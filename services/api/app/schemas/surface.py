import uuid
from datetime import datetime

from pydantic import BaseModel


class SubdomainOut(BaseModel):
    name: str
    ip: str


class PortOut(BaseModel):
    port: int
    service: str
    risk: str  # alta | media | baja


class SurfaceResult(BaseModel):
    domain: str
    subdomains: list[SubdomainOut]
    ports: list[PortOut]
    technologies: list[str]
    # Presentes cuando el resultado viene de un snapshot persistido (siempre,
    # desde que existe la tabla); None solo sería posible en datos legacy.
    id: uuid.UUID | None = None
    created_at: datetime | None = None
