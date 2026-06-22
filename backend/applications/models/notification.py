from datetime import datetime
from enum import Enum

from applications.extentions.init_sqlalchemy import db


class NotificationType(Enum):
    NEW_MESSAGE = "NEW_MESSAGE"
    COMMENT_REPLY = "COMMENT_REPLY"
    POST_LIKE = "POST_LIKE"
    COMMENT_LIKE = "COMMENT_LIKE"
    POST_COMMENT = "POST_COMMENT"
    SYSTEM_NOTICE = "SYSTEM_NOTICE"

    @property
    def label(self):
        labels = {
            self.NEW_MESSAGE: "新消息",
            self.COMMENT_REPLY: "评论回复",
            self.POST_LIKE: "帖子点赞",
            self.COMMENT_LIKE: "评论点赞",
            self.POST_COMMENT: "帖子评论",
            self.SYSTEM_NOTICE: "系统通知",
        }
        return labels.get(self, self.value)


class NotificationModel(db.Model):
    __tablename__ = "notification"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(100), db.ForeignKey("user.id"), nullable=False)
    sender_id = db.Column(db.String(100), db.ForeignKey("user.id"), nullable=True)
    type = db.Column(db.String(50), nullable=False)
    content = db.Column(db.String(200), nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    create_time = db.Column(db.DateTime, default=datetime.now)
    related_id = db.Column(db.Integer, nullable=True)
    related_type = db.Column(db.String(20), nullable=True)
    related_post_id = db.Column(db.Integer, nullable=True)

    user = db.relationship(
        "UserModel",
        foreign_keys=[user_id],
        backref=db.backref("notifications", order_by=create_time.desc()),
    )
    sender = db.relationship("UserModel", foreign_keys=[sender_id], backref="sent_notifications")

    def __repr__(self):
        return f"<Notification {self.id}: {self.type} - {self.content}>"

    def mark_as_read(self):
        self.is_read = True
        db.session.commit()

    def mark_as_unread(self):
        self.is_read = False
        db.session.commit()

    @property
    def type_label(self):
        try:
            return NotificationType(self.type).label
        except ValueError:
            return self.type
