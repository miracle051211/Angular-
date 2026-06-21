from flask import Blueprint
from flask_login import current_user

from applications.extentions.init_sqlalchemy import db
from applications.models.message import MessageModel

from .decorators import api_login_required
from .responses import api_error, api_success
from .serializers import serialize_user

bp = Blueprint("api_messages", __name__, url_prefix="/messages")


@bp.get("")
@api_login_required
def list_messages():
    messages = (
        MessageModel.query.filter_by(receiver_id=current_user.id)
        .order_by(MessageModel.create_time.desc())
        .limit(100)
        .all()
    )
    return api_success([_serialize_message(message) for message in messages], "获取私信成功")


@bp.get("/<int:message_id>")
@api_login_required
def get_message(message_id):
    message = MessageModel.query.filter_by(id=message_id, receiver_id=current_user.id).first()
    if not message:
        return api_error("私信不存在", 404)

    if not message.is_read:
        message.is_read = True
        db.session.commit()

    return api_success(_serialize_message(message), "获取私信成功")


@bp.get("/summary")
@api_login_required
def message_summary():
    unread = MessageModel.query.filter_by(receiver_id=current_user.id, is_read=False).count()
    return api_success({"unread": unread}, "获取私信汇总成功")


@bp.post("/read-all")
@api_login_required
def mark_all_read():
    MessageModel.query.filter_by(receiver_id=current_user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return api_success(None, "私信已全部标记为已读")


@bp.post("/<int:message_id>/read")
@api_login_required
def mark_read(message_id):
    message = MessageModel.query.filter_by(id=message_id, receiver_id=current_user.id).first()
    if not message:
        return api_error("私信不存在", 404)

    message.is_read = True
    db.session.commit()
    return api_success(_serialize_message(message), "私信已标记为已读")


def _serialize_message(message):
    sender_name = message.sender.username if message.sender else "洞天成员"
    return {
        "id": message.id,
        "subject": f"来自 {sender_name} 的私信",
        "body": message.content,
        "sender": serialize_user(message.sender),
        "receiver": serialize_user(message.receiver),
        "sentAt": message.create_time.isoformat(),
        "isRead": message.is_read,
    }
