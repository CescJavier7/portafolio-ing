"""
api/v1/applications.py

Tracker de POSTULACIONES de Sentra CV AI (reemplazo nativo de Notion). Personal
por usuario: todo se filtra por `user_id` del token (anti-IDOR). El usuario las
crea a mano, o "guardar como postulación" tras generar un CV, o vía API (n8n).
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.cv_document import CVDocument
from app.models.job_application import JobApplication
from app.models.user import User
from app.schemas.application import ApplicationCreate, ApplicationOut, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])


async def _get_owned(app_id: str, current_user: User, db: AsyncSession) -> JobApplication:
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.id == app_id,
            JobApplication.user_id == current_user.id,  # anti-IDOR
        )
    )
    app = result.scalar_one_or_none()
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Postulación no encontrada.")
    return app


async def _assert_cv_owned(cv_id: uuid.UUID | None, current_user: User, db: AsyncSession) -> None:
    """El CV enlazado debe ser del propio usuario (no enlazar CVs ajenos)."""
    if cv_id is None:
        return
    result = await db.execute(
        select(CVDocument.id).where(CVDocument.id == cv_id, CVDocument.user_id == current_user.id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV no encontrado.")


@router.get("", response_model=list[ApplicationOut])
async def list_applications(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(JobApplication)
        .where(JobApplication.user_id == current_user.id)
        .order_by(JobApplication.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def create_application(
    request: Request,
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_cv_owned(payload.cv_document_id, current_user, db)

    applied_at = payload.applied_at
    # Si nace ya como "postulado" sin fecha, la ponemos ahora (conveniencia).
    if payload.status == "applied" and applied_at is None:
        applied_at = datetime.now(timezone.utc)

    app = JobApplication(
        user_id=current_user.id,
        cv_document_id=payload.cv_document_id,
        company=payload.company.strip(),
        role=payload.role.strip(),
        job_url=payload.job_url.strip() if payload.job_url else None,
        status=payload.status,
        notes=payload.notes.strip(),
        applied_at=applied_at,
        score=payload.score,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@router.patch("/{app_id}", response_model=ApplicationOut)
async def update_application(
    app_id: str,
    payload: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app = await _get_owned(app_id, current_user, db)
    data = payload.model_dump(exclude_unset=True)

    if "cv_document_id" in data:
        await _assert_cv_owned(data["cv_document_id"], current_user, db)

    # Al pasar a "postulado" por primera vez, sella la fecha si no vino una.
    if data.get("status") == "applied" and app.applied_at is None and not data.get("applied_at"):
        app.applied_at = datetime.now(timezone.utc)

    for field in ("company", "role", "job_url", "status", "notes", "cv_document_id", "applied_at"):
        if field in data:
            value = data[field]
            if isinstance(value, str):
                value = value.strip() or (None if field == "job_url" else value)
            setattr(app, field, value)

    await db.commit()
    await db.refresh(app)
    return app


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    app_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    app = await _get_owned(app_id, current_user, db)
    await db.delete(app)
    await db.commit()
