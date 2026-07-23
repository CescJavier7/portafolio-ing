import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SurfaceSnapshot(Base):
    """
    Resultado persistido de un descubrimiento de superficie (subdominios,
    puertos, tecnologías). Sin esto, cada visita a la sección obligaba a
    re-descubrir (llamadas a crt.sh + escaneo de puertos, ~10-15s) y el
    resultado desaparecía al cambiar de pestaña del panel. Guardarlo permite
    mostrar el último resultado al instante y, más adelante, comparar
    superficies en el tiempo (qué subdominio apareció/desapareció).
    """
    __tablename__ = "surface_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    target_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("targets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    subdomains: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    ports: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    technologies: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
