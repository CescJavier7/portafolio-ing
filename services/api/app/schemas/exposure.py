from pydantic import BaseModel


class ExposureReference(BaseModel):
    framework: str
    ref: str
    title: str


class ExposureRoute(BaseModel):
    id: str
    title: str
    severity: str  # critica | alta | media | baja
    evidence: list[str]
    impact: str
    recommendation: str
    references: list[ExposureReference] = []


class ExposureResult(BaseModel):
    domain: str
    routes: list[ExposureRoute]
    counts: dict[str, int]  # conteo por severidad
