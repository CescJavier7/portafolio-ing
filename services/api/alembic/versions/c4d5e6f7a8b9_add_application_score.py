"""add score to job_applications (Job Agent — Application Score persistido)

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-08-20 18:00:00.000000

El lote/agente decide con el Application Score; se guarda en la postulación para
mostrarlo en el tracker. Nullable (postulaciones creadas a mano no lo tienen).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('job_applications', sa.Column('score', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('job_applications', 'score')
