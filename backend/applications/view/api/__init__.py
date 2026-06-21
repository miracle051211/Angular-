from flask import Blueprint

from .admin import bp as admin_bp
from .auth import bp as auth_bp
from .boards import bp as boards_bp
from .messages import bp as messages_bp
from .notifications import bp as notifications_bp
from .posts import bp as posts_bp
from .stats import bp as stats_bp
from .users import bp as users_bp

api_bp = Blueprint("api", __name__, url_prefix="/api")
api_bp.register_blueprint(admin_bp)
api_bp.register_blueprint(auth_bp)
api_bp.register_blueprint(boards_bp)
api_bp.register_blueprint(messages_bp)
api_bp.register_blueprint(notifications_bp)
api_bp.register_blueprint(posts_bp)
api_bp.register_blueprint(stats_bp)
api_bp.register_blueprint(users_bp)
