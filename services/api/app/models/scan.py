import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Scan(Base):
    """
    Un escaneo pasivo de un Target. Guarda el score (0-100), la letra (A-F)
    y el detalle completo de los hallazgos como JSON. El detalle SIEMPRE se
    guarda; que se muestre o no al usuario depende de su plan (el router
    decide) — así, si un usuario FREE mejora a PRO, sus escaneos viejos ya
    tienen el desglose disponible sin re-escanear.
    """
    __tablename__ = "scans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    target_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("targets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    score: Mapped[int] = mapped_column(Integer, nullable=False)
    grade: Mapped[str] = mapped_column(String(2), nullable=False)  # A, B, C, D, F

    # Lista de hallazgos: [{id, label, passed, weight, severity, recommendation}, ...]
    findings: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Informe IA generado para ESTE escaneo ({executive, priorities, technical}).
    # Se persiste al generarlo la primera vez → en revisitas se muestra al
    # instante, sin volver a llamar al LLM (evita la espera).
    ai_report: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    target: Mapped["Target"] = relationship()
