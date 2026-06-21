from functools import wraps

from flask import g
from flask_login import current_user

from applications.models.user import PermissionEnum

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


def api_staff_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return api_error("请先登录", 401)
        if not current_user.is_active:
            return api_error("该用户已被禁用", 403)
        if not current_user.is_staff:
            return api_error("没有后台访问权限", 403)
        return view_func(*args, **kwargs)

    return wrapper


def api_permission_required(permission: PermissionEnum):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            if not current_user.is_authenticated:
                return api_error("请先登录", 401)
            if not current_user.is_active:
                return api_error("该用户已被禁用", 403)
            user = getattr(g, "user", current_user)
            if not getattr(user, "is_staff", False):
                return api_error("没有后台访问权限", 403)
            if not user.has_permission(permission):
                return api_error("没有该操作权限", 403)
            return view_func(*args, **kwargs)

        return wrapper

    return decorator
