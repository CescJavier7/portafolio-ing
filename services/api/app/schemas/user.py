import uuid

from pydantic import BaseModel, EmailStr, ConfigDict, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    name: str | None = None
    role: str
    organization_id: uuid.UUID
    organization_name: str | None = None
    email_verified: bool
    # Plan de la organización, para que el frontend muestre el avatar Pro,
    # gates de features, etc. sin una llamada extra.
    plan: str = "FREE"


class ProfileUpdate(BaseModel):
    # Ambos opcionales: el frontend manda solo lo que cambió. None = no tocar.
    name: str | None = Field(default=None, max_length=120)
    organization_name: str | None = Field(default=None, min_length=2, max_length=120)