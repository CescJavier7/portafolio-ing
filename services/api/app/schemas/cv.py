import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ── Entrada ───────────────────────────────────────────────────────────

class CVGenerateRequest(BaseModel):
    # Título opcional; si no llega, se deriva de la oferta.
    title: str | None = Field(default=None, max_length=200)
    # El CV/experiencia ACTUAL del usuario, en texto libre (pega su CV o lo
    # escribe). El LLM lo estructura y lo adapta a la oferta.
    profile_text: str = Field(min_length=30, max_length=15000)
    # Texto de la oferta (pegado, o extraído por OCR de una foto y revisado
    # por el usuario antes de generar).
    job_posting: str = Field(min_length=30, max_length=15000)


class CVUpdateRequest(BaseModel):
    # El usuario puede corregir el CV generado (edición manual post-IA).
    title: str | None = Field(default=None, max_length=200)
    content: dict | None = None


# ── Estructura del CV que devuelve el LLM (validación de su salida) ──

class CVExperienceItem(BaseModel):
    role: str = ""
    company: str = ""
    period: str = ""
    highlights: list[str] = []


class CVContent(BaseModel):
    # Se valida la salida del LLM contra esto: si devuelve basura, falla
    # ruidosamente en el router (500 controlado) en vez de guardar un CV roto.
    full_name: str = ""
    headline: str = ""
    summary: str = ""
    experience: list[CVExperienceItem] = []
    education: list[str] = []
    skills: list[str] = []
    languages: list[str] = []
    match_score: int = 0            # % de requisitos cubiertos (0-100)
    missing_requirements: list[str] = []  # requisitos de la oferta NO cubiertos
    tips: list[str] = []            # sugerencias para mejorar el match


# ── Salida ────────────────────────────────────────────────────────────

class CVDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    job_posting: str
    content: dict
    match_score: int
    created_at: datetime
    updated_at: datetime


class CVListItem(BaseModel):
    # Versión ligera para el listado (sin el content completo ni la oferta).
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    match_score: int
    created_at: datetime
    updated_at: datetime


class OCRResult(BaseModel):
    text: str
