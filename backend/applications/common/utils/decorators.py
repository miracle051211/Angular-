from functools import wraps
from flask import g, abort, flash, redirect, url_for
from flask_login import login_required as _login_required

def login_required(func):
    @_login_required
    @wraps(func)
    def inner(*args, **kwargs):
        if not g.user.is_active:
            flash("该用户已被禁用！")
            return redirect(url_for("user.login"))
        else:
            return func(*args, **kwargs)
    return inner

def permission_required(permission):
    def outer(func):
        @wraps(func)
        def inner(*args, **kwargs):
            # 确保用户已登录且有权限
            if hasattr(g, "user") and g.user:
                # 确保获取最新的权限信息
                has_perm = g.user.has_permission(permission)
                if has_perm:
                    return func(*args, **kwargs)
            return abort(403)
        return inner
    return outer