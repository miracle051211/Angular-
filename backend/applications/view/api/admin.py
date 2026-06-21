from flask import Blueprint, request
from flask_login import current_user
from datetime import timedelta
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from applications.extentions.init_sqlalchemy import db
from applications.models.notification import NotificationModel, NotificationType
from applications.models.post import BoardModel, CommentModel, LikeModel, PostImageModel, PostModel, ReportModel
from applications.models.user import PermissionEnum, RoleModel, UserModel

from .decorators import api_permission_required, api_staff_required
from .responses import api_error, api_success
from .serializers import serialize_board, serialize_post_summary, serialize_user

bp = Blueprint("api_admin", __name__, url_prefix="/admin")


@bp.get("/dashboard")
@api_staff_required
def dashboard():
    pending_reports = ReportModel.query.filter_by(is_handled=False).count()
    recent_posts = (
        PostModel.query.options(joinedload(PostModel.board), joinedload(PostModel.author))
        .order_by(PostModel.create_time.desc())
        .limit(5)
        .all()
    )

    return api_success(
        {
            "stats": {
                "users": UserModel.query.filter_by(is_active=True).count(),
                "posts": PostModel.query.filter_by(is_active=True).count(),
                "comments": CommentModel.query.filter_by(is_active=True).count(),
                "reports": pending_reports,
            },
            "recentPosts": [serialize_admin_post(post) for post in recent_posts],
        },
        "获取后台概览成功",
    )


@bp.get("/users")
@api_permission_required(PermissionEnum.FRONT_USER)
def users():
    users = (
        UserModel.query.filter_by(is_staff=False)
        .order_by(UserModel.join_time.desc())
        .all()
    )
    return api_success([serialize_admin_user(user) for user in users], "获取用户列表成功")


@bp.patch("/users/<string:user_id>/active")
@api_permission_required(PermissionEnum.FRONT_USER)
def update_user_active(user_id):
    user = UserModel.query.get(user_id)
    if not user or user.is_staff:
        return api_error("用户不存在", 404)

    user.is_active = _read_bool("isActive")
    db.session.commit()
    return api_success(serialize_admin_user(user), "更新用户状态成功")


@bp.get("/staff")
@api_permission_required(PermissionEnum.CMD_USER)
def staff():
    staff_users = (
        UserModel.query.options(joinedload(UserModel.role).joinedload(RoleModel.permissions))
        .filter_by(is_staff=True)
        .order_by(UserModel.join_time.desc())
        .all()
    )
    return api_success([serialize_admin_user(user) for user in staff_users], "获取员工列表成功")



@bp.post("/staff")
@api_permission_required(PermissionEnum.CMD_USER)
def create_staff():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    role_name = (data.get("roleName") or "运营").strip()

    if not username:
        return api_error("员工姓名不能为空", 400)
    if not email:
        return api_error("员工邮箱不能为空", 400)
    if len(password) < 6:
        return api_error("初始密码至少需要 6 位", 400)
    if UserModel.query.filter_by(username=username).first():
        return api_error("用户名已存在", 400)
    if UserModel.query.filter_by(email=email).first():
        return api_error("邮箱已存在", 400)

    role = RoleModel.query.filter_by(name=role_name).first()
    if not role:
        return api_error("角色不存在", 400)

    user = UserModel(username=username, email=email, password=password, is_staff=True, role=role, is_active=True)
    db.session.add(user)
    db.session.commit()
    return api_success(serialize_admin_user(user), "新增员工成功", 201)
@bp.patch("/staff/<string:user_id>")
@api_permission_required(PermissionEnum.CMD_USER)
def update_staff(user_id):
    user = UserModel.query.get(user_id)
    if not user:
        return api_error("用户不存在", 404)

    data = request.get_json(silent=True) or {}
    if "isStaff" in data:
        user.is_staff = bool(data["isStaff"])
        if not user.is_staff:
            user.role = None
    if user.is_staff and data.get("roleId"):
        role = RoleModel.query.get(data["roleId"])
        if not role:
            return api_error("角色不存在", 404)
        user.role = role
    if user.is_staff and data.get("roleName"):
        role = RoleModel.query.filter_by(name=(data.get("roleName") or "").strip()).first()
        if not role:
            return api_error("角色不存在", 404)
        user.role = role

    db.session.commit()
    return api_success(serialize_admin_user(user), "更新员工信息成功")


@bp.get("/posts")
@api_permission_required(PermissionEnum.POST)
def posts():
    page, per_page = _pagination_args(default_per_page=20)
    pagination = (
        PostModel.query.options(joinedload(PostModel.board), joinedload(PostModel.author))
        .order_by(PostModel.create_time.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )
    return api_success(_paginated(pagination, serialize_admin_post), "获取帖子管理列表成功")


@bp.patch("/posts/<int:post_id>/active")
@api_permission_required(PermissionEnum.POST)
def update_post_active(post_id):
    post = PostModel.query.get(post_id)
    if not post:
        return api_error("帖子不存在", 404)

    post.is_active = _read_bool("isActive")
    db.session.commit()
    return api_success(serialize_admin_post(post), "更新帖子状态成功")


@bp.delete("/posts/<int:post_id>")
@api_permission_required(PermissionEnum.POST)
def delete_post(post_id):
    post = PostModel.query.get(post_id)
    if not post:
        return api_error("帖子不存在", 404)

    _hard_delete_post(post)
    db.session.commit()
    return api_success(None, "帖子已删除")


@bp.get("/comments")
@api_permission_required(PermissionEnum.COMMENT)
def comments():
    page, per_page = _pagination_args(default_per_page=20)
    pagination = (
        CommentModel.query.options(
            joinedload(CommentModel.author),
            joinedload(CommentModel.post).joinedload(PostModel.board),
        )
        .order_by(CommentModel.create_time.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )
    return api_success(_paginated(pagination, serialize_admin_comment), "获取评论管理列表成功")


@bp.patch("/comments/<int:comment_id>/active")
@api_permission_required(PermissionEnum.COMMENT)
def update_comment_active(comment_id):
    comment = CommentModel.query.get(comment_id)
    if not comment:
        return api_error("评论不存在", 404)

    comment.is_active = _read_bool("isActive")
    db.session.commit()
    return api_success(serialize_admin_comment(comment), "更新评论状态成功")


@bp.delete("/comments/<int:comment_id>")
@api_permission_required(PermissionEnum.COMMENT)
def delete_comment(comment_id):
    comment = CommentModel.query.get(comment_id)
    if not comment:
        return api_error("评论不存在", 404)

    _hard_delete_comment(comment)
    db.session.commit()
    return api_success(None, "评论已删除")


@bp.get("/boards")
@api_permission_required(PermissionEnum.Board)
def boards():
    boards = BoardModel.query.options(joinedload(BoardModel.posts)).order_by(BoardModel.create_time.desc()).all()
    return api_success([serialize_admin_board(board) for board in boards], "获取板块管理列表成功")


@bp.post("/boards")
@api_permission_required(PermissionEnum.Board)
def create_board():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return api_error("板块名称不能为空", 400)
    if BoardModel.query.filter_by(name=name).first():
        return api_error("板块名称已存在", 400)

    board = BoardModel(name=name, is_active=True)
    db.session.add(board)
    db.session.commit()
    return api_success(serialize_admin_board(board), "创建板块成功", 201)


@bp.patch("/boards/<int:board_id>/active")
@api_permission_required(PermissionEnum.Board)
def update_board_active(board_id):
    board = BoardModel.query.get(board_id)
    if not board:
        return api_error("板块不存在", 404)

    board.is_active = _read_bool("isActive")
    db.session.commit()
    return api_success(serialize_admin_board(board), "更新板块状态成功")


@bp.get("/reports")
@api_permission_required(PermissionEnum.POST)
def reports():
    page, per_page = _pagination_args(default_per_page=20)
    pagination = (
        ReportModel.query.options(
            joinedload(ReportModel.user),
            joinedload(ReportModel.post),
            joinedload(ReportModel.comment),
        )
        .order_by(ReportModel.create_time.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )
    return api_success(_paginated(pagination, serialize_admin_report), "获取举报列表成功")


@bp.patch("/reports/<int:report_id>")
@api_permission_required(PermissionEnum.POST)
def update_report(report_id):
    report = ReportModel.query.get(report_id)
    if not report:
        return api_error("举报不存在", 404)

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in {"pending", "resolved", "dismissed"}:
        return api_error("举报状态不正确", 400)

    report.is_handled = status != "pending"
    report.reason = _write_report_status_marker(report.reason, status)
    db.session.commit()
    return api_success(serialize_admin_report(report), "更新举报状态成功")


@bp.get("/announcements")
@api_permission_required(PermissionEnum.CMD_USER)
def announcements():
    notices = (
        NotificationModel.query.options(joinedload(NotificationModel.sender))
        .filter_by(type=NotificationType.SYSTEM_NOTICE.value)
        .order_by(NotificationModel.create_time.desc())
        .limit(200)
        .all()
    )
    return api_success(_group_announcements(notices), "获取公告列表成功")


@bp.post("/announcements")
@api_permission_required(PermissionEnum.CMD_USER)
def create_announcement():
    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()

    if not content:
        return api_error("公告内容不能为空", 400)
    if len(content) > 200:
        return api_error("公告内容不能超过 200 字", 400)

    users = UserModel.query.filter_by(is_active=True).all()
    if not users:
        return api_error("暂无可接收公告的用户", 400)

    notices = [
        NotificationModel(
            user_id=user.id,
            sender_id=current_user.id,
            type=NotificationType.SYSTEM_NOTICE.value,
            content=content,
            is_read=False,
        )
        for user in users
    ]
    db.session.add_all(notices)
    db.session.commit()
    return api_success(serialize_admin_announcement(notices[0], len(notices)), "公告已发布", 201)


@bp.delete("/announcements/<int:notice_id>")
@api_permission_required(PermissionEnum.CMD_USER)
def delete_announcement(notice_id):
    notice = NotificationModel.query.filter_by(
        id=notice_id,
        type=NotificationType.SYSTEM_NOTICE.value,
    ).first()
    if not notice:
        return api_error("公告不存在", 404)

    start_time = notice.create_time.replace(microsecond=0)
    end_time = start_time + timedelta(seconds=1)
    NotificationModel.query.filter(
        NotificationModel.type == NotificationType.SYSTEM_NOTICE.value,
        NotificationModel.content == notice.content,
        NotificationModel.create_time >= start_time,
        NotificationModel.create_time < end_time,
    ).delete(synchronize_session=False)
    db.session.commit()
    return api_success(None, "公告已删除")


def serialize_admin_user(user):
    data = serialize_user(user, include_private=True)
    data["isActive"] = user.is_active
    data["postCount"] = PostModel.query.filter_by(author_id=user.id).count()
    data["permissions"] = [permission.name.value for permission in user.role.permissions] if user.role else []
    return data


def serialize_admin_board(board):
    data = serialize_board(board)
    data["isActive"] = board.is_active
    data["createdAt"] = board.create_time.isoformat()
    return data


def serialize_admin_post(post):
    data = serialize_post_summary(post)
    data["isActive"] = post.is_active
    return data


def serialize_admin_comment(comment):
    return {
        "id": comment.id,
        "postId": comment.post_id,
        "postTitle": comment.post.title if comment.post else "原帖已删除",
        "content": comment.content,
        "createdAt": comment.create_time.isoformat(),
        "likeCount": comment.like_count(),
        "isActive": comment.is_active,
        "author": serialize_user(comment.author),
    }


def serialize_admin_report(report):
    target_type = "post" if report.post_id else "comment"
    target_title = "原内容已删除"
    if report.post:
        target_title = report.post.title
    elif report.comment:
        target_title = report.comment.content[:32]

    return {
        "id": report.id,
        "targetId": report.post_id or report.comment_id,
        "targetType": target_type,
        "targetTitle": target_title,
        "reason": _clean_report_reason(report.reason),
        "reporter": report.user.username if report.user else "未知用户",
        "createdAt": report.create_time.isoformat(),
        "status": _report_status(report),
    }


def serialize_admin_announcement(notice, receiver_count=1):
    return {
        "id": notice.id,
        "content": notice.content,
        "createdAt": notice.create_time.isoformat(),
        "sender": serialize_user(notice.sender),
        "receiverCount": receiver_count,
    }


def _group_announcements(notices):
    grouped = {}
    order = []
    for notice in notices:
        key = (notice.content, notice.create_time.replace(microsecond=0))
        if key not in grouped:
            grouped[key] = serialize_admin_announcement(notice, 0)
            order.append(key)
        grouped[key]["receiverCount"] += 1
    return [grouped[key] for key in order]



_REPORT_DISMISSED_PREFIX = "【已驳回】"
_REPORT_RESOLVED_PREFIX = "【已处理】"
_REPORT_STATUS_PREFIXES = (_REPORT_DISMISSED_PREFIX, _REPORT_RESOLVED_PREFIX)


def _report_status(report):
    if not report.is_handled:
        return "pending"
    return "dismissed" if (report.reason or "").startswith(_REPORT_DISMISSED_PREFIX) else "resolved"


def _clean_report_reason(reason):
    value = reason or ""
    for prefix in _REPORT_STATUS_PREFIXES:
        if value.startswith(prefix):
            return value[len(prefix):].lstrip()
    return value


def _write_report_status_marker(reason, status):
    clean_reason = _clean_report_reason(reason)
    if status == "dismissed":
        return f"{_REPORT_DISMISSED_PREFIX}{clean_reason}"
    if status == "resolved":
        return f"{_REPORT_RESOLVED_PREFIX}{clean_reason}"
    return clean_reason


def _pagination_args(default_per_page=20):
    page = max(request.args.get("page", default=1, type=int), 1)
    per_page = min(max(request.args.get("perPage", default=default_per_page, type=int), 1), 50)
    return page, per_page


def _paginated(pagination, serializer):
    return {
        "items": [serializer(item) for item in pagination.items],
        "page": pagination.page,
        "perPage": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }


def _read_bool(key):
    data = request.get_json(silent=True) or {}
    if key not in data:
        return False
    return bool(data[key])


def _hard_delete_post(post):
    comments = CommentModel.query.filter_by(post_id=post.id).all()
    comment_ids = [comment.id for comment in comments]

    NotificationModel.query.filter(
        (NotificationModel.related_post_id == post.id)
        | ((NotificationModel.related_type == "post") & (NotificationModel.related_id == post.id))
    ).delete(synchronize_session=False)
    ReportModel.query.filter_by(post_id=post.id).delete(synchronize_session=False)
    LikeModel.query.filter_by(post_id=post.id).delete(synchronize_session=False)
    PostImageModel.query.filter_by(post_id=post.id).delete(synchronize_session=False)

    if comment_ids:
        LikeModel.query.filter(LikeModel.comment_id.in_(comment_ids)).delete(synchronize_session=False)
        ReportModel.query.filter(ReportModel.comment_id.in_(comment_ids)).delete(synchronize_session=False)
        NotificationModel.query.filter(
            (NotificationModel.related_type == "comment") & (NotificationModel.related_id.in_(comment_ids))
        ).delete(synchronize_session=False)

        for comment in sorted(comments, key=lambda item: item.parent_id is None):
            db.session.delete(comment)

    db.session.delete(post)


def _hard_delete_comment(comment):
    comments = [comment]
    comments.extend(CommentModel.query.filter_by(parent_id=comment.id).all())
    comment_ids = [item.id for item in comments]

    LikeModel.query.filter(LikeModel.comment_id.in_(comment_ids)).delete(synchronize_session=False)
    ReportModel.query.filter(ReportModel.comment_id.in_(comment_ids)).delete(synchronize_session=False)
    NotificationModel.query.filter(
        (NotificationModel.related_type == "comment") & (NotificationModel.related_id.in_(comment_ids))
    ).delete(synchronize_session=False)

    for item in sorted(comments, key=lambda candidate: candidate.parent_id is not None, reverse=True):
        db.session.delete(item)



