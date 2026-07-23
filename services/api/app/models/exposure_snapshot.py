import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ExposureSnapshot(Base):
    """
    Resultado persistido de un análisis de exposición (rutas de riesgo +
    conteo por severidad). Mismo motivo que SurfaceSnapshot: mostrar el
    último resultado al instante en vez de recalcular en cada visita, y
    dejar la base para comparar en el tiempo ("qué ruta apareció esta semana").
    """
    __tablename__ = "exposure_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    target_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("targets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    routes: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    counts: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
