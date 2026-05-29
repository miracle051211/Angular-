from flask import Flask
from .init_avatars import init_avatars
from .init_csrf import init_csrf, csrf
from .init_mail import init_mail, mail
from .init_sqlalchemy import init_sqlalchemy, db
from .init_login import init_login, login_manager
from .init_cache import init_cache, cache
from .init_cors import init_cors, cors
from . import filters
from . import hooks

def init_plugs(app:Flask):

    # 注册Flask功能
    init_sqlalchemy(app)
    init_avatars(app)
    init_csrf(app)
    init_mail(app)
    init_login(app)
    init_cache(app)
    init_cors(app)

    # 添加钩子函数
    app.before_request(hooks.dongtian_before_request)

    # 添加模板过滤器
    app.template_filter("email_hash")(filters.email_hash)
    app.template_filter("friendly_time")(filters.friendly_time)
    app.template_filter("remove_html_tags")(filters.remove_html_tags)

    # 处理错误的钩子函数
    app.errorhandler(401)(hooks.bbs_401_error)
    app.errorhandler(404)(hooks.bbs_404_error)
    app.errorhandler(500)(hooks.bbs_500_error)


