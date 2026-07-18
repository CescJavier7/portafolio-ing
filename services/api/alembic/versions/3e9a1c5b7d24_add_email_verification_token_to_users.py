"""add email verification token to users

Revision ID: 3e9a1c5b7d24
Revises: 57d92ffe4b8e
Create Date: 2026-07-18 03:10:00.000000

Escrita a mano (no autogenerada) para que Mac y VPS compartan exactamente
el mismo archivo desde git, sin depender de correr autogenerate en cada
entorno.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3e9a1c5b7d24'
down_revision: Union[str, None] = '57d92ffe4b8e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('email_verification_token_hash', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('email_verification_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_users_email_verification_token_hash', 'users', ['email_verification_token_hash'])


def downgrade() -> None:
    op.drop_index('ix_users_email_verification_token_hash', table_name='users')
    op.drop_column('users', 'email_verification_expires_at')
    op.drop_column('users', 'email_verification_token_hash')
