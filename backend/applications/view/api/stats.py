from flask import Blueprint

from applications.models.post import BoardModel, CommentModel, PostModel
from applications.models.user import UserModel

from .responses import api_success

bp = Blueprint("api_stats", __name__, url_prefix="/stats")


@bp.get("")
def get_stats():
    return api_success(
        {
            "posts": PostModel.query.filter_by(is_active=True).count(),
            "users": UserModel.query.filter_by(is_active=True).count(),
            "comments": CommentModel.query.filter_by(is_active=True).count(),
            "boards": BoardModel.query.filter_by(is_active=True).count(),
        },
        "获取论坛数据成功",
    )
