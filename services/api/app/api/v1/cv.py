"""
api/v1/cv.py

Generador de CV adaptado a una oferta laboral. Requiere sesión de usuario
(cuenta única del sitio, la misma de Sentra). Freemium por CUENTA: FREE tiene
una cuota mensual (plans.cv_per_month), los planes de pago la sueltan.

Aislamiento anti-IDOR: TODO acceso a un CV se filtra por `user_id` del token,
nunca por un id que venga del cliente. Un CV es un dato personal → derecho de
supresión = DELETE real.
"""
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.config import get_settings
from app.core.plans import plan_for
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.cv_document import CVDocument
from app.models.organization import Organization
from app.models.user import User
from app.schemas.cv import (
    ApplyEmailOut,
    CVDocumentOut,
    CVGenerateRequest,
    CVListItem,
    CVUpdateRequest,
    OCRResult,
)
from app.services import cv_service
from app.services.ocr_service import extract_text_from_image
from app.services.pdf_service import extract_text_from_pdf

settings = get_settings()
router = APIRouter(prefix="/cv", tags=["cv"])


async def _get_owned_cv(cv_id: str, current_user: User, db: AsyncSession) -> CVDocument:
    result = await db.execute(
        select(CVDocument).where(CVDocument.id == cv_id, CVDocument.user_id == current_user.id)
    )
    cv = result.scalar_one_or_none()
    if cv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV no encontrado.")
    return cv


@router.post("", response_model=CVDocumentOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def generate_cv(
    request: Request,
    payload: CVGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.GROQ_API_KEY:
        # El servicio de IA no está configurado: 503, no 500 crudo.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El generador de CV no está disponible por el momento.",
        )

    # ── Gating freemium por cuota mensual (0 = ilimitado) ──
    org = await db.get(Organization, current_user.organization_id)
    limit = plan_for(org.plan if org else None).cv_per_month
    if limit != 0:
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        count_result = await db.execute(
            select(func.count())
            .select_from(CVDocument)
            .where(CVDocument.user_id == current_user.id, CVDocument.created_at >= month_start)
        )
        if count_result.scalar_one() >= limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Alcanzaste tu límite de {limit} CVs este mes. Mejora tu plan para generar sin límite.",
            )

    # ── Generación con IA (bloqueante → threadpool) ──
    try:
        cv_content = await run_in_threadpool(cv_service.generate_cv, payload.profile_text, payload.job_posting)
    except (json.JSONDecodeError, ValidationError):
        # El LLM devolvió algo no parseable/estructurado: fallo controlado.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar un CV válido. Inténtalo de nuevo.",
        )
    except Exception as exc:
        print(f"[CV] Fallo generando CV para user {current_user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El servicio de IA no respondió. Inténtalo más tarde.",
        )

    doc = CVDocument(
        user_id=current_user.id,
        title=cv_service.derive_title(cv_content, payload.title),
        job_posting=payload.job_posting,
        content=cv_content.model_dump(),
        match_score=cv_content.match_score,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.post("/ocr", response_model=OCRResult)
@limiter.limit("10/minute")
async def ocr_job_posting(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Sube una imagen (PNG, JPG, etc.).",
        )
    image_bytes = await file.read()
    try:
        text = await run_in_threadpool(extract_text_from_image, image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        print(f"[CV] Fallo OCR para user {current_user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo procesar la imagen. Pega el texto de la oferta manualmente.",
        )
    return OCRResult(text=text)


@router.post("/extract-pdf", response_model=OCRResult)
@limiter.limit("10/minute")
async def extract_pdf(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # content_type puede mentir; pypdf igual valida el contenido real abajo.
    if (file.content_type or "") not in ("application/pdf", "application/x-pdf", "application/octet-stream"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Sube un archivo PDF.",
        )
    pdf_bytes = await file.read()
    try:
        text = await run_in_threadpool(extract_text_from_pdf, pdf_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        print(f"[CV] Fallo extrayendo PDF para user {current_user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo procesar el PDF. Pega el texto manualmente.",
        )
    return OCRResult(text=text)


@router.post("/{cv_id}/apply-email", response_model=ApplyEmailOut)
@limiter.limit("10/minute")
async def apply_email(
    request: Request,
    cv_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de IA no disponible.")

    cv = await _get_owned_cv(cv_id, current_user, db)

    from app.schemas.cv import CVContent
    content = CVContent(**(cv.content or {}))

    try:
        email = await run_in_threadpool(cv_service.generate_apply_email, content, cv.job_posting)
    except (json.JSONDecodeError, ValidationError):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="No se pudo redactar el correo. Inténtalo de nuevo.")
    except Exception as exc:
        print(f"[CV] Fallo generando email para cv {cv_id}: {exc}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="El servicio de IA no respondió.")

    return ApplyEmailOut(
        subject=email["subject"],
        body=email["body"],
        recipient=cv_service.extract_recipient(cv.job_posting),
    )


@router.get("", response_model=list[CVListItem])
async def list_cvs(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CVDocument).where(CVDocument.user_id == current_user.id).order_by(CVDocument.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{cv_id}", response_model=CVDocumentOut)
async def get_cv(cv_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _get_owned_cv(cv_id, current_user, db)


@router.put("/{cv_id}", response_model=CVDocumentOut)
async def update_cv(
    cv_id: str,
    payload: CVUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cv = await _get_owned_cv(cv_id, current_user, db)
    if payload.title is not None:
        cv.title = payload.title.strip()[:200] or cv.title
    if payload.content is not None:
        cv.content = payload.content
        # Mantener el match_score en sync si el usuario editó el content.
        try:
            cv.match_score = max(0, min(100, int(payload.content.get("match_score", cv.match_score))))
        except (TypeError, ValueError):
            pass
    await db.commit()
    await db.refresh(cv)
    return cv


@router.delete("/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cv(cv_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cv = await _get_owned_cv(cv_id, current_user, db)
    await db.delete(cv)
    await db.commit()
