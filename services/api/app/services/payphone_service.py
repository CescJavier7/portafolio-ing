"""
services/payphone_service.py

PayPhone «Botón de Pago por redirección» (Ecuador): la pasarela que SÍ nos
aceptó (Lemon Squeezy y Kushki rechazaron la cuenta). Igual que un checkout
hosteado, PayPhone aloja el formulario de tarjeta → NUNCA tocamos datos de
tarjeta (nos saca del alcance de PCI-DSS).

Flujo (2 llamadas, ambas con Bearer token de la aplicación):
  1. Prepare → creamos la intención de pago y obtenemos las URLs de checkout.
  2. Confirm → tras pagar, PayPhone redirige a nuestra Url de respuesta con
     (id, clientTransactionId); confirmamos aquí y, si viene "Approved",
     activamos el plan.
  ⚠️ Si NO se confirma en los primeros 5 min, PayPhone REVIERTE el pago solo.

Montos: SIEMPRE en centavos (enteros). $10 = 1000. Debe cumplirse
  amount == amountWithoutTax + amountWithTax + tax + service + tip.
Contrato: https://docs.payphone.app/boton-de-pago-por-redireccion
"""
import requests

from app.core.config import get_settings

settings = get_settings()


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.PAYPHONE_TOKEN}",
        "Content-Type": "application/json",
    }


def prepare_payment(*, amount_cents: int, client_tx_id: str, reference: str) -> dict:
    """
    Crea la intención de pago. Devuelve el JSON de PayPhone:
    {paymentId, payWithPayPhone, payWithCard}. Metemos todo el monto en
    `amountWithoutTax` (sin desglose de IVA) para el caso simple.
    """
    payload = {
        "amount": amount_cents,
        "amountWithoutTax": amount_cents,
        "amountWithTax": 0,
        "tax": 0,
        "service": 0,
        "tip": 0,
        "currency": "USD",
        "clientTransactionId": client_tx_id,
        "storeId": settings.PAYPHONE_STORE_ID,
        "reference": reference,
        "responseUrl": settings.PAYPHONE_RESPONSE_URL,
    }
    resp = requests.post(f"{settings.PAYPHONE_API_BASE}/Prepare", json=payload, headers=_headers(), timeout=15)
    if not resp.ok:
        # El body dice el motivo REAL (token inválido, storeId incorrecto,
        # monto mal cuadrado...). Sin esto solo veríamos "400/401".
        raise RuntimeError(f"PayPhone Prepare falló: HTTP {resp.status_code} — {resp.text[:400]}")
    return resp.json()


def confirm_payment(*, transaction_id: int, client_tx_id: str) -> dict:
    """
    Confirma el pago. OJO: el campo se llama `clientTxId` (no
    `clientTransactionId`) en la confirmación. Devuelve, entre otros:
    transactionStatus ("Approved"/"Canceled"), statusCode (3=aprobada), amount.
    """
    payload = {"id": transaction_id, "clientTxId": client_tx_id}
    resp = requests.post(f"{settings.PAYPHONE_API_BASE}/V2/Confirm", json=payload, headers=_headers(), timeout=15)
    if not resp.ok:
        raise RuntimeError(f"PayPhone Confirm falló: HTTP {resp.status_code} — {resp.text[:400]}")
    return resp.json()
