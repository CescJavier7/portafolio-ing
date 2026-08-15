import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CVFolder(Base):
    """
    Carpeta/categoría para organizar los CVs de un usuario (ej. "Ciberseguridad",
    "Ingeniería de Software").

    Pertenece a un USER (dato personal, igual que el CV). Aislamiento anti-IDOR:
    todo acceso se filtra por `user_id` del token. Al borrar una carpeta, los CVs
    que la referencian quedan con `folder_id = NULL` (ON DELETE SET NULL): no se
    pierde ningún CV, solo se "des-categoriza".
    """
    __tablename__ = "cv_folders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(80), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
