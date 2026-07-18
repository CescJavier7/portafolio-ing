"""
api/v1/targets.py

Gestión de dominios a auditar. Reglas clave:
- Cada dominio arranca sin verificar; no se podrá escanear hasta que la
  verificación DNS TXT pase (barrera ético-legal).
- Límite de dominios por plan de la organización (FREE vs PRO). El límite
  se chequea al crear, contra las filas existentes.
- Aislamiento por organización: un usuario solo ve/toca los targets de SU
  organización. Nunca se filtra por user, siempre por organization_id del
  token — evita IDOR (acceder a recursos de otra org cambiando un id).
"""
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.target import Target
from app.models.user import User
from app.models.organization import Organization
from app.schemas.target import (
    TargetCreate,
    TargetCreatedOut,
    TargetOut,
    VerifyResultOut,
)
from app.services.dns_verification import (
    challenge_record_name,
    check_dns_txt,
    expected_txt_value,
)

router = APIRouter(prefix="/targets", tags=["targets"])

# Dominios permitidos por plan. FREE deja probar con uno; el resto exige Pro.
PLAN_TARGET_LIMITS = {
    "FREE": 1,
    "PRO": 10,
    "TEAM": 50,
    "ENTERPRISE": 1000,
}


def _created_payload(target: Target) -> TargetCreatedOut:
    return TargetCreatedOut(
        id=target.id,
        domain=target.domain,
        verified=target.verified,
        verified_at=target.verified_at,
        created_at=target.created_at,
        dns_record_name=challenge_record_name(target.domain),
        dns_record_value=expected_txt_value(target.verification_token),
    )


@router.get("", response_model=list[TargetOut])
async def list_targets(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Target)
        .where(Target.organization_id == current_user.organization_id)
        .order_by(Target.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=TargetCreatedOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_target(
    request: Request,
    payload: TargetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await db.get(Organization, current_user.organization_id)
    limit = PLAN_TARGET_LIMITS.get(org.plan if org else "FREE", 1)

    count_result = await db.execute(
        select(func.count())
        .select_from(Target)
        .where(Target.organization_id == current_user.organization_id)
    )
    if count_result.scalar_one() >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Alcanzaste el límite de dominios de tu plan ({limit}). Mejora a Pro para agregar más.",
        )

    # Duplicado dentro de la misma organización.
    existing = await db.execute(
        select(Target).where(
            Target.organization_id == current_user.organization_id,
            Target.domain == payload.domain,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ese dominio ya está registrado en tu organización.",
        )

    target = Target(
        organization_id=current_user.organization_id,
        domain=payload.domain,
        verification_token=secrets.token_urlsafe(24),
    )
    db.add(target)
    await db.commit()
    await db.refresh(target)

    return _created_payload(target)


async def _get_owned_target(target_id, current_user: User, db: AsyncSession) -> Target:
    # Siempre filtrando por organization_id del token: aunque adivinen un
    # target_id de otra org, esta query no lo devuelve (anti-IDOR).
    result = await db.execute(
        select(Target).where(
            Target.id == target_id,
            Target.organization_id == current_user.organization_id,
        )
    )
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dominio no encontrado.")
    return target


@router.get("/{target_id}/instructions", response_model=TargetCreatedOut)
async def get_instructions(
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_owned_target(target_id, current_user, db)
    return _created_payload(target)


@router.post("/{target_id}/verify", response_model=VerifyResultOut)
@limiter.limit("10/minute")  # la resolución DNS cuesta; evita abuso
async def verify_target(
    request: Request,
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_owned_target(target_id, current_user, db)

    if target.verified:
        return VerifyResultOut(verified=True, detail="Este dominio ya estaba verificado.")

    ok = await check_dns_txt(target.domain, target.verification_token)
    if not ok:
        return VerifyResultOut(
            verified=False,
            detail="Todavía no encontramos el registro TXT. Los cambios de DNS pueden tardar unos minutos en propagarse.",
        )

    from datetime import datetime, timezone

    target.verified = True
    target.verified_at = datetime.now(timezone.utc)
    await db.commit()

    return VerifyResultOut(verified=True, detail="Dominio verificado. Ya puedes auditarlo.")


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_target(
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_owned_target(target_id, current_user, db)
    await db.delete(target)
    await db.commit()
