"""add notification image url

Revision ID: 7c2a9d4e8b31
Revises: 5f4c1b8a2d90
Create Date: 2026-06-22 18:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "7c2a9d4e8b31"
down_revision = "5f4c1b8a2d90"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("notification", sa.Column("image_url", sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column("notification", "image_url")
