"""add cv_documents table (CV generator)

Revision ID: e2f4b8a1c930
Revises: d1a5c8b34e07
Create Date: 2026-08-15 10:00:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'e2f4b8a1c930'
down_revision: Union[str, None] = 'd1a5c8b34e07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cv_documents',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('job_posting', sa.Text(), nullable=False),
        sa.Column('content', sa.JSON(), nullable=False),
        sa.Column('match_score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cv_documents_user_id', 'cv_documents', ['user_id'])
    op.create_index('ix_cv_documents_created_at', 'cv_documents', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_cv_documents_created_at', table_name='cv_documents')
    op.drop_index('ix_cv_documents_user_id', table_name='cv_documents')
    op.drop_table('cv_documents')
