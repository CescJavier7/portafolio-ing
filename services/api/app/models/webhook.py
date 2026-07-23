import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Boolean, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Webhook(Base):
    """
    Webhook saliente de una organización. A diferencia de una API key o una
    contraseña, el `secret` se guarda RECUPERABLE (no solo su hash): Sentra
    necesita el valor real para FIRMAR cada entrega saliente (HMAC-SHA256,
    header X-Sentra-Signature) — no es un credential que alguien presenta
    para entrar, es un valor que ambos lados deben conocer para verificar
    autenticidad, igual que el signing secret de Stripe o de Lemon Squeezy.
    La API nunca lo devuelve después de la creación/regeneración (ver
    schemas/webhook.py): se trata con la misma disciplina que un secreto,
    aunque el almacenamiento sea distinto por necesidad funcional.
    """
    __tablename__ = "webhooks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    url: Mapped[str] = mapped_column(String(500), nullable=False)
    secret: Mapped[str] = mapped_column(String(100), nullable=False)

    # ["monitoring_alert", "scan_completed", "exposure_alert"]
    event_types: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
