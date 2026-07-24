"""
api/v1/audit.py

Lectura del registro de auditoría de la organización. Solo OWNER/ADMIN:
el rastro de "quién hizo qué" es información sensible de gobernanza, no algo
que cada miembro deba ver. No hay POST/PUT/DELETE a propósito — el log solo
se escribe desde audit_service (dentro de las acciones reales) y es inmutable
desde la API.

Aislamiento por organización (anti-IDOR): siempre se filtra por el
organization_id del token, nunca por un id que venga del cliente.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogOut

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogOut])
async def list_audit(
    current_user: User = Depends(require_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
    action: str | None = Query(default=None, description="Filtra por código de acción exacto."),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    query = select(AuditLog).where(AuditLog.organization_id == current_user.organization_id)
    if action:
        query = query.where(AuditLog.action == action)
    query = query.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    return list(result.scalars().all())
