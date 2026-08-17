import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PaymentRequest(Base):
    """
    Solicitud de pago MANUAL (MVP de cobros para Ecuador, sin pasarela).

    Flujo: el usuario paga por fuera (De Una / PayPhone link / transferencia /
    PayPal / USDT), envía aquí la REFERENCIA de la transacción, y el fundador la
    aprueba desde el panel → se activa el plan de la organización.

    Seguridad: NO se guardan datos de tarjeta ni comprobantes con PII sensible;
    solo la referencia (texto) que el titular decide compartir. La aprobación
    está restringida al fundador (require_founder), no al OWNER de la org.
    """
    __tablename__ = "payment_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    plan: Mapped[str] = mapped_column(String(20), nullable=False)  # plan solicitado (PRO | TEAM)
    method: Mapped[str] = mapped_column(String(30), nullable=False)  # deuna|payphone|transfer|paypal|usdt
    reference: Mapped[str] = mapped_column(String(200), nullable=False)  # referencia de la transacción
    note: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    amount: Mapped[str] = mapped_column(String(60), nullable=False, default="")  # monto mostrado al pagar

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)  # pending|approved|rejected

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
