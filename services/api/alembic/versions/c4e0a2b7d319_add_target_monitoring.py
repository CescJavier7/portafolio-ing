"""add monitoring_enabled to targets

Revision ID: c4e0a2b7d319
Revises: b3d9f1a4c208
Create Date: 2026-07-21 10:00:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4e0a2b7d319'
down_revision: Union[str, None] = 'b3d9f1a4c208'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('targets', sa.Column('monitoring_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('targets', 'monitoring_enabled')
