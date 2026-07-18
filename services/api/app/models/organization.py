import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    plan: Mapped[str] = mapped_column(String(20), default="FREE")  # FREE | PRO | TEAM | ENTERPRISE

     # Referencias a Lemon Squeezy. NUNCA se guarda info de tarjeta aquí: eso
    # vive exclusivamente en su Checkout hosteado (PCI compliance por diseño
    # — ni tocamos datos de tarjeta, así que ni siquiera aplica PCI-DSS).
    lemonsqueezy_customer_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    lemonsqueezy_subscription_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    subscription_status: Mapped[str | None] = mapped_column(String(30), nullable=True)  # active, past_due, canceled...

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Contador anti-abuso del plan FREE (ver core/plans.py). Vive en la org,
    # no por dominio: borrar/recrear dominios NO regala escaneos nuevos.
    free_scan_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    free_scan_window_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    users: Mapped[list["User"]] = relationship(back_populates="organization")
    targets: Mapped[list["Target"]] = relationship(back_populates="organization")