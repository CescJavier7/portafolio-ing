"""
api/v1/agent.py

Job Agent — Fase 1. Perfil de BÚSQUEDA (qué quiero / qué NO) + Application Score
(decide si vale la pena aplicar, con "¿por qué NO aplicar?"). Personal por usuario
(anti-IDOR). El scoring es rules-first (ver services/application_scoring.py); la
única llamada a IA es analizar la oferta.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.search_profile import SearchProfile
from app.models.user import User
from app.schemas.agent import EvaluateOut, EvaluateRequest, SearchProfileIn, SearchProfileOut
from app.services import application_scoring, cv_service
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Puntúa una oferta contra el perfil de búsqueda y da un veredicto
    (apply/maybe/avoid) + las razones para NO aplicar. IA solo para analizar la
    oferta; la decisión es determinista.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio no disponible.")
    try:
        assert_readable(payload.job_posting)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    sp = await _get_or_create(current_user, db)
    try:
        analysis = await run_in_threadpool(cv_service.analyze_offer, payload.job_posting)
    except Exception as exc:  # noqa: BLE001
        print(f"[Agent] analyze_offer falló (user {current_user.id}): {exc}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="No se pudo analizar la oferta. Inténtalo de nuevo.")

    result = application_scoring.score_application(_profile_dict(sp), analysis)
    return EvaluateOut(**result)
