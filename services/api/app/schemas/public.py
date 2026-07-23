from datetime import datetime

from pydantic import BaseModel

from app.schemas.scan import Finding


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
