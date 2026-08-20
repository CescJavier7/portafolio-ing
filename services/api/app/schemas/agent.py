import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

_SENIORITY = "^(junior|mid|senior|)$"


class SearchProfileIn(BaseModel):
    """Upsert del perfil de búsqueda (PUT). Todos con default → el form manda todo."""
    target_role: str = Field(default="", max_length=200)
    seniority: str = Field(default="", pattern=_SENIORITY)
    user_years_experience: int = Field(default=0, ge=0, le=60)
    min_salary: int | None = Field(default=None, ge=0)
    salary_currency: str = Field(default="USD", max_length=8)
    max_required_experience: int | None = Field(default=None, ge=0, le=60)
    open_to_relocate: bool = False
    visa_needed: bool = False
    locations: list[str] = Field(default_factory=list, max_length=30)
    modalities: list[str] = Field(default_factory=list, max_length=5)
    technologies: list[str] = Field(default_factory=list, max_length=80)
    industries: list[str] = Field(default_factory=list, max_length=30)
    desired_companies: list[str] = Field(default_factory=list, max_length=50)
    blocked_companies: list[str] = Field(default_factory=list, max_length=50)
    languages: list[str] = Field(default_factory=list, max_length=10)
    deal_breakers: list[str] = Field(default_factory=list, max_length=30)


class SearchProfileOut(SearchProfileIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class EvaluateRequest(BaseModel):
    job_posting: str = Field(min_length=30, max_length=15000)


class ScoreBreakdown(BaseModel):
    requisitos_obligatorios: int
    requisitos_deseables: int
    ubicacion_modalidad: int
    seniority: int
    idioma: int
    keywords_ats: int


class EvaluateOut(BaseModel):
    score: int                       # 0-100
    verdict: str                     # apply | maybe | avoid
    breakdown: ScoreBreakdown
    deal_breakers: list[str]         # razones DURAS por las que no aplicar
    reasons_avoid: list[str]         # "¿por qué NO deberías aplicar?"
    reasons_apply: list[str]         # lo que sí cumples
    company: str
    role: str
