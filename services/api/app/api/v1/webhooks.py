"""
api/v1/webhooks.py

CRUD de webhooks salientes de la organización. Requiere sesión de usuario
normal (JWT), no API key — es panel, no la API pública para máquinas.
"""
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, require_role
from app.core.plans import plan_for
from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.webhook import Webhook
from app.schemas.webhook import ALLOWED_EVENT_TYPES, WebhookCreate, WebhookCreatedOut, WebhookOut, WebhookToggle
from app.services.audit_service import record_audit

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _validate_event_types(event_types: list[str]) -> None:
    unknown = set(event_types) - ALLOWED_EVENT_TYPES
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tipo(s) de evento no soportado(s): {', '.join(sorted(unknown))}.",
        )


@router.get("", response_model=list[WebhookOut])
async def list_webhooks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Webhook)
        .where(Webhook.organization_id == current_user.organization_id)
        .order_by(Webhook.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=WebhookCreatedOut, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    payload: WebhookCreate,
    current_user: User = Depends(require_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    _validate_event_types(payload.event_types)

    org = await db.get(Organization, current_user.organization_id)
    limit = plan_for(org.plan if org else None).max_webhooks

    count_result = await db.execute(
        select(func.count()).select_from(Webhook).where(Webhook.organization_id == current_user.organization_id)
    )
    if count_result.scalar_one() >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Alcanzaste el límite de webhooks de tu plan ({limit}). Elimina alguno o mejora tu plan.",
        )

    hook = Webhook(
        organization_id=current_user.organization_id,
        url=str(payload.url),
        secret=f"whsec_{secrets.token_urlsafe(32)}",
        event_types=payload.event_types,
    )
    db.add(hook)
    record_audit(
        db,
        organization_id=current_user.organization_id,
        actor=current_user,
        action="webhook.created",
        target_label=str(payload.url),
    )
    await db.commit()
    await db.refresh(hook)

    return WebhookCreatedOut(
        id=hook.id,
        url=hook.url,
        event_types=hook.event_types,
        enabled=hook.enabled,
        last_triggered_at=hook.last_triggered_at,
        last_status_code=hook.last_status_code,
        created_at=hook.created_at,
        secret=hook.secret,  # única vez que el valor sale del servidor
    )


async def _get_owned_webhook(webhook_id: str, current_user: User, db: AsyncSession) -> Webhook:
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.organization_id == current_user.organization_id)
    )
    hook = result.scalar_one_or_none()
    if hook is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook no encontrado.")
    return hook


@router.patch("/{webhook_id}", response_model=WebhookOut)
async def toggle_webhook(
    webhook_id: str,
    payload: WebhookToggle,
    current_user: User = Depends(require_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    hook = await _get_owned_webhook(webhook_id, current_user, db)
    hook.enabled = payload.enabled
    await db.commit()
    await db.refresh(hook)
    return hook


@router.post("/{webhook_id}/regenerate-secret", response_model=WebhookCreatedOut)
async def regenerate_secret(
    webhook_id: str,
    current_user: User = Depends(require_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    hook = await _get_owned_webhook(webhook_id, current_user, db)
    hook.secret = f"whsec_{secrets.token_urlsafe(32)}"
    await db.commit()
    await db.refresh(hook)

    return WebhookCreatedOut(
        id=hook.id,
        url=hook.url,
        event_types=hook.event_types,
        enabled=hook.enabled,
        last_triggered_at=hook.last_triggered_at,
        last_status_code=hook.last_status_code,
        created_at=hook.created_at,
        secret=hook.secret,
    )


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: str,
    current_user: User = Depends(require_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    hook = await _get_owned_webhook(webhook_id, current_user, db)
    deleted_url = hook.url
    await db.delete(hook)
    record_audit(
        db,
        organization_id=current_user.organization_id,
        actor=current_user,
        action="webhook.deleted",
        target_label=deleted_url,
    )
    await db.commit()
