"""
services/lemonsqueezy_service.py

Lemon Squeezy es Merchant of Record: ellos son el vendedor legal ante el
cliente final y manejan impuestos/IVA globalmente — por eso no hace falta
tener RUC/empresa propia para vender. A diferencia de Stripe, no creamos un
"customer" remoto de antemano: el Checkout hosteado lo crea/asocia solo
cuando la persona paga, y nosotros lo enlazamos a la Organization leyendo
el webhook.

Reglas de seguridad clave en pagos:
1. NUNCA tocamos datos de tarjeta: el Checkout de Lemon Squeezy hostea el
   formulario. Nos saca del alcance de PCI-DSS casi por completo.
2. El webhook SIEMPRE se verifica con la firma (`X-Signature`, HMAC-SHA256
   sobre el body crudo) antes de parsear JSON. Sin firma válida, se
   rechaza sin procesar nada.
3. Idempotencia: ver nota en el router (billing.py).
"""
import hashlib
import hmac

import requests

from app.core.config import get_settings

settings = get_settings()

API_BASE = "https://api.lemonsqueezy.com/v1"


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.LEMONSQUEEZY_API_KEY}",
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json",
    }


def create_checkout_url(email: str, organization_id: str) -> str:
    """
    `custom` viaja de ida y vuelta: Lemon Squeezy lo devuelve intacto en
    `meta.custom_data` del webhook, así sabemos a qué Organization
    pertenece el pago sin haber creado un customer remoto de antemano.
    """
    payload = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_data": {
                    "email": email,
                    "custom": {"organization_id": organization_id},
                },
                "product_options": {
                    "redirect_url": "https://sentinel.cescjavier.dev/billing/success",
                },
            },
            "relationships": {
                "store": {"data": {"type": "stores", "id": settings.LEMONSQUEEZY_STORE_ID}},
                "variant": {"data": {"type": "variants", "id": settings.LEMONSQUEEZY_VARIANT_ID_PRO}},
            },
        }
    }

    response = requests.post(f"{API_BASE}/checkouts", json=payload, headers=_headers(), timeout=10)
    if not response.ok:
        # El body de error de LS dice exactamente por qué rechazó (API key
        # inválida, variante pending, cuenta en revisión...). Sin esto, el
        # log solo diría "400/401 Client Error" y a adivinar.
        raise RuntimeError(
            f"Lemon Squeezy rechazó el checkout: HTTP {response.status_code} — {response.text[:500]}"
        )
    return response.json()["data"]["attributes"]["url"]


def verify_webhook_signature(payload: bytes, signature_header: str | None) -> bool:
    """
    Lemon Squeezy firma el body crudo con HMAC-SHA256 usando el secreto del
    webhook y lo manda en el header `X-Signature` como hex digest.
    `hmac.compare_digest` evita timing attacks al comparar.
    """
    if not signature_header:
        return False

    digest = hmac.new(
        settings.LEMONSQUEEZY_WEBHOOK_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(digest, signature_header)
