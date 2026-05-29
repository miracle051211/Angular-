from flask import Blueprint, request
from flask_login import current_user
from sqlalchemy import or_

from applications.extentions.init_sqlalchemy import db
from applications.models.post import BoardModel, CommentModel, PostModel

from .decorators import api_login_required
from .responses import api_error, api_success
from .serializers import serialize_comment, serialize_post_detail, serialize_post_summary

bp = Blueprint("api_posts", __name__, url_prefix="/posts")


@bp.get("")
def list_posts():
    page = max(request.args.get("page", default=1, type=int), 1)
    per_page = min(max(request.args.get("perPage", default=10, type=int), 1), 50)
    board_id = request.args.get("boardId", type=int)
    search = (request.args.get("search") or "").strip()
    hot = request.args.get("hot", default=0, type=int)

    query = PostModel.query.join(BoardModel).filter(
        PostModel.is_active.is_(True),
        BoardModel.is_active.is_(True),
    )

    if board_id:
        query = query.filter(PostModel.board_id == board_id)
    if search:
        query = query.filter(or_(PostModel.title.contains(search), PostModel.content.contains(search)))

    order_column = PostModel.read_count.desc() if hot else PostModel.create_time.desc()
    pagination = query.order_by(order_column).paginate(page=page, per_page=per_page, error_out=False)

    return api_success({
        "items": [serialize_post_summary(post) for post in pagination.items],
        "page": page,
        "perPage": per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }, "获取帖子列表成功")


@bp.get("/<int:post_id>")
def get_post(post_id):
    post = _active_post_query().filter(PostModel.id == post_id).first()
    if not post:
        return api_error("帖子不存在", 404)

    post.read_count += 1
    db.session.commit()
    return api_success(serialize_post_detail(post), "获取帖子详情成功")


@bp.post("")
@api_login_required
def create_post():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    board_id = data.get("boardId") or data.get("board_id")

    if not title:
        return api_error("标题不能为空", 400)
    if not content:
        return api_error("内容不能为空", 400)
    if not board_id:
        return api_error("请选择板块", 400)

    board = BoardModel.query.filter_by(id=board_id, is_active=True).first()
    if not board:
        return api_error("板块不存在", 404)

    post = PostModel(title=title, content=content, board=board, author_id=current_user.id)
    db.session.add(post)
    db.session.commit()
    return api_success(serialize_post_detail(post), "发布帖子成功", 201)


@bp.put("/<int:post_id>")
@api_login_required
def update_post(post_id):
    post = _active_post_query().filter(PostModel.id == post_id).first()
    if not post:
        return api_error("帖子不存在", 404)
    if not _can_manage_post(post):
        return api_error("没有权限修改该帖子", 403)

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    board_id = data.get("boardId") or data.get("board_id")

    if not title:
        return api_error("标题不能为空", 400)
    if not content:
        return api_error("内容不能为空", 400)

    if board_id:
        board = BoardModel.query.filter_by(id=board_id, is_active=True).first()
        if not board:
            return api_error("板块不存在", 404)
        post.board = board

    post.title = title
    post.content = content
    db.session.commit()

    return api_success(serialize_post_detail(post), "更新帖子成功")


@bp.delete("/<int:post_id>")
@api_login_required
def delete_post(post_id):
    post = _active_post_query().filter(PostModel.id == post_id).first()
    if not post:
        return api_error("帖子不存在", 404)
    if not _can_manage_post(post):
        return api_error("没有权限删除该帖子", 403)

    post.is_active = False
    db.session.commit()
    return api_success(None, "删除帖子成功")


@bp.get("/<int:post_id>/comments")
def list_comments(post_id):
    post = _active_post_query().filter(PostModel.id == post_id).first()
    if not post:
        return api_error("帖子不存在", 404)

    comments = CommentModel.query.filter_by(
        post_id=post.id,
        parent_id=None,
        is_active=True,
    ).order_by(CommentModel.create_time.desc()).all()
    return api_success([serialize_comment(comment) for comment in comments], "获取评论成功")


@bp.post("/<int:post_id>/comments")
@api_login_required
def create_comment(post_id):
    post = _active_post_query().filter(PostModel.id == post_id).first()
    if not post:
        return api_error("帖子不存在", 404)

    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()
    parent_id = data.get("parentId") or data.get("parent_id")

    if not content:
        return api_error("评论内容不能为空", 400)

    parent = None
    if parent_id:
        parent = CommentModel.query.filter_by(id=parent_id, post_id=post.id, is_active=True).first()
        if not parent:
            return api_error("回复的评论不存在", 404)

    comment = CommentModel(
        content=content,
        post_id=post.id,
        author_id=current_user.id,
        parent_id=parent.id if parent else None,
    )
    db.session.add(comment)
    db.session.commit()
    return api_success(serialize_comment(comment), "评论成功", 201)


def _active_post_query():
    return PostModel.query.join(BoardModel).filter(
        PostModel.is_active.is_(True),
        BoardModel.is_active.is_(True),
    )


def _can_manage_post(post):
    return post.author_id == current_user.id or bool(current_user.is_staff)
