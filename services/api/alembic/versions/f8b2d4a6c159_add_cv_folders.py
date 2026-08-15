"""add cv_folders table + folder_id on cv_documents

Revision ID: f8b2d4a6c159
Revises: e2f4b8a1c930
Create Date: 2026-08-15 19:30:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
Carpetas/categorías de CV por usuario. ON DELETE SET NULL en cv_documents:
borrar una carpeta NO borra los CVs, solo los des-categoriza.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'f8b2d4a6c159'
down_revision: Union[str, None] = 'e2f4b8a1c930'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cv_folders',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cv_folders_user_id', 'cv_folders', ['user_id'])
    op.create_index('ix_cv_folders_created_at', 'cv_folders', ['created_at'])

    op.add_column('cv_documents', sa.Column('folder_id', UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_cv_documents_folder_id',
        'cv_documents',
        'cv_folders',
        ['folder_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_cv_documents_folder_id', 'cv_documents', ['folder_id'])


def downgrade() -> None:
    op.drop_index('ix_cv_documents_folder_id', table_name='cv_documents')
    op.drop_constraint('fk_cv_documents_folder_id', 'cv_documents', type_='foreignkey')
    op.drop_column('cv_documents', 'folder_id')
    op.drop_index('ix_cv_folders_created_at', table_name='cv_folders')
    op.drop_index('ix_cv_folders_user_id', table_name='cv_folders')
    op.drop_table('cv_folders')
