"""
api/v1/team.py

Gestión de equipo dentro de una organización (RBAC). Roles: OWNER (uno solo
por organización, asignado al registrar) > ADMIN > ANALYST > MEMBER. Un
usuario invitado se crea SIN contraseña utilizable (password_hash aleatorio
imposible de adivinar/loguear) hasta que acepta la invitación — mismo patrón
que la verificación de email: token opaco de un solo uso, hasheado con
SHA-256 para lookup indexado (ver core/security.py).
"""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, require_role
from app.core.config import get_settings
from app.core.plans import plan_for
from app.core.rate_limit import limiter
from app.core.security import (
    generate_email_verification_token,
    hash_email_verification_token,
    hash_password,
)
from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.team import TeamInviteAccept, TeamInviteCreate, TeamMemberOut, TeamRoleUpdate
from app.services.email_service import send_team_invite_email

settings = get_settings()
router = APIRouter(prefix="/team", tags=["team"])


@router.get("", response_model=list[TeamMemberOut])
async def list_team(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Cualquier miembro del equipo puede VER quién más está en la
    # organización; solo OWNER/ADMIN pueden invitar/remover/cambiar roles.
    result = await db.execute(
        select(User)
        .where(User.organization_id == current_user.organization_id)
        .order_by(User.created_at.asc())
    )
    return list(result.scalars().all())


@router.post("/invite", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def invite_member(
    request: Request,
    payload: TeamInviteCreate,
    current_user: User = Depends(require_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    org = await db.get(Organization, current_user.organization_id)
    limit = plan_for(org.plan if org else None).max_team_members

    count_result = await db.execute(
        select(func.count()).select_from(User).where(User.organization_id == current_user.organization_id)
    )
    if count_result.scalar_one() >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Alcanzaste el límite de miembros de tu plan ({limit}). Elimina alguno o mejora tu plan.",
        )

    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ese correo ya pertenece a una cuenta de Sentra.",
        )

    raw_token = generate_email_verification_token()

    # password_hash aleatorio e imposible de adivinar: el usuario NO puede
    # loguear (email_verified=False de por sí lo bloquea) hasta aceptar la
    # invitación y fijar su propia contraseña.
    invited_user = User(
        email=payload.email,
        password_hash=hash_password(secrets.token_urlsafe(32)),
        organization_id=current_user.organization_id,
        role=payload.role,
        email_verified=False,
        invite_token_hash=hash_email_verification_token(raw_token),
        invite_expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.INVITE_EXPIRE_HOURS),
    )
    db.add(invited_user)
    await db.commit()

    try:
        send_team_invite_email(payload.email, raw_token, org.name if org else "tu equipo", current_user.name)
    except Exception as exc:
        print(f"[EMAIL] Fallo al enviar invitación a {payload.email}: {exc}")

    return {"message": "Invitación enviada."}


@router.post("/accept-invite", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def accept_invite(request: Request, payload: TeamInviteAccept, db: AsyncSession = Depends(get_db)):
    # Mensaje IDÉNTICO para token inexistente o expirado: no confirmamos
    # ni negamos si un token en particular alguna vez existió.
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invitación inválida o expirada.",
    )

    token_hash = hash_email_verification_token(payload.token)
    result = await db.execute(select(User).where(User.invite_token_hash == token_hash))
    user = result.scalar_one_or_none()

    if user is None:
        raise invalid

    if user.invite_expires_at is None or user.invite_expires_at < datetime.now(timezone.utc):
        raise invalid

    user.name = payload.name.strip()
    user.password_hash = hash_password(payload.password)
    user.email_verified = True
    user.invite_token_hash = None
    user.invite_expires_at = None
    await db.commit()

    return {"message": "Invitación aceptada. Ya puedes iniciar sesión."}


@router.patch("/{user_id}/role", response_model=TeamMemberOut)
async def change_role(
    user_id: str,
    payload: TeamRoleUpdate,
    current_user: User = Depends(require_role("OWNER")),
    db: AsyncSession = Depends(get_db),
):
    # Solo OWNER cambia roles (evita que un ADMIN se autopromueva o degrade
    # a otros administradores). Único por diseño: no hay ruta para asignar
    # OWNER a nadie más — la organización conserva siempre un solo dueño.
    result = await db.execute(
        select(User).where(User.id == user_id, User.organization_id == current_user.organization_id)
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Miembro no encontrado.")

    if member.id == current_user.id or member.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes cambiar tu propio rol ni el del propietario.",
        )

    member.role = payload.role
    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    user_id: str,
    current_user: User = Depends(require_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.organization_id == current_user.organization_id)
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Miembro no encontrado.")

    if member.id == current_user.id or member.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminarte a ti mismo ni al propietario.",
        )

    await db.delete(member)
    await db.commit()
