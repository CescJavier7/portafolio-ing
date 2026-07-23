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
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_api_key_org
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.organization import Organization
from app.models.scan import Scan
from app.models.target import Target
from app.schemas.public import PublicFindingsOut, PublicScoreOut

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
