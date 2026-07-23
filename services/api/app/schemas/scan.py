import uuid
from datetime import datetime

from pydantic import BaseModel


class Reference(BaseModel):
    framework: str  # OWASP | CWE | NIST | RFC | PCI DSS
    ref: str        # A05:2021 | CWE-1021 | SP 800-52r2 ...
    title: str


class Finding(BaseModel):
    id: str
    label: str
    passed: bool
    weight: int
    severity: str
    recommendation: str | None = None
    # Campos nuevos (informe formal). Opcionales: los escaneos guardados
    # antes de esta versión no los tienen y deben seguir deserializando.
    category: str | None = None
    references: list[Reference] = []


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

    # Informe IA persistido ({executive, priorities, technical}) si ya se
    # generó. El frontend lo muestra al instante sin volver a llamar al LLM.
    ai_report: dict | None = None
