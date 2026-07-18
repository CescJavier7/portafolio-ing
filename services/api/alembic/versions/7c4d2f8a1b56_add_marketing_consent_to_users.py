"""add marketing consent to users

Revision ID: 7c4d2f8a1b56
Revises: 3e9a1c5b7d24
Create Date: 2026-07-18 06:00:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
server_default='false' para las filas existentes (nadie consintió
retroactivamente); el default de la app aplica para las nuevas.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c4d2f8a1b56'
down_revision: Union[str, None] = '3e9a1c5b7d24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('marketing_consent', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column('users', 'marketing_consent')
