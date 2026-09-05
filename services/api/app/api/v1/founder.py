"""
api/v1/founder.py

Panel del FUNDADOR: métricas de negocio agregadas de TODA la plataforma (no de una
org). Gated con `require_founder` (correos en FOUNDER_EMAILS). Solo lectura. No es
anti-IDOR porque el fundador ve todo a propósito — pero NADIE más puede.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_founder
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.captured_offer import CapturedOffer
from app.models.cv_document import CVDocument
from app.models.job_application import JobApplication
from app.models.organization import Organization
from app.models.payment_request import PaymentRequest
from app.models.scan import Scan
from app.models.target import Target
from app.models.user import User

router = APIRouter(prefix="/founder", tags=["founder"])

# Precio mensual estimado por plan (USD) para el MRR. Coherente con core/plans +
# PRICE_* de config. ENTERPRISE es a medida → estimado conservador.
_PLAN_PRICE = {"PRO": 10, "TEAM": 29, "ENTERPRISE": 99}
_PLANS = ("FREE", "PRO", "TEAM", "ENTERPRISE")


async def _count(db: AsyncSession, model, *conds) -> int:
    q = select(func.count()).select_from(model)
    for c in conds:
        q = q.where(c)
    return int((await db.execute(q)).scalar_one())


@router.get("/metrics")
@limiter.limit("30/minute")
async def founder_metrics(
    request: Request,
    founder: User = Depends(require_founder),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    d7, d30 = now - timedelta(days=7), now - timedelta(days=30)

    # Distribución de planes.
    by_plan = {p: 0 for p in _PLANS}
    rows = await db.execute(select(Organization.plan, func.count()).group_by(Organization.plan))
    for plan, n in rows.all():
        key = str(plan or "FREE")
        by_plan[key] = int(n) if key in by_plan else by_plan.get(key, 0)
    paid_active = by_plan["PRO"] + by_plan["TEAM"] + by_plan["ENTERPRISE"]
    mrr = sum(by_plan.get(p, 0) * price for p, price in _PLAN_PRICE.items())

    # Últimas altas (correo + plan de su org). PII, pero solo para el fundador.
    recent_rows = await db.execute(
        select(User.email, User.created_at, Organization.plan)
        .join(Organization, User.organization_id == Organization.id, isouter=True)
        .order_by(User.created_at.desc())
        .limit(8)
    )
    recent = [
        {"email": e, "created_at": c.isoformat() if c else None, "plan": str(p or "FREE")}
        for e, c, p in recent_rows.all()
    ]

    return {
        "orgs": {"total": await _count(db, Organization), "by_plan": by_plan, "paid_active": paid_active},
        "users": {
            "total": await _count(db, User),
            "new_7d": await _count(db, User, User.created_at >= d7),
            "new_30d": await _count(db, User, User.created_at >= d30),
        },
        "revenue": {
            "mrr_estimate_usd": mrr,
            "pending_payments": await _count(db, PaymentRequest, PaymentRequest.status == "pending"),
            "approved_payments": await _count(db, PaymentRequest, PaymentRequest.status == "approved"),
        },
        "activity": {
            "targets": await _count(db, Target),
            "scans": await _count(db, Scan),
            "cvs": await _count(db, CVDocument),
            "applications": await _count(db, JobApplication),
            "captured_offers": await _count(db, CapturedOffer),
        },
        "recent_signups": recent,
    }
