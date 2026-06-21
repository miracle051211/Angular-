from flask import Flask
from .media import bp as media_bp

def register_system_bps(app:Flask):
    app.register_blueprint(media_bp)
