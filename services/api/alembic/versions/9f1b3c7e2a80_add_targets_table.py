"""add targets table

Revision ID: 9f1b3c7e2a80
Revises: 7c4d2f8a1b56
Create Date: 2026-07-18 08:00:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '9f1b3c7e2a80'
down_revision: Union[str, None] = '7c4d2f8a1b56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'targets',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True), nullable=False),
        sa.Column('domain', sa.String(length=253), nullable=False),
        sa.Column('verified', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verification_token', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'domain', name='uq_target_org_domain'),
    )
    op.create_index('ix_targets_organization_id', 'targets', ['organization_id'])


def downgrade() -> None:
    op.drop_index('ix_targets_organization_id', table_name='targets')
    op.drop_table('targets')
