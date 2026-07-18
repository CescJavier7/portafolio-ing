"""
services/email_service.py

Envío de correos vía la API HTTP de Resend (misma cuenta/dominio verificado
que ya usa el portafolio Next.js en notification.service.ts). Sin SDK: la
API es un POST simple y `requests` ya está en requirements.

El fallo al enviar NO debe romper el registro: el usuario ya quedó creado
en DB y puede pedir el reenvío con /auth/resend-verification. Por eso quien
llama decide si captura la excepción (register la captura; resend también).
"""
import requests

from app.core.config import get_settings

settings = get_settings()

RESEND_API_URL = "https://api.resend.com/emails"


def send_verification_email(to_email: str, raw_token: str) -> None:
    verify_url = f"{settings.VERIFY_URL_BASE}?token={raw_token}"

    html = f"""
    <div style="background-color:#0a0a0a;color:#e5e5e5;padding:32px;font-family:-apple-system,Segoe UI,sans-serif;border-radius:12px;max-width:520px;margin:0 auto;">
      <h2 style="color:#ffffff;margin-top:0;">Verifica tu correo</h2>
      <p>Creaste una cuenta en <strong>Sentra</strong>. Para activarla, confirma que este correo es tuyo:</p>
      <p style="margin:28px 0;">
        <a href="{verify_url}"
           style="background-color:#6d28d9;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          Verificar mi correo
        </a>
      </p>
      <p style="color:#a3a3a3;font-size:13px;">
        El enlace expira en {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} horas.
        Si no creaste esta cuenta, ignora este correo — nadie puede usarla sin verificarla.
      </p>
    </div>
    """

    response = requests.post(
        RESEND_API_URL,
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": settings.EMAIL_FROM,
            "to": [to_email],
            "subject": "Sentra — Verifica tu correo",
            "html": html,
        },
        timeout=10,
    )
    response.raise_for_status()
