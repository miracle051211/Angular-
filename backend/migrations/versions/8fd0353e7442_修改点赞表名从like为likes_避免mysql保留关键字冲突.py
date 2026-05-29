"""修改点赞表名从like为likes，避免MySQL保留关键字冲突

Revision ID: 8fd0353e7442
Revises: 152c386614e1
Create Date: 2025-12-21 09:12:00.114015

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '8fd0353e7442'
down_revision = '152c386614e1'
branch_labels = None
depends_on = None


def upgrade():
    try:
        # 尝试将表名从 'like' 改为 'likes'
        op.execute("RENAME TABLE `like` TO `likes`")
    except Exception as e:
        # 如果表不存在或重命名失败，忽略错误
        pass


def downgrade():
    # 如果需要回滚，可以将表名改回
    op.execute("RENAME TABLE `likes` TO `like`")