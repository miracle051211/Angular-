# 后端 API 作业要求检查报告

## ✅ 完全满足的要求

### 1. Flask + 应用工厂模式 + Blueprint 结构
**状态：完全满足 ✅**

- **应用工厂模式**：pplications/__init__.py 中有 create_app() 函数
- **Blueprint 结构**：
  - pi_bp - 主 API 蓝图（/api）
  - pi_auth - 认证接口（/api/auth）
  - pi_posts - 帖子接口（/api/posts）
  - pi_users - 用户接口（/api/users）
  - pi_boards - 板块接口（/api/boards）
  - pi_admin - 管理接口（/api/admin）
  - pi_stats - 统计接口（/api/stats）
  - media_bp - 媒体文件访问（/media）

### 2. 不使用 Jinja2 模板，提供 RESTful JSON API
**状态：完全满足 ✅**

- ✅ 已删除所有 	emplates/ 目录
- ✅ 所有接口返回 JSON 格式
- ✅ 使用 jsonify() 返回数据

### 3. SQLAlchemy ORM，至少 3 张表
**状态：完全满足 ✅**

**核心业务表（超过 3 张）：**
1. **user** - 用户表
2. **post** - 帖子表（业务主表）
3. **board** - 板块表（分类表）
4. **comment** - 评论表
5. **likes** - 点赞表
6. **report** - 举报表
7. **role** - 角色表
8. **permission** - 权限表
9. **notification** - 通知表
10. **message** - 消息表
11. **captcha** - 验证码表

**关联表：**
- ole_permission_table - 角色权限多对多关联表

### 4. 表之间的关系（一对多/多对多）
**状态：完全满足 ✅**

**一对多关系：**
- UserModel ← PostModel (一个用户有多个帖子)
  - uthor_id = db.ForeignKey("user.id")
  - uthor = db.relationship("UserModel", backref = "posts")

- BoardModel ← PostModel (一个板块有多个帖子)
  - oard_id = db.ForeignKey("board.id")
  - oard = db.relationship("BoardModel", backref = "posts")

- PostModel ← CommentModel (一个帖子有多条评论)
  - post_id = db.ForeignKey("post.id")
  - post = db.relationship("PostModel", backref = "comments")

- UserModel ← LikeModel (一个用户有多个点赞)
  - user_id = db.ForeignKey("user.id")

- RoleModel ← UserModel (一个角色有多个用户)
  - ole_id = db.ForeignKey("role.id")
  - ole = db.relationship("RoleModel", backref = "users")

**多对多关系：**
- RoleModel ↔ PermissionModel (角色与权限多对多)
  - 通过 ole_permission_table 关联表实现
  - permissions = db.relationship("PermissionModel", secondary = role_permission_table, backref = "roles")

**业务功能体现：**
- ✅ 按板块筛选帖子：/api/posts?boardId=1
- ✅ 查看用户的帖子：通过 user.posts 反向引用
- ✅ 帖子与评论关联：/api/posts/<id>/comments
- ✅ 点赞关联：帖子点赞、评论点赞

### 5. 完整的 CRUD API
**状态：完全满足 ✅**

**帖子 (Post) CRUD：**
- ✅ **列表查询**：GET /api/posts - 支持分页、搜索、板块筛选、热门排序
- ✅ **详情查询**：GET /api/posts/<id> - 获取单个帖子详情
- ✅ **新增**：POST /api/posts - 创建帖子（需要登录）
- ✅ **修改**：PUT /api/posts/<id> - 更新帖子（需要作者权限）
- ✅ **删除**：DELETE /api/posts/<id> - 软删除帖子（需要作者权限）

**评论 (Comment) CRUD：**
- ✅ **列表查询**：GET /api/posts/<id>/comments
- ✅ **新增**：POST /api/posts/<id>/comments - 发表评论（需要登录）
- ✅ **删除**：评论删除接口已实现

**用户 (User) CRUD：**
- ✅ **详情查询**：GET /api/users/<id> - 获取用户信息
- ✅ **修改**：PUT /api/users/<id> - 更新用户资料（需要本人权限）
- ✅ **头像上传**：POST /api/users/<id>/avatar - 上传头像

**板块 (Board) CRUD：**
- ✅ **列表查询**：GET /api/boards
- ✅ **详情查询**：GET /api/boards/<id>
- ✅ 管理接口在 /api/admin/boards

### 6. 用户注册、登录、注销
**状态：完全满足 ✅**

**认证接口（/api/auth）：**
- ✅ **注册**：POST /api/auth/register
  - 参数：username, email, password
  - 验证：用户名长度、邮箱格式、密码长度、唯一性检查
  
- ✅ **登录**：POST /api/auth/login
  - 参数：email, password, remember
  - 使用 lask-login 的 login_user()
  - 返回用户信息
  
- ✅ **注销**：POST /api/auth/logout
  - 使用 lask-login 的 logout_user()
  
- ✅ **获取当前用户**：GET /api/auth/me
  - 需要登录才能访问

### 7. 密码哈希加密存储
**状态：完全满足 ✅**

**实现方式（pplications/models/user.py）：**
`python
from werkzeug.security import generate_password_hash, check_password_hash

class UserModel(UserMixin, db.Model):
    _password = db.Column(db.String(200), nullable = False)
    
    @property
    def password(self):
        return self._password
    
    @password.setter
    def password(self, raw_password):
        self._password = generate_password_hash(raw_password)
    
    def check_password(self, raw_password):
        return check_password_hash(self.password, raw_password)
\\\

- ✅ 使用 werkzeug.security 进行密码哈希
- ✅ 密码存储在 _password 字段（私有）
- ✅ 通过 @property 和 @setter 自动加密
- ✅ check_password() 方法验证密码

### 8. 后端权限控制
**状态：完全满足 ✅**

**权限装饰器（pplications/view/api/decorators.py）：**

1. **@api_login_required** - 需要登录
   - 检查 current_user.is_authenticated
   - 检查 current_user.is_active
   - 返回 401（未登录）或 403（被禁用）

2. **@api_staff_required** - 需要员工权限
   - 检查是否登录
   - 检查 current_user.is_staff
   - 返回 401/403

3. **@api_permission_required(permission)** - 需要特定权限
   - 检查是否登录
   - 检查是否员工
   - 检查是否有指定权限
   - 返回 401/403

**权限应用示例：**
`python
@bp.post("")
@api_login_required  # 创建帖子需要登录
def create_post():
    ...

@bp.delete("/<int:post_id>")
@api_login_required  # 删除帖子需要登录
def delete_post(post_id):
    if not _can_manage_post(post):  # 还需要是作者或管理员
        return api_error("没有权限删除该帖子", 403)
    ...
\\\

**核心接口权限保护：**
- ✅ POST /api/posts - 需要登录
- ✅ PUT /api/posts/<id> - 需要登录 + 作者权限
- ✅ DELETE /api/posts/<id> - 需要登录 + 作者权限
- ✅ POST /api/posts/<id>/comments - 需要登录
- ✅ POST /api/users/<id>/avatar - 需要登录 + 本人权限
- ✅ /api/admin/* - 需要员工权限 + 特定权限

### 9. CORS 跨域配置
**状态：完全满足 ✅**

**配置文件（pplications/extentions/init_cors.py）：**
`python
from flask_cors import CORS

def init_cors(app: Flask):
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", [])}},
        supports_credentials=True,
    )
\\\

**配置（pplications/config.py）：**
`python
class BaseConfig:
    CORS_ORIGINS = ["http://127.0.0.1:4200", "http://localhost:4200"]
\\\

- ✅ 使用 lask-cors 库
- ✅ 允许 Angular 前端（localhost:4200）访问
- ✅ 支持凭证（cookies/sessions）
- ✅ 只对 /api/* 路径开启 CORS

### 10. 统一接口返回格式
**状态：完全满足 ✅**

**响应工具函数（pplications/view/api/responses.py）：**
`python
def api_success(data=None, message="操作成功", status=200):
    return jsonify({
        "data": data,
        "message": message,
        "error": None,
    }), status

def api_error(message="请求失败", status=400, data=None):
    return jsonify({
        "data": data,
        "message": message,
        "error": message,
    }), status
\\\

**返回格式示例：**

**成功响应（200/201）：**
`json
{
  "data": { ... },
  "message": "操作成功",
  "error": null
}
\\\

**错误响应（400/401/403/404/500）：**
`json
{
  "data": null,
  "message": "错误描述",
  "error": "错误描述"
}
\\\

**支持的状态码：**
- ✅ 200 - 成功
- ✅ 201 - 创建成功
- ✅ 400 - 请求错误（参数错误、验证失败）
- ✅ 401 - 未登录
- ✅ 403 - 权限不足
- ✅ 404 - 资源不存在
- ✅ 500 - 服务器错误（自动处理）

## 📊 总结

### 满足情况
| 要求项 | 状态 |
|--------|------|
| 1. Flask + 应用工厂 + Blueprint | ✅ 完全满足 |
| 2. RESTful JSON API | ✅ 完全满足 |
| 3. SQLAlchemy + 至少3张表 | ✅ 完全满足（11张表） |
| 4. 表关系（一对多/多对多） | ✅ 完全满足 |
| 5. 完整 CRUD API | ✅ 完全满足 |
| 6. 注册/登录/注销 | ✅ 完全满足 |
| 7. 密码哈希加密 | ✅ 完全满足 |
| 8. 权限控制 | ✅ 完全满足 |
| 9. CORS 配置 | ✅ 完全满足 |
| 10. 统一返回格式 | ✅ 完全满足 |

**结论：后端完全满足所有作业要求！✅✅✅**

## 🎯 核心优势

1. **架构清晰**：应用工厂模式 + Blueprint 分层结构
2. **数据模型完善**：11 张表，多种关系类型，业务逻辑完整
3. **安全性高**：密码哈希、权限控制、登录验证
4. **接口规范**：RESTful 设计、统一响应格式、完整状态码
5. **前后端分离**：CORS 配置、纯 API 服务
6. **可扩展性强**：装饰器模式、权限系统、角色管理

## 📁 核心 API 端点列表

### 认证接口（/api/auth）
- POST /register - 用户注册
- POST /login - 用户登录
- POST /logout - 用户注销
- GET /me - 获取当前用户

### 帖子接口（/api/posts）
- GET / - 帖子列表（支持分页、搜索、筛选）
- GET /<id> - 帖子详情
- POST / - 创建帖子（需登录）
- PUT /<id> - 更新帖子（需权限）
- DELETE /<id> - 删除帖子（需权限）
- GET /<id>/comments - 评论列表
- POST /<id>/comments - 发表评论（需登录）
- POST /<id>/like - 点赞/取消点赞（需登录）
- POST /<id>/report - 举报帖子（需登录）

### 用户接口（/api/users）
- GET /<id> - 用户信息
- PUT /<id> - 更新用户资料（需权限）
- POST /<id>/avatar - 上传头像（需权限）

### 板块接口（/api/boards）
- GET / - 板块列表
- GET /<id> - 板块详情

### 管理接口（/api/admin）
- 需要员工权限 + 特定权限

### 统计接口（/api/stats）
- GET /dashboard - 仪表盘统计数据
