from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.api_keys import router as api_keys_router
from app.api.v1.auth import router as auth_router
from app.api.v1.billing import router as billing_router
from app.api.v1.internal import router as internal_router
from app.api.v1.public import router as public_router
from app.api.v1.public_free import router as public_free_router
from app.api.v1.targets import router as targets_router
from app.api.v1.team import router as team_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.audit import router as audit_router
from app.core.config import get_settings
from app.core.rate_limit import limiter

settings = get_settings()

# docs/redoc solo en desarrollo: no exponer el esquema de la API en producción.
app = FastAPI(
    title="Sentra API",
    version="0.1.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,  # necesario para que la cookie de refresh viaje cross-origin
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(billing_router, prefix="/api/v1")
app.include_router(targets_router, prefix="/api/v1")
app.include_router(internal_router, prefix="/api/v1")
app.include_router(api_keys_router, prefix="/api/v1")
app.include_router(public_router, prefix="/api/v1")
app.include_router(public_free_router, prefix="/api/v1")
app.include_router(team_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
