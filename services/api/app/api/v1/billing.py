"""
api/v1/billing.py

El endpoint de webhook es el más sensible de todo el servicio: cualquiera
puede intentar golpearlo desde internet haciéndose pasar por Lemon Squeezy.
Por eso:
1. Leemos el body como bytes CRUDOS (`await request.body()`), antes de que
   nada lo parsee como JSON — la firma se calcula sobre los bytes exactos
   que Lemon Squeezy envió.
2. `verify_webhook_signature` valida el HMAC con el secreto del webhook.
   Si no coincide, respondemos 400 sin procesar nada.
3. Idempotencia: guardamos una clave derivada del evento procesado. Lemon
   Squeezy reintenta si no respondemos 200 a tiempo, y sin este check
   podríamos aplicar el mismo cambio de suscripción dos veces.
"""
import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User
from app.services.lemonsqueezy_service import create_checkout_url, verify_webhook_signature

router = APIRouter(prefix="/billing", tags=["billing"])

# TODO: mover a una tabla `processed_webhook_events` en Postgres.
# Un set en memoria NO sobrevive un restart ni funciona con >1 réplica.
# Suficiente para validar el flujo ahora; hay que reemplazarlo antes de
# escalar horizontalmente la API.
_processed_event_ids: set[str] = set()


@router.get("/subscription")
async def get_subscription(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    org = await db.get(Organization, current_user.organization_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organización no encontrada.")
    return {
        "plan": org.plan,
        "subscription_status": org.subscription_status,
    }


@router.post("/checkout-session")
async def create_checkout(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    org = await db.get(Organization, current_user.organization_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organización no encontrada.")

    # A diferencia de Stripe, no necesitamos un customer_id remoto de
    # antemano: Lemon Squeezy crea/asocia el customer al completar el pago.
    try:
        checkout_url = create_checkout_url(current_user.email, str(org.id))
    except Exception as exc:
        # HTTPException (no excepción cruda): así la respuesta pasa por los
        # handlers de FastAPI y SÍ lleva headers CORS — un 500 sin manejar
        # sale sin ellos y el navegador lo disfraza de "error de CORS".
        print(f"[BILLING] Fallo creando checkout para org {org.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El proveedor de pagos no aceptó la solicitud. Inténtalo más tarde.",
        )
    return {"checkout_url": checkout_url}


@router.post("/webhook")
async def lemonsqueezy_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    signature = request.headers.get("x-signature")

    if not verify_webhook_signature(payload, signature):
        # No dar detalle del motivo exacto: evita ayudar a un atacante a
        # calibrar cómo forjar la firma.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firma inválida.")

    event = json.loads(payload)
    event_name = event.get("meta", {}).get("event_name")
    data = event.get("data", {})
    attributes = data.get("attributes", {})

    # `data.id` + evento + `updated_at` como clave de idempotencia: el mismo
    # recurso puede repetirse en varios eventos, pero updated_at cambia en
    # cada transición de estado real.
    event_key = f"{data.get('id')}:{event_name}:{attributes.get('updated_at')}"
    if event_key in _processed_event_ids:
        return {"received": True, "idempotent_skip": True}
    _processed_event_ids.add(event_key)

    organization_id = event.get("meta", {}).get("custom_data", {}).get("organization_id")

    if event_name in ("subscription_created", "subscription_updated"):
        if organization_id:
            org = await db.get(Organization, organization_id)
            if org:
                org.lemonsqueezy_customer_id = str(attributes.get("customer_id"))
                org.lemonsqueezy_subscription_id = str(data.get("id"))
                subscription_status = attributes.get("status")
                org.subscription_status = subscription_status
                org.plan = "PRO" if subscription_status == "active" else org.plan
                await db.commit()

    elif event_name in ("subscription_cancelled", "subscription_expired"):
        if organization_id:
            org = await db.get(Organization, organization_id)
            if org:
                org.plan = "FREE"
                org.subscription_status = attributes.get("status", "cancelled")
                await db.commit()

    # Otros eventos (order_created, subscription_payment_failed, etc.) se
    # agregan aquí según los necesites — no hace falta manejar todos desde
    # el día uno.

    return {"received": True}
