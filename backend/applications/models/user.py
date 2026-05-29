# enum模块提供了一种定义枚举类型的方式，用于表示一组有限的、唯一的常量值
from enum import Enum
from applications.extentions.init_sqlalchemy import db
from datetime import datetime
from shortuuid import uuid
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class PermissionEnum(Enum):
    Board = "板块"
    POST = "帖子"
    COMMENT = "评论"
    FRONT_USER = "前台用户"
    CMD_USER = "后台用户"

class PermissionModel(db.Model):
    __tablename__ = "permission"
    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    name = db.Column(db.Enum(PermissionEnum), nullable = False, unique = True)

role_permission_table = db.Table(
    "role_permission_table",
    db.Column("role_id", db.Integer, db.ForeignKey("role.id")),
    db.Column("permission_id", db.Integer, db.ForeignKey("permission.id"))
)

class RoleModel(db.Model):
    __tablename__ = "role"
    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    name = db.Column(db.String(50), nullable = False)
    # 角色描述desc
    desc = db.Column(db.String(200), nullable = False)
    create_time = db.Column(db.DateTime, default = datetime.now)
    # 实现many2many
    permissions = db.relationship("PermissionModel", secondary = role_permission_table, backref = "roles")

class UserModel(UserMixin, db.Model):
    __tablename__ = "user"
    id = db.Column(db.String(100), primary_key = True, default = uuid)
    username = db.Column(db.String(50), nullable = False, unique = True)
    # 将password改成_password
    _password = db.Column(db.String(200), nullable = False)
    email = db.Column(db.String(50), nullable = False, unique = True)
    # avatar 头像, 存储图片在服务器中保存的路径， 可以为空
    avatar = db.Column(db.String(100))
    # signature 签名, 可以为空
    signature = db.Column(db.String(100))
    join_time = db.Column(db.DateTime, default = datetime.now) 
    # 是否是员工，只有员工才可以进入后台系统，默认为False
    is_staff = db.Column(db.Boolean, default = False, nullable = False)
    # 是否可用，默认情况下是可用的，如果不可用，则会限制其登录
    is_active = db.Column(db.Boolean, default = True, nullable = False)
    
    # 隐私设置
    is_profile_public = db.Column(db.Boolean, default=True, nullable=False)  # 个人资料是否公开
    show_email = db.Column(db.Boolean, default=True, nullable=False)  # 是否显示邮箱
    
    # 通知设置
    notify_new_message = db.Column(db.Boolean, default=True, nullable=False)  # 新消息通知
    notify_comment_reply = db.Column(db.Boolean, default=True, nullable=False)  # 评论回复通知
    notify_post_like = db.Column(db.Boolean, default=True, nullable=False)  # 帖子点赞通知
    notify_comment_like = db.Column(db.Boolean, default=True, nullable=False)  # 评论点赞通知
    receive_email_notifications = db.Column(db.Boolean, default=False, nullable=False)  # 是否接收邮件通知

    # 外键
    role_id = db.Column(db.Integer, db.ForeignKey("role.id"))
    role = db.relationship("RoleModel", backref = "users")

    # arg *args **kwargs 传参顺序 *args是元组 **kwagrs是列表
    # *args将arg(位置参数)后的所有位置参数放到了一个元组里 **kwargs将关键字参数放到了字典里形成键值对
    def __init__(self, *args, **kwargs):
        if "password" in kwargs:
            self.password = kwargs.get("password")
            kwargs.pop("password")
        super(UserModel, self).__init__(*args, **kwargs)

    # 密码加密管理
    @property
    # 将password()方法定义为属性， 以后通过user.password可以获取加密后的密码
    def password(self):
        return self._password
    
    @password.setter
    # 通过user.password = "xxxxxx"会触发@password.setter下的password方法
    def password(self, raw_password):
        self._password = generate_password_hash(raw_password)

    # 密码验证
    def check_password(self, raw_password):
        # 以后通过user.check_password("password")即可返回密码是否正确
        result = check_password_hash(self.password, raw_password)
        return result
    
    # 检查是否有权限
    def has_permission(self, permission):
        # 确保获取最新的权限信息
        if not self.role:
            return False
        # 检查权限列表是否存在且不为空
        if not hasattr(self.role, 'permissions') or not self.role.permissions:
            return False
        return permission in [p.name for p in self.role.permissions]
    




