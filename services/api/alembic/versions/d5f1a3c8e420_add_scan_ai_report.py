"""add ai_report to scans

Revision ID: d5f1a3c8e420
Revises: c4e0a2b7d319
Create Date: 2026-07-23 10:00:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5f1a3c8e420'
down_revision: Union[str, None] = 'c4e0a2b7d319'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('scans', sa.Column('ai_report', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('scans', 'ai_report')
