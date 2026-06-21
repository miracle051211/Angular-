from flask import Flask
from .init_avatars import init_avatars
from .init_mail import init_mail, mail
from .init_sqlalchemy import init_sqlalchemy, db
from .init_login import init_login, login_manager
from .init_cache import init_cache, cache
from .init_cors import init_cors, cors
from . import hooks

def init_plugs(app:Flask):

    # 注册Flask功能
    init_sqlalchemy(app)
    init_avatars(app)
    init_mail(app)
    init_login(app)
    init_cache(app)
    init_cors(app)

    # 添加钩子函数
    app.before_request(hooks.dongtian_before_request)
