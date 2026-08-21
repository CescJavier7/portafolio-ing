import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CapturedOffer(Base):
    """
    Oferta CAPTURADA por el usuario (desde la extensión de navegador, con "Añadir
    a Sentra") para procesarla luego en la Bandeja del agente del sitio. Es la cola
    que conecta el descubrimiento (ves una vacante en la web) con la decisión
    (evaluar + preparar en Sentra).

    Personal (anti-IDOR): TODO acceso se filtra por `user_id` del token. Efímera:
    se borra al procesarla o al vaciar la bandeja; se limita el número por usuario
    para que no crezca sin control.
    """
    __tablename__ = "captured_offers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    text: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    title: Mapped[str | None] = mapped_column(String(300), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
