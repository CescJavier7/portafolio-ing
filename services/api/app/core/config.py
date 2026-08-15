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

    # ── Stripe - Reemplazado por Lemonsqueezy ───────────────────────────────────────────────
    LEMONSQUEEZY_API_KEY: str
    LEMONSQUEEZY_STORE_ID: str
    LEMONSQUEEZY_VARIANT_ID_PRO: str
    LEMONSQUEEZY_WEBHOOK_SECRET: str

    # ── Email (Resend — mismo dominio/key que usa el portafolio) ──
    RESEND_API_KEY: str
    EMAIL_FROM: str = "Sentra <admin@cescjavier.dev>"
    # Base del link de verificación que va en el correo. Apunta a la propia
    # API por ahora; cuando exista el frontend de Sentra, cambiar aquí para
    # que el link aterrice en una página bonita que llame a la API.
    VERIFY_URL_BASE: str = "https://api.cescjavier.dev/api/v1/auth/verify-email"
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24

    # Invitación de equipo: a diferencia de la verificación de email, esta SÍ
    # apunta al FRONTEND (necesita un formulario — nombre + contraseña — no
    # un simple GET), no a la propia API.
    INVITE_ACCEPT_URL_BASE: str = "https://cescjavier.dev/es/sentinel/accept-invite"
    INVITE_EXPIRE_HOURS: int = 72

    # ── Groq (LLM para el generador de CV) ──────────────────────
    # Opcional a nivel de arranque (default vacío) para no tumbar la API si
    # aún no se configuró en el .env del VPS. El endpoint de CV valida su
    # presencia y responde 503 si falta, en vez de reventar el servicio entero.
    GROQ_API_KEY: str = ""
    GROQ_CV_MODEL: str = "llama-3.3-70b-versatile"

    # ── Monitoreo continuo ──────────────────────────────────────
    # Secreto que protege el endpoint /internal/run-monitoring (lo dispara
    # un cron del VPS, no un usuario). Vacío = monitoreo deshabilitado
    # (el endpoint responde 503). Se compara con hmac.compare_digest.
    MONITORING_INTERNAL_SECRET: str = ""

    # ── CORS ─────────────────────────────────────────────────
    # www incluido: Traefik sirve el sitio en ambos hosts y el navegador
    # manda el Origin exacto. localhost:3000 para desarrollo del frontend.
    ALLOWED_ORIGINS: list[str] = [
        "https://sentinel.cescjavier.dev",
        "https://cescjavier.dev",
        "https://www.cescjavier.dev",
        "http://localhost:3000",
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