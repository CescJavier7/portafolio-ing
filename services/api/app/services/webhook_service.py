"""
services/webhook_service.py

Entrega de webhooks salientes. Cada organización puede registrar N webhooks
(límite según su plan, ver core/plans.py) suscritos a uno o más
`event_types`. Cada entrega se firma con HMAC-SHA256 sobre el body JSON
crudo (header `X-Sentra-Signature`) usando el `secret` guardado en texto
plano en la fila (ver models/webhook.py para el porqué) — el receptor debe
poder recalcular la misma firma para verificar autenticidad, igual que
hace Lemon Squeezy con nosotros en el sentido inverso.

Los fallos de entrega NUNCA deben tumbar el flujo que los dispara (un scan,
una alerta de monitoreo): todo aquí es best-effort, con timeout corto y
excepciones capturadas. El POST en sí es bloqueante (requests), por eso se
ejecuta en threadpool — mismo patrón que scan_domain/discover_surface.
"""
import hashlib
import hmac
import json
from datetime import datetime, timezone

import requests
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.webhook import Webhook

DELIVERY_TIMEOUT = 5  # segundos — un endpoint lento del cliente no debe frenar el request que dispara el evento


def _sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _deliver(url: str, secret: str, body: bytes, event_type: str) -> int | None:
    try:
        response = requests.post(
            url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-Sentra-Signature": _sign(secret, body),
                "X-Sentra-Event": event_type,
            },
            timeout=DELIVERY_TIMEOUT,
        )
        return response.status_code
    except Exception as exc:
        print(f"[WEBHOOK] Fallo entregando {event_type} a {url}: {exc}")
        return None


async def trigger_webhooks(db: AsyncSession, organization_id, event_type: str, data: dict) -> None:
    result = await db.execute(
        select(Webhook).where(Webhook.organization_id == organization_id, Webhook.enabled.is_(True))
    )
    hooks = [w for w in result.scalars().all() if event_type in (w.event_types or [])]
    if not hooks:
        return

    # default=str: los payloads suelen llevar datetimes (scanned_at, etc.),
    # y json.dumps no los serializa por defecto.
    body = json.dumps({"event": event_type, "data": data}, default=str).encode()

    for hook in hooks:
        status_code = await run_in_threadpool(_deliver, hook.url, hook.secret, body, event_type)
        hook.last_triggered_at = datetime.now(timezone.utc)
        hook.last_status_code = status_code

    await db.commit()
