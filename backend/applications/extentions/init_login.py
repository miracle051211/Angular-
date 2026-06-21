from flask_login import LoginManager
from applications.common.utils.jwt import load_user_from_token
from applications.models.user import UserModel

login_manager = LoginManager()

def init_login(app):
    login_manager.init_app(app)
    # 设置登录视图
    login_manager.login_view = 'user.login'
    # 设置未授权提示消息
    login_manager.login_message = '请先登录'
    # 设置消息分类
    login_manager.login_message_category = 'warning'

    # 加载用户的回调函数
    @login_manager.user_loader
    def load_user(user_id):
        return UserModel.query.get(user_id)

    @login_manager.request_loader
    def load_user_from_request(request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        return load_user_from_token(auth_header.removeprefix("Bearer ").strip())
