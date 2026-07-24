"""add scan_observations table (data engine)

Revision ID: c9e3a1f60d42
Revises: b4d7e2f9c118
Create Date: 2026-07-23 20:00:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'c9e3a1f60d42'
down_revision: Union[str, None] = 'b4d7e2f9c118'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'scan_observations',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('domain_hash', sa.String(length=64), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('grade', sa.String(length=2), nullable=False),
        sa.Column('failed_checks', sa.JSON(), nullable=False),
        sa.Column('source', sa.String(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_scan_observations_domain_hash', 'scan_observations', ['domain_hash'])
    op.create_index('ix_scan_observations_source', 'scan_observations', ['source'])
    op.create_index('ix_scan_observations_created_at', 'scan_observations', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_scan_observations_created_at', table_name='scan_observations')
    op.drop_index('ix_scan_observations_source', table_name='scan_observations')
    op.drop_index('ix_scan_observations_domain_hash', table_name='scan_observations')
    op.drop_table('scan_observations')
