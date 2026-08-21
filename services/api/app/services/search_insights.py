"""
services/search_insights.py

Learning Loop (FASE 4) — Diagnóstico de la búsqueda. DETERMINISTA (rules-first,
sin IA, verificable): agrega las postulaciones del usuario y devuelve su embudo,
tasas de conversión y observaciones accionables. Es la base del "aprende": con
esto Sentra puede decir a la persona QUÉ está funcionando y qué no.

Seguridad: solo agrega datos que ya son del usuario (el router filtra por
`organization`/`user_id`). No recibe input libre → sin superficie de inyección.
Devuelve SOLO agregados (nunca el contenido de una postulación) → sin fuga de PII.
"""
from datetime import datetime, timezone

# Estados que cuentan como "ya apliqué" (enviada), y los que son una respuesta.
_APPLIED = {"applied", "interview", "offer", "rejected"}
_RESPONDED = {"interview", "offer", "rejected"}
_POSITIVE = {"interview", "offer"}


def _avg(nums: list[float]) -> float | None:
    return round(sum(nums) / len(nums), 1) if nums else None


def _rate(part: int, whole: int) -> float:
    return round(part / whole, 3) if whole else 0.0


def compute_insights(apps: list[dict], now: datetime | None = None) -> dict:
    """
    apps: [{status, score: int|None, created_at: datetime}]. Todo ya filtrado por
    dueño. Devuelve el diagnóstico completo (agregados + observaciones por código
    para que el frontend las traduzca es/en).
    """
    now = now or datetime.now(timezone.utc)
    total = len(apps)

    funnel = {s: 0 for s in ("saved", "applied", "interview", "offer", "rejected")}
    for a in apps:
        st = str(a.get("status") or "saved")
        if st in funnel:
            funnel[st] += 1

    applied = sum(1 for a in apps if a.get("status") in _APPLIED)
    responded = sum(1 for a in apps if a.get("status") in _RESPONDED)
    positive = sum(1 for a in apps if a.get("status") in _POSITIVE)
    offers = funnel["offer"]

    scores_all = [a["score"] for a in apps if isinstance(a.get("score"), int)]
    scores_pos = [a["score"] for a in apps if a.get("status") in _POSITIVE and isinstance(a.get("score"), int)]
    scores_neg = [a["score"] for a in apps if a.get("status") == "rejected" and isinstance(a.get("score"), int)]

    # Actividad temporal (por created_at; robusto a tz-naive antiguos).
    def _age_days(dt) -> float | None:
        if not isinstance(dt, datetime):
            return None
        d = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        return (now - d).total_seconds() / 86400

    ages = [d for d in (_age_days(a.get("created_at")) for a in apps) if d is not None]
    applied_7d = sum(1 for d in ages if d <= 7)
    applied_30d = sum(1 for d in ages if d <= 30)
    last_activity_days = round(min(ages)) if ages else None

    response_rate = _rate(responded, applied)
    interview_rate = _rate(positive, applied)
    offer_rate = _rate(offers, applied)
    avg_pos, avg_neg = _avg(scores_pos), _avg(scores_neg)

    # ── Observaciones (deterministas). code → el frontend traduce; value = nº. ──
    insights: list[dict] = []
    if total == 0:
        insights.append({"code": "no_data", "level": "info", "value": 0})
    else:
        if applied_7d >= 3:
            insights.append({"code": "good_momentum", "level": "good", "value": applied_7d})
        elif last_activity_days is not None and last_activity_days > 14:
            insights.append({"code": "low_activity", "level": "warn", "value": last_activity_days})

        if funnel["saved"] >= 3 and funnel["saved"] > applied:
            insights.append({"code": "update_statuses", "level": "info", "value": funnel["saved"]})

        if applied >= 5:
            if response_rate < 0.15:
                insights.append({"code": "low_response", "level": "warn", "value": round(response_rate * 100)})
            elif response_rate >= 0.30:
                insights.append({"code": "strong_response", "level": "good", "value": round(response_rate * 100)})

        if avg_pos is not None and avg_neg is not None and (avg_pos - avg_neg) >= 8:
            insights.append({"code": "score_correlation", "level": "good", "value": round(avg_pos - avg_neg)})

        if positive > 0:
            insights.append({"code": "interview_stage", "level": "good", "value": positive})

    return {
        "total": total,
        "funnel": funnel,
        "applied": applied,
        "response_rate": response_rate,
        "interview_rate": interview_rate,
        "offer_rate": offer_rate,
        "avg_score": _avg(scores_all),
        "avg_score_positive": avg_pos,
        "avg_score_rejected": avg_neg,
        "applied_last_7d": applied_7d,
        "applied_last_30d": applied_30d,
        "last_activity_days": last_activity_days,
        "insights": insights,
    }
