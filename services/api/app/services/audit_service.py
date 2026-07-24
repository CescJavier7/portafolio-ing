"""
services/audit_service.py

Helper único para dejar rastro de auditoría. Se llama desde los endpoints
que mutan estado sensible (equipo, dominios, API keys, webhooks, contraseña).

Patrón de uso: `record_audit(...)` solo hace `db.add(entry)`. NO comitea —
el commit del propio endpoint (que ya persiste la acción real) persiste
también la entrada de auditoría, de modo que ambas caen en la misma
transacción: si la acción se revierte, su registro también. Así el log
nunca miente ("se invitó a X") sobre algo que en realidad falló.
"""
from app.models.audit_log import AuditLog
from app.models.user import User


def record_audit(
    db,
    *,
    organization_id,
    actor: User | None,
    action: str,
    target_label: str | None = None,
    meta: dict | None = None,
) -> None:
    entry = AuditLog(
        organization_id=organization_id,
        actor_user_id=actor.id if actor else None,
        # Snapshot del email: sobrevive a que el usuario se elimine luego.
        actor_email=actor.email if actor else "system",
        action=action,
        target_label=target_label,
        meta=meta,
    )
    db.add(entry)
