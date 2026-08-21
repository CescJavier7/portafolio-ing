"""
Tests del diagnóstico de búsqueda (services/search_insights.py): embudo, tasas y
observaciones. Determinista; se inyecta `now` para no depender del reloj.
"""
from datetime import datetime, timedelta, timezone

from app.services import search_insights as si

NOW = datetime(2026, 8, 20, 12, 0, 0, tzinfo=timezone.utc)


def _app(status, score, days_ago):
    return {"status": status, "score": score, "created_at": NOW - timedelta(days=days_ago)}


def test_empty_history_is_no_data():
    r = si.compute_insights([], now=NOW)
    assert r["total"] == 0
    assert r["insights"] == [{"code": "no_data", "level": "info", "value": 0}]


def test_funnel_and_rates():
    apps = [
        _app("applied", 85, 1),
        _app("interview", 90, 3),
        _app("rejected", 60, 5),
        _app("offer", 88, 10),
        _app("applied", 70, 2),
        _app("saved", None, 1),
    ]
    r = si.compute_insights(apps, now=NOW)
    assert r["total"] == 6
    assert r["funnel"]["saved"] == 1
    assert r["funnel"]["interview"] == 1
    assert r["funnel"]["offer"] == 1
    # applied = enviadas (applied+interview+offer+rejected) = 5
    assert r["applied"] == 5
    # respondidas = interview+offer+rejected = 3 → 0.6
    assert r["response_rate"] == 0.6
    # entrevista = interview+offer = 2 → 0.4
    assert r["interview_rate"] == 0.4
    assert r["offer_rate"] == 0.2


def test_score_correlation_insight():
    apps = [
        _app("interview", 90, 3),
        _app("offer", 88, 4),
        _app("rejected", 60, 5),
        _app("rejected", 58, 6),
    ]
    r = si.compute_insights(apps, now=NOW)
    codes = {i["code"] for i in r["insights"]}
    # avg positivo (~89) vs negativo (~59) → gap grande → correlación de score.
    assert "score_correlation" in codes


def test_low_activity_insight():
    apps = [_app("applied", 70, 40)]  # última actividad hace 40 días
    r = si.compute_insights(apps, now=NOW)
    codes = {i["code"] for i in r["insights"]}
    assert "low_activity" in codes


def test_good_momentum_insight():
    apps = [_app("applied", 70, d) for d in (1, 2, 3)]  # 3 en 7 días
    r = si.compute_insights(apps, now=NOW)
    codes = {i["code"] for i in r["insights"]}
    assert "good_momentum" in codes


def test_no_scores_avg_is_none():
    apps = [_app("saved", None, 1), _app("saved", None, 2)]
    r = si.compute_insights(apps, now=NOW)
    assert r["avg_score"] is None
    assert r["applied"] == 0
