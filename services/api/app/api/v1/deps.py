import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token, hash_api_key
from app.db.session import get_db
from app.models.api_key import ApiKey
from app.models.organization import Organization
from app.models.user import User

# auto_error=False: así devolvemos NUESTRO mensaje de error consistente,
# en vez del genérico de FastAPI cuando falta el header.
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autorizado.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise unauthorized

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise unauthorized

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise unauthorized

    return user


async def get_api_key_org(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Organization:
    """
    Auth de la API PÚBLICA (para máquinas, no para el panel): el header
    lleva una API key de organización, no un JWT de sesión de usuario.
    Mismo esquema Bearer, distinta validación — se busca por hash, nunca
    se decodifica nada.
    """
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="API key inválida o ausente.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    result = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == hash_api_key(credentials.credentials))
    )
    key = result.scalar_one_or_none()

    if key is None or key.revoked:
        raise unauthorized

    # Actualiza last_used_at, pero no en CADA request (evita un write por
    # llamada): solo si pasaron >5 min desde el último registro.
    now = datetime.now(timezone.utc)
    if key.last_used_at is None or (now - key.last_used_at) > timedelta(minutes=5):
        key.last_used_at = now
        await db.commit()

    org = await db.get(Organization, key.organization_id)
    if org is None:
        raise unauthorized

    return org


def require_role(*allowed_roles: str):
    """
    Gate de RBAC para endpoints del panel (JWT, no API key). Se usa como
    `Depends(require_role("OWNER", "ADMIN"))` sobre `get_current_user`:
    reutiliza la sesión ya validada, solo agrega el chequeo de rol encima
    en vez de duplicar la verificación de token.
    """

    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para esta acción.",
            )
        return user

    return _check