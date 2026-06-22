import os
import uuid

from flask import Blueprint, current_app, request, url_for
from flask_login import current_user
from sqlalchemy import or_
from werkzeug.utils import secure_filename

from applications.common.utils.ai_service import ai_service
from applications.extentions.init_sqlalchemy import db
from applications.models.notification import NotificationModel, NotificationType
from applications.models.post import (
    BoardModel,
    CommentModel,
    LikeModel,
    PostImageModel,
    PostModel,
    ReportModel,
)
from applications.models.user import UserModel

from .decorators import api_login_required
from .responses import api_error, api_success
from .serializers import serialize_comment, serialize_post_detail, serialize_post_summary

bp = Blueprint("api_posts", __name__, url_prefix="/posts")

ALLOWED_POST_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024
MAX_POST_IMAGES_PER_UPLOAD = 9
AI_ASSIST_MODES = {"inspiration", "continue", "structure", "polish"}


@bp.get("")
def list_posts():
    page = max(request.args.get("page", default=1, type=int), 1)
    per_page = min(max(request.args.get("perPage", default=10, type=int), 1), 50)
    board_id = request.args.get("boardId", type=int)
    search = (request.args.get("search") or "").strip()
    hot = request.args.get("hot", default=0, type=int)
    mine = request.args.get("mine", default=0, type=int)

    query = PostModel.query.join(BoardModel).filter(
        PostModel.is_active.is_(True),
        BoardModel.is_active.is_(True),
    )

    if board_id:
        query = query.filter(PostModel.board_id == board_id)
    if mine:
        if not current_user.is_authenticated:
            return api_error("请先登录", 401)
        query = query.filter(PostModel.author_id == current_user.id)
    if search:
        query = query.filter(or_(PostModel.title.contains(search), PostModel.content.contains(search)))

    order_column = PostModel.read_count.desc() if hot else PostModel.create_time.desc()
    pagination = query.order_by(order_column).paginate(page=page, per_page=per_page, error_out=False)

    return api_success(
        {
            "items": [serialize_post_summary(post) for post in pagination.items],
            "page": page,
            "perPage": per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        },
        "获取帖子列表成功",
    )


@bp.get("/<int:post_id>")
def get_post(post_id):
    post = _active_post_query().filter(PostModel.id == post_id).first()
    if not post:
        return api_error("帖子不存在", 404)

    post.read_count += 1
    db.session.commit()
    return api_success(serialize_post_detail(post), "获取帖子详情成功")


@bp.post("/ai-assist")
@api_login_required
def ai_assist_post():
    data = request.get_json(silent=True) or {}
    mode = (data.get("mode") or "").strip()
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()

    if mode not in AI_ASSIST_MODES:
        return api_error("无效的 AI 辅助模式。", 400)
    if mode != "inspiration" and not content:
        return api_error("使用这个 AI 模式前请先写一点正文。", 400)

    context = "\n".join(
        part
        for part in [
            f"Title: {title}" if title else "",
            f"Content: {content}" if content else "",
        ]
        if part
    )

    if mode == "inspiration":
        result = ai_service.generate_inspiration(
            "Generate a natural Chinese forum post title and opening paragraph for a learning community. "
            "Put the title on the first line and the body after it."
            f"\n\nExisting clues:\n{context or 'None'}"
        )
        message = "AI 灵感已生成。"
    elif mode == "continue":
        result = ai_service.continue_content(
            content,
            "Continue this Chinese learning community post. Keep the tone natural, "
            "do not repeat existing content, and output only the continuation.",
        )
        message = "AI 续写已生成。"
    elif mode == "structure":
        result = ai_service.optimize_structure(
            content,
            "Improve the structure of this Chinese learning community post. "
            "Make it clearer and more organized without making it formal or stiff.",
        )
        message = "AI 结构整理已生成。"
    else:
        result = ai_service.polish_content(
            content,
            "Polish this Chinese learning community post. Make it natural, sincere, "
            "clear, and easy to respond to without making it overly formal.",
        )
        message = "AI 润色已生成。"

    if getattr(result, "text", "").startswith("AI service failed"):
        return api_error(result.text, 502)

    return api_success(
        {
            "text": result.text,
            "usage": result.usage,
            "model": result.get("model"),
        },
        message,
    )


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
    current_user.add_experience(1)
    db.session.add(post)
    db.session.commit()
    _create_mentions(content, post.id)
    return api_success(serialize_post_detail(post), "发布帖子成功", 201)


@bp.post("/<int:post_id>/images")
@api_login_required
def upload_post_images(post_id):
    post = _active_post_query().filter(PostModel.id == post_id).first()
    if not post:
        return api_error("帖子不存在", 404)
    if not _can_manage_post(post):
        return api_error("没有权限给该帖子上传图片", 403)

    files = [file for file in request.files.getlist("images") if file and file.filename]
    if not files:
        return api_error("请选择图片文件", 400)
    if len(files) > MAX_POST_IMAGES_PER_UPLOAD:
        return api_error(f"一次最多上传 {MAX_POST_IMAGES_PER_UPLOAD} 张图片", 400)

    save_path = current_app.config.get("POST_IMAGES_SAVE_PATH")
    if not os.path.isabs(save_path):
        save_path = os.path.join(current_app.root_path, save_path)
    os.makedirs(save_path, exist_ok=True)

    saved_images = []
    for image in files:
        filename = secure_filename(image.filename)
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if extension not in ALLOWED_POST_IMAGE_EXTENSIONS:
            return api_error("图片只支持 jpg、png、webp、gif", 400)

        image.stream.seek(0, os.SEEK_END)
        size = image.stream.tell()
        image.stream.seek(0)
        if size > MAX_POST_IMAGE_BYTES:
            return api_error("单张图片不能超过 5MB", 400)

        saved_name = f"{uuid.uuid4().hex}.{extension}"
        image.save(os.path.join(save_path, saved_name))
        post_image = PostImageModel(
            post_id=post.id,
            uploader_id=current_user.id,
            original_name=filename,
            url=url_for("media.media_file", filename=f"posts/{saved_name}"),
        )
        db.session.add(post_image)
        saved_images.append(post_image)

    db.session.commit()
    return api_success(
        [{"id": image.id, "url": image.url, "originalName": image.original_name} for image in saved_images],
        "图片上传成功",
        201,
    )


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

    _hard_delete_post(post)
    db.session.commit()
    return api_success(None, "删除帖子成功")


@bp.get("/<int:post_id>/comments")
def list_comments(post_id):
    post = _active_post_query().filter(PostModel.id == post_id).first()
    if not post:
        return api_error("帖子不存在", 404)

    comments = CommentModel.query.filter_by(post_id=post.id, parent_id=None, is_active=True).order_by(CommentModel.create_time.desc()).all()
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

    if post.author_id != current_user.id:
        _create_notification(
            user_id=post.author_id,
            sender_id=current_user.id,
            notice_type=NotificationType.POST_COMMENT.value,
            content=f"{current_user.username} 评论了你的帖子《{post.title}》。",
            related_id=comment.id,
            related_type="comment",
            related_post_id=post.id,
        )
    if parent and parent.author_id != current_user.id:
        _create_notification(
            user_id=parent.author_id,
            sender_id=current_user.id,
            notice_type=NotificationType.COMMENT_REPLY.value,
            content=f"{current_user.username} 回复了你的评论。",
            related_id=comment.id,
            related_type="comment",
            related_post_id=post.id,
        )
    _create_mentions(content, post.id)
    return api_success(serialize_comment(comment), "评论成功", 201)


@bp.post("/<int:post_id>/like")
@api_login_required
def toggle_post_like(post_id):
    post = _active_post_query().filter(PostModel.id == post_id).first()
    if not post:
        return api_error("帖子不存在", 404)

    like = LikeModel.query.filter_by(user_id=current_user.id, post_id=post.id).first()
    if like:
        db.session.delete(like)
        liked = False
    else:
        db.session.add(LikeModel(user_id=current_user.id, post_id=post.id))
        liked = True
        if post.author_id != current_user.id:
            post.author.add_experience(1)
            _create_notification(
                user_id=post.author_id,
                sender_id=current_user.id,
                notice_type=NotificationType.POST_LIKE.value,
                content=f"{current_user.username} 赞了你的帖子《{post.title}》。",
                related_id=post.id,
                related_type="post",
                related_post_id=post.id,
            )

    db.session.commit()
    return api_success({"liked": liked, "count": post.like_count()}, "点赞状态已更新")


@bp.post("/<int:post_id>/report")
@api_login_required
def report_post(post_id):
    post = _active_post_query().filter(PostModel.id == post_id).first()
    if not post:
        return api_error("帖子不存在", 404)

    report = ReportModel(user_id=current_user.id, post_id=post.id, reason=_report_reason())
    db.session.add(report)
    db.session.commit()
    return api_success({"reported": True}, "举报已提交", 201)


@bp.post("/<int:post_id>/comments/<int:comment_id>/like")
@api_login_required
def toggle_comment_like(post_id, comment_id):
    comment = _active_comment(post_id, comment_id)
    if not comment:
        return api_error("评论不存在", 404)

    like = LikeModel.query.filter_by(user_id=current_user.id, comment_id=comment.id).first()
    if like:
        db.session.delete(like)
        liked = False
    else:
        db.session.add(LikeModel(user_id=current_user.id, comment_id=comment.id))
        liked = True
        if comment.author_id != current_user.id:
            comment.author.add_experience(1)
            _create_notification(
                user_id=comment.author_id,
                sender_id=current_user.id,
                notice_type=NotificationType.COMMENT_LIKE.value,
                content=f"{current_user.username} 赞了你的评论。",
                related_id=comment.id,
                related_type="comment",
                related_post_id=post_id,
            )

    db.session.commit()
    return api_success({"liked": liked, "count": comment.like_count()}, "点赞状态已更新")


@bp.post("/<int:post_id>/comments/<int:comment_id>/report")
@api_login_required
def report_comment(post_id, comment_id):
    comment = _active_comment(post_id, comment_id)
    if not comment:
        return api_error("评论不存在", 404)

    report = ReportModel(user_id=current_user.id, comment_id=comment.id, reason=_report_reason())
    db.session.add(report)
    db.session.commit()
    return api_success({"reported": True}, "举报已提交", 201)


def _active_post_query():
    return PostModel.query.join(BoardModel).filter(
        PostModel.is_active.is_(True),
        BoardModel.is_active.is_(True),
    )


def _can_manage_post(post):
    return post.author_id == current_user.id or bool(current_user.is_staff)


def _active_comment(post_id, comment_id):
    return CommentModel.query.filter_by(id=comment_id, post_id=post_id, is_active=True).first()


def _report_reason():
    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip()
    return (reason or "用户未填写具体原因")[:500]


def _create_notification(user_id, sender_id, notice_type, content, related_id=None, related_type=None, related_post_id=None):
    recipient = UserModel.query.get(user_id)
    if not recipient or not _allows_notification(recipient, notice_type):
        return

    db.session.add(
        NotificationModel(
            user_id=user_id,
            sender_id=sender_id,
            type=notice_type,
            content=content[:200],
            related_id=related_id,
            related_type=related_type,
            related_post_id=related_post_id,
        )
    )


def _allows_notification(user, notice_type):
    if notice_type in {NotificationType.POST_COMMENT.value, NotificationType.COMMENT_REPLY.value, "MENTION"}:
        return bool(user.notify_comment_reply)
    if notice_type == NotificationType.POST_LIKE.value:
        return bool(user.notify_post_like)
    if notice_type == NotificationType.COMMENT_LIKE.value:
        return bool(user.notify_comment_like)
    if notice_type == NotificationType.NEW_MESSAGE.value:
        return bool(user.notify_new_message)
    return True


def _create_mentions(content, post_id):
    mentioned_names = {part.strip(" ，。!！?？；;") for part in content.split("@")[1:]}
    for raw_name in mentioned_names:
        username = raw_name.split()[0] if raw_name else ""
        if not username:
            continue
        user = UserModel.query.filter_by(username=username, is_active=True).first()
        if not user or user.id == current_user.id:
            continue
        _create_notification(
            user_id=user.id,
            sender_id=current_user.id,
            notice_type="MENTION",
            content=f"{current_user.username} 在帖子里 @ 了你。",
            related_id=post_id,
            related_type="post",
            related_post_id=post_id,
        )
    db.session.commit()


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
