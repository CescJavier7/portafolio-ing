import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProcessedWebhookEvent(Base):
    """
    Idempotencia PERSISTENTE de los webhooks de Lemon Squeezy. Antes esto vivía
    en un set en memoria (`_processed_event_ids`): se perdía en cada reinicio y
    no funcionaba con más de una réplica, lo que abría la puerta a aplicar DOS
    veces el mismo evento de cobro/suscripción.

    Ahora cada evento procesado deja una fila con `event_key` ÚNICO. El índice
    único es la garantía real de "exactamente una vez": si dos entregas del
    mismo evento llegan a la vez (Lemon Squeezy reintenta), la segunda choca
    contra el unique y se trata como duplicado. Sobrevive reinicios y réplicas.
    """
    __tablename__ = "processed_webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # "{data.id}:{event_name}:{updated_at}" — el mismo recurso puede repetirse
    # en varios eventos, pero updated_at cambia en cada transición real.
    event_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
