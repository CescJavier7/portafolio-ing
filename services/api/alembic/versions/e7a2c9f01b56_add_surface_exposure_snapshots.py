"""add surface_snapshots and exposure_snapshots tables

Revision ID: e7a2c9f01b56
Revises: d5f1a3c8e420
Create Date: 2026-07-23 12:00:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'e7a2c9f01b56'
down_revision: Union[str, None] = 'd5f1a3c8e420'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'surface_snapshots',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('target_id', UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True), nullable=False),
        sa.Column('subdomains', sa.JSON(), nullable=False),
        sa.Column('ports', sa.JSON(), nullable=False),
        sa.Column('technologies', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['target_id'], ['targets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_surface_snapshots_target_id', 'surface_snapshots', ['target_id'])
    op.create_index('ix_surface_snapshots_organization_id', 'surface_snapshots', ['organization_id'])
    op.create_index('ix_surface_snapshots_created_at', 'surface_snapshots', ['created_at'])

    op.create_table(
        'exposure_snapshots',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('target_id', UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True), nullable=False),
        sa.Column('routes', sa.JSON(), nullable=False),
        sa.Column('counts', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['target_id'], ['targets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_exposure_snapshots_target_id', 'exposure_snapshots', ['target_id'])
    op.create_index('ix_exposure_snapshots_organization_id', 'exposure_snapshots', ['organization_id'])
    op.create_index('ix_exposure_snapshots_created_at', 'exposure_snapshots', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_exposure_snapshots_created_at', table_name='exposure_snapshots')
    op.drop_index('ix_exposure_snapshots_organization_id', table_name='exposure_snapshots')
    op.drop_index('ix_exposure_snapshots_target_id', table_name='exposure_snapshots')
    op.drop_table('exposure_snapshots')

    op.drop_index('ix_surface_snapshots_created_at', table_name='surface_snapshots')
    op.drop_index('ix_surface_snapshots_organization_id', table_name='surface_snapshots')
    op.drop_index('ix_surface_snapshots_target_id', table_name='surface_snapshots')
    op.drop_table('surface_snapshots')
