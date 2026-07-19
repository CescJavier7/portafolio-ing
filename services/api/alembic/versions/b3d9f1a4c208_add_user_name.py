"""add user display name

Revision ID: b3d9f1a4c208
Revises: a1c8e5d3f207
Create Date: 2026-07-19 10:00:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3d9f1a4c208'
down_revision: Union[str, None] = 'a1c8e5d3f207'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('name', sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'name')
