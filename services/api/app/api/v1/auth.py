"""
api/v1/auth.py

Flujo de refresh tokens (rotación + detección de reuso):
- La cookie de refresh NO contiene el token completo "en crudo" solamente:
  contiene "{token_id}:{secreto}". `token_id` nos deja encontrar la fila en
  DB sin tener que comparar el secreto contra TODAS las filas (evitaría
  timing attacks de fuerza bruta si tuviéramos que iterar). El secreto se
  compara contra el hash guardado, igual que una contraseña.
- Cada vez que se usa un refresh token, se invalida (rotación) y se emite
  uno nuevo de la misma "familia" (`family_id`).
- Si alguien presenta un refresh token YA usado/revocado, es señal de que
  fue robado (el legítimo ya rotó a uno nuevo) → se revoca TODA la familia,
  cerrando todas las sesiones derivadas de ese login como medida de
  contención.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    generate_email_verification_token,
    generate_refresh_token_raw,
    hash_email_verification_token,
    hash_password,
    hash_refresh_token,
    verify_password,
    verify_refresh_token,
)
from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.organization import Organization
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResendVerificationRequest,
)
from app.schemas.user import UserOut
from app.services.email_service import send_verification_email

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "sentra_refresh"
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _set_refresh_cookie(response: Response, token_id: uuid.UUID, raw_secret: str) -> None:
    cookie_value = f"{token_id}:{raw_secret}"
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=cookie_value,
        httponly=True,        # inaccesible desde JS -> mitiga robo por XSS
        secure=settings.is_production,
        samesite="strict",    # el token nunca viaja en requests cross-site
        domain=settings.COOKIE_DOMAIN,
        path="/api/v1/auth",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
    )


async def _issue_tokens(db: AsyncSession, response: Response, user: User, family_id: uuid.UUID | None = None) -> str:
    family_id = family_id or uuid.uuid4()
    raw_secret = generate_refresh_token_raw()

    token_row = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_secret),
        family_id=family_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(token_row)
    await db.flush()  # necesitamos token_row.id antes de armar la cookie

    _set_refresh_cookie(response, token_row.id, raw_secret)

    return create_access_token(subject=str(user.id), organization_id=str(user.organization_id))


@router.post("/register", response_model=MessageResponse)
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Mensaje de respuesta SIEMPRE idéntico exista o no el email:
    # evita que un atacante enumere qué correos ya están registrados.
    generic_response = MessageResponse(
        message="Si los datos son válidos, revisa tu correo para verificar la cuenta."
    )

    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        return generic_response

    organization = Organization(name=payload.organization_name)
    db.add(organization)
    await db.flush()  # obtenemos organization.id

    # A diferencia de Stripe, no creamos un customer remoto aquí: Lemon
    # Squeezy lo crea/asocia solo al completar el primer Checkout, y lo
    # enlazamos a esta Organization vía el webhook (ver billing.py).

    raw_token = generate_email_verification_token()

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        organization_id=organization.id,
        role="OWNER",
        email_verified=False,
        email_verification_token_hash=hash_email_verification_token(raw_token),
        email_verification_expires_at=datetime.now(timezone.utc)
        + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS),
    )
    db.add(user)
    await db.commit()

    # El envío va DESPUÉS del commit: si Resend falla, el usuario ya existe
    # y puede pedir el reenvío con /auth/resend-verification. No revertimos
    # el registro por un fallo del proveedor de email.
    try:
        send_verification_email(payload.email, raw_token)
    except Exception as exc:
        print(f"[EMAIL] Fallo al enviar verificación a {payload.email}: {exc}")

    return generic_response


def _verify_result_page(title: str, body: str) -> HTMLResponse:
    # El link del correo se abre en un navegador: una mini página legible
    # es mejor UX que JSON crudo. Cuando exista el frontend de Sentra,
    # VERIFY_URL_BASE apuntará allá y esto quedará solo como fallback.
    return HTMLResponse(f"""
    <!doctype html>
    <html lang="es"><head><meta charset="utf-8"><title>Sentra</title></head>
    <body style="background:#0a0a0a;color:#e5e5e5;font-family:-apple-system,Segoe UI,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
      <div style="text-align:center;max-width:420px;padding:24px;">
        <h1 style="color:#fff;">{title}</h1>
        <p style="color:#a3a3a3;">{body}</p>
      </div>
    </body></html>
    """)


@router.get("/verify-email")
@limiter.limit("10/minute")
async def verify_email(request: Request, token: str = "", db: AsyncSession = Depends(get_db)):
    # Mensaje de fallo IDÉNTICO para token inexistente, expirado o vacío:
    # no le decimos a un atacante en cuál de los tres casos cayó.
    failure = _verify_result_page(
        "Enlace inválido o expirado",
        "Pide un nuevo correo de verificación desde la página de login.",
    )

    if not token:
        return failure

    token_hash = hash_email_verification_token(token)
    result = await db.execute(select(User).where(User.email_verification_token_hash == token_hash))
    user = result.scalar_one_or_none()

    if user is None:
        return failure

    if user.email_verification_expires_at is None or user.email_verification_expires_at < datetime.now(timezone.utc):
        return failure

    user.email_verified = True
    # Un solo uso: se limpia el token para que el mismo link no sirva dos veces.
    user.email_verification_token_hash = None
    user.email_verification_expires_at = None
    await db.commit()

    return _verify_result_page(
        "Correo verificado",
        "Tu cuenta de Sentra está activa. Ya puedes iniciar sesión.",
    )


@router.post("/resend-verification", response_model=MessageResponse)
@limiter.limit("3/minute")
async def resend_verification(request: Request, payload: ResendVerificationRequest, db: AsyncSession = Depends(get_db)):
    # Respuesta SIEMPRE idéntica: no filtra si el email existe ni si ya
    # estaba verificado (mismo principio anti-enumeración que /register).
    generic_response = MessageResponse(
        message="Si la cuenta existe y está pendiente de verificar, enviamos un nuevo correo."
    )

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or user.email_verified:
        return generic_response

    raw_token = generate_email_verification_token()
    user.email_verification_token_hash = hash_email_verification_token(raw_token)
    user.email_verification_expires_at = datetime.now(timezone.utc) + timedelta(
        hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
    )
    await db.commit()

    try:
        send_verification_email(payload.email, raw_token)
    except Exception as exc:
        print(f"[EMAIL] Fallo al reenviar verificación a {payload.email}: {exc}")

    return generic_response


@router.post("/login", response_model=AccessTokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas.",  # mensaje IDÉNTICO para email inexistente o password incorrecto
    )

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None:
        raise invalid_credentials

    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Cuenta bloqueada temporalmente por múltiples intentos fallidos.",
        )

    if not verify_password(payload.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
        await db.commit()
        raise invalid_credentials

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verifica tu correo antes de iniciar sesión.",
        )

    user.failed_login_attempts = 0
    user.locked_until = None

    access_token = await _issue_tokens(db, response, user)
    await db.commit()

    return AccessTokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
@limiter.limit("20/minute")
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    cookie_value = request.cookies.get(REFRESH_COOKIE_NAME)
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión inválida.")

    if not cookie_value or ":" not in cookie_value:
        raise unauthorized

    raw_id, raw_secret = cookie_value.split(":", 1)
    try:
        token_id = uuid.UUID(raw_id)
    except ValueError:
        raise unauthorized

    result = await db.execute(select(RefreshToken).where(RefreshToken.id == token_id))
    token_row = result.scalar_one_or_none()

    if token_row is None:
        raise unauthorized

    # ── Detección de reuso: token ya revocado pero se vuelve a presentar ──
    if token_row.revoked:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == token_row.family_id)
            .values(revoked=True)
        )
        await db.commit()
        response.delete_cookie(REFRESH_COOKIE_NAME, domain=settings.COOKIE_DOMAIN, path="/api/v1/auth")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión comprometida detectada. Vuelve a iniciar sesión.",
        )

    if token_row.expires_at < datetime.now(timezone.utc):
        raise unauthorized

    if not verify_refresh_token(raw_secret, token_row.token_hash):
        raise unauthorized

    user = await db.get(User, token_row.user_id)
    if user is None:
        raise unauthorized

    # Rotación: se revoca el usado, se emite uno nuevo de la misma familia.
    token_row.revoked = True

    access_token = await _issue_tokens(db, response, user, family_id=token_row.family_id)
    await db.commit()

    return AccessTokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    cookie_value = request.cookies.get(REFRESH_COOKIE_NAME)

    if cookie_value and ":" in cookie_value:
        raw_id, _ = cookie_value.split(":", 1)
        try:
            token_id = uuid.UUID(raw_id)
            await db.execute(update(RefreshToken).where(RefreshToken.id == token_id).values(revoked=True))
            await db.commit()
        except ValueError:
            pass

    response.delete_cookie(REFRESH_COOKIE_NAME, domain=settings.COOKIE_DOMAIN, path="/api/v1/auth")
    return MessageResponse(message="Sesión cerrada.")


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    # El frontend lo usa para saber quién está logueado (panel, navbar, etc.)
    # sin decodificar el JWT en el cliente.
    return current_user


@router.post("/change-password", response_model=AccessTokenResponse)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    response: Response,
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Exigir la contraseña actual aunque ya haya sesión: si alguien roba un
    # access token (15 min), no puede convertirlo en control permanente de
    # la cuenta cambiando la contraseña.
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La contraseña actual es incorrecta.",
        )

    current_user.password_hash = hash_password(payload.new_password)

    # Se revocan TODOS los refresh tokens del usuario: cambiar la contraseña
    # cierra las sesiones en otros dispositivos (si el motivo del cambio es
    # un robo de credenciales, esto expulsa al atacante). La sesión actual
    # se renueva abajo con una familia nueva, así este dispositivo sigue
    # logueado sin fricción.
    await db.execute(
        update(RefreshToken).where(RefreshToken.user_id == current_user.id).values(revoked=True)
    )

    access_token = await _issue_tokens(db, response, current_user)
    await db.commit()

    return AccessTokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )