"""add job_applications table (Sentra CV AI — tracker de postulaciones)

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-08-19 12:00:00.000000

Tracker nativo de postulaciones: el usuario sigue a qué empresas/roles se postuló,
en qué estado va y con qué CV. Personal (user_id, anti-IDOR); enlaza opcionalmente
el CV generado (ON DELETE SET NULL: borrar el CV no borra la postulación).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'job_applications',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('cv_document_id', UUID(as_uuid=True), nullable=True),
        sa.Column('company', sa.String(length=160), nullable=False),
        sa.Column('role', sa.String(length=200), nullable=False),
        sa.Column('job_url', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='saved'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cv_document_id'], ['cv_documents.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_job_applications_user_id', 'job_applications', ['user_id'])
    op.create_index('ix_job_applications_cv_document_id', 'job_applications', ['cv_document_id'])
    op.create_index('ix_job_applications_status', 'job_applications', ['status'])
    op.create_index('ix_job_applications_created_at', 'job_applications', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_job_applications_created_at', table_name='job_applications')
    op.drop_index('ix_job_applications_status', table_name='job_applications')
    op.drop_index('ix_job_applications_cv_document_id', table_name='job_applications')
    op.drop_index('ix_job_applications_user_id', table_name='job_applications')
    op.drop_table('job_applications')
