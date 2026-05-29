from flask import Blueprint

from applications.models.post import BoardModel

from .responses import api_success
from .serializers import serialize_board

bp = Blueprint("api_boards", __name__, url_prefix="/boards")


@bp.get("")
def list_boards():
    boards = BoardModel.query.filter_by(is_active=True).order_by(BoardModel.create_time.desc()).all()
    return api_success([serialize_board(board) for board in boards], "获取板块列表成功")
