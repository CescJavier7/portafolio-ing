import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditLog(Base):
    """
    Registro de auditoría inmutable por organización: quién hizo qué y cuándo.
    En un producto de SEGURIDAD con equipos multi-usuario esto no es opcional
    — es la trazabilidad que un cliente enterprise (y un incidente) exigen.

    Decisiones de diseño:
    - `actor_email` se guarda DENORMALIZADO (copia, no solo el FK): un audit
      log debe sobrevivir a que el usuario se elimine. Si borras a un miembro,
      su rastro histórico ("ana@ invitó a bob@") NO debe desaparecer ni quedar
      en null. El FK es solo referencia blanda (SET NULL al borrar).
    - Solo se INSERTA, nunca se actualiza ni borra desde la app: un audit log
      editable no vale nada. No hay endpoint de update/delete a propósito.
    - `action` es un código estable (ej. "member.invited"); la traducción a
      texto legible vive en el frontend (i18n ES/EN), no se hardcodea aquí.
    """
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Referencia blanda al usuario que ejecutó la acción. NULL = acción del
    # sistema (ej. un webhook de billing, el cron de monitoreo).
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False)

    # Código estable de la acción, ej. "member.invited", "target.deleted".
    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)

    # Sujeto legible de la acción (dominio, email invitado, nombre de la key…).
    target_label: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Contexto extra estructurado, ej. {"from": "MEMBER", "to": "ADMIN"}.
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
