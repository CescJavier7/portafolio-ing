import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Target(Base):
    """
    Un dominio que una organización quiere auditar. NO se puede escanear
    hasta que `verified=True`: la verificación por DNS TXT prueba que quien
    lo registra controla el dominio. Es la barrera ético-legal de Sentra —
    escanear un dominio ajeno sin autorización es potencialmente ilegal.
    """
    __tablename__ = "targets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Dominio normalizado (sin esquema, sin www, minúsculas). Ver schemas.
    domain: Mapped[str] = mapped_column(String(253), nullable=False)  # 253 = longitud máxima de un FQDN

    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Token que el usuario publica como registro TXT en su DNS. Impredecible
    # (no adivinable) para que nadie verifique un dominio ajeno a ciegas.
    verification_token: Mapped[str] = mapped_column(String(64), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    organization: Mapped["Organization"] = relationship(back_populates="targets")

    __table_args__ = (
        # Un mismo dominio no se registra dos veces en la MISMA organización
        # (dos organizaciones distintas sí pueden reclamar el mismo dominio;
        # cada una debe verificarlo por su cuenta).
        UniqueConstraint("organization_id", "domain", name="uq_target_org_domain"),
    )
