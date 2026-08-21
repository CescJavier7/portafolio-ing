"""
api/v1/agent.py

Job Agent — Fase 1. Perfil de BÚSQUEDA (qué quiero / qué NO) + Application Score
(decide si vale la pena aplicar, con "¿por qué NO aplicar?"). Personal por usuario
(anti-IDOR). El scoring es rules-first (ver services/application_scoring.py); la
única llamada a IA es analizar la oferta.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_current_user_flex
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.captured_offer import CapturedOffer
from app.models.job_application import JobApplication
from app.models.search_profile import SearchProfile
from app.models.user import User
from app.schemas.agent import (
    CapturedOfferIn,
    CapturedOfferOut,
    EvaluateOut,
    EvaluateRequest,
    FirewallRequest,
    FirewallResult,
    ScoreBreakdown,
    SearchProfileIn,
    SearchProfileOut,
)
from app.services import application_firewall, application_scoring, cv_service
from app.services.text_guard import assert_readable

settings = get_settings()
router = APIRouter(prefix="/agent", tags=["job-agent"])

_LIST_FIELDS = (
    "locations", "modalities", "technologies", "industries",
    "desired_companies", "blocked_companies", "languages", "deal_breakers",
)
_SCALAR_FIELDS = (
    "target_role", "seniority", "user_years_experience", "min_salary",
    "salary_currency", "max_required_experience", "open_to_relocate", "visa_needed",
)


def _profile_dict(sp: SearchProfile) -> dict:
    """Vista dict del perfil (para el motor de scoring)."""
    return {f: getattr(sp, f) for f in (_SCALAR_FIELDS + _LIST_FIELDS)}


def _infer_country(hint: str, sp: SearchProfile | None) -> str:
    """País para el umbral de sueldo: el hint explícito manda; si no, se deduce de
    las ubicaciones del perfil ('Quito, Ecuador' → EC)."""
    if hint and hint.strip():
        return hint.strip()
    if sp:
        for loc in (sp.locations or []):
            code = application_firewall.country_in_text(loc)
            if code:
                return code
    return ""


async def _get_or_create(current_user: User, db: AsyncSession) -> SearchProfile:
    result = await db.execute(select(SearchProfile).where(SearchProfile.user_id == current_user.id))
    sp = result.scalar_one_or_none()
    if sp is None:
        sp = SearchProfile(user_id=current_user.id)
        db.add(sp)
        await db.commit()
        await db.refresh(sp)
    return sp


@router.get("/profile", response_model=SearchProfileOut)
async def get_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _get_or_create(current_user, db)


@router.put("/profile", response_model=SearchProfileOut)
async def put_profile(
    payload: SearchProfileIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sp = await _get_or_create(current_user, db)
    data = payload.model_dump()
    for field in _SCALAR_FIELDS + _LIST_FIELDS:
        setattr(sp, field, data[field])
    await db.commit()
    await db.refresh(sp)
    return sp


@router.post("/evaluate", response_model=EvaluateOut)
@limiter.limit("30/minute")
async def evaluate(
    request: Request,
    payload: EvaluateRequest,
    current_user: User = Depends(get_current_user_flex),
    db: AsyncSession = Depends(get_db),
):
    """
    Puntúa una oferta contra el perfil de búsqueda y da un veredicto
    (apply/maybe/avoid) + las razones para NO aplicar. Antes pasa por el
    Application Firewall (detección de estafas, determinista): si la oferta es una
    estafa clara (DANGER) se corta en seco y NO se gasta la llamada al LLM.
    IA solo para analizar la oferta; la decisión es determinista.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio no disponible.")
    try:
        assert_readable(payload.job_posting)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    sp = await _get_or_create(current_user, db)
    country = _infer_country(payload.country, sp)

    # ── Capa 1: Application Firewall (sin IA, sin coste) ──
    firewall = application_firewall.scan_posting(payload.job_posting, country=country)

    # Estafa clara → corte en seco: no evaluamos (ni pagamos IA por) un fraude.
    if firewall["risk_level"] == "danger":
        return EvaluateOut(
            score=0,
            verdict="avoid",
            breakdown={k: 0 for k in ScoreBreakdown.model_fields},
            deal_breakers=["Posible estafa detectada — revisa las señales antes de continuar."],
            reasons_avoid=[f["code"] for f in firewall["flags"]],
            reasons_apply=[],
            company="",
            role="",
            firewall=firewall,
            duplicate=None,
        )

    try:
        analysis = await run_in_threadpool(cv_service.analyze_offer, payload.job_posting)
    except Exception as exc:  # noqa: BLE001
        print(f"[Agent] analyze_offer falló (user {current_user.id}): {exc}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="No se pudo analizar la oferta. Inténtalo de nuevo.")

    result = application_scoring.score_application(_profile_dict(sp), analysis)

    # ── Capa 2: Duplicate Killer — ¿ya aplicaste a algo casi idéntico? ──
    rows = await db.execute(
        select(JobApplication.company, JobApplication.role, JobApplication.status)
        .where(JobApplication.user_id == current_user.id)
    )
    existing = [{"company": c, "role": r, "status": s} for c, r, s in rows.all()]
    duplicate = application_firewall.find_duplicate(result["company"], result["role"], existing)

    return EvaluateOut(**result, firewall=firewall, duplicate=duplicate)


@router.post("/firewall", response_model=FirewallResult)
@limiter.limit("60/minute")
async def firewall_scan(
    request: Request,
    payload: FirewallRequest,
    current_user: User = Depends(get_current_user_flex),
    db: AsyncSession = Depends(get_db),
):
    """
    Application Firewall STANDALONE: escanea una oferta buscando señales de estafa
    SIN IA (determinista, sin gastar cuota de CV ni créditos de Groq). Ideal para
    la extensión de navegador: filtro instantáneo antes de invertir tiempo o una
    evaluación completa. El umbral de sueldo se ajusta por país (hint o perfil).
    """
    sp = await _get_or_create(current_user, db)
    country = _infer_country(payload.country, sp)
    return FirewallResult(**application_firewall.scan_posting(payload.job_posting, country=country))


# ── Bandeja del agente: cola de ofertas capturadas (puente extensión → web) ──

_INBOX_MAX = 100  # tope por usuario; al pasarse se descartan las más viejas.


@router.post("/inbox", response_model=CapturedOfferOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def capture_offer(
    request: Request,
    payload: CapturedOfferIn,
    current_user: User = Depends(get_current_user_flex),
    db: AsyncSession = Depends(get_db),
):
    """
    Encola una oferta capturada (desde la extensión: 'Añadir a Sentra') para
    procesarla luego en la Bandeja del agente. Auth flexible (la extensión usa
    API key). Poda las más viejas si se supera el tope por usuario.
    """
    offer = CapturedOffer(
        user_id=current_user.id,
        text=payload.text,
        source_url=payload.source_url,
        title=payload.title,
    )
    db.add(offer)
    await db.flush()

    # Poda: conserva solo las _INBOX_MAX más recientes (evita crecimiento sin fin).
    total = (
        await db.execute(select(func.count()).select_from(CapturedOffer).where(CapturedOffer.user_id == current_user.id))
    ).scalar_one()
    if total > _INBOX_MAX:
        overflow = total - _INBOX_MAX
        old_ids = (
            await db.execute(
                select(CapturedOffer.id)
                .where(CapturedOffer.user_id == current_user.id)
                .order_by(CapturedOffer.created_at.asc())
                .limit(overflow)
            )
        ).scalars().all()
        if old_ids:
            await db.execute(delete(CapturedOffer).where(CapturedOffer.id.in_(old_ids)))

    await db.commit()
    await db.refresh(offer)
    return offer


@router.get("/inbox", response_model=list[CapturedOfferOut])
async def list_captured_offers(
    current_user: User = Depends(get_current_user_flex),
    db: AsyncSession = Depends(get_db),
):
    """Ofertas capturadas pendientes de procesar (más recientes primero)."""
    rows = await db.execute(
        select(CapturedOffer)
        .where(CapturedOffer.user_id == current_user.id)
        .order_by(CapturedOffer.created_at.desc())
    )
    return rows.scalars().all()


@router.delete("/inbox/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_captured_offer(
    offer_id: str,
    current_user: User = Depends(get_current_user_flex),
    db: AsyncSession = Depends(get_db),
):
    """Quita una oferta de la bandeja (tras procesarla o descartarla). Anti-IDOR."""
    result = await db.execute(
        delete(CapturedOffer).where(CapturedOffer.id == offer_id, CapturedOffer.user_id == current_user.id)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Oferta no encontrada.")
