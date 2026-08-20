"""add search_profiles table (Job Agent — perfil de búsqueda)

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-08-20 12:00:00.000000

Perfil de búsqueda laboral por usuario (qué quiere / qué NO acepta). Base del
Application Score: con esto Sentra decide a qué ofertas aplicar. Uno por usuario.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'search_profiles',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('target_role', sa.String(length=200), nullable=False, server_default=''),
        sa.Column('seniority', sa.String(length=20), nullable=False, server_default=''),
        sa.Column('user_years_experience', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('min_salary', sa.Integer(), nullable=True),
        sa.Column('salary_currency', sa.String(length=8), nullable=False, server_default='USD'),
        sa.Column('max_required_experience', sa.Integer(), nullable=True),
        sa.Column('open_to_relocate', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('visa_needed', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('locations', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('modalities', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('technologies', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('industries', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('desired_companies', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('blocked_companies', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('languages', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('deal_breakers', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_search_profiles_user_id'),
    )


def downgrade() -> None:
    op.drop_table('search_profiles')
