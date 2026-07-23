"""
services/surface.py

Descubrimiento de superficie externa de un dominio (primer ladrillo del
"Grafo de superficie"). Combina:

- Subdominios: pasivo vía Certificate Transparency (crt.sh) + sondeo DNS de
  una lista corta de nombres comunes. crt.sh es data pública de certificados
  emitidos: no toca el objetivo.
- Puertos: chequeo de puertos/servicios comunes SOLO sobre el apex (no sobre
  cada subdominio) con connect_ex y timeout corto. Es la parte "activa" —
  por eso solo se corre sobre dominios verificados y con disclaimer.
- Tecnología: fingerprint a partir de cabeceras HTTP (Server, X-Powered-By…).

Todo síncrono (socket/requests/dns) → correr con run_in_threadpool.
Los timeouts son cortos a propósito: un objetivo lento no debe colgar la API.
"""
import socket
import ssl

import dns.resolver
import requests

# Nombres comunes a sondear por DNS (además de lo que aporte crt.sh).
COMMON_SUBDOMAINS = [
    "www", "mail", "api", "dev", "staging", "test", "admin", "app", "blog",
    "shop", "portal", "vpn", "remote", "webmail", "smtp", "ns1", "ns2",
    "cdn", "static", "assets", "docs", "status", "git", "ftp", "m", "beta",
]

# Puertos comunes: (puerto, servicio, riesgo_si_expuesto). El riesgo marca
# los que normalmente NO deberían estar abiertos a internet.
COMMON_PORTS = [
    (21, "FTP", "alta"),
    (22, "SSH", "media"),
    (25, "SMTP", "baja"),
    (80, "HTTP", "baja"),
    (110, "POP3", "media"),
    (143, "IMAP", "media"),
    (443, "HTTPS", "baja"),
    (3306, "MySQL", "alta"),
    (3389, "RDP", "alta"),
    (5432, "PostgreSQL", "alta"),
    (6379, "Redis", "alta"),
    (8080, "HTTP alternativo", "media"),
    (8443, "HTTPS alternativo", "media"),
    (27017, "MongoDB", "alta"),
]

MAX_SUBDOMAINS = 40


def _crtsh_subdomains(domain: str) -> set[str]:
    try:
        resp = requests.get(
            f"https://crt.sh/?q=%25.{domain}&output=json",
            timeout=12,
            headers={"User-Agent": "SentraScanner/1.0 (+https://cescjavier.dev)"},
        )
        if not resp.ok:
            return set()
        data = resp.json()
    except (requests.RequestException, ValueError):
        return set()

    out: set[str] = set()
    for row in data:
        for name in str(row.get("name_value", "")).split("\n"):
            n = name.strip().lower().lstrip("*.")
            if n == domain or n.endswith("." + domain):
                out.add(n)
    return out


def _resolve(name: str) -> str | None:
    try:
        resolver = dns.resolver.Resolver()
        resolver.lifetime = 2.0
        answers = resolver.resolve(name, "A")
        return str(answers[0])
    except Exception:
        return None


def _discover_subdomains(domain: str) -> list[dict]:
    names: set[str] = set(_crtsh_subdomains(domain))
    names.update(f"{sub}.{domain}" for sub in COMMON_SUBDOMAINS)
    names.discard(domain)

    ordered = sorted(names)[:MAX_SUBDOMAINS]
    out = []
    for name in ordered:
        ip = _resolve(name)
        # Solo reportamos los que resuelven (vivos): un subdominio en un cert
        # viejo que ya no resuelve no es superficie de ataque actual.
        if ip:
            out.append({"name": name, "ip": ip})
    return out


def _scan_ports(domain: str) -> list[dict]:
    ip = _resolve(domain)
    if not ip:
        return []
    out = []
    for port, service, risk in COMMON_PORTS:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1.5)
                if s.connect_ex((ip, port)) == 0:
                    out.append({"port": port, "service": service, "risk": risk})
        except OSError:
            continue
    return out


def _fingerprint(domain: str) -> list[str]:
    tech: set[str] = set()
    try:
        resp = requests.get(
            f"https://{domain}",
            timeout=8,
            allow_redirects=True,
            headers={"User-Agent": "SentraScanner/1.0 (+https://cescjavier.dev)"},
        )
        h = {k.lower(): v for k, v in resp.headers.items()}
        for key in ("server", "x-powered-by", "x-generator", "via", "x-aspnet-version"):
            if h.get(key):
                tech.add(h[key])
        # Señales típicas por header.
        if "cf-ray" in h or (h.get("server", "").lower() == "cloudflare"):
            tech.add("Cloudflare")
        if "x-vercel-id" in h:
            tech.add("Vercel")
        if h.get("x-powered-by", "").lower().startswith("next"):
            tech.add("Next.js")
    except requests.RequestException:
        pass
    return sorted(tech)


def discover_surface(domain: str) -> dict:
    subdomains = _discover_subdomains(domain)
    ports = _scan_ports(domain)
    technologies = _fingerprint(domain)
    return {
        "domain": domain,
        "subdomains": subdomains,
        "ports": ports,
        "technologies": technologies,
    }
