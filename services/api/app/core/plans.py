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
    scans_per_day: int        # escaneos por ventana de 24h (si limitado)
    limited_scans: bool       # True: aplica y muestra el contador de 24h
    show_score_detail: bool   # desglose de la ponderación del score
    ai_reports: bool          # reportes con IA
    api_access: bool          # puede crear API keys / usar la API pública
    max_api_keys: int         # tope de llaves activas simultáneas
    max_team_members: int     # usuarios totales en la organización (incluye OWNER)
    max_webhooks: int         # webhooks salientes activos simultáneos
    cv_per_month: int         # generaciones de CV al mes (0 = ilimitado)


# limited_scans=False => escaneos ilimitados (coherente con "ilimitados" del
# modal de upgrade). El rate limit por endpoint (10/min) sigue protegiendo
# contra abuso incluso en planes ilimitados.
#
# cv_per_month: el generador de CV es freemium por CUENTA (por usuario). FREE
# tiene una cuota mensual; los planes de pago la sueltan (0 = ilimitado). El
# contador se calcula al vuelo (COUNT de CVs del usuario en el mes en curso),
# no se guarda un contador mutable — así no hay estado que resetear ni que
# pueda desincronizarse.
PLANS: dict[str, PlanConfig] = {
    "FREE": PlanConfig(max_targets=3, scans_per_day=3, limited_scans=True, show_score_detail=False, ai_reports=False, api_access=False, max_api_keys=0, max_team_members=1, max_webhooks=0, cv_per_month=3),
    "PRO": PlanConfig(max_targets=10, scans_per_day=0, limited_scans=False, show_score_detail=True, ai_reports=True, api_access=True, max_api_keys=3, max_team_members=3, max_webhooks=1, cv_per_month=0),
    "TEAM": PlanConfig(max_targets=50, scans_per_day=0, limited_scans=False, show_score_detail=True, ai_reports=True, api_access=True, max_api_keys=10, max_team_members=10, max_webhooks=5, cv_per_month=0),
    "ENTERPRISE": PlanConfig(max_targets=1000, scans_per_day=0, limited_scans=False, show_score_detail=True, ai_reports=True, api_access=True, max_api_keys=50, max_team_members=50, max_webhooks=20, cv_per_month=0),
}


def plan_for(plan_name: str | None) -> PlanConfig:
    return PLANS.get(plan_name or "FREE", PLANS["FREE"])
