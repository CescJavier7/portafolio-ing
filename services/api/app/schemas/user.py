import uuid

from pydantic import BaseModel, EmailStr, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    role: str
    organization_id: uuid.UUID
    email_verified: bool
    # Plan de la organización, para que el frontend muestre el avatar Pro,
    # gates de features, etc. sin una llamada extra.
    plan: str = "FREE"