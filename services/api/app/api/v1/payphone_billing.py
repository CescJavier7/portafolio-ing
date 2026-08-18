"""
api/v1/payphone_billing.py

Cobro con tarjeta AUTOMÁTICO vía PayPhone (Botón de Pago por redirección).
A diferencia de manual_billing (que necesita aprobación del fundador), aquí la
activación es INSTANTÁNEA: se verifica el pago contra PayPhone y se sube el plan.

Reutiliza el modelo PaymentRequest: en /prepare se crea una fila 'pending' con
el clientTransactionId en `reference`; en /confirm se aprueba SOLA si PayPhone
responde "Approved". Anti-doble-cobro: idempotente por el estado de la fila.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.organization import Organization
from app.models.payment_request import PaymentRequest
from app.models.user import User
from app.services import payphone_service
from app.services.subscription import next_period_end

settings = get_settings()
# OJO: el prefijo es "/billing/card" (neutro) a propósito. Si la URL contuviera
# "payphone", los bloqueadores de anuncios/privacidad (Brave Shields, uBlock,
# EasyPrivacy) la bloquean del lado del cliente → el pago fallaría para usuarios
# reales con adblocker. El nombre visible en la UI sí puede decir "PayPhone".
router = APIRouter(prefix="/billing/card", tags=["billing-payphone"])

# Precio en CENTAVOS por plan (PayPhone trabaja con enteros).
_PRICE_CENTS = {"PRO": 1000, "TEAM": 2900}


class PrepareOut(BaseModel):
    pay_url: str
    client_transaction_id: str


class ConfirmIn(BaseModel):
    id: int
    clientTransactionId: str


class ConfirmOut(BaseModel):
    status: str  # 'approved' | 'rejected'
    plan: str | None = None
    message: str | None = None  # motivo de PayPhone si se rechazó (p. ej. banco declinó)


def _guard_enabled() -> None:
    if not settings.payphone_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El pago con tarjeta no está disponible por el momento.",
        )


@router.post("/prepare", response_model=PrepareOut)
@limiter.limit("10/minute")
async def prepare(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Inicia el pago: crea la intención en PayPhone y devuelve la URL de checkout."""
    _guard_enabled()
    plan = "PRO"
    amount = _PRICE_CENTS[plan]
    client_tx_id = f"stra-{uuid.uuid4().hex}"

    # Anula intentos de PayPhone pendientes previos de esta org (evita basura y
    # confusiones de idempotencia si el usuario reintenta el pago).
    existing = await db.execute(
        select(PaymentRequest).where(
            PaymentRequest.organization_id == current_user.organization_id,
            PaymentRequest.method == "payphone",
            PaymentRequest.status == "pending",
        )
    )
    for old in existing.scalars().all():
        old.status = "expired"

    try:
        prep = await run_in_threadpool(
            payphone_service.prepare_payment,
            amount_cents=amount,
            client_tx_id=client_tx_id,
            reference="Sentra Pro",
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[PayPhone] Prepare error (org {current_user.organization_id}): {exc}")
        # 400 (no 502) A PROPÓSITO: Cloudflare intercepta los 5xx y les quita la
        # cabecera CORS → el navegador no puede leer el motivo y muestra un genérico
        # "No se pudo conectar". Con 4xx el error real llega al usuario.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"PayPhone: {str(exc)[:220]}")

    # payWithCard = checkout anónimo con tarjeta (no exige tener la app PayPhone).
    pay_url = prep.get("payWithCard") or prep.get("payWithPayPhone")
    if not pay_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PayPhone no devolvió una URL de pago válida.")

    pr = PaymentRequest(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        plan=plan,
        method="payphone",
        reference=client_tx_id,
        note=str(prep.get("paymentId", "")),
        amount=settings.PRICE_PRO,
    )
    db.add(pr)
    await db.commit()
    return PrepareOut(pay_url=pay_url, client_transaction_id=client_tx_id)


@router.post("/confirm", response_model=ConfirmOut)
@limiter.limit("30/minute")
async def confirm(request: Request, payload: ConfirmIn, db: AsyncSession = Depends(get_db)):
    """
    Confirma el pago tras la redirección de PayPhone y activa el plan.

    SIN auth de sesión a propósito: la ventana de confirmación de PayPhone es de
    5 minutos y no queremos que un token de sesión vencido bloquee la activación
    (PayPhone revertiría el cobro). La seguridad la garantiza PayPhone: solo
    confirma como "Approved" un pago REAL para ese par (id, clientTransactionId),
    y nosotros solo activamos la organización DUEÑA de ese clientTransactionId.
    """
    _guard_enabled()

    result = await db.execute(
        select(PaymentRequest).where(
            PaymentRequest.reference == payload.clientTransactionId,
            PaymentRequest.method == "payphone",
        )
    )
    pr = result.scalar_one_or_none()
    if pr is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transacción no encontrada.")

    org = await db.get(Organization, pr.organization_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organización no encontrada.")

    # Idempotencia: si ya está aprobada, no reconfirmamos (PayPhone puede
    # rechazar una segunda confirmación del mismo pago).
    if pr.status == "approved":
        return ConfirmOut(status="approved", plan=org.plan)

    try:
        conf = await run_in_threadpool(
            payphone_service.confirm_payment,
            transaction_id=payload.id,
            client_tx_id=payload.clientTransactionId,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[PayPhone] Confirm error (tx {payload.id}): {exc}")
        # 4xx, no 5xx: ver nota en /prepare (Cloudflare + CORS).
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"PayPhone: {str(exc)[:220]}")

    # Log de la respuesta CRUDA de PayPhone: imprescindible para depurar por qué
    # un pago se marca aprobado/rechazado (los nombres de campo pueden variar).
    print(f"[PayPhone] Confirm response (tx {payload.id}, org {pr.organization_id}): {conf}")

    status_txt = str(conf.get("transactionStatus") or "").strip().lower()
    status_code = conf.get("statusCode")
    approved = status_txt == "approved" or status_code == 3

    # El monto lo FIJAMOS en /prepare (1000 = $10), así que un "Approved" ya
    # implica que pagó lo correcto — no rechazamos por el monto (evita falsos
    # negativos si PayPhone reporta el monto en otro formato/campo). Solo se loguea.
    if approved:
        org.plan = pr.plan
        org.plan_expires_at = next_period_end(org.plan_expires_at)  # +30 días (apila si renueva)
        org.subscription_status = "active_payphone"  # distingue del flujo manual/LS
        pr.status = "approved"
        pr.reviewed_at = datetime.now(timezone.utc)
        pr.reviewer_email = "payphone-auto"
        await db.commit()
        return ConfirmOut(status="approved", plan=org.plan)

    # No aprobado (cancelado, pendiente de OTP, o rechazado por el banco).
    print(
        f"[PayPhone] Pago NO aprobado (tx {payload.id}): "
        f"transactionStatus={status_txt!r} statusCode={status_code} "
        f"message={conf.get('message')!r}"
    )
    pr.status = "rejected"
    pr.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    return ConfirmOut(status="rejected", message=conf.get("message"))
