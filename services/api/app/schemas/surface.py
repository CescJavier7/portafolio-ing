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
