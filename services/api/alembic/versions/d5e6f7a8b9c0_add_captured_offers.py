"""add captured_offers table (puente extensión → Bandeja del agente)

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-08-20 13:00:00.000000

Cola de ofertas capturadas desde la extensión de navegador ("Añadir a Sentra")
para procesarlas en la Bandeja del agente. Efímera y personal (por usuario).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'captured_offers',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('source_url', sa.String(length=500), nullable=True),
        sa.Column('title', sa.String(length=300), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_captured_offers_user_id', 'captured_offers', ['user_id'])
    op.create_index('ix_captured_offers_created_at', 'captured_offers', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_captured_offers_created_at', table_name='captured_offers')
    op.drop_index('ix_captured_offers_user_id', table_name='captured_offers')
    op.drop_table('captured_offers')
