"""add user invite fields and webhooks table

Revision ID: a8c1f4e9b203
Revises: f3b8d5e2a917
Create Date: 2026-07-25 09:00:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'a8c1f4e9b203'
down_revision: Union[str, None] = 'f3b8d5e2a917'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('invite_token_hash', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('invite_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_users_invite_token_hash', 'users', ['invite_token_hash'])

    op.create_table(
        'webhooks',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('secret', sa.String(length=100), nullable=False),
        sa.Column('event_types', sa.JSON(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('last_triggered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_status_code', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_webhooks_organization_id', 'webhooks', ['organization_id'])


def downgrade() -> None:
    op.drop_index('ix_webhooks_organization_id', table_name='webhooks')
    op.drop_table('webhooks')

    op.drop_index('ix_users_invite_token_hash', table_name='users')
    op.drop_column('users', 'invite_expires_at')
    op.drop_column('users', 'invite_token_hash')
