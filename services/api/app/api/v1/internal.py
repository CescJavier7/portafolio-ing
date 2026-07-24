"""
api/v1/internal.py

Endpoints internos que NO usa el frontend: los dispara un cron del VPS.
Protegidos por un secreto compartido (header X-Internal-Secret), comparado
con hmac.compare_digest. Si el secreto no está configurado, el endpoint
responde 503 (monitoreo deshabilitado) — nunca queda abierto por defecto.
"""
import hmac
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.models.organization import Organization
from app.models.scan import Scan
from app.models.target import Target
from app.models.user import User
from app.services.email_service import send_monitoring_alert
from app.services.observation_service import record_observation
from app.services.scanner import scan_domain
from app.services.webhook_service import trigger_webhooks

settings = get_settings()
router = APIRouter(prefix="/internal", tags=["internal"])

_GRADE_RANK = {"A": 5, "B": 4, "C": 3, "D": 2, "F": 1}
SCORE_DROP_ALERT = 5  # puntos: umbral para considerar "empeoró"


def _authorize(secret: str | None) -> None:
    configured = settings.MONITORING_INTERNAL_SECRET
    if not configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Monitoreo no configurado.")
    if not secret or not hmac.compare_digest(secret, configured):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado.")


@router.post("/run-monitoring")
async def run_monitoring(
    x_internal_secret: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _authorize(x_internal_secret)

    result = await db.execute(
        select(Target).where(Target.verified.is_(True), Target.monitoring_enabled.is_(True))
    )
    targets = result.scalars().all()

    checked = 0
    alerts = 0

    for target in targets:
        checked += 1

        # Escaneo previo más reciente (para comparar).
        prev_res = await db.execute(
            select(Scan).where(Scan.target_id == target.id).order_by(Scan.created_at.desc()).limit(1)
        )
        prev = prev_res.scalar_one_or_none()

        scan_data = await run_in_threadpool(scan_domain, target.domain)

        scan = Scan(
            target_id=target.id,
            organization_id=target.organization_id,
            score=scan_data["score"],
            grade=scan_data["grade"],
            findings=scan_data["findings"],
        )
        db.add(scan)
        await db.commit()

        # Motor de datos: el cron también alimenta el flujo agregado.
        await record_observation(db, target.domain, scan_data, source="monitor")

        if prev is None:
            continue  # primer escaneo: no hay con qué comparar

        # Controles que ANTES pasaban y AHORA fallan.
        prev_passed = {f["id"] for f in (prev.findings or []) if f.get("passed")}
        newly_failed = [
            f for f in scan_data["findings"] if not f.get("passed") and f.get("id") in prev_passed
        ]

        score_drop = prev.score - scan_data["score"]
        grade_worse = _GRADE_RANK.get(scan_data["grade"], 0) < _GRADE_RANK.get(prev.grade, 0)

        if not (newly_failed or score_drop >= SCORE_DROP_ALERT or grade_worse):
            continue  # sin regresión relevante

        await trigger_webhooks(
            db,
            target.organization_id,
            "monitoring_alert",
            {
                "domain": target.domain,
                "old_score": prev.score,
                "new_score": scan_data["score"],
                "old_grade": prev.grade,
                "new_grade": scan_data["grade"],
                "newly_failed": newly_failed,
            },
        )

        # Avisar a los usuarios de la organización dueña del dominio.
        users_res = await db.execute(select(User).where(User.organization_id == target.organization_id))
        for user in users_res.scalars().all():
            try:
                await run_in_threadpool(
                    send_monitoring_alert,
                    user.email,
                    target.domain,
                    prev.score,
                    scan_data["score"],
                    prev.grade,
                    scan_data["grade"],
                    newly_failed,
                )
                alerts += 1
            except Exception as exc:  # un fallo de correo no detiene el run
                print(f"[MONITORING] fallo enviando alerta a {user.email}: {exc}")

    return {"checked": checked, "alerts_sent": alerts, "ran_at": datetime.now(timezone.utc).isoformat()}
