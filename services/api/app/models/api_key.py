import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ApiKey(Base):
    """
    Llave de acceso a la API pública de Sentra (fuera del JWT de sesión de
    usuario). Vive a nivel de ORGANIZACIÓN, no de usuario: cualquier llave
    de la org puede consultar los dominios de esa org, igual que una API key
    de Stripe pertenece a la cuenta, no a la persona que la generó.
    """
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False)

    # Hash SHA-256 (ver security.py:generate_api_key para el porqué). Único
    # e indexado: es como se ENCUENTRA la fila cuando llega un request.
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)

    # Prefijo en claro (ej. "sentra_a1b2c3"), solo para que el usuario
    # reconozca la llave en la lista. Nunca es suficiente para autenticar.
    key_prefix: Mapped[str] = mapped_column(String(20), nullable=False)

    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
