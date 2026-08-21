"""
Tests del Application Score (services/application_scoring.py): ponderación,
deal-breakers duros y veredicto. Rules-first → determinista.
"""
from app.services import application_scoring as sc


def _profile(**over):
    base = {
        "technologies": ["python", "fastapi", "docker", "postgresql"],
        "modalities": ["remoto"],
        "seniority": "mid",
        "languages": ["es"],
        "locations": [],
        "blocked_companies": [],
        "deal_breakers": [],
        "max_required_experience": None,
    }
    base.update(over)
    return base


def _analysis(**over):
    base = {
        "empresa": "Acme",
        "puesto": "Backend Developer",
        "seniority": "mid",
        "modalidad": "remoto",
        "ubicacion": "Remoto",
        "area_dominante": "backend",
        "requisitos_obligatorios": ["Python", "FastAPI", "PostgreSQL"],
        "requisitos_deseables": ["Docker"],
        "palabras_clave_ats": ["Python", "FastAPI"],
        "idioma_del_cv": "es",
    }
    base.update(over)
    return base


def test_strong_match_is_apply():
    r = sc.score_application(_profile(), _analysis())
    assert r["verdict"] == "apply"
    assert r["score"] >= 80
    assert not r["deal_breakers"]
    assert 0 <= r["score"] <= 100


def test_blocked_modality_is_deal_breaker():
    # El usuario solo acepta remoto; la oferta es presencial → deal-breaker.
    r = sc.score_application(_profile(modalities=["remoto"]), _analysis(modalidad="presencial"))
    assert r["verdict"] == "avoid"
    assert r["score"] <= 45
    assert any("Modalidad" in d for d in r["deal_breakers"])


def test_seniority_above_profile_is_deal_breaker():
    r = sc.score_application(_profile(seniority="junior"), _analysis(seniority="senior"))
    assert r["verdict"] == "avoid"
    assert r["deal_breakers"]


def test_max_experience_exceeded_is_deal_breaker():
    r = sc.score_application(
        _profile(max_required_experience=3),
        _analysis(requisitos_obligatorios=["5 años de experiencia en Python"]),
    )
    assert r["verdict"] == "avoid"
    assert any("años" in d for d in r["deal_breakers"])


def test_blocked_company_is_deal_breaker():
    r = sc.score_application(_profile(blocked_companies=["Acme"]), _analysis(empresa="Acme Corp"))
    assert r["verdict"] == "avoid"
    assert r["deal_breakers"]


def test_missing_requirements_go_to_reasons_avoid():
    r = sc.score_application(
        _profile(technologies=["python"]),
        _analysis(requisitos_obligatorios=["Kubernetes", "Go", "Rust"]),
    )
    # Ningún obligatorio cubierto → aparecen en reasons_avoid.
    assert any("Kubernetes" in x or "Go" in x or "Rust" in x for x in r["reasons_avoid"])


def test_breakdown_keys_present():
    r = sc.score_application(_profile(), _analysis())
    for k in ("requisitos_obligatorios", "requisitos_deseables", "ubicacion_modalidad", "seniority", "idioma", "keywords_ats"):
        assert k in r["breakdown"]
