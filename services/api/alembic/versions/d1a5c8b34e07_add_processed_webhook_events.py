"""add processed_webhook_events table (webhook idempotency)

Revision ID: d1a5c8b34e07
Revises: c9e3a1f60d42
Create Date: 2026-07-23 21:00:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'd1a5c8b34e07'
down_revision: Union[str, None] = 'c9e3a1f60d42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'processed_webhook_events',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('event_key', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_key', name='uq_processed_webhook_events_event_key'),
    )
    op.create_index('ix_processed_webhook_events_event_key', 'processed_webhook_events', ['event_key'])


def downgrade() -> None:
    op.drop_index('ix_processed_webhook_events_event_key', table_name='processed_webhook_events')
    op.drop_table('processed_webhook_events')
