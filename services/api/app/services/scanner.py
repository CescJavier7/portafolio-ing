"""
services/scanner.py

Scanner PASIVO v1. No ataca ni explota: solo observa lo que el dominio
expone públicamente — cabeceras HTTP de seguridad, certificado TLS y
registros DNS de correo (SPF/DMARC). Es 100% no intrusivo y legal sobre
un dominio verificado.

Cada check aporta un peso; la suma da un Security Score 0-100 y una letra.
Todo es síncrono (usa requests/ssl/socket) y se corre en un threadpool
desde el endpoint async para no bloquear el event loop.
"""
import socket
import ssl
from datetime import datetime, timezone

import dns.resolver
import requests

# ── Definición de checks: (id, label, peso, severidad, recomendación) ──
# Los pesos suman 100. Severidad: se usa en el detalle (solo Pro).
HEADER_CHECKS = [
    ("hsts", "Strict-Transport-Security (HSTS)", 15, "alta",
     "Añade el header HSTS para forzar HTTPS y evitar downgrade a HTTP."),
    ("csp", "Content-Security-Policy", 15, "alta",
     "Define una CSP para mitigar XSS e inyección de contenido."),
    ("xfo", "X-Frame-Options", 8, "media",
     "Añade X-Frame-Options (o CSP frame-ancestors) para evitar clickjacking."),
    ("xcto", "X-Content-Type-Options", 7, "media",
     "Añade X-Content-Type-Options: nosniff para evitar MIME sniffing."),
    ("refpol", "Referrer-Policy", 5, "baja",
     "Define Referrer-Policy para no filtrar URLs sensibles en el header Referer."),
    ("permpol", "Permissions-Policy", 5, "baja",
     "Define Permissions-Policy para restringir APIs del navegador (cámara, geo, etc.)."),
]
HEADER_NAMES = {
    "hsts": "strict-transport-security",
    "csp": "content-security-policy",
    "xfo": "x-frame-options",
    "xcto": "x-content-type-options",
    "refpol": "referrer-policy",
    "permpol": "permissions-policy",
}

SSL_VALID_WEIGHT = 15
SSL_NOTEXPIRING_WEIGHT = 5
TLS_VERSION_WEIGHT = 5
SPF_WEIGHT = 8
DMARC_WEIGHT = 7
# 6 headers (55) + ssl (20) + tls (5) + spf (8) + dmarc (7) = 100


def _finding(check_id, label, passed, weight, severity, recommendation):
    return {
        "id": check_id,
        "label": label,
        "passed": passed,
        "weight": weight,
        "severity": severity,
        # La recomendación solo tiene sentido si NO pasó.
        "recommendation": None if passed else recommendation,
    }


def _scan_headers(domain: str) -> list[dict]:
    findings = []
    try:
        resp = requests.get(
            f"https://{domain}",
            timeout=8,
            allow_redirects=True,
            headers={"User-Agent": "SentraScanner/1.0 (+https://cescjavier.dev)"},
        )
        headers = {k.lower(): v for k, v in resp.headers.items()}
    except requests.RequestException:
        headers = None

    for check_id, label, weight, severity, rec in HEADER_CHECKS:
        present = headers is not None and HEADER_NAMES[check_id] in headers
        findings.append(_finding(check_id, label, present, weight, severity, rec))
    return findings


def _scan_ssl(domain: str) -> list[dict]:
    findings = []
    valid = False
    not_expiring = False
    tls_ok = False
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=8) as sock:
            with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                version = ssock.version()  # ej. "TLSv1.3"
                valid = True  # si el handshake pasó con verificación, el cert es válido para el host

                # Expiración
                not_after = cert.get("notAfter")
                if not_after:
                    exp = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                    days_left = (exp - datetime.now(timezone.utc)).days
                    not_expiring = days_left > 30

                tls_ok = version in ("TLSv1.2", "TLSv1.3")
    except (ssl.SSLError, socket.error, socket.timeout, ValueError):
        pass

    findings.append(_finding(
        "ssl_valid", "Certificado TLS válido", valid, SSL_VALID_WEIGHT, "alta",
        "Instala un certificado TLS válido y confiable (ej. Let's Encrypt).",
    ))
    findings.append(_finding(
        "ssl_expiry", "Certificado no próximo a expirar (>30 días)", not_expiring, SSL_NOTEXPIRING_WEIGHT, "media",
        "Renueva el certificado: expira pronto o no se pudo verificar la fecha.",
    ))
    findings.append(_finding(
        "tls_version", "TLS 1.2 o superior", tls_ok, TLS_VERSION_WEIGHT, "media",
        "Habilita TLS 1.2/1.3 y deshabilita versiones antiguas (TLS 1.0/1.1).",
    ))
    return findings


def _txt_records(name: str) -> list[str]:
    try:
        resolver = dns.resolver.Resolver()
        resolver.lifetime = 5.0
        answers = resolver.resolve(name, "TXT")
        out = []
        for rdata in answers:
            out.append("".join(
                p.decode() if isinstance(p, bytes) else str(p) for p in rdata.strings
            ))
        return out
    except Exception:
        return []


def _scan_dns(domain: str) -> list[dict]:
    findings = []

    spf = any(r.lower().startswith("v=spf1") for r in _txt_records(domain))
    findings.append(_finding(
        "spf", "Registro SPF", spf, SPF_WEIGHT, "media",
        "Publica un registro SPF (v=spf1 ...) para evitar suplantación de tu correo.",
    ))

    dmarc = any(r.lower().startswith("v=dmarc1") for r in _txt_records(f"_dmarc.{domain}"))
    findings.append(_finding(
        "dmarc", "Registro DMARC", dmarc, DMARC_WEIGHT, "media",
        "Publica un registro DMARC (_dmarc, v=DMARC1 ...) para protegerte del phishing.",
    ))
    return findings


def _grade(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


def scan_domain(domain: str) -> dict:
    """
    Corre todos los checks y devuelve {score, grade, findings}. Síncrono:
    llamar con run_in_threadpool desde el endpoint async.
    """
    findings = []
    findings += _scan_headers(domain)
    findings += _scan_ssl(domain)
    findings += _scan_dns(domain)

    score = sum(f["weight"] for f in findings if f["passed"])
    score = max(0, min(100, score))

    return {"score": score, "grade": _grade(score), "findings": findings}
