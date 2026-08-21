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
    country: str = Field(default="", max_length=40)  # hint para el umbral de sueldo


class FirewallRequest(BaseModel):
    """Escaneo anti-estafa standalone (sin IA, sin gastar cuota)."""
    job_posting: str = Field(min_length=10, max_length=15000)
    country: str = Field(default="", max_length=40)


class CapturedOfferIn(BaseModel):
    """Oferta capturada desde la extensión ('Añadir a Sentra')."""
    text: str = Field(min_length=20, max_length=15000)
    source_url: str | None = Field(default=None, max_length=500)
    title: str | None = Field(default=None, max_length=300)


class CapturedOfferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    text: str
    source_url: str | None
    title: str | None
    created_at: datetime


class InsightItem(BaseModel):
    code: str                        # good_momentum | low_response | ... (i18n en frontend)
    level: str                       # good | warn | info
    value: int


class FunnelCounts(BaseModel):
    saved: int
    applied: int
    interview: int
    offer: int
    rejected: int


class InsightsOut(BaseModel):
    """Diagnóstico de la búsqueda (Learning Loop). Solo agregados, sin PII."""
    total: int
    funnel: FunnelCounts
    applied: int
    response_rate: float
    interview_rate: float
    offer_rate: float
    avg_score: float | None
    avg_score_positive: float | None
    avg_score_rejected: float | None
    applied_last_7d: int
    applied_last_30d: int
    last_activity_days: int | None
    insights: list[InsightItem]


class ScoreBreakdown(BaseModel):
    requisitos_obligatorios: int
    requisitos_deseables: int
    ubicacion_modalidad: int
    seniority: int
    idioma: int
    keywords_ats: int


class FirewallFlag(BaseModel):
    code: str                        # advance_fee | crypto_payment | ... (i18n en frontend)
    severity: str                    # high | medium | low
    matched: str = ""                # fragmento que disparó la señal (evidencia)


class FirewallResult(BaseModel):
    risk_level: str                  # safe | caution | danger
    risk_score: int                  # 0-100 (mayor = más riesgo)
    flags: list[FirewallFlag]
    country: str = ""                # código de país usado para el umbral de sueldo


class DuplicateMatch(BaseModel):
    company: str
    role: str
    status: str
    similarity: int                  # 0-100


class Personalization(BaseModel):
    """Ajuste del score aprendido del historial del usuario (Learning Loop)."""
    active: bool                     # ¿había señal suficiente para personalizar?
    delta: int                       # ajuste aplicado al score (± acotado)
    reasons: list[str]               # explicación transparente del ajuste
    n_outcomes: int                  # cuántos resultados (entrevista/oferta/rechazo) lo respaldan


class EvaluateOut(BaseModel):
    score: int                       # 0-100
    verdict: str                     # apply | maybe | avoid
    breakdown: ScoreBreakdown
    deal_breakers: list[str]         # razones DURAS por las que no aplicar
    reasons_avoid: list[str]         # "¿por qué NO deberías aplicar?"
    reasons_apply: list[str]         # lo que sí cumples
    company: str
    role: str
    firewall: FirewallResult         # Application Firewall (detección de estafas)
    duplicate: DuplicateMatch | None = None  # Duplicate Killer (ya aplicaste algo similar)
    personalization: Personalization | None = None  # ajuste aprendido del historial
