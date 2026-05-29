from flask import Flask
from .cms import bp as cms_bp
from .front import bp as front_bp
from .media import bp as media_bp
from .post import bp as post_bp
from .user import bp as user_bp

def register_system_bps(app:Flask):
    app.register_blueprint(cms_bp)
    app.register_blueprint(front_bp)
    app.register_blueprint(media_bp)
    app.register_blueprint(post_bp)
    app.register_blueprint(user_bp)
