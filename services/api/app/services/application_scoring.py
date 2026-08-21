"""
services/application_scoring.py

Application Score: decide si vale la pena aplicar a una oferta, dado el PERFIL DE
BÚSQUEDA del usuario. RULES-FIRST (determinista, verificable, barato): la única
parte con IA es analizar la oferta (`cv_service.analyze_offer`); la puntuación y
el veredicto son reglas puras — clave para la economía por aplicación y para
poder decir "aplicaciones verificables" (ver SENTRA_JOB_AGENT_STRATEGY.md).

Ponderación (suma 100):
  requisitos obligatorios 35 · deseables 10 · ubicación/modalidad 20 ·
  seniority 15 · idioma 10 · keywords ATS 10.
Deal-breakers (duros): fuerzan veredicto "avoid" y limitan el score.
"""
import re

_SENIORITY_RANK = {"junior": 0, "mid": 1, "senior": 2}
_YEARS_RE = re.compile(r"(\d{1,2})\s*\+?\s*(?:años|anos|years|year|yrs)", re.IGNORECASE)


def _norm(s: object) -> str:
    return str(s or "").strip().lower()


def _covered_fraction(items: list, techs_lower: list[str]) -> float | None:
    """Fracción de `items` (requisitos de la oferta) que menciona alguna tech del usuario."""
    if not items:
        return None  # sin datos → neutral (no penaliza ni premia)
    hit = 0
    for it in items:
        itl = _norm(it)
        if any(t and t in itl for t in techs_lower):
            hit += 1
    return hit / len(items)


def _max_required_years(items: list) -> int | None:
    years = [int(m) for it in items for m in _YEARS_RE.findall(_norm(it))]
    return max(years) if years else None


def _seniority_score(prof: int | None, off: int | None) -> float:
    if prof is None or off is None:
        return 0.6
    if off <= prof:
        return 1.0            # encaja o sobra-calificado
    return 0.3 if off - prof == 1 else 0.0


def _location_modality_score(profile: dict, analysis: dict) -> float:
    prof_mods = [_norm(m) for m in profile.get("modalities", [])]
    off_mod = _norm(analysis.get("modalidad"))
    remote = off_mod in ("remoto", "remote")
    mod_ok = 1.0 if (not prof_mods or off_mod in ("", "no especificado") or off_mod in prof_mods) else 0.0

    locs = [_norm(location) for location in profile.get("locations", [])]
    off_loc = _norm(analysis.get("ubicacion"))
    loc_ok = 1.0 if (not locs or remote or any(location and location in off_loc for location in locs)) else 0.3
    return (mod_ok + loc_ok) / 2


def _language_score(profile: dict, analysis: dict) -> float:
    idioma = _norm(analysis.get("idioma_del_cv"))  # es|en
    langs = " ".join(_norm(x) for x in profile.get("languages", []))
    if not idioma or not langs:
        return 0.7
    if idioma == "en" and ("en" in langs.split() or "ingl" in langs):
        return 1.0
    if idioma == "es" and ("es" in langs.split() or "espa" in langs):
        return 1.0
    return 0.5


_DIM_LABEL = {
    "skills": "skills",
    "experiencia": "experiencia",
    "seniority": "seniority",
    "idioma": "idioma",
    "ubicacion": "ubicación",
}


def _build_explanation(skills_frac: float | None, compat: dict, risks: list[dict], deal_breakers: list, verdict: str) -> str:
    """Explicación DETERMINISTA del veredicto (sin IA): % de obligatorios,
    fortaleza principal y brecha principal con matiz según el veredicto."""
    if deal_breakers:
        return "No recomendado: " + deal_breakers[0].rstrip(".") + "."
    base = (
        "La oferta no lista requisitos obligatorios claros."
        if skills_frac is None
        else f"Cumples el {round(skills_frac * 100)}% de los requisitos obligatorios."
    )
    parts = [base]
    strong = [_DIM_LABEL[k] for k, v in compat.items() if v >= 85]
    if strong:
        parts.append("Tu punto fuerte: " + ", ".join(strong[:3]) + ".")
    high = [r["text"] for r in risks if r["level"] == "high"]
    if high:
        closing = "El encaje general es suficiente para intentarlo." if verdict != "avoid" else "La brecha es grande para este puesto."
        parts.append(f"Brecha principal: {high[0]}. {closing}")
    elif verdict == "apply":
        parts.append("Buen encaje: vale la pena aplicar.")
    return " ".join(parts)


def score_application(profile: dict, analysis: dict) -> dict:
    techs = [_norm(t) for t in profile.get("technologies", []) if t]
    obligatorios = analysis.get("requisitos_obligatorios", []) or []
    deseables = analysis.get("requisitos_deseables", []) or []
    keywords = analysis.get("palabras_clave_ats", []) or []

    deal_breakers: list[str] = []

    # ── Deal-breakers (duros) ──
    prof_mods = [_norm(m) for m in profile.get("modalities", [])]
    off_mod = _norm(analysis.get("modalidad"))
    if prof_mods and off_mod not in ("", "no especificado") and off_mod not in prof_mods:
        deal_breakers.append(f"Modalidad «{analysis.get('modalidad')}» (tú quieres {', '.join(profile.get('modalities', []))})")

    off_company = _norm(analysis.get("empresa"))
    for bc in profile.get("blocked_companies", []):
        if _norm(bc) and off_company and _norm(bc) in off_company:
            deal_breakers.append(f"Empresa en tu lista de bloqueadas: {analysis.get('empresa')}")

    haystack = " ".join(
        [_norm(analysis.get("puesto")), _norm(analysis.get("area_dominante"))]
        + [_norm(x) for x in obligatorios]
    )
    for db in profile.get("deal_breakers", []):
        if _norm(db) and _norm(db) in haystack:
            deal_breakers.append(f"Coincide con lo que NO quieres: «{db}»")

    prof_sen = _SENIORITY_RANK.get(_norm(profile.get("seniority")))
    off_sen = _SENIORITY_RANK.get(_norm(analysis.get("seniority")))
    if prof_sen is not None and off_sen is not None and off_sen - prof_sen >= 1:
        deal_breakers.append(f"Seniority por encima de tu perfil (pide {analysis.get('seniority')})")

    req_years = _max_required_years(obligatorios + deseables)
    max_exp = profile.get("max_required_experience")
    if max_exp is not None and req_years is not None and req_years > max_exp:
        deal_breakers.append(f"Pide {req_years} años de experiencia (tu tope es {max_exp})")

    # ── Puntuación ponderada ──
    def weighted(frac: float | None, weight: int, default: float = 0.6) -> int:
        return round((default if frac is None else frac) * weight)

    breakdown = {
        "requisitos_obligatorios": weighted(_covered_fraction(obligatorios, techs), 35),
        "requisitos_deseables": weighted(_covered_fraction(deseables, techs), 10, default=0.5),
        "ubicacion_modalidad": weighted(_location_modality_score(profile, analysis), 20),
        "seniority": weighted(_seniority_score(prof_sen, off_sen), 15),
        "idioma": weighted(_language_score(profile, analysis), 10),
        "keywords_ats": weighted(_covered_fraction(keywords, techs), 10, default=0.5),
    }
    score = sum(breakdown.values())

    # ── Razones (para "¿por qué aplicar / NO aplicar?") ──
    reasons_apply: list[str] = []
    reasons_avoid: list[str] = []
    for it in obligatorios:
        cubierto = any(t in _norm(it) for t in techs)
        (reasons_apply if cubierto else reasons_avoid).append(
            ("Cumples: " if cubierto else "Requisito no cubierto: ") + str(it)
        )

    # ── Veredicto ──
    if deal_breakers:
        verdict = "avoid"
        score = min(score, 45)
    elif score >= 80:
        verdict = "apply"
    elif score >= 65:
        verdict = "maybe"
    else:
        verdict = "avoid"

    # ── Compatibilidad por dimensión (0-100), riesgos y explicación ──
    skills_frac = _covered_fraction(obligatorios, techs)  # cobertura de obligatorios
    user_years = profile.get("user_years_experience")
    if req_years and isinstance(user_years, int):
        exp_pct = 100 if req_years <= 0 else min(100, round(user_years / req_years * 100))
    else:
        d = _covered_fraction(deseables, techs)
        exp_pct = round((d if d is not None else 0.7) * 100)

    compatibility = {
        "skills": round((skills_frac if skills_frac is not None else 0.7) * 100),
        "experiencia": exp_pct,
        "seniority": round(_seniority_score(prof_sen, off_sen) * 100),
        "idioma": round(_language_score(profile, analysis) * 100),
        "ubicacion": round(_location_modality_score(profile, analysis) * 100),
    }

    risks: list[dict] = []
    for it in obligatorios:
        if not any(t and t in _norm(it) for t in techs):
            risks.append({"text": f"{it} — requerido, no cubierto", "level": "high"})
    if prof_sen is not None and off_sen is not None and off_sen > prof_sen:
        risks.append({
            "text": f"Piden seniority {analysis.get('seniority')}, tu perfil es {profile.get('seniority') or 'sin definir'}",
            "level": "high" if off_sen - prof_sen >= 1 else "medium",
        })
    if req_years and isinstance(user_years, int) and user_years < req_years:
        risks.append({
            "text": f"Piden {req_years} años de experiencia; tienes {user_years}",
            "level": "high" if (max_exp is not None and req_years > max_exp) else "medium",
        })
    if compatibility["idioma"] <= 50:
        risks.append({"text": "El idioma de la oferta no está confirmado en tu perfil", "level": "medium"})
    if compatibility["ubicacion"] <= 50:
        risks.append({"text": "Ubicación/modalidad no coincide con tus preferencias", "level": "high"})
    risks = risks[:6]

    explanation = _build_explanation(skills_frac, compatibility, risks, deal_breakers, verdict)

    return {
        "score": max(0, min(100, round(score))),
        "verdict": verdict,
        "breakdown": breakdown,
        "compatibility": compatibility,
        "risks": risks,
        "explanation": explanation,
        "deal_breakers": deal_breakers,
        "reasons_avoid": (deal_breakers + reasons_avoid)[:6],
        "reasons_apply": reasons_apply[:6],
        "company": analysis.get("empresa", "") or "",
        "role": analysis.get("puesto", "") or "",
    }
