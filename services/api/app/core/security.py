"""
core/security.py

- Contraseñas: Argon2id (passlib). Parámetros por defecto de passlib ya
  siguen las recomendaciones OWASP 2024 (m=19MB, t=2, p=1 aprox.), pero se
  puede tunear si el hardware del VPS lo permite (más memoria = más seguro).
- JWT: access tokens de vida corta (15 min) firmados HS256. El refresh
  token NO es JWT: es un valor aleatorio opaco que se guarda hasheado en
  la base de datos (igual que una contraseña). Así, si la tabla de tokens
  se filtra, no se pueden usar directamente (rainbow table inútil, hay que
  romper el hash).
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, organization_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,           # user id
        "org": organization_id,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def generate_refresh_token_raw() -> str:
    # Token opaco de alta entropía (256 bits). No es JWT: no lleva
    # información codificada, solo es un identificador impredecible.
    return secrets.token_urlsafe(64)


def generate_email_verification_token() -> str:
    # Mismo principio que el refresh token: valor opaco impredecible.
    return secrets.token_urlsafe(32)


def hash_email_verification_token(raw_token: str) -> str:
    # OJO: aquí SHA-256 a propósito, NO Argon2. El link del correo solo trae
    # el token, así que necesitamos ENCONTRAR al usuario por él: un hash
    # determinístico permite `WHERE token_hash = sha256(recibido)` con índice.
    # Con Argon2 (salt aleatorio) habría que iterar TODAS las filas. Es seguro
    # porque el token tiene 256 bits de entropía: no existe diccionario ni
    # fuerza bruta viable contra eso, a diferencia de una contraseña humana.
    return hashlib.sha256(raw_token.encode()).hexdigest()


def hash_refresh_token(raw_token: str) -> str:
    # Se guarda en DB con el mismo hashing que una contraseña.
    return pwd_context.hash(raw_token)


def verify_refresh_token(raw_token: str, hashed_token: str) -> bool:
    return pwd_context.verify(raw_token, hashed_token)


API_KEY_PREFIX = "sentra_"


def generate_api_key() -> tuple[str, str, str]:
    """
    Genera una API key. Devuelve (raw, hash, prefix):
    - raw: se muestra al usuario UNA sola vez (al crearla), nunca se guarda.
    - hash: SHA-256 determinístico — igual razón que el token de verificación
      de email: la llave llega en cada request y hay que ENCONTRAR la fila
      por ella con un índice, no compararla contra todas (Argon2 obligaría
      a iterar). Segura por los 256 bits de entropía del token, igual que
      el refresh token opaco.
    - prefix: primeros caracteres del raw, se guardan EN CLARO para que el
      usuario reconozca la llave en la lista sin volver a ver el valor
      completo (mismo patrón que Stripe/GitHub: "sentra_a1b2c3...").
    """
    raw = f"{API_KEY_PREFIX}{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    prefix = raw[: len(API_KEY_PREFIX) + 6]
    return raw, key_hash, prefix


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()