"""
api/v1/public.py

La API PÚBLICA de Sentra: autenticada con API key de organización (ver
deps.get_api_key_org), pensada para que OTROS SISTEMAS la consuman —
un pipeline de CI/CD, un script, otro backend — no el panel.

Aislamiento: una key solo puede consultar dominios que pertenecen a SU
propia organización (Target.organization_id == key de la request), nunca
dominios ajenos. No es un oráculo público de "cualquier dominio del
mundo" — es "los dominios que TÚ ya verificaste con Sentra".
"""
import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.concurrency import run_in_threadpool
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_api_key_org
from app.core.config import get_settings
from app.core.plans import plan_for
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.organization import Organization
from app.models.scan import Scan
from app.models.target import Target
from app.schemas.cv import CVContent, CVGenerateRequest
from app.schemas.public import PublicFindingsOut, PublicGateOut, PublicScoreOut
from app.services import cv_service
from app.services.cv_prompts import rebuild_cv
from app.services.text_guard import assert_readable

router = APIRouter(prefix="/public", tags=["public-api"])


async def _latest_scan_for_domain(domain: str, org: Organization, db: AsyncSession) -> tuple[Target, Scan]:
    target_result = await db.execute(
        select(Target).where(Target.domain == domain, Target.organization_id == org.id)
    )
    target = target_result.scalar_one_or_none()
    if target is None:
        # Mismo mensaje si el dominio no existe o pertenece a otra org:
        # no confirmamos ni negamos la existencia de dominios ajenos.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dominio no encontrado en tu organización.")

    scan_result = await db.execute(
        select(Scan).where(Scan.target_id == target.id).order_by(Scan.created_at.desc()).limit(1)
    )
    scan = scan_result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Este dominio aún no tiene escaneos.")

    return target, scan


@router.get("/domains/{domain}/score", response_model=PublicScoreOut)
@limiter.limit("60/minute")
async def public_score(
    request: Request,
    domain: str,
    org: Organization = Depends(get_api_key_org),
    db: AsyncSession = Depends(get_db),
):
    _, scan = await _latest_scan_for_domain(domain, org, db)
    return PublicScoreOut(domain=domain, score=scan.score, grade=scan.grade, scanned_at=scan.created_at)


@router.get("/domains/{domain}/gate", response_model=PublicGateOut)
@limiter.limit("60/minute")
async def public_gate(
    request: Request,
    domain: str,
    org: Organization = Depends(get_api_key_org),
    db: AsyncSession = Depends(get_db),
    min_score: int = Query(70, ge=0, le=100, description="Umbral mínimo aceptable del Security Score."),
):
    """
    Pensado para un paso de CI/CD: "¿este dominio sigue por encima de mi
    umbral de seguridad?". Responde SIEMPRE 200 (la consulta fue exitosa)
    con `passed: bool` — nunca usamos el código HTTP para señalar el
    resultado del negocio, eso es un anti-patrón de diseño de APIs. El
    script de CI decide con `passed`, no con el status code.
    """
    _, scan = await _latest_scan_for_domain(domain, org, db)
    return PublicGateOut(
        domain=domain,
        score=scan.score,
        grade=scan.grade,
        scanned_at=scan.created_at,
        min_score=min_score,
        passed=scan.score >= min_score,
    )


@router.get("/domains/{domain}/findings", response_model=PublicFindingsOut)
@limiter.limit("60/minute")
async def public_findings(
    request: Request,
    domain: str,
    org: Organization = Depends(get_api_key_org),
    db: AsyncSession = Depends(get_db),
):
    _, scan = await _latest_scan_for_domain(domain, org, db)
    return PublicFindingsOut(
        domain=domain,
        score=scan.score,
        grade=scan.grade,
        scanned_at=scan.created_at,
        findings=scan.findings or [],
    )


@router.post("/cv/generate", response_model=CVContent)
@limiter.limit("20/hour")
async def public_cv_generate(
    request: Request,
    payload: CVGenerateRequest,
    org: Organization = Depends(get_api_key_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Genera y adapta un CV a una oferta, autenticado por API KEY (no por sesión).

    Es el motor de la AUTOMATIZACIÓN de Sentra CV AI: un flujo de n8n (o un
    script propio) manda el perfil + la oferta y recibe el CV ya adaptado en
    JSON — listo para guardarlo en Notion, enviarlo o registrarlo como
    postulación. STATELESS a propósito: no hay usuario dueño, así que NO se
    persiste nada; solo transforma. Reutiliza exactamente el mismo pipeline
    anclado por ids del panel (services/cv_service + cv_prompts), para que la
    calidad y las garantías anti-invención sean idénticas.
    """
    settings = get_settings()
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El generador de CV no está disponible por el momento.",
        )

    # Gate de plan: la generación consume tokens de IA, así que se reserva a
    # planes con acceso a API (Pro+). Una key podría sobrevivir a un downgrade.
    if not plan_for(org.plan).api_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu plan no incluye acceso a la API. Actualiza a Pro para automatizar.",
        )

    try:
        assert_readable(payload.profile_text)
        assert_readable(payload.job_posting)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    try:
        profile, analysis = await asyncio.wait_for(
            asyncio.gather(
                run_in_threadpool(cv_service.extract_profile, payload.profile_text),
                run_in_threadpool(cv_service.analyze_offer, payload.job_posting),
            ),
            timeout=65,
        )
        llm_output = await asyncio.wait_for(
            run_in_threadpool(cv_service.adapt_cv, profile, analysis),
            timeout=45,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="La generación tardó demasiado. Inténtalo de nuevo.",
        )
    except (json.JSONDecodeError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar un CV válido. Inténtalo de nuevo.",
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[CV/API] Fallo generando CV para org {org.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El servicio de IA no respondió. Inténtalo más tarde.",
        )

    rich, _ = rebuild_cv(profile, llm_output)
    try:
        cv_content = CVContent(**cv_service.map_rich_to_content(rich, profile))
    except ValidationError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar un CV válido. Inténtalo de nuevo.",
        )
    cv_content.match_score = max(0, min(100, cv_content.match_score))
    return cv_content
