"""
core/plans.py

Definición central de qué permite cada plan. Un solo lugar para la lógica
de negocio del freemium, así el router no la esparce por todos lados.

Modelo del límite de escaneos (anti-abuso):
- El plan FREE permite N escaneos por ventana de 24h. El contador vive en
  Organization (free_scan_count + free_scan_window_start), NO se cuenta por
  dominio: así borrar/recrear dominios NO regala escaneos nuevos.
- La ventana es rodante desde el primer escaneo: pasadas 24h, se reinicia
  a 0 y el usuario recupera sus intentos.
- PRO tiene un límite alto (prácticamente ilimitado para el uso normal).
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class PlanConfig:
    max_targets: int          # dominios registrables
    scans_per_day: int        # escaneos por ventana de 24h
    show_score_detail: bool   # desglose de la ponderación del score
    ai_reports: bool          # reportes con IA (futuro)


PLANS: dict[str, PlanConfig] = {
    "FREE": PlanConfig(max_targets=3, scans_per_day=3, show_score_detail=False, ai_reports=False),
    "PRO": PlanConfig(max_targets=10, scans_per_day=100, show_score_detail=True, ai_reports=True),
    "TEAM": PlanConfig(max_targets=50, scans_per_day=500, show_score_detail=True, ai_reports=True),
    "ENTERPRISE": PlanConfig(max_targets=1000, scans_per_day=10000, show_score_detail=True, ai_reports=True),
}


def plan_for(plan_name: str | None) -> PlanConfig:
    return PLANS.get(plan_name or "FREE", PLANS["FREE"])
