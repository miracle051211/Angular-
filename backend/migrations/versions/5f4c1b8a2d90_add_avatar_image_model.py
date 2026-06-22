"""add avatar image model

Revision ID: 5f4c1b8a2d90
Revises: c8e2d6b1f4a9
Create Date: 2026-06-22 14:12:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


revision = "5f4c1b8a2d90"
down_revision = "c8e2d6b1f4a9"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "avatar_image",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("filename", sa.String(length=160), nullable=False),
        sa.Column("user_id", sa.String(length=100), nullable=False),
        sa.Column("mime_type", sa.String(length=80), nullable=False),
        sa.Column("data", mysql.LONGBLOB(), nullable=False),
        sa.Column("create_time", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("filename"),
    )
    op.create_index(op.f("ix_avatar_image_user_id"), "avatar_image", ["user_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_avatar_image_user_id"), table_name="avatar_image")
    op.drop_table("avatar_image")
