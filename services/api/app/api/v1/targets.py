"""
api/v1/targets.py

Gestión de dominios a auditar. Reglas clave:
- Cada dominio arranca sin verificar; no se podrá escanear hasta que la
  verificación DNS TXT pase (barrera ético-legal).
- Límite de dominios por plan de la organización (FREE vs PRO). El límite
  se chequea al crear, contra las filas existentes.
- Aislamiento por organización: un usuario solo ve/toca los targets de SU
  organización. Nunca se filtra por user, siempre por organization_id del
  token — evita IDOR (acceder a recursos de otra org cambiando un id).
"""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.plans import plan_for
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.scan import Scan
from app.models.target import Target
from app.models.user import User
from app.models.organization import Organization
from app.schemas.scan import ScanResult
from app.schemas.target import (
    MonitoringUpdate,
    TargetCreate,
    TargetCreatedOut,
    TargetOut,
    VerifyResultOut,
)
from app.schemas.exposure import ExposureResult
from app.schemas.surface import SurfaceResult
from app.services.dns_verification import (
    challenge_record_name,
    check_dns_txt,
    expected_txt_value,
)
from app.services.exposure import compute_exposure
from app.services.surface import discover_surface
from app.services.scanner import scan_domain

router = APIRouter(prefix="/targets", tags=["targets"])

SCAN_WINDOW = timedelta(hours=24)


def _created_payload(target: Target) -> TargetCreatedOut:
    return TargetCreatedOut(
        id=target.id,
        domain=target.domain,
        verified=target.verified,
        verified_at=target.verified_at,
        created_at=target.created_at,
        dns_record_name=challenge_record_name(target.domain),
        dns_record_value=expected_txt_value(target.verification_token),
    )


@router.get("", response_model=list[TargetOut])
async def list_targets(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Target)
        .where(Target.organization_id == current_user.organization_id)
        .order_by(Target.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=TargetCreatedOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_target(
    request: Request,
    payload: TargetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await db.get(Organization, current_user.organization_id)
    limit = plan_for(org.plan if org else None).max_targets

    count_result = await db.execute(
        select(func.count())
        .select_from(Target)
        .where(Target.organization_id == current_user.organization_id)
    )
    if count_result.scalar_one() >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Alcanzaste el límite de dominios de tu plan ({limit}). Mejora a Pro para agregar más.",
        )

    # Duplicado dentro de la misma organización.
    existing = await db.execute(
        select(Target).where(
            Target.organization_id == current_user.organization_id,
            Target.domain == payload.domain,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ese dominio ya está registrado en tu organización.",
        )

    target = Target(
        organization_id=current_user.organization_id,
        domain=payload.domain,
        verification_token=secrets.token_urlsafe(24),
    )
    db.add(target)
    await db.commit()
    await db.refresh(target)

    return _created_payload(target)


async def _get_owned_target(target_id, current_user: User, db: AsyncSession) -> Target:
    # Siempre filtrando por organization_id del token: aunque adivinen un
    # target_id de otra org, esta query no lo devuelve (anti-IDOR).
    result = await db.execute(
        select(Target).where(
            Target.id == target_id,
            Target.organization_id == current_user.organization_id,
        )
    )
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dominio no encontrado.")
    return target


@router.get("/{target_id}/instructions", response_model=TargetCreatedOut)
async def get_instructions(
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_owned_target(target_id, current_user, db)
    return _created_payload(target)


@router.post("/{target_id}/verify", response_model=VerifyResultOut)
@limiter.limit("10/minute")  # la resolución DNS cuesta; evita abuso
async def verify_target(
    request: Request,
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_owned_target(target_id, current_user, db)

    if target.verified:
        return VerifyResultOut(verified=True, detail="Este dominio ya estaba verificado.")

    ok = await check_dns_txt(target.domain, target.verification_token)
    if not ok:
        return VerifyResultOut(
            verified=False,
            detail="Todavía no encontramos el registro TXT. Los cambios de DNS pueden tardar unos minutos en propagarse.",
        )

    from datetime import datetime, timezone

    target.verified = True
    target.verified_at = datetime.now(timezone.utc)
    await db.commit()

    return VerifyResultOut(verified=True, detail="Dominio verificado. Ya puedes auditarlo.")


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_target(
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_owned_target(target_id, current_user, db)
    await db.delete(target)
    await db.commit()


@router.post("/{target_id}/exposure", response_model=ExposureResult)
@limiter.limit("5/minute")
async def analyze_exposure(
    request: Request,
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_owned_target(target_id, current_user, db)
    if not target.verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes verificar la propiedad del dominio antes de analizar su exposición.",
        )
    org = await db.get(Organization, current_user.organization_id)
    if not plan_for(org.plan if org else None).show_score_detail:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="La inteligencia de exposición es una función Pro.",
        )

    # Usamos el último escaneo (rápido, desde DB). Si no hay, escaneamos una vez.
    prev = await db.execute(
        select(Scan).where(Scan.target_id == target.id).order_by(Scan.created_at.desc()).limit(1)
    )
    scan = prev.scalar_one_or_none()
    if scan is not None:
        findings = scan.findings or []
    else:
        scan_data = await run_in_threadpool(scan_domain, target.domain)
        new_scan = Scan(
            target_id=target.id,
            organization_id=current_user.organization_id,
            score=scan_data["score"],
            grade=scan_data["grade"],
            findings=scan_data["findings"],
        )
        db.add(new_scan)
        await db.commit()
        findings = scan_data["findings"]

    surface = await run_in_threadpool(discover_surface, target.domain)
    routes = compute_exposure(findings, surface)
    counts = {
        sev: sum(1 for r in routes if r["severity"] == sev)
        for sev in ("critica", "alta", "media", "baja")
    }
    return {"domain": target.domain, "routes": routes, "counts": counts}


@router.post("/{target_id}/discover", response_model=SurfaceResult)
@limiter.limit("5/minute")
async def discover_target(
    request: Request,
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_owned_target(target_id, current_user, db)
    if not target.verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes verificar la propiedad del dominio antes de mapear su superficie.",
        )
    org = await db.get(Organization, current_user.organization_id)
    # El descubrimiento de superficie (incluye chequeo de puertos) es Pro:
    # reutilizamos el gate de detalle. FREE recibe 402 → modal de upgrade.
    if not plan_for(org.plan if org else None).show_score_detail:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="El mapa de superficie es una función Pro. Mejora tu plan para descubrir subdominios, puertos y tecnologías.",
        )
    return await run_in_threadpool(discover_surface, target.domain)


@router.patch("/{target_id}/monitoring", response_model=TargetOut)
async def set_monitoring(
    target_id: str,
    payload: MonitoringUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_owned_target(target_id, current_user, db)
    if payload.enabled and not target.verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verifica el dominio antes de activar el monitoreo.",
        )
    target.monitoring_enabled = payload.enabled
    await db.commit()
    await db.refresh(target)
    return target


def _scan_to_result(scan: Scan, domain: str, show_detail: bool, scans_remaining: int | None) -> ScanResult:
    return ScanResult(
        id=scan.id,
        target_id=scan.target_id,
        domain=domain,
        score=scan.score,
        grade=scan.grade,
        created_at=scan.created_at,
        findings=scan.findings if show_detail else None,
        detail_locked=not show_detail,
        scans_remaining=scans_remaining,
        ai_report=scan.ai_report if show_detail else None,
    )


@router.post("/{target_id}/scan", response_model=ScanResult)
@limiter.limit("10/minute")
async def scan_target(
    request: Request,
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_owned_target(target_id, current_user, db)

    # Barrera ético-legal: no se escanea lo que no se ha verificado.
    if not target.verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes verificar la propiedad del dominio antes de escanearlo.",
        )

    org = await db.get(Organization, current_user.organization_id)
    config = plan_for(org.plan if org else None)

    # ── Límite anti-abuso SOLO para planes con escaneos limitados (FREE).
    # El contador vive en la org (no por dominio): borrar/recrear dominios
    # no lo reinicia. Los planes ilimitados (PRO+) saltan todo esto. ──
    remaining: int | None = None
    if config.limited_scans:
        now = datetime.now(timezone.utc)
        window_start = org.free_scan_window_start
        if window_start is None or (now - window_start) >= SCAN_WINDOW:
            org.free_scan_window_start = now
            org.free_scan_count = 0

        if org.free_scan_count >= config.scans_per_day:
            resets_at = (org.free_scan_window_start or now) + SCAN_WINDOW
            await db.commit()  # persistir el posible reset de ventana de arriba
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    "Agotaste tus escaneos disponibles. "
                    f"Recuperarás {config.scans_per_day} escaneos el {resets_at.strftime('%d/%m %H:%M')} UTC, "
                    "o mejora a Pro para escanear sin esperar."
                ),
            )

    # Escaneo real (bloqueante → threadpool para no frenar el event loop).
    result = await run_in_threadpool(scan_domain, target.domain)

    scan = Scan(
        target_id=target.id,
        organization_id=current_user.organization_id,
        score=result["score"],
        grade=result["grade"],
        findings=result["findings"],
    )
    db.add(scan)

    if config.limited_scans:
        org.free_scan_count += 1
        remaining = max(0, config.scans_per_day - org.free_scan_count)

    await db.commit()
    await db.refresh(scan)

    return _scan_to_result(scan, target.domain, config.show_score_detail, remaining)


@router.get("/{target_id}/scans", response_model=list[ScanResult])
async def list_scans(
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_owned_target(target_id, current_user, db)
    org = await db.get(Organization, current_user.organization_id)
    show_detail = plan_for(org.plan if org else None).show_score_detail

    result = await db.execute(
        select(Scan).where(Scan.target_id == target.id).order_by(Scan.created_at.desc()).limit(10)
    )
    scans = result.scalars().all()
    return [_scan_to_result(s, target.domain, show_detail, None) for s in scans]


@router.put("/{target_id}/scans/{scan_id}/report", status_code=status.HTTP_204_NO_CONTENT)
async def save_scan_report(
    target_id: str,
    scan_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Persiste el informe IA en el escaneo, para no regenerarlo en cada visita.
    target = await _get_owned_target(target_id, current_user, db)
    org = await db.get(Organization, current_user.organization_id)
    if not plan_for(org.plan if org else None).ai_reports:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Los informes IA son una función Pro.")

    result = await db.execute(select(Scan).where(Scan.id == scan_id, Scan.target_id == target.id))
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escaneo no encontrado.")

    # Solo guardamos las claves esperadas (no confiamos en el body crudo).
    scan.ai_report = {
        "executive": str(payload.get("executive", "")),
        "priorities": str(payload.get("priorities", "")),
        "technical": str(payload.get("technical", "")),
    }
    await db.commit()
