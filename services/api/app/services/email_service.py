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

    text = (
        "Verifica tu correo\n\n"
        "Creaste una cuenta en Sentra. Para activarla, abre este enlace:\n"
        f"{verify_url}\n\n"
        f"El enlace expira en {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} horas. "
        "Si no creaste esta cuenta, ignora este correo."
    )
    _send(to_email, "Sentra — Verifica tu correo", html, text=text)


def send_team_invite_email(to_email: str, raw_token: str, org_name: str, inviter_name: str | None) -> None:
    accept_url = f"{settings.INVITE_ACCEPT_URL_BASE}?token={raw_token}"
    inviter = inviter_name or "un administrador"

    html = f"""
    <div style="background-color:#0a0a0a;color:#e5e5e5;padding:32px;font-family:-apple-system,Segoe UI,sans-serif;border-radius:12px;max-width:520px;margin:0 auto;">
      <h2 style="color:#ffffff;margin-top:0;">Te invitaron a un equipo en Sentra</h2>
      <p><strong>{inviter}</strong> te invitó a unirte a la organización <strong>{org_name}</strong> en Sentra.</p>
      <p style="margin:28px 0;">
        <a href="{accept_url}"
           style="background-color:#22c55e;color:#000000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
          Aceptar invitación
        </a>
      </p>
      <p style="color:#a3a3a3;font-size:13px;">
        El enlace expira en {settings.INVITE_EXPIRE_HOURS} horas.
        Si no esperabas esta invitación, ignora este correo.
      </p>
    </div>
    """

    _send(to_email, f"Sentra — Invitación de {org_name}", html)


def _send(to_email: str, subject: str, html: str, text: str | None = None) -> None:
    # Enviar SIEMPRE multipart (html + text): los filtros anti-spam penalizan los
    # correos solo-HTML. `reply_to` a una dirección real mejora la reputación y
    # da salida al usuario. Si no se pasa `text`, derivamos uno pobre pero válido.
    payload = {
        "from": settings.EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html,
        "text": text or "Abre este correo en un cliente compatible con HTML.",
        "reply_to": "admin@cescjavier.dev",
    }
    response = requests.post(
        RESEND_API_URL,
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=10,
    )
    response.raise_for_status()


def send_monitoring_alert(
    to_email: str,
    domain: str,
    old_score: int,
    new_score: int,
    old_grade: str,
    new_grade: str,
    newly_failed: list[dict],
) -> None:
    """
    Alerta de monitoreo continuo: la postura del dominio empeoró. `newly_failed`
    son los controles que ANTES pasaban y ahora fallan (con su marco).
    """
    items = "".join(
        f'<li style="margin-bottom:8px;"><strong style="color:#fca5a5;">{f.get("label","")}</strong>'
        + (f' <span style="color:#94a3b8;font-size:12px;">({", ".join(r.get("framework","")+" "+r.get("ref","") for r in f.get("references",[]))})</span>' if f.get("references") else "")
        + (f'<br><span style="color:#a3a3a3;font-size:13px;">{f.get("recommendation","")}</span>' if f.get("recommendation") else "")
        + "</li>"
        for f in newly_failed
    )
    changes = (
        f'<ul style="padding-left:18px;margin:12px 0;">{items}</ul>'
        if items
        else '<p style="color:#a3a3a3;font-size:13px;">El puntaje bajó sin nuevos controles fallidos (revisa el detalle en tu panel).</p>'
    )

    html = f"""
    <div style="background-color:#0a0a0a;color:#e5e5e5;padding:32px;font-family:-apple-system,Segoe UI,sans-serif;border-radius:12px;max-width:560px;margin:0 auto;">
      <p style="color:#f59e0b;font-weight:700;letter-spacing:.05em;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Alerta de seguridad · Sentra</p>
      <h2 style="color:#ffffff;margin:0 0 12px;">La postura de <span style="color:#22c55e;">{domain}</span> empeoró</h2>
      <p style="font-size:15px;">Tu Security Score bajó de <strong style="color:#86efac;">{old_score} ({old_grade})</strong> a
      <strong style="color:#fca5a5;">{new_score} ({new_grade})</strong>.</p>
      <p style="font-size:14px;color:#cbd5e1;margin-top:16px;"><strong>Cambios detectados:</strong></p>
      {changes}
      <p style="margin:24px 0 0;">
        <a href="https://cescjavier.dev/es/sentinel/panel"
           style="background-color:#22c55e;color:#000;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;">
          Ver el informe completo
        </a>
      </p>
      <p style="color:#64748b;font-size:11px;margin-top:20px;">Recibes este correo porque activaste el monitoreo continuo de este dominio en Sentra.</p>
    </div>
    """
    _send(to_email, f"⚠️ Sentra — La seguridad de {domain} bajó ({new_score}/{new_grade})", html)
