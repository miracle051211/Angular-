"""add follow model

Revision ID: f2c8d9a1b345
Revises: ee48b838a46b
Create Date: 2026-06-19 10:15:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'f2c8d9a1b345'
down_revision = 'ee48b838a46b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'follow',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('follower_id', sa.String(length=100), nullable=False),
        sa.Column('followed_id', sa.String(length=100), nullable=False),
        sa.Column('create_time', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['followed_id'], ['user.id']),
        sa.ForeignKeyConstraint(['follower_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('follower_id', 'followed_id', name='_follower_followed_uc'),
    )


def downgrade():
    op.drop_table('follow')
