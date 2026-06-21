from flask import Blueprint, request
from flask_login import current_user
from sqlalchemy import and_, or_
from sqlalchemy.orm import joinedload

from applications.extentions.init_sqlalchemy import db
from applications.models.message import MessageModel
from applications.models.user import UserModel

from .decorators import api_login_required
from .responses import api_error, api_success
from .serializers import serialize_user

bp = Blueprint("api_messages", __name__, url_prefix="/messages")


def _message_query_for_current_user():
    return MessageModel.query.options(
        joinedload(MessageModel.sender),
        joinedload(MessageModel.receiver),
    ).filter(
        or_(
            MessageModel.receiver_id == current_user.id,
            MessageModel.sender_id == current_user.id,
        )
    )


@bp.get("")
@api_login_required
def list_messages():
    messages = (
        MessageModel.query.options(joinedload(MessageModel.sender), joinedload(MessageModel.receiver))
        .filter_by(receiver_id=current_user.id)
        .order_by(MessageModel.create_time.desc())
        .limit(100)
        .all()
    )
    return api_success([_serialize_message(message) for message in messages], "获取私信成功")


@bp.post("")
@api_login_required
def send_message():
    payload = request.get_json(silent=True) or {}
    receiver_id = (payload.get("receiverId") or "").strip()
    receiver_text = (payload.get("receiver") or "").strip()
    content = (payload.get("content") or payload.get("body") or "").strip()

    if not content:
        return api_error("请填写私信内容", 400)
    if len(content) > 1200:
        return api_error("私信内容不能超过 1200 字", 400)

    receiver = None
    if receiver_id:
        receiver = UserModel.query.filter_by(id=receiver_id, is_active=True).first()
    elif receiver_text:
        receiver = UserModel.query.filter(
            UserModel.is_active.is_(True),
            or_(UserModel.username == receiver_text, UserModel.email == receiver_text),
        ).first()

    if not receiver:
        return api_error("收件人不存在", 404)
    if receiver.id == current_user.id:
        return api_error("不能给自己发送私信", 400)

    message = MessageModel(sender_id=current_user.id, receiver_id=receiver.id, content=content)
    db.session.add(message)
    db.session.commit()

    message = MessageModel.query.options(joinedload(MessageModel.sender), joinedload(MessageModel.receiver)).get(message.id)
    return api_success(_serialize_message(message), "私信已送达", 201)


@bp.get("/conversations")
@api_login_required
def list_conversations():
    messages = _message_query_for_current_user().order_by(MessageModel.create_time.desc()).all()
    conversations = {}

    for message in messages:
        partner = message.sender if message.sender_id != current_user.id else message.receiver
        if not partner:
            continue
        existing = conversations.get(partner.id)
        if existing is None:
            conversations[partner.id] = {
                "partner": serialize_user(partner),
                "latestMessage": _serialize_message(message),
                "unreadCount": 0,
            }
        if message.receiver_id == current_user.id and not message.is_read:
            conversations[partner.id]["unreadCount"] += 1

    return api_success(list(conversations.values()), "获取会话成功")


@bp.get("/conversations/<string:user_id>")
@api_login_required
def get_conversation(user_id):
    partner = UserModel.query.filter_by(id=user_id, is_active=True).first()
    if not partner:
        return api_error("用户不存在", 404)

    messages = (
        MessageModel.query.options(joinedload(MessageModel.sender), joinedload(MessageModel.receiver))
        .filter(
            or_(
                and_(MessageModel.sender_id == current_user.id, MessageModel.receiver_id == partner.id),
                and_(MessageModel.sender_id == partner.id, MessageModel.receiver_id == current_user.id),
            )
        )
        .order_by(MessageModel.create_time.asc())
        .limit(300)
        .all()
    )

    unread_ids = [message.id for message in messages if message.receiver_id == current_user.id and not message.is_read]
    if unread_ids:
        MessageModel.query.filter(MessageModel.id.in_(unread_ids)).update({"is_read": True}, synchronize_session=False)
        db.session.commit()
        for message in messages:
            if message.id in unread_ids:
                message.is_read = True

    return api_success(
        {
            "partner": serialize_user(partner),
            "messages": [_serialize_message(message) for message in messages],
        },
        "获取会话成功",
    )


@bp.get("/<int:message_id>")
@api_login_required
def get_message(message_id):
    message = MessageModel.query.options(joinedload(MessageModel.sender), joinedload(MessageModel.receiver)).filter(
        MessageModel.id == message_id,
        or_(MessageModel.receiver_id == current_user.id, MessageModel.sender_id == current_user.id),
    ).first()
    if not message:
        return api_error("私信不存在", 404)

    if message.receiver_id == current_user.id and not message.is_read:
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
    sender_name = message.sender.username if message.sender else "匿名用户"
    return {
        "id": message.id,
        "subject": f"来自 {sender_name} 的私信",
        "body": message.content,
        "content": message.content,
        "sender": serialize_user(message.sender),
        "receiver": serialize_user(message.receiver),
        "sentAt": message.create_time.isoformat(),
        "isRead": message.is_read,
        "isMine": message.sender_id == current_user.id if current_user and current_user.is_authenticated else False,
    }
