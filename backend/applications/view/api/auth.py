from flask import Blueprint, request
from flask_login import current_user, login_user, logout_user

from applications.extentions.init_sqlalchemy import db
from applications.models.user import UserModel

from .decorators import api_login_required
from .responses import api_error, api_success
from .serializers import serialize_user

bp = Blueprint("api_auth", __name__, url_prefix="/auth")


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if len(username) < 2:
        return api_error("用户名至少需要 2 个字符", 400)
    if "@" not in email:
        return api_error("邮箱格式不正确", 400)
    if len(password) < 6:
        return api_error("密码至少需要 6 位", 400)
    if UserModel.query.filter_by(email=email).first():
        return api_error("邮箱已存在", 400)
    if UserModel.query.filter_by(username=username).first():
        return api_error("用户名已存在", 400)

    user = UserModel(username=username, email=email, password=password)
    db.session.add(user)
    db.session.commit()
    login_user(user)

    return api_success(serialize_user(user), "注册成功", 201)


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    remember = bool(data.get("remember", False))

    user = UserModel.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return api_error("邮箱或密码错误", 400)
    if not user.is_active:
        return api_error("该用户已被禁用", 403)

    login_user(user, remember=remember)
    return api_success(serialize_user(user), "登录成功")


@bp.post("/logout")
def logout():
    logout_user()
    return api_success(None, "退出登录成功")


@bp.get("/me")
@api_login_required
def me():
    return api_success(serialize_user(current_user), "获取当前用户成功")
