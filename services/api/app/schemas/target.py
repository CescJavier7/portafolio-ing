import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

# Un FQDN válido: etiquetas alfanuméricas (con guiones internos) separadas
# por puntos, al menos un punto (TLD). No exhaustivo con IDN/punycode, pero
# suficiente para el MVP y evita basura obvia.
_DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$"
)


class TargetCreate(BaseModel):
    domain: str

    @field_validator("domain")
    @classmethod
    def normalize_domain(cls, v: str) -> str:
        d = v.strip().lower()
        # Quitar esquema y path si el usuario pegó una URL completa.
        d = re.sub(r"^https?://", "", d)
        d = d.split("/")[0]
        # Quitar www. y puerto.
        d = d.removeprefix("www.")
        d = d.split(":")[0]
        if not _DOMAIN_RE.match(d):
            raise ValueError("Dominio inválido. Ejemplo válido: midominio.com")
        return d


class TargetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    domain: str
    verified: bool
    verified_at: datetime | None
    created_at: datetime
    monitoring_enabled: bool = False


class MonitoringUpdate(BaseModel):
    enabled: bool


class TargetCreatedOut(TargetOut):
    # Solo al crear (o al pedir instrucciones): qué registro TXT publicar.
    dns_record_name: str
    dns_record_value: str


class VerifyResultOut(BaseModel):
    verified: bool
    detail: str
