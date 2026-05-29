from applications.extentions.init_sqlalchemy import db
from datetime import datetime
from enum import Enum

class NotificationType(Enum):
    NEW_MESSAGE = "NEW_MESSAGE"
    COMMENT_REPLY = "COMMENT_REPLY"
    POST_LIKE = "POST_LIKE"
    COMMENT_LIKE = "COMMENT_LIKE"
    POST_COMMENT = "POST_COMMENT"
    SYSTEM_NOTICE = "SYSTEM_NOTICE"

    @property
    def label(self):
        """返回通知类型的中文标签"""
        labels = {
            self.NEW_MESSAGE: "新消息",
            self.COMMENT_REPLY: "评论回复",
            self.POST_LIKE: "帖子点赞",
            self.COMMENT_LIKE: "评论点赞",
            self.POST_COMMENT: "帖子评论",
            self.SYSTEM_NOTICE: "系统通知"
        }
        return labels.get(self, self.value)

class NotificationModel(db.Model):
    __tablename__ = "notification"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    # 接收通知的用户ID
    user_id = db.Column(db.String(100), db.ForeignKey("user.id"), nullable=False)
    # 发送通知的用户ID（可选，系统通知可能没有发送者）
    sender_id = db.Column(db.String(100), db.ForeignKey("user.id"), nullable=True)
    # 通知类型
    type = db.Column(db.String(50), nullable=False)
    # 通知内容
    content = db.Column(db.String(200), nullable=False)
    # 是否已读
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    # 创建时间
    create_time = db.Column(db.DateTime, default=datetime.now)
    # 相关资源ID（如帖子ID、评论ID等）
    related_id = db.Column(db.Integer, nullable=True)
    # 相关资源类型（如帖子、评论等）
    related_type = db.Column(db.String(20), nullable=True)
    # 相关帖子ID（如果通知是关于评论的，则记录评论所属的帖子ID，便于跳转）
    related_post_id = db.Column(db.Integer, nullable=True)
    
    # 关系
    user = db.relationship("UserModel", foreign_keys=[user_id], backref=db.backref('notifications', order_by=create_time.desc()))
    sender = db.relationship("UserModel", foreign_keys=[sender_id], backref='sent_notifications')
    
    def __repr__(self):
        return f"<Notification {self.id}: {self.type} - {self.content}>"
    
    def mark_as_read(self):
        """标记通知为已读"""
        self.is_read = True
        db.session.commit()
    
    def mark_as_unread(self):
        """标记通知为未读"""
        self.is_read = False
        db.session.commit()
    
    @property
    def type_label(self):
        """返回通知类型的中文标签"""
        try:
            return NotificationType(self.type).label
        except ValueError:
            return self.type