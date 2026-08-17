"""add payment_requests table (manual billing MVP)

Revision ID: b9e4d1f7a802
Revises: a7c3e9f21b84
Create Date: 2026-08-17 12:00:00.000000

Escrita a mano para que Mac y VPS compartan el mismo archivo desde git.
Cobros manuales: el usuario envía la referencia de un pago hecho por fuera y el
fundador lo aprueba desde el panel → activa el plan de la organización.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'b9e4d1f7a802'
down_revision: Union[str, None] = 'a7c3e9f21b84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'payment_requests',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('plan', sa.String(length=20), nullable=False),
        sa.Column('method', sa.String(length=30), nullable=False),
        sa.Column('reference', sa.String(length=200), nullable=False),
        sa.Column('note', sa.String(length=500), nullable=False, server_default=''),
        sa.Column('amount', sa.String(length=60), nullable=False, server_default=''),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewer_email', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_payment_requests_organization_id', 'payment_requests', ['organization_id'])
    op.create_index('ix_payment_requests_user_id', 'payment_requests', ['user_id'])
    op.create_index('ix_payment_requests_status', 'payment_requests', ['status'])
    op.create_index('ix_payment_requests_created_at', 'payment_requests', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_payment_requests_created_at', table_name='payment_requests')
    op.drop_index('ix_payment_requests_status', table_name='payment_requests')
    op.drop_index('ix_payment_requests_user_id', table_name='payment_requests')
    op.drop_index('ix_payment_requests_organization_id', table_name='payment_requests')
    op.drop_table('payment_requests')
