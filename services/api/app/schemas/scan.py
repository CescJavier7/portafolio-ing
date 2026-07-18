import uuid
from datetime import datetime

from pydantic import BaseModel


class Finding(BaseModel):
    id: str
    label: str
    passed: bool
    weight: int
    severity: str
    recommendation: str | None = None


class ScanResult(BaseModel):
    id: uuid.UUID
    target_id: uuid.UUID
    domain: str
    score: int
    grade: str
    created_at: datetime

    # Detalle solo para planes que lo permiten (PRO+). En FREE viaja None,
    # y `detail_locked=True` le dice al frontend que muestre el candado.
    findings: list[Finding] | None = None
    detail_locked: bool = False

    # Cuántos escaneos le quedan en la ventana actual (para la UI del free).
    scans_remaining: int | None = None
