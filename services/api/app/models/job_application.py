import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class JobApplication(Base):
    """
    Una postulación laboral que el usuario sigue en Sentra CV AI (el "tracker"
    nativo — reemplaza a Notion en el flujo de automatización).

    Pertenece a un USER (dato personal, igual que el CV): TODO acceso se filtra
    por `user_id` del token (anti-IDOR), nunca por un id que venga del cliente.
    Puede enlazar el CV generado para esa oferta (`cv_document_id`); borrar el CV
    NO borra la postulación (ON DELETE SET NULL), solo la desvincula.

    Se puede crear desde el panel (a mano o "guardar como postulación" tras
    generar un CV) o por API con API key (n8n) — mismo modelo.
    """
    __tablename__ = "job_applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    cv_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cv_documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    company: Mapped[str] = mapped_column(String(160), nullable=False)
    role: Mapped[str] = mapped_column(String(200), nullable=False)
    job_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # saved | applied | interview | offer | rejected
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="saved", index=True)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Fecha en que se marcó como "postulado" (opcional).
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
