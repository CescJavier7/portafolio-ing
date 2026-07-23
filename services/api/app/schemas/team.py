import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TeamMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str | None
    role: str
    email_verified: bool
    created_at: datetime


class TeamInviteCreate(BaseModel):
    email: EmailStr
    role: str = Field(pattern="^(ADMIN|ANALYST|MEMBER)$")


class TeamRoleUpdate(BaseModel):
    role: str = Field(pattern="^(ADMIN|ANALYST|MEMBER)$")


class TeamInviteAccept(BaseModel):
    token: str
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)
