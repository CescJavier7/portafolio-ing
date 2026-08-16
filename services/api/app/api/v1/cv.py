"""
api/v1/cv.py

Generador de CV adaptado a una oferta laboral. Requiere sesión de usuario
(cuenta única del sitio, la misma de Sentra). Freemium por CUENTA: FREE tiene
una cuota mensual (plans.cv_per_month), los planes de pago la sueltan.

Aislamiento anti-IDOR: TODO acceso a un CV se filtra por `user_id` del token,
nunca por un id que venga del cliente. Un CV es un dato personal → derecho de
supresión = DELETE real.
"""
import asyncio
import json
from datetime import datetime, timedelta, timezone

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
from app.models.cv_folder import CVFolder
from app.models.organization import Organization
from app.models.user import User
from app.schemas.cv import (
    ApplyEmailOut,
    CVContent,
    CVDocumentOut,
    CVFolderCreate,
    CVFolderOut,
    CVGenerateRequest,
    CVImproveRequest,
    CVListItem,
    CVMoveRequest,
    CVUpdateRequest,
    OCRResult,
)
from app.services import cv_service
from app.services.cv_prompts import detectar_datos_no_rastreables, rebuild_cv
from app.services.file_guard import validate_upload, wipe
from app.services.ocr_service import extract_text_from_image
from app.services.pdf_service import extract_text_from_pdf
from app.services.text_guard import assert_readable

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


async def _enforce_cv_quota(current_user: User, db: AsyncSession) -> None:
    """
    Cuota SEMANAL freemium (0 = ilimitado). Cuenta los CVs creados por el
    usuario en los últimos 7 días (ventana rodante). Lo usan TANTO generar
    como 'mejorar con IA' — cada mejora crea una versión nueva y por eso
    consume 1 crédito. Lanza 402 si se agotó.
    """
    org = await db.get(Organization, current_user.organization_id)
    limit = plan_for(org.plan if org else None).cv_per_week
    if limit == 0:
        return
    window_start = datetime.now(timezone.utc) - timedelta(days=7)
    count_result = await db.execute(
        select(func.count())
        .select_from(CVDocument)
        .where(CVDocument.user_id == current_user.id, CVDocument.created_at >= window_start)
    )
    if count_result.scalar_one() >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Alcanzaste tu límite de {limit} CVs esta semana. Mejora tu plan para generar sin límite.",
        )


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

    # El texto a veces llega sin espacios (extracción de PDF rota) → rompía la
    # generación con un error genérico. Lo detectamos aquí y devolvemos el
    # motivo REAL (422 con mensaje accionable), sin gastar tokens de Groq.
    try:
        assert_readable(payload.profile_text)
        assert_readable(payload.job_posting)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    # ── Gating freemium por cuota semanal (0 = ilimitado) ──
    await _enforce_cv_quota(current_user, db)

    # ── Pipeline anclado por ids (ver cv_prompts.py) ──
    # Fase 1 (normalizar perfil) y Fase 2 (analizar oferta) son independientes →
    # en paralelo. Luego Fase 3 (adaptar). Timeouts para responder SIEMPRE antes
    # del corte de ~100s de Cloudflare (2 llamadas secuenciales como máximo).
    try:
        profile, analysis = await asyncio.wait_for(
            asyncio.gather(
                run_in_threadpool(cv_service.extract_profile, payload.profile_text),
                run_in_threadpool(cv_service.analyze_offer, payload.job_posting),
            ),
            timeout=65,
        )
        llm_output = await asyncio.wait_for(
            run_in_threadpool(cv_service.adapt_cv, profile, analysis),
            timeout=45,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="La generación tardó demasiado. Inténtalo de nuevo.",
        )
    except (json.JSONDecodeError, ValidationError):
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

    # ── Fase 4: reconstrucción VERIFICADA. Los ids inventados se descartan; los
    # datos personales/empresas/fechas salen del perfil, no del modelo. ──
    rich, incidencias = rebuild_cv(profile, llm_output)
    if incidencias:
        # Tasa alta = prompt degradado o perfil mal normalizado. Diagnóstico.
        print(f"[CV] Incidencias de reconstrucción (user {current_user.id}): {incidencias}")
    avisos = detectar_datos_no_rastreables(rich, profile)
    if avisos:
        print(f"[CV] Cifras no rastreables (user {current_user.id}): {avisos}")

    # Mapeo al CVContent plano que consume el frontend actual.
    try:
        cv_content = CVContent(**cv_service.map_rich_to_content(rich, profile))
    except ValidationError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar un CV válido. Inténtalo de nuevo.",
        )
    cv_content.match_score = max(0, min(100, cv_content.match_score))

    doc = CVDocument(
        user_id=current_user.id,
        title=cv_service.derive_title(cv_content, payload.title),
        job_posting=payload.job_posting,
        content=cv_content.model_dump(),
        match_score=cv_content.match_score,
        profile=profile,  # perfil normalizado con ids = fuente de verdad
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def _read_and_validate(file: UploadFile, allowed: set[str]) -> bytearray:
    """
    Lee el archivo a un bytearray, valida por FIRMA (magic numbers) + 5 MB, y lo
    devuelve para procesar EN MEMORIA. Nunca toca disco. El caller hace wipe()
    del buffer al terminar (defensa en profundidad).
    """
    buf = bytearray(await file.read())
    try:
        validate_upload(bytes(buf), allowed)
    except ValueError as exc:
        wipe(buf)
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(exc))
    return buf


@router.post("/ocr", response_model=OCRResult)
@limiter.limit("10/minute")
async def ocr_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # Validación estricta por firma: SOLO JPG/PNG reales (no confiamos en la
    # extensión ni en el Content-Type del cliente). Máximo 5 MB, en memoria.
    buf = await _read_and_validate(file, {"image/jpeg", "image/png"})
    try:
        text = await run_in_threadpool(extract_text_from_image, bytes(buf))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        print(f"[CV] Fallo OCR para user {current_user.id}: {exc}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="No se pudo procesar la imagen. Pega el texto manualmente.")
    finally:
        wipe(buf)  # borra el buffer de la imagen tras procesarla
    return OCRResult(text=text)


@router.post("/extract-pdf", response_model=OCRResult)
@limiter.limit("10/minute")
async def extract_pdf(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    buf = await _read_and_validate(file, {"application/pdf"})
    try:
        text = await run_in_threadpool(extract_text_from_pdf, bytes(buf))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        print(f"[CV] Fallo extrayendo PDF para user {current_user.id}: {exc}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="No se pudo procesar el PDF. Pega el texto manualmente.")
    finally:
        wipe(buf)
    return OCRResult(text=text)


@router.post("/{cv_id}/improve", response_model=CVDocumentOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def improve_cv(
    request: Request,
    cv_id: str,
    payload: CVImproveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Regeneración interactiva: reescribe el CV (con las ediciones/sugerencias del
    usuario) para subir el match. CONSUME 1 crédito → se aplica el gate semanal
    y se guarda como una VERSIÓN NUEVA (por eso cuenta; el original queda en el
    historial). El original se lee para conservar título, oferta y carpeta.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="El generador de CV no está disponible.")

    original = await _get_owned_cv(cv_id, current_user, db)

    # El gate se aplica ANTES de gastar tokens: si no hay crédito, no llamamos al LLM.
    await _enforce_cv_quota(current_user, db)

    try:
        improved = await run_in_threadpool(cv_service.improve_cv, payload.content, original.job_posting)
    except (json.JSONDecodeError, ValidationError):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="No se pudo mejorar el CV. Inténtalo de nuevo.")
    except Exception as exc:
        print(f"[CV] Fallo mejorando cv {cv_id}: {exc}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="El servicio de IA no respondió.")

    doc = CVDocument(
        user_id=current_user.id,
        title=f"{original.title} ✦"[:200],
        job_posting=original.job_posting,
        content=improved.model_dump(),
        match_score=improved.match_score,
        folder_id=original.folder_id,  # la versión mejorada hereda la carpeta
        profile=original.profile,  # y el perfil normalizado (fuente de verdad)
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


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


@router.get("/quota")
async def cv_quota(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Cuántas generaciones de IA le quedan al usuario esta semana. Lo usa el
    wizard para BLOQUEAR las 'varitas mágicas' al agotarse (pero dejar el editor
    manual funcionando). remaining=None → plan ilimitado.
    """
    org = await db.get(Organization, current_user.organization_id)
    limit = plan_for(org.plan if org else None).cv_per_week
    if limit == 0:
        return {"limit": 0, "used": 0, "remaining": None}
    window_start = datetime.now(timezone.utc) - timedelta(days=7)
    used_result = await db.execute(
        select(func.count())
        .select_from(CVDocument)
        .where(CVDocument.user_id == current_user.id, CVDocument.created_at >= window_start)
    )
    used = used_result.scalar_one()
    return {"limit": limit, "used": used, "remaining": max(0, limit - used)}


# ── Carpetas / categorías ──────────────────────────────────────────────
# OJO: estas rutas se declaran ANTES de las de "/{cv_id}" para que "/cv/folders"
# no sea capturado por el parámetro dinámico (FastAPI casa por orden de registro).

@router.get("/folders", response_model=list[CVFolderOut])
async def list_folders(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CVFolder).where(CVFolder.user_id == current_user.id).order_by(CVFolder.created_at.asc())
    )
    return list(result.scalars().all())


@router.post("/folders", response_model=CVFolderOut, status_code=status.HTTP_201_CREATED)
async def create_folder(
    payload: CVFolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    name = payload.name.strip()[:80]
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El nombre no puede estar vacío.")
    # Idempotente por usuario (case-insensitive): si ya existe, la devolvemos en
    # vez de duplicar. Evita "Ciberseguridad" y "ciberseguridad" repetidas.
    existing = await db.execute(
        select(CVFolder).where(
            CVFolder.user_id == current_user.id, func.lower(CVFolder.name) == name.lower()
        )
    )
    folder = existing.scalar_one_or_none()
    if folder is not None:
        return folder
    folder = CVFolder(user_id=current_user.id, name=name)
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


@router.patch("/folders/{folder_id}", response_model=CVFolderOut)
async def rename_folder(
    folder_id: str,
    payload: CVFolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Renombra una carpeta del usuario (anti-IDOR: filtrada por user_id)."""
    result = await db.execute(
        select(CVFolder).where(CVFolder.id == folder_id, CVFolder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpeta no encontrada.")
    name = payload.name.strip()[:80]
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El nombre no puede estar vacío.")
    folder.name = name
    await db.commit()
    await db.refresh(folder)
    return folder


@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CVFolder).where(CVFolder.id == folder_id, CVFolder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpeta no encontrada.")
    # ON DELETE SET NULL en la FK → los CVs de la carpeta se des-categorizan
    # solos, no se borran.
    await db.delete(folder)
    await db.commit()


@router.get("", response_model=list[CVListItem])
async def list_cvs(
    folder_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(CVDocument).where(CVDocument.user_id == current_user.id)
    if folder_id is not None:
        # Filtro por carpeta (anti-IDOR implícito: sigue acotado por user_id).
        query = query.where(CVDocument.folder_id == folder_id)
    result = await db.execute(query.order_by(CVDocument.created_at.desc()))
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
    if payload.set_folder:
        # Asignar (o quitar, con folder_id=null) la carpeta. Si se asigna una,
        # verificamos que pertenezca al usuario (anti-IDOR: no mover el CV a una
        # carpeta ajena).
        if payload.folder_id is not None:
            owns = await db.execute(
                select(CVFolder.id).where(
                    CVFolder.id == payload.folder_id, CVFolder.user_id == current_user.id
                )
            )
            if owns.scalar_one_or_none() is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpeta no encontrada.")
        cv.folder_id = payload.folder_id
    await db.commit()
    await db.refresh(cv)
    return cv


@router.patch("/{cv_id}", response_model=CVDocumentOut)
async def move_cv(
    cv_id: str,
    payload: CVMoveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mueve un CV a una carpeta (o lo saca con folder_id=null). Doble barrera
    anti-IDOR: el CV debe ser del usuario (_get_owned_cv) Y la carpeta destino
    también (no se puede mover a una carpeta ajena).
    """
    cv = await _get_owned_cv(cv_id, current_user, db)
    if payload.folder_id is not None:
        owns = await db.execute(
            select(CVFolder.id).where(
                CVFolder.id == payload.folder_id, CVFolder.user_id == current_user.id
            )
        )
        if owns.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpeta no encontrada.")
    cv.folder_id = payload.folder_id
    await db.commit()
    await db.refresh(cv)
    return cv


@router.delete("/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cv(cv_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cv = await _get_owned_cv(cv_id, current_user, db)
    await db.delete(cv)
    await db.commit()
