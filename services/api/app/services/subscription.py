"""
services/subscription.py

Lógica del ciclo de vida de la suscripción (mensual). Un pago aprobado extiende
el período 30 días; si ya está activo, se extiende desde el fin actual (así una
renovación anticipada NO pierde días). Cancelar mantiene el acceso hasta
`plan_expires_at`; el downgrade a FREE ocurre al vencer sin renovar.
"""
from datetime import datetime, timedelta, timezone

PERIOD_DAYS = 30


def next_period_end(current: datetime | None) -> datetime:
    """
    Nuevo fin de período tras un pago. Si el período actual sigue vigente, se
    apila desde ahí (no se pierden días); si no, cuenta desde ahora.
    """
    now = datetime.now(timezone.utc)
    base = current if (current is not None and current > now) else now
    return base + timedelta(days=PERIOD_DAYS)


def is_expired(plan_expires_at: datetime | None) -> bool:
    """True si el período pagado ya venció (hay que bajar a FREE)."""
    if plan_expires_at is None:
        return False  # sin período definido = no vencido (legacy / ilimitado)
    return plan_expires_at <= datetime.now(timezone.utc)
