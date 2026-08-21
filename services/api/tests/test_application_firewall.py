"""
Tests del Application Firewall (services/application_firewall.py):
detección de estafas, umbral de sueldo por país, y Duplicate Killer.
Funciones puras → sin fixtures.
"""
from app.services import application_firewall as fw


# ── Scam detector ──────────────────────────────────────────────────────

def test_scam_offer_is_danger():
    scam = (
        "Trabaja desde casa y gana $800 por dia sin experiencia. Contratacion "
        "inmediata, sin entrevista. Para empezar debes hacer un pago de inscripcion "
        "y comprar el kit de bienvenida. Escribenos por WhatsApp. reclu2024@gmail.com"
    )
    r = fw.scan_posting(scam)
    assert r["risk_level"] == "danger"
    codes = {f["code"] for f in r["flags"]}
    assert "advance_fee" in codes
    assert "instant_hire" in codes
    assert "messaging_only" in codes
    # Correo gratuito como ÚNICO canal.
    assert "free_email_only" in codes


def test_legit_offer_is_safe():
    legit = (
        "Buscamos Backend Engineer (Python/FastAPI) para nuestro equipo remoto. "
        "Requisitos: 3 años de experiencia, PostgreSQL, Docker. Modalidad remoto. "
        "Postula en careers@empresa.com"
    )
    r = fw.scan_posting(legit)
    assert r["risk_level"] == "safe"
    assert r["flags"] == []


def test_url_shortener_flag():
    r = fw.scan_posting("Aplica aqui: bit.ly/empleo-genial para el puesto de analista de datos.")
    codes = {f["code"] for f in r["flags"]}
    assert "url_shortener" in codes


def test_corporate_email_not_flagged():
    # Si hay un correo corporativo, NO se marca free_email_only aunque sea gmail-less.
    r = fw.scan_posting("Vacante de QA. Envia tu CV a talento@miempresa.io para el proceso.")
    codes = {f["code"] for f in r["flags"]}
    assert "free_email_only" not in codes


# ── Umbral de sueldo por país ──────────────────────────────────────────

def test_salary_threshold_country_relative():
    txt = "Gana $500 al dia trabajando desde casa como asistente virtual."
    assert fw.scan_posting(txt, country="Ecuador")["risk_level"] == "danger"
    # El mismo monto es plausible en EE. UU. → no dispara sueldo absurdo.
    us = fw.scan_posting(txt, country="US")
    assert "unreal_salary" not in {f["code"] for f in us["flags"]}


def test_country_inferred_from_text():
    assert fw.country_in_text("Quito, Ecuador") == "EC"
    assert fw.country_in_text("Remote - United States") == "US"
    assert fw.country_in_text("cualquier lugar") is None


def test_parse_amount_thousands():
    assert fw._parse_amount("5.000") == 5000.0
    assert fw._parse_amount("5,000") == 5000.0
    assert fw._parse_amount("1.234,56") == 1234.56
    assert fw._parse_amount("900") == 900.0


# ── Duplicate Killer ───────────────────────────────────────────────────

def test_duplicate_same_company_synonym_role():
    existing = [{"company": "Acme Corp", "role": "Backend Developer", "status": "applied"}]
    dup = fw.find_duplicate("Acme Corp", "Backend Engineer", existing)
    assert dup is not None
    assert dup["similarity"] >= 80


def test_duplicate_different_role_no_match():
    existing = [{"company": "Acme Corp", "role": "Backend Developer", "status": "applied"}]
    assert fw.find_duplicate("Acme Corp", "Frontend Designer", existing) is None


def test_duplicate_different_company_no_match():
    existing = [{"company": "Acme Corp", "role": "Backend Developer", "status": "applied"}]
    assert fw.find_duplicate("Globex", "Backend Engineer", existing) is None


def test_duplicate_empty_history():
    assert fw.find_duplicate("Acme", "Backend Dev", []) is None
