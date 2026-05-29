from flask import Blueprint

from applications.extentions import csrf

from .auth import bp as auth_bp
from .boards import bp as boards_bp
from .posts import bp as posts_bp

api_bp = Blueprint("api", __name__, url_prefix="/api")
api_bp.register_blueprint(auth_bp)
api_bp.register_blueprint(boards_bp)
api_bp.register_blueprint(posts_bp)

csrf.exempt(api_bp)
