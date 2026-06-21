import random
from datetime import datetime

import requests
from flask import Blueprint, current_app, request
from flask_login import current_user, login_user, logout_user
from flask_mail import Message

from applications.common.utils.jwt import create_access_token
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


def _serialize_auth_payload(user):
    return {
        "user": serialize_user(user, include_private=True),
        "token": create_access_token(user.id),
    }


def _captcha_email_content(captcha, captcha_type):
    if captcha_type == "register":
        subject = "Miracle registration code"
        action = "register your account"
    else:
        subject = "Miracle password reset code"
        action = "reset your password"

    body = (
        f"Your Miracle verification code is: {captcha}\n\n"
        f"Use this code to {action}. It will expire in 5 minutes.\n\n"
        "If you did not request this code, you can ignore this email."
    )
    return subject, body


def _send_captcha_email(email, captcha, captcha_type):
    subject, body = _captcha_email_content(captcha, captcha_type)

    if current_app.config.get("RESEND_API_KEY"):
        _send_resend_email(email, subject, body)
        return

    message = Message(subject=subject, recipients=[email])
    message.body = body
    mail.send(message)


def _send_resend_email(email, subject, body):
    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {current_app.config['RESEND_API_KEY']}",
            "Content-Type": "application/json",
        },
        json={
            "from": current_app.config["RESEND_FROM_EMAIL"],
            "to": [email],
            "subject": subject,
            "text": body,
        },
        timeout=current_app.config.get("RESEND_TIMEOUT", 10),
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Resend email failed: {response.status_code} {response.text}")


@bp.post("/captcha")
def send_captcha():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    captcha_type = (data.get("type") or "register").strip()

    if captcha_type not in CAPTCHA_TYPES:
        return api_error("Invalid verification code type.", 400)
    if captcha_type == "register" and UserModel.query.filter_by(email=email).first():
        return api_error("This email is already registered. Please sign in.", 400)
    if captcha_type == "reset" and not UserModel.query.filter_by(email=email).first():
        return api_error("This email is not registered.", 404)

    latest = _latest_valid_captcha(email, captcha_type)
    if latest and latest.is_valid() and (datetime.now() - latest.created_at).total_seconds() < 60:
        return api_error("Verification codes are being sent too frequently. Please try later.", 429)

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
        return api_error(f"Failed to send verification code: {exc}", 500)

    return api_success(None, "Verification code sent.")


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    captcha = (data.get("captcha") or "").strip()

    if len(username) < 2:
        return api_error("Username must contain at least 2 characters.", 400)
    if len(password) < 6:
        return api_error("Password must contain at least 6 characters.", 400)
    if not captcha:
        return api_error("Please enter the email verification code.", 400)
    if UserModel.query.filter_by(email=email).first():
        return api_error("This email is already registered.", 400)
    if UserModel.query.filter_by(username=username).first():
        return api_error("This username is already taken.", 400)
    if not _verify_captcha(email, "register", captcha):
        return api_error("Verification code is incorrect or expired.", 400)

    user = UserModel(username=username, email=email, password=password)
    db.session.add(user)
    db.session.commit()
    login_user(user)

    return api_success(_serialize_auth_payload(user), "Registered successfully.", 201)


@bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    captcha = (data.get("captcha") or "").strip()
    password = data.get("password") or ""

    user = UserModel.query.filter_by(email=email).first()
    if not user:
        return api_error("This email is not registered.", 404)
    if len(password) < 6:
        return api_error("New password must contain at least 6 characters.", 400)
    if not _verify_captcha(email, "reset", captcha):
        return api_error("Verification code is incorrect or expired.", 400)

    user.password = password
    db.session.commit()
    return api_success(None, "Password reset successfully. Please sign in again.")


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    remember = bool(data.get("remember", False))

    user = UserModel.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return api_error("Email or password is incorrect.", 400)
    if not user.is_active:
        return api_error("This account has been disabled.", 403)

    login_user(user, remember=remember)
    user.grant_daily_login_experience()
    db.session.commit()
    return api_success(_serialize_auth_payload(user), "Signed in successfully.")


@bp.post("/logout")
def logout():
    logout_user()
    return api_success(None, "Signed out successfully.")


@bp.get("/me")
@api_login_required
def me():
    return api_success(serialize_user(current_user, include_private=True), "Current user loaded.")
