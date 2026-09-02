import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LessonProgress(Base):
    """
    Progreso de la Academia: una fila = un usuario completó una lección. Personal
    (anti-IDOR, `user_id`). `lesson_slug` identifica la lección como
    "<track>/<slug>" (ej. "ciberseguridad/inyeccion-sql"). Único por (usuario,
    lección) para que marcar dos veces no duplique.
    """
    __tablename__ = "lesson_progress"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lesson_slug: Mapped[str] = mapped_column(String(200), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (UniqueConstraint("user_id", "lesson_slug", name="uq_lesson_progress_user_slug"),)
