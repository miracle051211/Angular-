from flask import Blueprint, request
from flask_login import current_user
from sqlalchemy.orm import joinedload

from applications.extentions.init_sqlalchemy import db
from applications.models.notification import NotificationModel, NotificationType

from .decorators import api_login_required
from .responses import api_error, api_success
from .serializers import serialize_user

bp = Blueprint("api_notifications", __name__, url_prefix="/notifications")


@bp.get("")
@api_login_required
def list_notifications():
    notices = (
        NotificationModel.query.filter_by(user_id=current_user.id)
        .order_by(NotificationModel.create_time.desc())
        .limit(100)
        .all()
    )
    return api_success([_serialize_notification(notice) for notice in notices], "获取通知成功")


@bp.get("/summary")
@api_login_required
def notification_summary():
    notices = NotificationModel.query.filter_by(user_id=current_user.id, is_read=False).all()
    return api_success(
        {
            "mentions": _count_by_group(notices, "mention"),
            "likes": _count_by_group(notices, "like"),
            "system": _count_by_group(notices, "system"),
            "messages": _count_by_group(notices, "message"),
            "total": len(notices),
        },
        "获取通知汇总成功",
    )


@bp.get("/announcements")
def list_announcements():
    limit = min(max(request.args.get("limit", default=3, type=int), 1), 20)
    scan_limit = min(limit * 50, 300)
    notices = (
        NotificationModel.query.options(joinedload(NotificationModel.sender))
        .filter_by(type=NotificationType.SYSTEM_NOTICE.value)
        .order_by(NotificationModel.create_time.desc())
        .limit(scan_limit)
        .all()
    )

    seen = set()
    announcements = []
    for notice in notices:
        key = (notice.content, notice.image_url, notice.create_time.replace(microsecond=0))
        if key in seen:
            continue
        seen.add(key)
        announcements.append(_serialize_announcement(notice))
        if len(announcements) >= limit:
            break

    return api_success(announcements, "获取公告成功")


@bp.post("/read-all")
@api_login_required
def mark_all_read():
    NotificationModel.query.filter_by(user_id=current_user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return api_success(None, "通知已全部标记为已读")


@bp.post("/read-group/<string:group>")
@api_login_required
def mark_group_read(group):
    notices = NotificationModel.query.filter_by(user_id=current_user.id, is_read=False).all()
    for notice in notices:
        if _notification_group(notice.type) == group:
            notice.is_read = True
    db.session.commit()
    return api_success(None, "该分类通知已标记为已读")


@bp.delete("")
@api_login_required
def delete_all_notifications():
    NotificationModel.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return api_success(None, "通知已清空")


@bp.post("/<int:notice_id>/read")
@api_login_required
def mark_read(notice_id):
    notice = NotificationModel.query.filter_by(id=notice_id, user_id=current_user.id).first()
    if not notice:
        return api_error("通知不存在", 404)

    notice.is_read = True
    db.session.commit()
    return api_success(_serialize_notification(notice), "通知已标记为已读")


@bp.delete("/<int:notice_id>")
@api_login_required
def delete_notification(notice_id):
    notice = NotificationModel.query.filter_by(id=notice_id, user_id=current_user.id).first()
    if not notice:
        return api_error("通知不存在", 404)

    db.session.delete(notice)
    db.session.commit()
    return api_success(None, "通知已删除")


def _count_by_group(notices, group):
    return sum(1 for notice in notices if _notification_group(notice.type) == group)


def _serialize_notification(notice):
    group = _notification_group(notice.type)
    return {
        "id": notice.id,
        "kind": group,
        "type": notice.type,
        "title": _notification_title(notice.type),
        "body": notice.content,
        "imageUrl": notice.image_url,
        "createdAt": notice.create_time.isoformat(),
        "isRead": notice.is_read,
        "targetUrl": _notification_target(notice),
        "sender": serialize_user(notice.sender),
    }


def _serialize_announcement(notice):
    return {
        "id": notice.id,
        "title": "洞天公告",
        "body": notice.content,
        "imageUrl": notice.image_url,
        "createdAt": notice.create_time.isoformat(),
        "sender": serialize_user(notice.sender),
    }


def _notification_group(notice_type):
    if notice_type in {NotificationType.POST_LIKE.value, NotificationType.COMMENT_LIKE.value}:
        return "like"
    if notice_type == "MENTION":
        return "mention"
    if notice_type == NotificationType.SYSTEM_NOTICE.value:
        return "system"
    if notice_type in {
        NotificationType.NEW_MESSAGE.value,
        NotificationType.POST_COMMENT.value,
        NotificationType.COMMENT_REPLY.value,
    }:
        return "message"
    return "message"


def _notification_title(notice_type):
    titles = {
        NotificationType.POST_LIKE.value: "收到的赞",
        NotificationType.COMMENT_LIKE.value: "收到的赞",
        NotificationType.SYSTEM_NOTICE.value: "系统通知",
        NotificationType.NEW_MESSAGE.value: "我的消息",
        NotificationType.COMMENT_REPLY.value: "评论回复",
        NotificationType.POST_COMMENT.value: "评论消息",
        "MENTION": "@我的",
    }
    return titles.get(notice_type, "通知")


def _notification_target(notice):
    post_id = notice.related_post_id or (notice.related_id if notice.related_type == "post" else None)
    if post_id:
        return f"/posts/{post_id}"
    if notice.type == NotificationType.NEW_MESSAGE.value:
        return "/messages"
    if notice.type == NotificationType.SYSTEM_NOTICE.value:
        return "/notifications?tab=system"
    return "/notifications"
