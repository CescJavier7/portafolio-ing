"""
api/v1/api_keys.py

Gestión de API keys de la organización (crear/listar/revocar). Requiere
sesión de usuario normal (JWT) — esto es "panel", no la API pública que
consumen máquinas con la key ya emitida (ver public.py).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, require_role
from app.core.plans import plan_for
from app.core.security import generate_api_key
from app.db.session import get_db
from app.models.api_key import ApiKey
from app.models.organization import Organization
from app.models.user import User
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreatedOut, ApiKeyOut

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


async def _require_api_access(current_user: User, db: AsyncSession) -> None:
    org = await db.get(Organization, current_user.organization_id)
    if not plan_for(org.plan if org else None).api_access:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="El acceso a la API es una función Pro.",
        )


@router.get("", response_model=list[ApiKeyOut])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.organization_id == current_user.organization_id)
        .order_by(ApiKey.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=ApiKeyCreatedOut, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: ApiKeyCreate,
    current_user: User = Depends(require_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    await _require_api_access(current_user, db)

    org = await db.get(Organization, current_user.organization_id)
    limit = plan_for(org.plan if org else None).max_api_keys

    count_result = await db.execute(
        select(func.count())
        .select_from(ApiKey)
        .where(ApiKey.organization_id == current_user.organization_id, ApiKey.revoked.is_(False))
    )
    if count_result.scalar_one() >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Alcanzaste el límite de API keys activas de tu plan ({limit}). Revoca alguna o mejora tu plan.",
        )

    raw, key_hash, prefix = generate_api_key()
    key = ApiKey(
        organization_id=current_user.organization_id,
        name=payload.name,
        key_hash=key_hash,
        key_prefix=prefix,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)

    return ApiKeyCreatedOut(
        id=key.id,
        name=key.name,
        key_prefix=key.key_prefix,
        revoked=key.revoked,
        last_used_at=key.last_used_at,
        created_at=key.created_at,
        key=raw,  # única vez que el valor crudo sale del servidor
    )


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    current_user: User = Depends(require_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.organization_id == current_user.organization_id)
    )
    key = result.scalar_one_or_none()
    if key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key no encontrada.")

    key.revoked = True
    await db.commit()
