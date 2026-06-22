import os
import re


def _normalize_database_url(database_url: str | None) -> str | None:
    if not database_url:
        return None
    if database_url.startswith("mysql://"):
        return database_url.replace("mysql://", "mysql+pymysql://", 1)
    return database_url


def _cors_origins():
    origins = os.getenv("CORS_ORIGINS")
    if origins:
        return [origin.strip() for origin in origins.split(",") if origin.strip()]
    return re.compile(r"^http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$")


class BaseConfig:
    SECRET_KEY = os.getenv("MIRACLE_SECRET_KEY", "123456")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = _cors_origins()
    UPLOAD_IMAGE_PATH = "static/images"


class DevelopmentConfig(BaseConfig):
    SQLALCHEMY_DATABASE_URI = (
        _normalize_database_url(os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL"))
        or "mysql+pymysql://root:123456@localhost:3306/dongtian_test?charset=utf8mb4"
    )

    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.qq.com")
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "true").lower() == "true"
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "false").lower() == "true"
    MAIL_PORT = int(os.getenv("MAIL_PORT", "465"))
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", MAIL_USERNAME)
    MAIL_TIMEOUT = int(os.getenv("MAIL_TIMEOUT", "10"))

    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "re_C6RKbykT_qknSYPC3anNqcNx6mLajpEWz")
    RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "Miracle <onboarding@resend.dev>")
    RESEND_TIMEOUT = int(os.getenv("RESEND_TIMEOUT", "10"))

    PER_PAGE_COUNT = 10

    AVATARS_SAVE_PATH = os.getenv(
        "AVATARS_SAVE_PATH",
        os.path.join(BaseConfig.UPLOAD_IMAGE_PATH, "avatars"),
    )
    POST_IMAGES_SAVE_PATH = os.getenv(
        "POST_IMAGES_SAVE_PATH",
        os.path.join(BaseConfig.UPLOAD_IMAGE_PATH, "posts"),
    )


class TestingConfig(BaseConfig):
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
