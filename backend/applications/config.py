import re
import os



# 数据库配置信息
class BaseConfig:
    SECRET_KEY = os.getenv("MIRACLE_SECRET_KEY", "change-me-in-production")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = re.compile(r"^http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$")
    # 上传文件配置
    UPLOAD_IMAGE_PATH = "static/images"
    

class DevelopmentConfig(BaseConfig):
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:123456@localhost:3306/dongtian_test?charset=utf8mb4'

    # 邮箱配置
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.qq.com")
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "true").lower() == "true"
    MAIL_PORT = int(os.getenv("MAIL_PORT", "465"))
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", MAIL_USERNAME)

    # 分页设置
    PER_PAGE_COUNT = 10

    # 头像保存路径
    AVATARS_SAVE_PATH = os.path.join(BaseConfig.UPLOAD_IMAGE_PATH, "avatars")
    POST_IMAGES_SAVE_PATH = os.path.join(BaseConfig.UPLOAD_IMAGE_PATH, "posts")
    
    # 确保路径是绝对路径
    if not os.path.isabs(AVATARS_SAVE_PATH):
        AVATARS_SAVE_PATH = os.path.abspath(AVATARS_SAVE_PATH)
    if not os.path.isabs(POST_IMAGES_SAVE_PATH):
        POST_IMAGES_SAVE_PATH = os.path.abspath(POST_IMAGES_SAVE_PATH)
    

class TestingConfig(BaseConfig):
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"





