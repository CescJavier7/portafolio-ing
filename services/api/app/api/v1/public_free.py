"""
api/v1/public_free.py

Escaneo PÚBLICO gratuito (el "enganchador"): SIN login y SIN verificación de
dominio. Solo toca información pública (cabeceras, TLS, DNS/SPF/DMARC) —
exactamente lo que hacen securityheaders.com o SSL Labs — así que no viola la
barrera ético-legal: la verificación DNS sigue siendo obligatoria para todo lo
profundo (descubrimiento de superficie con puertos, monitoreo, guardar en una
organización).

Al ser anónimo y hacer llamadas de red salientes:
- Rate limit AGRESIVO por IP (anti-abuso).
- Guard anti-SSRF: se rechaza cualquier dominio que resuelva a IP no pública.
- NO se persiste nada: es un resultado puntual, el gancho para registrarse.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import limiter
from app.db.session import get_db
from app.schemas.public import FreeScanRequest, PublicFindingsOut
from app.services.net_guard import resolves_to_public_ip
from app.services.observation_service import record_observation
from app.services.scanner import scan_domain

router = APIRouter(prefix="/free", tags=["public-free"])


@router.post("/scan", response_model=PublicFindingsOut)
@limiter.limit("5/minute;30/hour")
async def free_scan(request: Request, payload: FreeScanRequest, db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timezone

    if not await run_in_threadpool(resolves_to_public_ip, payload.domain):
        # Mismo mensaje para "no resuelve" y "resuelve a IP interna": no
        # damos pistas de red interna a quien sondea.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pudimos resolver ese dominio a una dirección pública. Revisa que esté bien escrito.",
        )

    result = await run_in_threadpool(scan_domain, payload.domain)

    # Motor de datos: incluso los escaneos anónimos alimentan el flujo agregado
    # (dominio hasheado, sin IP ni identidad). Best-effort.
    await record_observation(db, payload.domain, result, source="free")

    return PublicFindingsOut(
        domain=payload.domain,
        score=result["score"],
        grade=result["grade"],
        scanned_at=datetime.now(timezone.utc),
        findings=result["findings"],
    )
