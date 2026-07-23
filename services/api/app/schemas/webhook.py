import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

ALLOWED_EVENT_TYPES = {"scan_completed", "monitoring_alert", "exposure_alert"}


class WebhookCreate(BaseModel):
    url: HttpUrl
    event_types: list[str] = Field(min_length=1)


class WebhookToggle(BaseModel):
    enabled: bool


class WebhookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    event_types: list[str]
    enabled: bool
    last_triggered_at: datetime | None
    last_status_code: int | None
    created_at: datetime


class WebhookCreatedOut(WebhookOut):
    # SOLO se devuelve en la respuesta de creación/regeneración. A
    # diferencia de una API key, el secret SÍ se guarda recuperable en DB
    # (ver models/webhook.py), pero la API igual lo trata como show-once
    # para minimizar la ventana en la que viaja por la red/frontend.
    secret: str
