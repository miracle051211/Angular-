"""add user experience fields

Revision ID: c8e2d6b1f4a9
Revises: a41b0f7e9c62
Create Date: 2026-06-20 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "c8e2d6b1f4a9"
down_revision = "a41b0f7e9c62"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user",
        sa.Column("experience", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "user",
        sa.Column("last_login_bonus_date", sa.Date(), nullable=True),
    )
    op.alter_column("user", "experience", server_default=None)


def downgrade():
    op.drop_column("user", "last_login_bonus_date")
    op.drop_column("user", "experience")
