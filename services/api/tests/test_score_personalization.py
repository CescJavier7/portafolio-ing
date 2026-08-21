"""
Tests de la personalización del score (services/score_personalization.py):
aprendizaje regularizado y acotado del historial. Determinista.
"""
from app.services import score_personalization as sp


def _history():
    # 3 positivos "backend", 2 rechazos "fullstack" → señal clara.
    return [
        {"status": "interview", "role": "Backend Developer"},
        {"status": "offer", "role": "Backend Engineer"},
        {"status": "interview", "role": "Backend Python"},
        {"status": "rejected", "role": "Fullstack Developer"},
        {"status": "rejected", "role": "Fullstack Engineer"},
    ]


def test_learns_boost_and_penalty():
    prefs = sp.learn_preferences(_history())
    assert prefs["active"] is True
    assert prefs["n_outcomes"] == 5
    assert "backend" in prefs["boost"]
    assert "fullstack" in prefs["penalty"]


def test_insufficient_data_is_inactive():
    prefs = sp.learn_preferences(_history()[:2])  # solo 2 resultados
    assert prefs["active"] is False
    assert prefs["boost"] == [] and prefs["penalty"] == []


def test_boost_applies_positive_delta():
    prefs = sp.learn_preferences(_history())
    base = {"score": 72, "verdict": "maybe", "deal_breakers": []}
    result = sp.personalize(base, prefs, {"puesto": "Backend Developer", "area_dominante": "backend"})
    assert result["delta"] > 0
    assert base["score"] == 74  # +2
    assert result["reasons"]


def test_penalty_recalculates_verdict():
    prefs = sp.learn_preferences(_history())
    base = {"score": 82, "verdict": "apply", "deal_breakers": []}
    sp.personalize(base, prefs, {"puesto": "Fullstack Developer", "area_dominante": "fullstack"})
    assert base["score"] == 80  # -2
    assert base["verdict"] == "apply"  # 80 sigue siendo apply (umbral inclusivo)


def test_delta_is_bounded():
    # Aunque coincidan muchas keywords, el ajuste está acotado a ±6.
    prefs = {"active": True, "n_outcomes": 10, "boost": ["a", "b", "c"], "penalty": []}
    base = {"score": 50, "verdict": "avoid", "deal_breakers": []}
    r = sp.personalize(base, prefs, {"puesto": "a b c", "area_dominante": "a b c"})
    assert r["delta"] <= 6


def test_deal_breaker_verdict_not_overwritten():
    prefs = sp.learn_preferences(_history())
    base = {"score": 40, "verdict": "avoid", "deal_breakers": ["Modalidad presencial"]}
    sp.personalize(base, prefs, {"puesto": "Backend Developer", "area_dominante": "backend"})
    # El ajuste puede tocar el score, pero NUNCA revierte un avoid con deal-breaker.
    assert base["verdict"] == "avoid"


def test_inactive_prefs_no_change():
    base = {"score": 70, "verdict": "maybe", "deal_breakers": []}
    r = sp.personalize(base, {"active": False, "n_outcomes": 1, "boost": [], "penalty": []}, {"puesto": "Backend"})
    assert r["delta"] == 0
    assert base["score"] == 70
