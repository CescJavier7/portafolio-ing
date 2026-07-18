"""
api/v1/billing.py

El endpoint de webhook es el más sensible de todo el servicio: cualquiera
puede intentar golpearlo desde internet haciéndose pasar por Stripe. Por
eso:
1. Leemos el body como bytes CRUDOS (`await request.body()`), antes de
   que nada lo parsee como JSON — la firma se calcula sobre los bytes
   exactos que Stripe envió.
2. `verify_and_parse_webhook` valida la firma con el secreto del webhook.
   Si no coincide, lanza excepción y respondemos 400 sin procesar nada.
3. Idempotencia: guardamos `event.id` procesados. Stripe reintenta
   eventos si no respondemos 200 a tiempo, y sin este check podríamos
   aplicar el mismo cambio de suscripción dos veces.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import stripe

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User
from app.services.stripe_service import create_checkout_session, verify_and_parse_webhook

router = APIRouter(prefix="/billing", tags=["billing"])

# TODO: mover a una tabla `processed_webhook_events` en Postgres.
# Un set en memoria NO sobrevive un restart ni funciona con >1 réplica.
# Suficiente para validar el flujo ahora; hay que reemplazarlo antes de
# escalar horizontalmente la API.
_processed_event_ids: set[str] = set()


@router.post("/checkout-session")
async def create_checkout(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    org = await db.get(Organization, current_user.organization_id)
    if org is None or org.stripe_customer_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organización sin customer de Stripe.")

    checkout_url = create_checkout_session(org.stripe_customer_id, str(org.id))
    return {"checkout_url": checkout_url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    if not signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falta firma de Stripe.")

    try:
        event = verify_and_parse_webhook(payload, signature)
    except stripe.error.SignatureVerificationError:
        # No dar detalle del motivo exacto: evita ayudar a un atacante a
        # calibrar cómo forjar la firma.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firma inválida.")

    if event.id in _processed_event_ids:
        return {"received": True, "idempotent_skip": True}
    _processed_event_ids.add(event.id)

    data = event.data.object
    organization_id = data.get("metadata", {}).get("organization_id") or data.get("client_reference_id")

    if event.type in ("customer.subscription.updated", "customer.subscription.created"):
        if organization_id:
            org = await db.get(Organization, organization_id)
            if org:
                org.stripe_subscription_id = data.get("id")
                org.subscription_status = data.get("status")
                org.plan = "PRO" if data.get("status") == "active" else org.plan
                await db.commit()

    elif event.type == "customer.subscription.deleted":
        if organization_id:
            org = await db.get(Organization, organization_id)
            if org:
                org.plan = "FREE"
                org.subscription_status = "canceled"
                await db.commit()

    # Otros eventos (invoice.payment_failed, etc.) se agregan aquí según
    # los necesites — no hace falta manejar todos desde el día uno.

    return {"received": True}