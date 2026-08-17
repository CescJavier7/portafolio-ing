"""
api/v1/manual_billing.py

Cobros MANUALES (MVP para Ecuador, sin pasarela — LemonSqueezy y Kushki
rechazaron la cuenta). Flujo:
  1. El usuario elige plan y método, paga por fuera (De Una / PayPhone link /
     transferencia / PayPal / USDT) y envía la REFERENCIA de la transacción.
  2. El FUNDADOR (require_founder, no el OWNER de la org) la revisa en el panel
     y la aprueba → se activa el plan de la organización.

Es la base sobre la que luego se automatiza (PayPhone/Polar) sin rehacer el modelo.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, require_founder
from app.core.config import get_settings
from app.db.session import get_db
from app.models.organization import Organization
from app.models.payment_request import PaymentRequest
from app.models.user import User
from app.schemas.billing import (
    ManualConfigOut,
    ManualPaymentCreate,
    PayMethodOut,
    PaymentRequestOut,
    PendingPaymentOut,
)

settings = get_settings()
router = APIRouter(prefix="/billing/manual", tags=["billing-manual"])

_METHOD_LABELS = {
    "deuna": "De Una (Banco Pichincha)",
    "payphone": "PayPhone",
    "transfer": "Transferencia bancaria",
    "paypal": "PayPal",
    "usdt": "USDT (dólar cripto)",
}


def _available_methods() -> list[PayMethodOut]:
    """Solo los métodos configurados (con datos reales en el .env del VPS)."""
    mapping = [
        ("deuna", settings.PAY_DEUNA),
        ("payphone", settings.PAY_PAYPHONE_LINK),
        ("transfer", settings.PAY_BANK),
        ("paypal", settings.PAY_PAYPAL),
        ("usdt", settings.PAY_USDT),
    ]
    return [
        PayMethodOut(key=k, label=_METHOD_LABELS[k], instructions=v.strip())
        for k, v in mapping
        if v.strip()
    ]


def _price_for(plan: str) -> str:
    return settings.PRICE_TEAM if plan == "TEAM" else settings.PRICE_PRO


async def _get_pending(request_id: str, db: AsyncSession) -> PaymentRequest:
    result = await db.execute(select(PaymentRequest).where(PaymentRequest.id == request_id))
    pr = result.scalar_one_or_none()
    if pr is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada.")
    if pr.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Esta solicitud ya fue revisada.")
    return pr


@router.get("/config", response_model=ManualConfigOut)
async def manual_config(current_user: User = Depends(get_current_user)):
    return ManualConfigOut(
        price_pro=settings.PRICE_PRO,
        price_team=settings.PRICE_TEAM,
        contact=settings.PAY_CONTACT,
        methods=_available_methods(),
    )


@router.post("/request", response_model=PaymentRequestOut, status_code=status.HTTP_201_CREATED)
async def create_request(
    payload: ManualPaymentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.method not in {m.key for m in _available_methods()}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Método de pago no disponible.")
    # Una sola solicitud pendiente por organización (evita spam/duplicados).
    existing = await db.execute(
        select(PaymentRequest).where(
            PaymentRequest.organization_id == current_user.organization_id,
            PaymentRequest.status == "pending",
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya tienes una solicitud de pago pendiente de revisión.",
        )
    pr = PaymentRequest(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        plan=payload.plan,
        method=payload.method,
        reference=payload.reference.strip(),
        note=payload.note.strip(),
        amount=_price_for(payload.plan),
    )
    db.add(pr)
    await db.commit()
    await db.refresh(pr)
    return pr


@router.get("/mine", response_model=list[PaymentRequestOut])
async def my_requests(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PaymentRequest)
        .where(PaymentRequest.organization_id == current_user.organization_id)
        .order_by(PaymentRequest.created_at.desc())
    )
    return list(result.scalars().all())


# ── Endpoints del FUNDADOR ──────────────────────────────────────────────

@router.get("/pending", response_model=list[PendingPaymentOut])
async def pending(current_user: User = Depends(require_founder), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PaymentRequest, User.email, Organization.name)
        .join(User, User.id == PaymentRequest.user_id)
        .join(Organization, Organization.id == PaymentRequest.organization_id)
        .where(PaymentRequest.status == "pending")
        .order_by(PaymentRequest.created_at.asc())
    )
    return [
        PendingPaymentOut(
            id=pr.id,
            plan=pr.plan,
            method=pr.method,
            reference=pr.reference,
            note=pr.note,
            amount=pr.amount,
            status=pr.status,
            created_at=pr.created_at,
            organization_id=pr.organization_id,
            organization_name=org_name,
            user_email=user_email,
        )
        for pr, user_email, org_name in result.all()
    ]


@router.post("/{request_id}/approve")
async def approve(
    request_id: str, current_user: User = Depends(require_founder), db: AsyncSession = Depends(get_db)
):
    pr = await _get_pending(request_id, db)
    org = await db.get(Organization, pr.organization_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organización no encontrada.")
    org.plan = pr.plan
    org.subscription_status = "active_manual"  # distingue del flujo Lemon Squeezy
    pr.status = "approved"
    pr.reviewed_at = datetime.now(timezone.utc)
    pr.reviewer_email = current_user.email
    await db.commit()
    return {"status": "approved", "plan": org.plan}


@router.post("/{request_id}/reject")
async def reject(
    request_id: str, current_user: User = Depends(require_founder), db: AsyncSession = Depends(get_db)
):
    pr = await _get_pending(request_id, db)
    pr.status = "rejected"
    pr.reviewed_at = datetime.now(timezone.utc)
    pr.reviewer_email = current_user.email
    await db.commit()
    return {"status": "rejected"}
