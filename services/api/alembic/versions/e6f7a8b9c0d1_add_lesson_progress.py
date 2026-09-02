"""add lesson_progress table (Academia — progreso de lecciones)

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-09-02 10:00:00.000000

Progreso de la Academia por usuario: qué lecciones completó. Único por
(usuario, lección).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'lesson_progress',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('lesson_slug', sa.String(length=200), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'lesson_slug', name='uq_lesson_progress_user_slug'),
    )
    op.create_index('ix_lesson_progress_user_id', 'lesson_progress', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_lesson_progress_user_id', table_name='lesson_progress')
    op.drop_table('lesson_progress')
