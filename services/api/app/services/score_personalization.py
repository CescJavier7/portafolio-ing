"""
services/score_personalization.py

Learning Loop (FASE 4, cierre) — personaliza el Application Score con el HISTORIAL
del usuario. DETERMINISTA, transparente, ACOTADO y REGULARIZADO:

- Aprende de resultados REALES: qué palabras del puesto se repiten en tus
  postulaciones que llegaron a ENTREVISTA/OFERTA (positivas) frente a las
  RECHAZADAS (negativas).
- Solo se activa con señal suficiente (`_MIN_OUTCOMES`): con pocos datos NO toca
  nada (evita sobreajustar a 2 casos).
- Ajuste ACOTADO (`_MAX_DELTA`): nunca puede voltear una decisión por sí solo, y
  jamás anula un deal-breaker ni al firewall (esos son autoritativos aguas arriba).
- Transparente: devuelve las razones ("tus entrevistas suelen ser de 'backend'").

No recibe input libre; opera sobre datos ya del usuario (el router filtra por
`user_id`). Sin IA, sin red, sin PII de salida (solo palabras de puesto agregadas).
"""
import re

_POSITIVE = {"interview", "offer"}
_NEGATIVE = {"rejected"}

_MIN_OUTCOMES = 4      # nº mínimo de resultados resueltos para activar
_MIN_TOKEN_HITS = 2    # una palabra debe repetirse para contar (no casos únicos)
_GAP = 0.34            # diferencia mínima de frecuencia positiva vs negativa
_MAX_KEYWORDS = 3      # tope de palabras premiadas / penalizadas
_PER_KEYWORD = 2       # puntos por palabra coincidente
_MAX_DELTA = 6         # tope del ajuste total (±)

# Palabras demasiado comunes para diferenciar (ruido en títulos de puesto).
_STOP = {
    "developer", "engineer", "ingeniero", "desarrollador", "analyst", "analista",
    "specialist", "especialista", "senior", "junior", "mid", "ssr", "sr", "jr",
    "de", "del", "la", "el", "y", "and", "the", "for", "en", "software", "it",
    "remote", "remoto", "hibrido", "presencial", "full", "time", "tiempo", "completo",
}
_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> set[str]:
    return {t for t in _TOKEN_RE.findall((text or "").lower()) if t not in _STOP and len(t) > 2}


def learn_preferences(apps: list[dict]) -> dict:
    """
    apps: [{status, role}]. Devuelve el modelo de preferencias aprendido:
      { active, n_outcomes, boost: [palabras], penalty: [palabras] }
    'boost' = palabras de puesto que correlacionan con entrevistas/ofertas;
    'penalty' = las que correlacionan con rechazos.
    """
    pos = [a for a in apps if a.get("status") in _POSITIVE]
    neg = [a for a in apps if a.get("status") in _NEGATIVE]
    n_outcomes = len(pos) + len(neg)
    if n_outcomes < _MIN_OUTCOMES:
        return {"active": False, "n_outcomes": n_outcomes, "boost": [], "penalty": []}

    def _freq(group: list[dict]) -> dict[str, int]:
        counts: dict[str, int] = {}
        for a in group:
            for tok in _tokens(a.get("role", "")):
                counts[tok] = counts.get(tok, 0) + 1
        return counts

    pos_freq, neg_freq = _freq(pos), _freq(neg)
    np_, nn = max(1, len(pos)), max(1, len(neg))

    scored: list[tuple[str, float, int]] = []  # (token, gap, hits)
    for tok in set(pos_freq) | set(neg_freq):
        pc, nc = pos_freq.get(tok, 0), neg_freq.get(tok, 0)
        if pc + nc < _MIN_TOKEN_HITS:
            continue
        gap = pc / np_ - nc / nn
        scored.append((tok, gap, pc + nc))

    boost = [t for t, gap, _ in sorted(scored, key=lambda x: x[1], reverse=True) if gap >= _GAP][:_MAX_KEYWORDS]
    penalty = [t for t, gap, _ in sorted(scored, key=lambda x: x[1]) if gap <= -_GAP][:_MAX_KEYWORDS]

    return {"active": bool(boost or penalty), "n_outcomes": n_outcomes, "boost": boost, "penalty": penalty}


def personalize(base: dict, prefs: dict, analysis: dict) -> dict:
    """
    Aplica el ajuste personalizado sobre el resultado de `score_application`.
    Devuelve `{delta, reasons, active, n_outcomes}` y MODIFICA `base['score']`
    (acotado 0-100). No reescribe el veredicto si hay deal-breakers (avoid manda);
    solo recalcula el veredicto por bandas cuando la decisión era limpia.
    """
    result = {"active": bool(prefs.get("active")), "delta": 0, "reasons": [], "n_outcomes": prefs.get("n_outcomes", 0)}
    if not prefs.get("active"):
        return result

    offer_tokens = _tokens(analysis.get("puesto", "")) | _tokens(analysis.get("area_dominante", ""))
    delta = 0
    reasons: list[str] = []
    for kw in prefs.get("boost", []):
        if kw in offer_tokens:
            delta += _PER_KEYWORD
            reasons.append(f"+{_PER_KEYWORD} · tus entrevistas suelen ser de «{kw}»")
    for kw in prefs.get("penalty", []):
        if kw in offer_tokens:
            delta -= _PER_KEYWORD
            reasons.append(f"-{_PER_KEYWORD} · sueles ser rechazado/a en «{kw}»")

    delta = max(-_MAX_DELTA, min(_MAX_DELTA, delta))
    if delta == 0:
        return result

    new_score = max(0, min(100, base["score"] + delta))
    base["score"] = new_score
    # Recalcular veredicto SOLO si la decisión no estaba forzada por deal-breakers.
    if not base.get("deal_breakers"):
        base["verdict"] = "apply" if new_score >= 80 else "maybe" if new_score >= 65 else "avoid"

    result.update({"delta": delta, "reasons": reasons[:4]})
    return result
