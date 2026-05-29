from applications.extentions.init_sqlalchemy import db
from datetime import datetime


class MessageModel(db.Model):
    __tablename__ = "message"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    # 发送者ID
    sender_id = db.Column(db.String(100), db.ForeignKey("user.id"), nullable=False)
    # 接收者ID
    receiver_id = db.Column(db.String(100), db.ForeignKey("user.id"), nullable=False)
    # 消息内容
    content = db.Column(db.Text, nullable=False)
    # 是否已读
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    # 创建时间
    create_time = db.Column(db.DateTime, default=datetime.now)
    # 关系
    sender = db.relationship("UserModel", foreign_keys=[sender_id], backref=db.backref("sent_messages", order_by=create_time.desc()))
    receiver = db.relationship("UserModel", foreign_keys=[receiver_id], backref=db.backref("received_messages", order_by=create_time.desc()))

    def __repr__(self):
        return f"<Message {self.id}: from {self.sender_id} to {self.receiver_id}>"
    
    def mark_as_read(self):
        """标记消息为已读"""
        self.is_read = True
        db.session.commit()
