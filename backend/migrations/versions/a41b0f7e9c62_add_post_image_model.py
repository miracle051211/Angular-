"""add post image model

Revision ID: a41b0f7e9c62
Revises: f2c8d9a1b345
Create Date: 2026-06-19 11:05:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "a41b0f7e9c62"
down_revision = "f2c8d9a1b345"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "post_image",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("url", sa.String(length=255), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=True),
        sa.Column("create_time", sa.DateTime(), nullable=True),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("uploader_id", sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["post.id"]),
        sa.ForeignKeyConstraint(["uploader_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("post_image")
