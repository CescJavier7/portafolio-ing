import re
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.schemas.scan import Finding

# Mismo patrón de dominio que schemas/target.py (FQDN válido, con TLD).
_DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$"
)


class FreeScanRequest(BaseModel):
    domain: str

    @field_validator("domain")
    @classmethod
    def normalize_domain(cls, v: str) -> str:
        d = v.strip().lower()
        d = re.sub(r"^https?://", "", d)
        d = d.split("/")[0]
        d = d.removeprefix("www.")
        d = d.split(":")[0]
        if not _DOMAIN_RE.match(d):
            raise ValueError("Dominio inválido. Ejemplo válido: midominio.com")
        return d


class PublicScoreOut(BaseModel):
    domain: str
    score: int
    grade: str
    scanned_at: datetime


class PublicFindingsOut(BaseModel):
    domain: str
    score: int
    grade: str
    scanned_at: datetime
    findings: list[Finding]


class PublicGateOut(BaseModel):
    domain: str
    score: int
    grade: str
    scanned_at: datetime
    min_score: int
    passed: bool
