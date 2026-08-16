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
    # Asignación de carpeta. Distinguimos "no tocar" (campo ausente) de "quitar
    # de la carpeta" (folder_id = null explícito) con un flag aparte.
    folder_id: uuid.UUID | None = None
    set_folder: bool = False  # True → aplicar folder_id (incluido null para quitar)


class CVFolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class CVMoveRequest(BaseModel):
    # Mover un CV a una carpeta (o sacarlo con folder_id=null). Endpoint PATCH
    # dedicado: semántica clara ("cambiar solo la carpeta"), sin arrastrar
    # content/title como el PUT.
    folder_id: uuid.UUID | None = None


class CVFolderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    created_at: datetime


class CVImproveRequest(BaseModel):
    # El CV ACTUAL (posiblemente ya editado a mano en la vista previa). El LLM
    # lo reescribe para subir el match, incorporando las sugerencias. Cuenta
    # como 1 generación nueva (consume crédito).
    content: dict


# ── Estructura del CV que devuelve el LLM (validación de su salida) ──

class CVExperienceItem(BaseModel):
    role: str = ""
    company: str = ""
    period: str = ""
    highlights: list[str] = []


class CVContact(BaseModel):
    # Datos de contacto de la cabecera (los pone el sistema desde el perfil, no
    # el LLM en la fase de adaptación). Cadena vacía si el perfil no los trae.
    location: str = ""
    email: str = ""
    phone: str = ""
    website: str = ""


class CVContent(BaseModel):
    # Se valida la salida del LLM contra esto: si devuelve basura, falla
    # ruidosamente en el router (500 controlado) en vez de guardar un CV roto.
    full_name: str = ""
    headline: str = ""
    contact: CVContact = Field(default_factory=CVContact)
    summary: str = ""
    experience: list[CVExperienceItem] = []
    education: list[str] = []
    skills: list[str] = []
    languages: list[str] = []
    match_score: int = 0            # % de requisitos cubiertos (0-100)
    missing_requirements: list[str] = []  # requisitos de la oferta NO cubiertos
    # Sugerencias accionables para subir el match. `tips` se mantiene como alias
    # retrocompatible (CVs viejos lo traían); el prompt ahora puebla ambos igual.
    actionable_suggestions: list[str] = []
    tips: list[str] = []


# ── Salida ────────────────────────────────────────────────────────────

class CVDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    job_posting: str
    content: dict
    match_score: int
    folder_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class CVListItem(BaseModel):
    # Versión ligera para el listado (sin el content completo ni la oferta).
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    match_score: int
    folder_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class OCRResult(BaseModel):
    text: str


class ApplyEmailOut(BaseModel):
    # Correo de postulación redactado por el LLM. `recipient` sale por regex
    # de la oferta (si trae un email); puede quedar vacío y lo pone el usuario.
    subject: str
    body: str
    recipient: str = ""
