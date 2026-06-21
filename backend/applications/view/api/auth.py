import random
from datetime import datetime

from flask import Blueprint, current_app, request
from flask_mail import Message
from flask_login import current_user, login_user, logout_user

from applications.extentions.init_mail import mail
from applications.extentions.init_sqlalchemy import db
from applications.models.captcha import CaptchaModel
from applications.models.user import UserModel

from .decorators import api_login_required
from .responses import api_error, api_success
from .serializers import serialize_user

bp = Blueprint("api_auth", __name__, url_prefix="/auth")

CAPTCHA_TYPES = {"register", "reset"}


def _make_captcha():
    return f"{random.randint(0, 999999):06d}"


def _latest_valid_captcha(email, captcha_type):
    return (
        CaptchaModel.query.filter_by(email=email, type=captcha_type)
        .order_by(CaptchaModel.created_at.desc())
        .first()
    )


def _verify_captcha(email, captcha_type, captcha):
    item = _latest_valid_captcha(email, captcha_type)
    if not item or not item.is_valid() or item.captcha != captcha:
        return False
    db.session.delete(item)
    return True


def _send_captcha_email(email, captcha, captcha_type):
    subject = "学习小洞天注册验证码" if captcha_type == "register" else "学习小洞天密码重置验证码"
    action = "注册账号" if captcha_type == "register" else "找回密码"
    message = Message(subject=subject, recipients=[email])
    message.body = (
        f"你的学习小洞天验证码是：{captcha}\n\n"
        f"该验证码用于{action}，5 分钟内有效。"
        "如果不是你本人操作，请忽略这封邮件。"
    )
    mail.send(message)


@bp.post("/captcha")
def send_captcha():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    captcha_type = (data.get("type") or "register").strip()

    if captcha_type not in CAPTCHA_TYPES:
        return api_error("验证码类型不正确", 400)
    if captcha_type == "register" and UserModel.query.filter_by(email=email).first():
        return api_error("邮箱已存在，请直接登录", 400)
    if captcha_type == "reset" and not UserModel.query.filter_by(email=email).first():
        return api_error("该邮箱尚未注册", 404)

    latest = _latest_valid_captcha(email, captcha_type)
    if latest and latest.is_valid() and (datetime.now() - latest.created_at).total_seconds() < 60:
        return api_error("验证码发送太频繁，请稍后再试", 429)

    captcha = _make_captcha()
    CaptchaModel.query.filter_by(email=email, type=captcha_type).delete()
    db.session.add(CaptchaModel(email=email, captcha=captcha, type=captcha_type))
    db.session.commit()

    try:
        _send_captcha_email(email, captcha, captcha_type)
    except Exception as exc:
        current_app.logger.exception("Failed to send captcha email")
        CaptchaModel.query.filter_by(email=email, type=captcha_type, captcha=captcha).delete()
        db.session.commit()
        return api_error(f"验证码发送失败：{exc}", 500)

    return api_success(None, "验证码已发送")


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    captcha = (data.get("captcha") or "").strip()

    if len(username) < 2:
        return api_error("用户名至少需要 2 个字符", 400)
    if len(password) < 6:
        return api_error("密码至少需要 6 位", 400)
    if not captcha:
        return api_error("请输入邮箱验证码", 400)
    if UserModel.query.filter_by(email=email).first():
        return api_error("邮箱已存在", 400)
    if UserModel.query.filter_by(username=username).first():
        return api_error("用户名已存在", 400)
    if not _verify_captcha(email, "register", captcha):
        return api_error("验证码不正确或已过期", 400)

    user = UserModel(username=username, email=email, password=password)
    db.session.add(user)
    db.session.commit()
    login_user(user)

    return api_success(serialize_user(user, include_private=True), "注册成功", 201)


@bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    captcha = (data.get("captcha") or "").strip()
    password = data.get("password") or ""

    user = UserModel.query.filter_by(email=email).first()
    if not user:
        return api_error("该邮箱尚未注册", 404)
    if len(password) < 6:
        return api_error("新密码至少需要 6 位", 400)
    if not _verify_captcha(email, "reset", captcha):
        return api_error("验证码不正确或已过期", 400)

    user.password = password
    db.session.commit()
    return api_success(None, "密码已重置，请重新登录")


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
    user.grant_daily_login_experience()
    db.session.commit()
    return api_success(serialize_user(user, include_private=True), "登录成功")


@bp.post("/logout")
def logout():
    logout_user()
    return api_success(None, "退出登录成功")


@bp.get("/me")
@api_login_required
def me():
    return api_success(serialize_user(current_user, include_private=True), "获取当前用户成功")
