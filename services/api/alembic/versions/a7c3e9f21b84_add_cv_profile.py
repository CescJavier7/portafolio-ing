"""add profile json column on cv_documents (id-anchored pipeline)

Revision ID: a7c3e9f21b84
Revises: f8b2d4a6c159
Create Date: 2026-08-15 20:15:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
`profile` guarda el perfil normalizado con ids (fuente de verdad de la
generación anclada). Nullable: los CVs previos al pipeline no lo tienen.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7c3e9f21b84'
down_revision: Union[str, None] = 'f8b2d4a6c159'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cv_documents', sa.Column('profile', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('cv_documents', 'profile')
