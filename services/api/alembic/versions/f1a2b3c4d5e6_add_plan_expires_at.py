"""add plan_expires_at to organizations (subscription period)

Revision ID: f1a2b3c4d5e6
Revises: b9e4d1f7a802
Create Date: 2026-08-18 12:00:00.000000

Ciclo de vida de suscripción: cada pago aprobado extiende `plan_expires_at` 30
días. Cancelar NO baja el plan de golpe — mantiene el acceso Pro hasta esa
fecha (como Netflix/Spotify). El downgrade a FREE ocurre al vencer sin renovar.
Backfill: a los PRO/TEAM actuales se les da 30 días desde ahora para no cortarlos.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'b9e4d1f7a802'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'organizations',
        sa.Column('plan_expires_at', sa.DateTime(timezone=True), nullable=True),
    )
    # No cortar a los que ya son de pago: 30 días desde el momento de la migración.
    op.execute(
        "UPDATE organizations SET plan_expires_at = now() + interval '30 days' "
        "WHERE plan IN ('PRO', 'TEAM', 'ENTERPRISE')"
    )


def downgrade() -> None:
    op.drop_column('organizations', 'plan_expires_at')
