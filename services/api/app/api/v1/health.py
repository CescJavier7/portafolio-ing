"""
api/v1/health.py

Endpoint detallado del "sensor". Distinto del `/health` raíz (liveness simple que
usa Traefik/Cloudflare): este sondea BD, Redis y Groq y reporta el estado de cada
integración. Público pero SANITIZADO (solo ok/down + latencia, sin detalle de
error) y rate-limited. Código HTTP: 200 si ok/degraded, 503 solo si algo CRÍTICO
cayó (así un monitor externo puede alertar, y Cloudflare no rompe los 200).
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.core.rate_limit import limiter
from app.services.health_service import run_health_checks

router = APIRouter(tags=["health"])


@router.get("/health")
@limiter.limit("60/minute")
async def health_deep(request: Request):
    result = await run_health_checks()
    return JSONResponse(content=result, status_code=200 if result["status"] != "down" else 503)
