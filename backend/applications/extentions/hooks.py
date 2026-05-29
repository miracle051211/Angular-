from flask import g, render_template
from flask_login import current_user
from sqlalchemy.orm import joinedload

from applications.extentions.init_login import login_manager
from applications.models.user import UserModel, RoleModel, PermissionModel
from applications.extentions.init_sqlalchemy import db

def dongtian_before_request():
    """钩子函数，在请求之前执行"""
    # 如果用户已登录
    if current_user.is_authenticated:
        # 从数据库重新加载用户对象，强制获取最新信息，包括角色和权限
        user = db.session.query(UserModel).options(
            joinedload(UserModel.role).joinedload(RoleModel.permissions)
        ).filter(UserModel.id == current_user.id).first()
        
        if user:
            g.user = user
        else:
            g.user = None
def bbs_404_error(error):
    return render_template("errors/404.html")
def bbs_401_error(error):
    return render_template("errors/401.html")
def bbs_500_error(error):
    return render_template("errors/500.html")


