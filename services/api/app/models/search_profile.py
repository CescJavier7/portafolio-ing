import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SearchProfile(Base):
    """
    Perfil de BÚSQUEDA laboral del usuario (no el CV): qué trabajo quiere y —sobre
    todo— qué NO acepta. Es la base del Job Agent: con esto Sentra puede DECIDIR a
    qué ofertas aplicar (Application Score), no solo generar CVs.

    Uno por usuario (unique user_id). Personal (anti-IDOR): todo acceso se filtra
    por `user_id` del token. Las listas se guardan como JSON.
    """
    __tablename__ = "search_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )

    # Objetivo
    target_role: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    seniority: Mapped[str] = mapped_column(String(20), nullable=False, default="")  # junior|mid|senior|""
    user_years_experience: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Condiciones
    min_salary: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    # Deal-breaker: rechazar ofertas que pidan MÁS años que esto (ej. "no 5 años").
    max_required_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    open_to_relocate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    visa_needed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Listas (JSON)
    locations: Mapped[list] = mapped_column(JSON, nullable=False, default=list)          # ["Ecuador","Quito","Remoto LATAM"]
    modalities: Mapped[list] = mapped_column(JSON, nullable=False, default=list)         # ["remoto","hibrido","presencial"]
    technologies: Mapped[list] = mapped_column(JSON, nullable=False, default=list)       # ["Python","React",...]
    industries: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    desired_companies: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    blocked_companies: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    languages: Mapped[list] = mapped_column(JSON, nullable=False, default=list)          # ["es","en"]
    # Lo que NO quiere: strings libres ("ventas","soporte","presencial",...).
    deal_breakers: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
