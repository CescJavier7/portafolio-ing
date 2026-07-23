"""
services/exposure.py

Inteligencia de exposición: correlaciona lo OBSERVADO (hallazgos del scan +
superficie) en "rutas de exposición" priorizadas. Es la versión honesta del
"attack path" para un scanner externo pasivo: NO inventa movimiento lateral
ni CVEs que no vimos — solo encadena condiciones reales y observables que,
juntas, elevan el riesgo. Cada ruta lleva su evidencia y su marco.

Determinista a propósito (reglas, no IA): en seguridad la explicabilidad
vende, y una ruta inventada por un LLM es un pasivo, no un activo.
"""

# Orden de severidad para ordenar y puntuar.
SEV_RANK = {"critica": 4, "alta": 3, "media": 2, "baja": 1}

DB_PORTS = {1433: "SQL Server", 3306: "MySQL", 5432: "PostgreSQL", 6379: "Redis", 27017: "MongoDB", 5984: "CouchDB"}
ADMIN_PORTS = {21: "FTP", 22: "SSH", 23: "Telnet", 3389: "RDP"}
ALT_HTTP_PORTS = {8080: "HTTP alternativo", 8443: "HTTPS alternativo"}
SENSITIVE_KEYWORDS = ("admin", "login", "portal", "vpn", "remote", "cpanel", "webmail", "git", "jenkins", "ci", "staging", "dev", "test")

REF = {
    "misconfig": {"framework": "OWASP", "ref": "A05:2021", "title": "Security Misconfiguration"},
    "crypto": {"framework": "OWASP", "ref": "A02:2021", "title": "Cryptographic Failures"},
    "exposed_svc": {"framework": "CWE", "ref": "CWE-668", "title": "Exposure of Resource to Wrong Sphere"},
    "spoof": {"framework": "CWE", "ref": "CWE-290", "title": "Authentication Bypass by Spoofing"},
    "clickjack": {"framework": "CWE", "ref": "CWE-1021", "title": "Improper Restriction of Rendered UI Layers"},
    "xss": {"framework": "CWE", "ref": "CWE-79", "title": "Cross-site Scripting"},
    "cleartext": {"framework": "CWE", "ref": "CWE-319", "title": "Cleartext Transmission"},
}


def _route(rid, title, severity, evidence, impact, recommendation, references):
    return {
        "id": rid,
        "title": title,
        "severity": severity,
        "evidence": evidence,
        "impact": impact,
        "recommendation": recommendation,
        "references": references,
    }


def compute_exposure(findings: list[dict], surface: dict) -> list[dict]:
    routes: list[dict] = []
    failed = {f.get("id") for f in findings if not f.get("passed")}
    ports = {p["port"]: p["service"] for p in surface.get("ports", [])}
    subs = [s["name"] for s in surface.get("subdomains", [])]

    # 1. Puertos de base de datos expuestos → exposición directa de datos.
    db_open = {p: s for p, s in ports.items() if p in DB_PORTS}
    if db_open:
        routes.append(_route(
            "db_exposed",
            "Base de datos expuesta a internet",
            "critica",
            [f"Puerto {p} ({DB_PORTS[p]}) accesible públicamente" for p in db_open],
            "Un motor de base de datos accesible desde internet permite intentos de acceso directo, fuerza bruta de credenciales y, si está mal configurado, exfiltración de datos sin pasar por la aplicación.",
            "Cierra el puerto en el firewall y enlaza el servicio solo a la red interna (localhost/VPN). Nunca expongas una base de datos directamente.",
            [REF["exposed_svc"], REF["misconfig"]],
        ))

    # 2. Administración remota expuesta (RDP/FTP/Telnet altos; SSH medio).
    admin_open = {p: s for p, s in ports.items() if p in ADMIN_PORTS}
    if admin_open:
        high = any(p in (21, 23, 3389) for p in admin_open)
        routes.append(_route(
            "remote_admin",
            "Servicios de administración remota expuestos",
            "alta" if high else "media",
            [f"Puerto {p} ({ADMIN_PORTS[p]}) abierto" for p in admin_open],
            "Los servicios de administración remota son objetivo constante de fuerza bruta y explotación. FTP y Telnet además transmiten credenciales en claro.",
            "Restringe el acceso por IP/VPN, usa claves en lugar de contraseñas (SSH) y elimina FTP/Telnet en favor de SFTP.",
            [REF["exposed_svc"], REF["cleartext"]],
        ))

    # 3. Puerto HTTP alternativo abierto SIN HSTS → tráfico interceptable.
    alt_open = {p: s for p, s in ports.items() if p in ALT_HTTP_PORTS}
    if alt_open and "hsts" in failed:
        routes.append(_route(
            "alt_http_no_hsts",
            "Servicio HTTP alternativo sin forzado de HTTPS",
            "media",
            [f"Puerto {p} ({ALT_HTTP_PORTS[p]}) abierto" for p in alt_open] + ["HSTS ausente en el dominio"],
            "Un servicio alterno accesible por HTTP sin HSTS puede servirse en claro, permitiendo interceptación o downgrade de la conexión.",
            "Fuerza HTTPS en todos los servicios y publica HSTS. Cierra los puertos alternativos si no se usan.",
            [REF["cleartext"], REF["crypto"]],
        ))

    # 4. Subdominio sensible vivo + debilidades web (XSS/clickjacking).
    sensitive = [s for s in subs if any(k in s.split(".")[0] for k in SENSITIVE_KEYWORDS)]
    web_weak = failed & {"csp", "xfo"}
    if sensitive and web_weak:
        missing = []
        if "csp" in failed:
            missing.append("Content-Security-Policy ausente")
        if "xfo" in failed:
            missing.append("X-Frame-Options ausente")
        routes.append(_route(
            "sensitive_surface",
            "Superficie sensible con controles web débiles",
            "alta",
            sensitive[:6] + missing,
            "Subdominios de administración/acceso expuestos, combinados con la falta de CSP o X-Frame-Options, amplían el riesgo de XSS y clickjacking justo donde más duele: paneles con privilegios.",
            "Prioriza endurecer los subdominios sensibles: define una CSP estricta y X-Frame-Options/`frame-ancestors`. Considera exponerlos solo tras VPN.",
            [REF["xss"], REF["clickjack"], REF["misconfig"]],
        ))

    # 5. Suplantación de correo (SPF/DMARC).
    if "spf" in failed or "dmarc" in failed:
        both = "spf" in failed and "dmarc" in failed
        ev = []
        if "spf" in failed:
            ev.append("Registro SPF ausente")
        if "dmarc" in failed:
            ev.append("Registro DMARC ausente")
        routes.append(_route(
            "email_spoofing",
            "Dominio suplantable en campañas de correo",
            "alta" if both else "media",
            ev,
            "Sin SPF/DMARC, un atacante puede enviar correos que parecen venir de tu dominio: phishing dirigido a tus clientes, fraude al CEO (BEC) y daño de marca. Es de los vectores más usados y baratos.",
            "Publica SPF (`v=spf1 ...`) y DMARC (`_dmarc`, `v=DMARC1; p=quarantine`). Empieza en `p=none` para monitorear y endurece a `quarantine`/`reject`.",
            [REF["spoof"]],
        ))

    # 6. Transporte débil (cert inválido o TLS viejo).
    if "ssl_valid" in failed or "tls_version" in failed:
        ev = []
        if "ssl_valid" in failed:
            ev.append("Certificado TLS inválido o no confiable")
        if "tls_version" in failed:
            ev.append("Versión de TLS obsoleta")
        routes.append(_route(
            "weak_transport",
            "Transporte cifrado débil",
            "alta",
            ev,
            "Un certificado inválido o versiones antiguas de TLS permiten interceptación (man-in-the-middle) y minan la confianza del navegador de tus usuarios.",
            "Instala un certificado válido (Let's Encrypt) y habilita solo TLS 1.2/1.3, deshabilitando 1.0/1.1.",
            [REF["crypto"]],
        ))

    # 7. Superficie amplia (muchos subdominios vivos) → más que vigilar.
    if len(subs) >= 15:
        routes.append(_route(
            "broad_surface",
            "Superficie de ataque amplia",
            "baja",
            [f"{len(subs)} subdominios vivos detectados"],
            "Cada subdominio vivo es una puerta potencial. Una superficie amplia sin inventario claro facilita que un servicio olvidado (shadow IT) quede sin parchear.",
            "Mantén un inventario de subdominios, retira los que no uses y activa el monitoreo continuo sobre los críticos.",
            [REF["exposed_svc"]],
        ))

    routes.sort(key=lambda r: SEV_RANK.get(r["severity"], 0), reverse=True)
    return routes
