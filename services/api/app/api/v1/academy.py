"""
api/v1/academy.py

Progreso de la Academia (lecciones completadas por usuario). El CONTENIDO de las
lecciones vive en el frontend (Markdown); aquí solo se guarda qué completó cada
usuario, para pintar el progreso y continuar donde lo dejó. Anti-IDOR: todo se
filtra por `user_id` del token.
"""
from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.lesson_progress import LessonProgress
from app.models.user import User

router = APIRouter(prefix="/academy", tags=["academy"])


class ProgressOut(BaseModel):
    completed: list[str]  # ["ciberseguridad/inyeccion-sql", ...]


class ProgressIn(BaseModel):
    lesson_slug: str = Field(min_length=1, max_length=200)
    completed: bool


@router.get("/progress", response_model=ProgressOut)
@limiter.limit("60/minute")
async def get_progress(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(LessonProgress.lesson_slug).where(LessonProgress.user_id == current_user.id)
    )
    return ProgressOut(completed=[r[0] for r in rows.all()])


@router.put("/progress", response_model=ProgressOut)
@limiter.limit("120/minute")
async def set_progress(
    request: Request,
    payload: ProgressIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Marca/desmarca una lección como completada (idempotente por el UNIQUE)."""
    slug = payload.lesson_slug.strip()
    if payload.completed:
        exists = await db.execute(
            select(LessonProgress.id).where(
                LessonProgress.user_id == current_user.id, LessonProgress.lesson_slug == slug
            )
        )
        if exists.scalar_one_or_none() is None:
            db.add(LessonProgress(user_id=current_user.id, lesson_slug=slug))
    else:
        await db.execute(
            delete(LessonProgress).where(
                LessonProgress.user_id == current_user.id, LessonProgress.lesson_slug == slug
            )
        )
    await db.commit()

    rows = await db.execute(
        select(LessonProgress.lesson_slug).where(LessonProgress.user_id == current_user.id)
    )
    return ProgressOut(completed=[r[0] for r in rows.all()])
