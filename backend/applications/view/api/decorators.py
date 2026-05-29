from functools import wraps

from flask_login import current_user

from .responses import api_error


def api_login_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return api_error("请先登录", 401)
        if not current_user.is_active:
            return api_error("该用户已被禁用", 403)
        return view_func(*args, **kwargs)

    return wrapper
