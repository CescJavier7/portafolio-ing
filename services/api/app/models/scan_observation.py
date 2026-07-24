import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ScanObservation(Base):
    """
    EL MOTOR DE DATOS. Registro append-only de CADA escaneo que ocurre en
    Sentra —autenticado, del cron de monitoreo, y del escáner público gratis—
    pensado como el activo longitudinal que se revaloriza con el tiempo: la
    película de la postura de seguridad externa de Internet.

    A diferencia de `Scan` (que pertenece a una organización y guarda el
    detalle para el usuario), esto es un flujo AGREGADO y desligado del dueño:
    sirve para tendencias globales ("los fallos de CSP subieron 30% este mes",
    "adopción de TLS 1.3", "qué controles fallan más") y benchmarks por
    comparación, NUNCA para mostrar datos de un dominio ajeno.

    Privacidad por diseño:
    - `domain_hash` = SHA-256 del dominio, NO el dominio en claro. Permite
      identidad longitudinal estable (el mismo dominio hashea igual siempre)
      y contar dominios distintos, sin almacenar QUÉ se escaneó — importante
      porque el escáner público es anónimo (alguien podría escanear el dominio
      de un tercero). El agregado nunca necesita el dominio real.
    - No se guarda IP, usuario ni organización. Es deliberadamente anónimo.
    - Solo se INSERTA, nunca se lee por-dominio para un tercero.
    """
    __tablename__ = "scan_observations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # SHA-256 del dominio (64 hex). Índice para futuros agregados por dominio.
    domain_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    score: Mapped[int] = mapped_column(Integer, nullable=False)
    grade: Mapped[str] = mapped_column(String(2), nullable=False)

    # IDs de los controles que FALLARON (ej. ["hsts", "csp", "dmarc"]). Basta
    # para todas las tendencias ("¿qué control falla más?", "¿mejora con el
    # tiempo?") sin guardar el detalle completo por observación.
    failed_checks: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Origen: "panel" (escaneo autenticado), "monitor" (cron), "free" (público).
    source: Mapped[str] = mapped_column(String(10), nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
