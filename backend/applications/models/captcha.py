from applications.extentions.init_sqlalchemy import db
from datetime import datetime, timedelta
from shortuuid import uuid

class CaptchaModel(db.Model):
    __tablename__ = "captcha"
    id = db.Column(db.String(100), primary_key=True, default=uuid)
    email = db.Column(db.String(50), nullable=False)
    captcha = db.Column(db.String(6), nullable=False)
    # type字段用于区分不同用途的验证码，如"register"、"reset"等
    type = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    expired_at = db.Column(db.DateTime, default=lambda: datetime.now() + timedelta(minutes=5))
    
    def __init__(self, email, captcha, type):
        self.email = email
        self.captcha = captcha
        self.type = type
        self.created_at = datetime.now()
        self.expired_at = datetime.now() + timedelta(minutes=5)
    
    # 检查验证码是否有效
    def is_valid(self):
        return datetime.now() < self.expired_at
