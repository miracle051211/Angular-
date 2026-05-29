import os
from flask import Flask
from applications.config import DevelopmentConfig
from applications.extentions import init_plugs
from applications.view import init_bps
from applications.common.script import init_script

def create_app():

    app = Flask(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


    app.config.from_object(DevelopmentConfig)

    # 初始化组件
    init_plugs(app)

    # 初始化蓝图
    init_bps(app)

    # 注册命令
    init_script(app)


    return app


