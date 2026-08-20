"""
services/application_firewall.py

Application Firewall — protege al candidato ANTES de aplicar. Dos capas, ambas
DETERMINISTAS (rules-first, cero IA, cero coste, verificable):

  1. Scam Detector  → escanea el TEXTO CRUDO de la oferta buscando patrones de
     fraude laboral (pago por adelantado, cripto, datos sensibles, sueldos
     absurdos, contacto solo por WhatsApp, correos gratuitos como único canal,
     acortadores de enlaces, empresa anónima). Trabaja sobre el texto crudo a
     propósito: el análisis con IA descarta contacto y salario, justo lo que
     delata la estafa.

  2. Duplicate Killer → evita gastar una aplicación (y la cuota de IA) en una
     oferta casi idéntica a otra a la que el usuario YA se postuló. Similitud
     por tokens (Jaccard) sobre empresa+puesto, contra su propio historial.

Se expone vía /agent/evaluate. Si el firewall marca DANGER, el endpoint puede
cortar en seco y ahorrarse la llamada al LLM (no se evalúa una estafa).

Seguridad: el texto de la oferta es INPUT NO CONFIABLE. Aquí solo se leen
patrones (regex acotadas, sin eval, sin red); nada se ejecuta ni interpola.
"""
import re
import unicodedata

_SEVERITY_WEIGHT = {"high": 40, "medium": 20, "low": 10}

# Proveedores de correo gratuitos: legítimos para personas, sospechosos como
# ÚNICO canal de una "empresa" que contrata.
_FREE_EMAIL_DOMAINS = {
    "gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.es",
    "hotmail.es", "live.com", "proton.me", "protonmail.com", "icloud.com",
    "gmx.com", "aol.com", "mail.com", "yandex.com",
}
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})")
_SHORTENER_RE = re.compile(
    r"\b(?:bit\.ly|tinyurl\.com|cutt\.ly|is\.gd|t\.co|rebrand\.ly|shorturl\.at|"
    r"rb\.gy|ow\.ly|acortar\.link|goo\.gl)\b",
    re.IGNORECASE,
)
# Monto + periodo corto (día/semana/hora) → gancho de "gana mucho en poco".
_MONEY_PERIOD_RE = re.compile(
    r"(?:\$|usd|us\$)\s*([\d][\d.,]{2,})\s*(?:usd)?\s*(?:/|por|al|a la|a el|cada)?\s*"
    r"(dia|día|semana|hora|day|week|hour)",
    re.IGNORECASE,
)


def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def _norm_text(s: str) -> str:
    """minúsculas + sin acentos → matching robusto (día==dia, comisión==comision)."""
    return _strip_accents(str(s or "").lower())


# Reglas de estafa. Cada una: (code, severity, [frases que, si aparecen, disparan]).
# Las frases ya vienen sin acentos y en minúscula (se comparan sobre _norm_text).
_SCAM_RULES: list[tuple[str, str, list[str]]] = [
    ("advance_fee", "high", [
        "pago de inscripcion", "cuota de inscripcion", "cuota de ingreso",
        "deposito inicial", "pago inicial", "pago por adelantado", "adelanto de dinero",
        "training fee", "registration fee", "pago para procesar", "pago para activar",
        "compra del kit", "compra de kit", "kit de bienvenida", "compra de material",
        "pago del uniforme", "pagar por el puesto", "tarifa de procesamiento",
        "envia dinero", "enviar dinero", "abonar una cuota",
    ]),
    ("crypto_payment", "high", [
        "pago en bitcoin", "pago en cripto", "pago en criptomoneda", "pago en usdt",
        "trust wallet", "metamask", "billetera cripto", "wallet de cripto",
        "invierte en cripto", "inversion en cripto", "retira en usdt", "cobra en usdt",
    ]),
    ("sensitive_data", "high", [
        "numero de tarjeta", "datos de tu tarjeta", "tarjeta de credito para",
        "cvv", "clave dinamica", "contrasena de tu", "clave de tu banco",
        "credenciales de tu banco", "pin de tu tarjeta", "codigo de verificacion de tu",
        "foto de tu cedula" , "copia de tu cedula", "foto de tu tarjeta",
    ]),
    ("instant_hire", "medium", [
        "contratacion inmediata", "sin entrevista", "no requiere entrevista",
        "empieza hoy mismo", "empiezas hoy", "trabajo garantizado", "ingreso inmediato",
        "no necesitas experiencia", "sin experiencia necesaria", "cupos limitados hoy",
    ]),
    ("messaging_only", "medium", [
        "escribenos al whatsapp", "escribenos por whatsapp", "solo por whatsapp",
        "contactanos por telegram", "escribe al telegram", "unete al grupo de telegram",
        "postula por whatsapp", "envia whatsapp al", "aplica por whatsapp",
    ]),
    ("anonymous_company", "low", [
        "importante empresa reconocida", "prestigiosa empresa", "empresa lider del sector",
        "reconocida multinacional", "importante compania del rubro",
    ]),
]


def scan_posting(job_posting: str) -> dict:
    """
    Escanea el texto crudo de la oferta. Devuelve:
      { risk_level: safe|caution|danger, risk_score: 0-100, flags: [ ... ] }
    Cada flag: { code, severity, matched } — la etiqueta legible la pone el
    frontend por `code` (i18n es/en).
    """
    raw = str(job_posting or "")
    norm = _norm_text(raw)
    flags: list[dict] = []

    def add(code: str, severity: str, matched: str = "") -> None:
        if not any(f["code"] == code for f in flags):
            flags.append({"code": code, "severity": severity, "matched": matched[:120]})

    # ── Reglas por frase ──
    for code, severity, phrases in _SCAM_RULES:
        for p in phrases:
            if p in norm:
                add(code, severity, p)
                break

    # ── Sueldo absurdo: monto alto por día/semana/hora ──
    for amount_raw, period in _MONEY_PERIOD_RE.findall(raw):
        amount = _parse_amount(amount_raw)
        period_n = _norm_text(period)
        threshold = {
            "hora": 80, "hour": 80,
            "dia": 400, "day": 400,
            "semana": 2500, "week": 2500,
        }.get(period_n)
        if threshold and amount >= threshold:
            add("unreal_salary", "high", f"{amount_raw}/{period}")
            break

    # ── Acortadores de enlaces (phishing) ──
    if _SHORTENER_RE.search(raw):
        add("url_shortener", "medium")

    # ── Correos: si HAY correos y TODOS son gratuitos → único canal informal ──
    domains = [d.lower() for d in _EMAIL_RE.findall(raw)]
    if domains and all(d in _FREE_EMAIL_DOMAINS for d in domains):
        add("free_email_only", "medium", domains[0])

    # ── Cripto sin contexto de pago pero con gancho de inversión/ganancias ──
    if not any(f["code"] == "crypto_payment" for f in flags):
        crypto_terms = ("bitcoin", "usdt", "criptomoneda", "cripto ", "binance", "wallet")
        money_bait = ("ganancias", "inversion", "duplica", "rendimiento diario", "retiro diario")
        if any(t in norm for t in crypto_terms) and any(m in norm for m in money_bait):
            add("crypto_payment", "high", "cripto + ganancias")

    # ── Puntuación y nivel ──
    score = min(100, sum(_SEVERITY_WEIGHT.get(f["severity"], 0) for f in flags))
    has_high = any(f["severity"] == "high" for f in flags)
    if has_high or score >= 50:
        level = "danger"
    elif score >= 20:
        level = "caution"
    else:
        level = "safe"

    return {"risk_level": level, "risk_score": score, "flags": flags}


def _parse_amount(raw: str) -> float:
    """'5.000' / '5,000' / '5000' → 5000.0. Heurística ES/EN para separadores."""
    s = raw.strip()
    # Si hay coma y punto, el último es el decimal; quitamos el otro como millar.
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    else:
        # Solo un separador: si deja grupos de 3, es de millar → se quita.
        s = re.sub(r"[.,](?=\d{3}\b)", "", s)
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


# ---------------------------------------------------------------------------
# Duplicate Killer
# ---------------------------------------------------------------------------

_STOP_TOKENS = {
    "sa", "inc", "llc", "ltda", "ltd", "cia", "corp", "co", "the", "de", "del",
    "la", "el", "los", "las", "and", "y", "for", "en", "sas", "srl", "gmbh",
}
# Sinónimos → forma canónica, para que "Backend Engineer" y "Backend Developer"
# (misma vacante en la práctica) no se separen por un simple cambio de palabra.
_SYNONYMS = {
    "engineer": "dev", "developer": "dev", "dev": "dev", "programmer": "dev",
    "programador": "dev", "programadora": "dev", "desarrollador": "dev",
    "desarrolladora": "dev", "ingeniero": "dev", "ingeniera": "dev",
    "frontend": "front", "front": "front",
    "backend": "back", "back": "back",
    "fullstack": "full", "full": "full",
}
_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokens(s: str) -> set[str]:
    out: set[str] = set()
    for t in _TOKEN_RE.findall(_norm_text(s)):
        if t in _STOP_TOKENS or len(t) <= 1:
            continue
        out.add(_SYNONYMS.get(t, t))
    return out


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def find_duplicate(company: str, role: str, existing: list[dict], threshold: float = 0.8) -> dict | None:
    """
    Busca en el historial (`existing`: [{company, role, status}]) una postulación
    casi idéntica a (company, role). Similitud = 0.6·empresa + 0.4·puesto.
    Devuelve el mejor match ≥ threshold, o None. Determinista.
    """
    ct, rt = _tokens(company), _tokens(role)
    if not ct and not rt:
        return None

    best: dict | None = None
    best_sim = threshold
    for e in existing:
        ec, er = _tokens(e.get("company", "")), _tokens(e.get("role", ""))
        sim = 0.6 * _jaccard(ct, ec) + 0.4 * _jaccard(rt, er)
        # Si la empresa coincide 100%, basta con puesto muy parecido.
        if _jaccard(ct, ec) >= 0.99:
            sim = max(sim, 0.6 + 0.4 * _jaccard(rt, er))
        if sim >= best_sim:
            best_sim = sim
            best = {
                "company": e.get("company", ""),
                "role": e.get("role", ""),
                "status": e.get("status", ""),
                "similarity": round(sim * 100),
            }
    return best
