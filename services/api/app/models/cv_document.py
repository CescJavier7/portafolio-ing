import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer, ForeignKey, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CVDocument(Base):
    """
    Un CV generado por el usuario, adaptado a una oferta laboral concreta.

    Pertenece a un USER (no a una Organization): un CV es personal. TODO el
    acceso se filtra por `user_id` del token (anti-IDOR) — nunca por un id que
    venga del cliente.

    Datos personales (LOPDP Ecuador / GDPR): `job_posting` y `content` contienen
    información personal del titular. Por eso:
    - Aislamiento estricto por usuario.
    - El usuario puede eliminarlo en cualquier momento (derecho de supresión) —
      DELETE real, no soft-delete: si el titular pide borrar, se borra.
    - La política de privacidad declara la retención y el subprocesador (Groq).
    """
    __tablename__ = "cv_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Título legible ("CV para Backend Developer — Empresa X").
    title: Mapped[str] = mapped_column(String(200), nullable=False)

    # Texto de la oferta (pegado por el usuario o extraído por OCR de una foto).
    job_posting: Mapped[str] = mapped_column(Text, nullable=False)

    # CV estructurado que devolvió el LLM: {summary, experience[], skills[], ...}.
    # JSON (no HTML) → el frontend controla el render y el PDF.
    content: Mapped[dict] = mapped_column(JSON, nullable=False)

    # % de requisitos de la oferta que cubre el CV (0-100), calculado por el LLM.
    match_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
