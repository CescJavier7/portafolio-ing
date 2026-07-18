"""
services/stripe_service.py

Reglas de seguridad clave en pagos:
1. NUNCA tocamos datos de tarjeta: Stripe Checkout hostea el formulario.
   Esto nos saca del alcance de PCI-DSS casi por completo.
2. El webhook SIEMPRE se verifica con la firma (`Stripe-Signature`) usando
   el body crudo (bytes), antes de parsear JSON. Si alguien golpea el
   endpoint del webhook sin la firma correcta, se rechaza sin procesar nada.
3. Idempotencia: cada evento de Stripe trae un `id` único. Si Stripe
   reintenta el mismo evento (pasa seguido), no debe duplicar efectos
   (ej. no sumar dos veces una suscripción). Ver nota en el router.
"""
import stripe

from app.core.config import get_settings

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY


def create_stripe_customer(email: str, organization_id: str) -> str:
    customer = stripe.Customer.create(
        email=email,
        metadata={"organization_id": organization_id},
    )
    return customer.id


def create_checkout_session(customer_id: str, organization_id: str) -> str:
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": settings.STRIPE_PRICE_ID_PRO, "quantity": 1}],
        success_url="https://sentinel.cescjavier.dev/billing/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url="https://sentinel.cescjavier.dev/billing/cancelled",
        metadata={"organization_id": organization_id},
        # Evita que un customer_id ajeno se use para pagar una org que no es la suya
        client_reference_id=organization_id,
    )
    return session.url


def verify_and_parse_webhook(payload: bytes, signature_header: str) -> stripe.Event:
    # Lanza stripe.error.SignatureVerificationError si la firma no coincide.
    # NO capturamos esa excepción aquí: debe propagarse para que el router
    # responda 400 y Stripe no reintente un evento inválido/malicioso.
    return stripe.Webhook.construct_event(
        payload, signature_header, settings.STRIPE_WEBHOOK_SECRET
    )