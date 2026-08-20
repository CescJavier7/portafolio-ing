import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# Estados del embudo de postulación.
_STATUS = "^(saved|applied|interview|offer|rejected)$"


class ApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=160)
    role: str = Field(min_length=1, max_length=200)
    job_url: str | None = Field(default=None, max_length=500)
    status: str = Field(default="saved", pattern=_STATUS)
    notes: str = Field(default="", max_length=2000)
    cv_document_id: uuid.UUID | None = None
    applied_at: datetime | None = None
    score: int | None = Field(default=None, ge=0, le=100)


class ApplicationUpdate(BaseModel):
    # Todos opcionales: PATCH parcial (típico: cambiar solo el status).
    company: str | None = Field(default=None, min_length=1, max_length=160)
    role: str | None = Field(default=None, min_length=1, max_length=200)
    job_url: str | None = Field(default=None, max_length=500)
    status: str | None = Field(default=None, pattern=_STATUS)
    notes: str | None = Field(default=None, max_length=2000)
    cv_document_id: uuid.UUID | None = None
    applied_at: datetime | None = None


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company: str
    role: str
    job_url: str | None
    status: str
    notes: str
    cv_document_id: uuid.UUID | None
    applied_at: datetime | None
    score: int | None
    created_at: datetime
    updated_at: datetime
