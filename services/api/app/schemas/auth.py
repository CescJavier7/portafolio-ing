import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    organization_name: str = Field(min_length=2, max_length=120)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        # Reglas mínimas razonables (NIST 800-63B ya NO recomienda exigir
        # símbolos/mayúsculas obligatorias — la longitud importa más que
        # la complejidad artificial). Pedimos longitud + al menos un dígito
        # o símbolo, para descartar contraseñas triviales tipo "aaaaaaaaaaaa".
        if not re.search(r"[0-9\W]", v):
            raise ValueError("La contraseña debe incluir al menos un número o símbolo.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos


class MessageResponse(BaseModel):
    message: str