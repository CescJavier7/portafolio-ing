"""
services/health_service.py

El "sensor" del backend: sondea cada integración crítica (BD, Redis, Groq) y
reporta su estado. Diseño:
- **Sanitizado**: al cliente solo va ok/down/degraded + latencia; el detalle del
  error (que podría filtrar infra) se queda en los logs del servidor.
- **Acotado en tiempo**: cada sondeo tiene timeout corto para que el health nunca
  cuelgue (un monitor lo llama seguido).
- **Severidad**: la BD es CRÍTICA (si cae → down); Redis/Groq son degradaciones
  (el sitio sigue en pie, pero rate-limit/IA fallan) → degraded.
"""
import time
from typing import Any, Awaitable, Callable

from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import engine

settings = get_settings()


# ── Sondeos individuales (lanzan excepción si fallan) ──────────────────

async def _probe_db() -> str:
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return "conectada"


async def _probe_redis() -> str:
    import redis.asyncio as aredis  # lazy

    client = aredis.from_url(settings.REDIS_URL, socket_connect_timeout=3, socket_timeout=3)
    try:
        await client.ping()
        return "conectado"
    finally:
        await client.aclose()


def _probe_groq_sync() -> str:
    """SÍNCRONO (SDK de Groq): valida la key Y que exista al menos un modelo de la
    cadena de fallback. Cliente con timeout corto (no el de 75s de generación)."""
    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY ausente")
    from groq import Groq

    from app.services.cv_service import _model_chain

    client = Groq(api_key=settings.GROQ_API_KEY, max_retries=0, timeout=8.0)
    available = {m.id for m in client.models.list().data}
    chain = _model_chain()
    usable = [m for m in chain if m in available]
    if not usable:
        raise RuntimeError(f"ningún modelo de la cadena está disponible: {chain}")
    return f"{usable[0]} disponible"


# ── Orquestación ───────────────────────────────────────────────────────

async def _timed_async(name: str, critical: bool, fn: Callable[[], Awaitable[str]]) -> dict[str, Any]:
    t0 = time.perf_counter()
    try:
        detail = await fn()
        return {"name": name, "status": "ok", "critical": critical, "latency_ms": round((time.perf_counter() - t0) * 1000), "detail": detail}
    except Exception as exc:  # noqa: BLE001
        print(f"[health] {name} DOWN: {type(exc).__name__}: {str(exc)[:200]}")
        return {"name": name, "status": "down", "critical": critical, "latency_ms": round((time.perf_counter() - t0) * 1000), "detail": "unreachable"}


async def _timed_sync(name: str, critical: bool, fn: Callable[[], str]) -> dict[str, Any]:
    from fastapi.concurrency import run_in_threadpool

    t0 = time.perf_counter()
    try:
        detail = await run_in_threadpool(fn)
        return {"name": name, "status": "ok", "critical": critical, "latency_ms": round((time.perf_counter() - t0) * 1000), "detail": detail}
    except Exception as exc:  # noqa: BLE001
        print(f"[health] {name} DOWN: {type(exc).__name__}: {str(exc)[:200]}")
        return {"name": name, "status": "down", "critical": critical, "latency_ms": round((time.perf_counter() - t0) * 1000), "detail": "unreachable"}


async def run_health_checks() -> dict[str, Any]:
    """Corre todos los sondeos y agrega el estado global."""
    checks = [
        await _timed_async("database", True, _probe_db),
        await _timed_async("redis", False, _probe_redis),
        await _timed_sync("groq", False, _probe_groq_sync),
    ]

    critical_down = any(c["status"] == "down" and c["critical"] for c in checks)
    any_down = any(c["status"] == "down" for c in checks)
    overall = "down" if critical_down else ("degraded" if any_down else "ok")

    return {
        "status": overall,
        "service": "sentra-api",
        "checks": checks,
        # Config no-secreta útil para diagnosticar integraciones (no expone valores).
        "config": {
            "groq_model": settings.GROQ_CV_MODEL,
            "groq_key_set": bool(settings.GROQ_API_KEY),
            "payphone_enabled": settings.payphone_enabled,
            "email_enabled": bool(getattr(settings, "RESEND_API_KEY", "")),
        },
    }
