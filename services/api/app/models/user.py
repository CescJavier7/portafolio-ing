import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Nombre para mostrar (opcional; el usuario lo define en su perfil).
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)

    role: Mapped[str] = mapped_column(String(20), default="OWNER")  # OWNER | ADMIN | ANALYST | MEMBER

    # Verificación de email: hasta que sea True, la cuenta no puede loguear.
    # Evita registros con emails ajenos/falsos y reduce spam de cuentas.
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Token de verificación (hasheado SHA-256, ver security.py para el porqué
    # de SHA-256 y no Argon2 aquí). Indexado: el link del correo solo trae el
    # token y hay que encontrar al usuario por él.
    email_verification_token_hash: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    email_verification_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Consentimiento EXPLÍCITO para noticias/promociones (opt-in, nunca
    # marcado por defecto). Enviar marketing sin esto = problemas legales
    # (GDPR/LOPD) y de reputación de dominio.
    marketing_consent: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── Mitigación de fuerza bruta a nivel de cuenta ──────────
    # Complementa el rate limiting por IP (que se puede evadir con proxies):
    # esto limita intentos contra UNA cuenta específica sin importar el origen.
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    organization: Mapped["Organization"] = relationship(back_populates="users")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))