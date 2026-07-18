import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    # max_length como tope duro; el mínimo se valida abajo con mensaje en
    # español (Field(min_length=...) daría el mensaje por defecto en inglés).
    password: str = Field(max_length=128)
    organization_name: str = Field(min_length=2, max_length=120)
    # Opt-in explícito: el frontend lo manda solo si el usuario marcó el
    # checkbox. Default False — jamás consentimiento implícito.
    marketing_consent: bool = False

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        # Reglas mínimas razonables (NIST 800-63B ya NO recomienda exigir
        # símbolos/mayúsculas obligatorias — la longitud importa más que
        # la complejidad artificial). Pedimos longitud + al menos un dígito
        # o símbolo, para descartar contraseñas triviales tipo "aaaaaaaaaaaa".
        if len(v) < 12:
            raise ValueError("La contraseña debe tener al menos 12 caracteres.")
        if not re.search(r"[0-9\W]", v):
            raise ValueError("La contraseña debe incluir al menos un número o símbolo.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        # Mismas reglas que el registro (ver RegisterRequest).
        if len(v) < 12:
            raise ValueError("La contraseña debe tener al menos 12 caracteres.")
        if not re.search(r"[0-9\W]", v):
            raise ValueError("La contraseña debe incluir al menos un número o símbolo.")
        return v


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos


class MessageResponse(BaseModel):
    message: str