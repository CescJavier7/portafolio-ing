"""
core/config.py

Toda la configuración sensible vive en variables de entorno (12-Factor App).
Pydantic Settings valida tipos y longitudes al arrancar: si falta o está mal
un secreto, la app NO levanta. Preferible a un fallo silencioso en producción.
"""
from functools import lru_cache
# FIX: Importamos computed_field aquí arriba
from pydantic import Field, field_validator, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Entorno ──────────────────────────────────────────────
    ENVIRONMENT: str = "development"  # "development" | "production"

    # ── Base de datos ────────────────────────────────────────
    DATABASE_URL: str

    # ── JWT ──────────────────────────────────────────────────
    JWT_SECRET: str = Field(min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15   
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Stripe ───────────────────────────────────────────────
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    STRIPE_PRICE_ID_PRO: str  

    # ── CORS ─────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "https://sentinel.cescjavier.dev",
        "https://cescjavier.dev",
    ]

    # ── Redis (rate limiting) ────────────────────────────────
    REDIS_URL: str = "redis://redis:6379/1"

    # ── Cookies ──────────────────────────────────────────────
    COOKIE_DOMAIN: str = ".cescjavier.dev"  

    @field_validator("JWT_SECRET")
    @classmethod
    def secret_not_placeholder(cls, v: str) -> str:
        if v.lower() in {"changeme", "secret", "your-secret-here"}:
            raise ValueError("JWT_SECRET no puede ser un valor placeholder.")
        return v

    # FIX: Aquí inyectamos la lógica de producción y cookies seguras
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @computed_field
    @property
    def cookie_secure(self) -> bool:
        """
        True en producción (exige HTTPS).
        False en desarrollo (permite HTTP en localhost).
        """
        return self.is_production


@lru_cache
def get_settings() -> Settings:
    # lru_cache: se parsea el .env una sola vez, no en cada request.
    return Settings()

# FIX: Exportamos la instancia global para que Alembic (y el resto de la app) la consuma
settings = get_settings()