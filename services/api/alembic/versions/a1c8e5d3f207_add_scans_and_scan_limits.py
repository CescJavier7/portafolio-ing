"""add scans table and free scan limit counters

Revision ID: a1c8e5d3f207
Revises: 9f1b3c7e2a80
Create Date: 2026-07-18 09:30:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'a1c8e5d3f207'
down_revision: Union[str, None] = '9f1b3c7e2a80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Contadores anti-abuso en organizations.
    op.add_column('organizations', sa.Column('free_scan_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('organizations', sa.Column('free_scan_window_start', sa.DateTime(timezone=True), nullable=True))

    # Tabla de escaneos.
    op.create_table(
        'scans',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('target_id', UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('grade', sa.String(length=2), nullable=False),
        sa.Column('findings', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['target_id'], ['targets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_scans_target_id', 'scans', ['target_id'])
    op.create_index('ix_scans_organization_id', 'scans', ['organization_id'])
    op.create_index('ix_scans_created_at', 'scans', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_scans_created_at', table_name='scans')
    op.drop_index('ix_scans_organization_id', table_name='scans')
    op.drop_index('ix_scans_target_id', table_name='scans')
    op.drop_table('scans')
    op.drop_column('organizations', 'free_scan_window_start')
    op.drop_column('organizations', 'free_scan_count')
