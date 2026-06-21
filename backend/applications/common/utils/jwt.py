import base64
import hashlib
import hmac
import json
import time

from flask import current_app


TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7


def _b64encode(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64decode(data):
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def _sign(message):
    secret = current_app.config["SECRET_KEY"].encode("utf-8")
    return _b64encode(hmac.new(secret, message.encode("ascii"), hashlib.sha256).digest())


def create_access_token(user_id):
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "user_id": user_id,
        "iat": now,
        "exp": now + TOKEN_MAX_AGE_SECONDS,
    }
    header_part = _b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_part = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = _sign(f"{header_part}.{payload_part}")
    return f"{header_part}.{payload_part}.{signature}"


def load_user_from_token(token):
    from applications.models.user import UserModel

    try:
        header_part, payload_part, signature = token.split(".")
        expected_signature = _sign(f"{header_part}.{payload_part}")
        if not hmac.compare_digest(signature, expected_signature):
            return None
        payload = json.loads(_b64decode(payload_part))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
    except (ValueError, TypeError, json.JSONDecodeError):
        return None

    return UserModel.query.get(payload.get("user_id"))
