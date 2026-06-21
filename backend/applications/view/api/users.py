import os
import uuid

from flask import Blueprint, current_app, request, url_for
from flask_login import current_user
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from werkzeug.utils import secure_filename

from applications.extentions.init_sqlalchemy import db
from applications.models.post import CommentModel, PostModel
from applications.models.user import FollowModel, UserModel

from .decorators import api_login_required
from .responses import api_error, api_success
from .serializers import serialize_post_summary, serialize_user

bp = Blueprint("api_users", __name__, url_prefix="/users")

ALLOWED_AVATAR_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_AVATAR_BYTES = 3 * 1024 * 1024


def _serialize_settings(user):
    return {
        "notifyCommentReply": bool(user.notify_comment_reply),
        "notifyNewMessage": bool(user.notify_new_message),
        "notifyPostLike": bool(user.notify_post_like),
        "notifyCommentLike": bool(user.notify_comment_like),
        "receiveEmailNotifications": bool(user.receive_email_notifications),
    }


@bp.get("")
def search_users():
    search = (request.args.get("search") or "").strip()
    limit = min(max(request.args.get("limit", default=8, type=int), 1), 20)

    if not search:
        return api_success([], "获取用户搜索结果成功")

    query = UserModel.query.filter(UserModel.is_active.is_(True))
    query = query.filter(
        or_(
            UserModel.username.contains(search),
            UserModel.email.contains(search),
            UserModel.signature.contains(search),
        )
    )

    users = query.order_by(UserModel.join_time.desc()).limit(limit).all()
    return api_success([serialize_user(user) for user in users], "获取用户搜索结果成功")


@bp.get("/<string:user_id>/profile")
def get_profile(user_id):
    user = UserModel.query.get(user_id)
    if not user or not user.is_active:
        return api_error("用户不存在", 404)

    posts = (
        PostModel.query.options(joinedload(PostModel.board), joinedload(PostModel.author))
        .filter_by(author_id=user.id, is_active=True)
        .order_by(PostModel.create_time.desc())
        .all()
    )
    post_ids = [post.id for post in posts]
    comment_count = 0
    if post_ids:
        comment_count = (
            CommentModel.query.filter(
                CommentModel.post_id.in_(post_ids),
                CommentModel.is_active.is_(True),
            ).count()
        )

    return api_success(
        {
            "user": serialize_user(user),
            "stats": {
                "posts": len(posts),
                "reads": sum(post.read_count or 0 for post in posts),
                "comments": comment_count,
            },
            "posts": [serialize_post_summary(post) for post in posts[:12]],
        },
        "获取用户资料成功",
    )


@bp.post("/me/avatar")
@api_login_required
def update_my_avatar():
    avatar = request.files.get("avatar")
    if not avatar or not avatar.filename:
        return api_error("请选择头像文件", 400)

    if request.content_length and request.content_length > MAX_AVATAR_BYTES:
        return api_error("头像不能超过 3MB", 400)

    filename = secure_filename(avatar.filename)
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_AVATAR_EXTENSIONS:
        return api_error("头像只支持 jpg、png、webp", 400)

    avatars_save_path = current_app.config.get("AVATARS_SAVE_PATH")
    if not os.path.isabs(avatars_save_path):
        avatars_save_path = os.path.join(current_app.root_path, avatars_save_path)
    os.makedirs(avatars_save_path, exist_ok=True)

    saved_name = f"{uuid.uuid4().hex}.{extension}"
    avatar.save(os.path.join(avatars_save_path, saved_name))

    current_user.avatar = url_for("media.media_file", filename=f"avatars/{saved_name}")
    db.session.commit()

    return api_success(serialize_user(current_user, include_private=True), "头像已更新")


@bp.patch("/me/profile")
@api_login_required
def update_my_profile():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    signature = (data.get("signature") or "").strip()
    gender = (data.get("gender") or "").strip()

    if not username:
        return api_error("昵称不能为空", 400)
    if len(username) > 24:
        return api_error("昵称不能超过 24 个字", 400)
    if len(signature) > 100:
        return api_error("签名不能超过 100 个字", 400)
    if gender and gender not in {"male", "female", "secret"}:
        return api_error("性别参数不正确", 400)

    existing = UserModel.query.filter(UserModel.username == username, UserModel.id != current_user.id).first()
    if existing:
        return api_error("这个昵称已经被使用", 400)

    current_user.username = username
    current_user.signature = signature or None
    current_user.gender = gender or None
    db.session.commit()

    return api_success(serialize_user(current_user, include_private=True), "资料已更新")


@bp.patch("/me/password")
@api_login_required
def update_my_password():
    data = request.get_json(silent=True) or {}
    old_password = data.get("oldPassword") or ""
    new_password = data.get("newPassword") or ""

    if not old_password:
        return api_error("请输入当前密码", 400)
    if not current_user.check_password(old_password):
        return api_error("当前密码不正确", 400)
    if len(new_password) < 6:
        return api_error("新密码至少需要 6 位", 400)
    if old_password == new_password:
        return api_error("新密码不能和当前密码相同", 400)

    current_user.password = new_password
    db.session.commit()

    return api_success(None, "密码已更新")


@bp.get("/me/settings")
@api_login_required
def get_my_settings():
    return api_success(_serialize_settings(current_user), "获取账号设置成功")


@bp.patch("/me/settings")
@api_login_required
def update_my_settings():
    data = request.get_json(silent=True) or {}
    fields = {
        "notifyCommentReply": "notify_comment_reply",
        "notifyNewMessage": "notify_new_message",
        "notifyPostLike": "notify_post_like",
        "notifyCommentLike": "notify_comment_like",
        "receiveEmailNotifications": "receive_email_notifications",
    }

    for payload_key, model_key in fields.items():
        if payload_key in data:
            setattr(current_user, model_key, bool(data[payload_key]))

    db.session.commit()
    return api_success(_serialize_settings(current_user), "账号设置已更新")


@bp.get("/me/following")
@api_login_required
def list_my_following():
    follows = (
        FollowModel.query.options(joinedload(FollowModel.followed))
        .filter_by(follower_id=current_user.id)
        .order_by(FollowModel.create_time.desc())
        .all()
    )
    users = [follow.followed for follow in follows if follow.followed and follow.followed.is_active]
    return api_success([serialize_user(user) for user in users], "获取关注列表成功")


@bp.get("/<string:user_id>/followers")
def list_followers(user_id):
    user = UserModel.query.get(user_id)
    if not user or not user.is_active:
        return api_error("用户不存在", 404)

    follows = (
        FollowModel.query.options(joinedload(FollowModel.follower))
        .filter_by(followed_id=user.id)
        .order_by(FollowModel.create_time.desc())
        .all()
    )
    users = [follow.follower for follow in follows if follow.follower and follow.follower.is_active]
    return api_success([serialize_user(item) for item in users], "获取粉丝列表成功")


@bp.get("/<string:user_id>/following")
def list_following(user_id):
    user = UserModel.query.get(user_id)
    if not user or not user.is_active:
        return api_error("用户不存在", 404)

    follows = (
        FollowModel.query.options(joinedload(FollowModel.followed))
        .filter_by(follower_id=user.id)
        .order_by(FollowModel.create_time.desc())
        .all()
    )
    users = [follow.followed for follow in follows if follow.followed and follow.followed.is_active]
    return api_success([serialize_user(item) for item in users], "获取关注列表成功")


@bp.post("/<string:user_id>/follow")
@api_login_required
def follow_user(user_id):
    target = UserModel.query.get(user_id)
    if not target or not target.is_active:
        return api_error("用户不存在", 404)
    if target.id == current_user.id:
        return api_error("不能关注自己", 400)

    follow = FollowModel.query.filter_by(
        follower_id=current_user.id,
        followed_id=target.id,
    ).first()
    if not follow:
        db.session.add(FollowModel(follower_id=current_user.id, followed_id=target.id))
        db.session.commit()

    return api_success(serialize_user(target), "关注成功")


@bp.delete("/<string:user_id>/follow")
@api_login_required
def unfollow_user(user_id):
    follow = FollowModel.query.filter_by(
        follower_id=current_user.id,
        followed_id=user_id,
    ).first()
    if follow:
        db.session.delete(follow)
        db.session.commit()

    target = UserModel.query.get(user_id)
    return api_success(serialize_user(target) if target else None, "已取消关注")
