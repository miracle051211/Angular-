# 后端清理总结

## 已删除的文件和目录

### 1. 旧前端模板和静态文件
- 	emplates/front/ - 旧的前端 Jinja2 模板
- 	emplates/cms/ - 旧的后台管理模板
- 	emplates/errors/ - 错误页面模板
- static/cms/ - 后台管理静态文件（CSS/JS）
- static/common/ - 公共静态文件

### 2. 旧的 View 文件（模板渲染）
- pplications/view/system/cms.py - 后台管理视图
- pplications/view/system/front.py - 前端首页视图
- pplications/view/system/user.py - 用户相关视图（注册/登录）
- pplications/view/system/post.py - 发帖视图

### 3. 表单验证类（WTForms）
- pplications/forms/baseform.py
- pplications/forms/cms.py
- pplications/forms/post.py
- pplications/forms/user.py

### 4. 扩展功能
- pplications/extentions/filters.py - Jinja2 模板过滤器
- pplications/extentions/init_csrf.py - CSRF 保护（前后端分离不需要）

### 5. 清理的钩子函数
- hooks.py 中的错误处理函数（401/404/500）

## 保留的文件

### 重要保留项
- static/images/ 和 static/images/avatars/ - **用户上传的图片和头像**
- pplications/view/system/media.py - **媒体文件访问路由**（提供 /media/<filename> 访问）
- pplications/extentions/hooks.py 中的 dongtian_before_request() - 用户认证钩子

## 修改的文件

1. **applications/view/system/__init__.py**
   - 移除了 cms_bp, front_bp, post_bp, user_bp
   - 只保留 media_bp

2. **applications/view/api/__init__.py**
   - 移除了 csrf.exempt() 调用

3. **applications/extentions/__init__.py**
   - 移除了 init_csrf
   - 移除了模板过滤器注册
   - 移除了错误处理器注册

4. **applications/extentions/hooks.py**
   - 只保留 dongtian_before_request()

5. **applications/forms/__init__.py**
   - 清空，只保留注释

## 当前后端架构

### 目录结构
\\\
new_miracle/backend/
├── app.py                          # 入口文件
├── init_db.py                      # 数据库初始化
├── applications/
│   ├── config.py                   # 配置
│   ├── models/                     # 数据模型
│   │   ├── user.py
│   │   ├── post.py
│   │   ├── message.py
│   │   ├── notification.py
│   │   └── captcha.py
│   ├── view/
│   │   ├── api/                    # REST API 接口
│   │   │   ├── admin.py
│   │   │   ├── auth.py
│   │   │   ├── boards.py
│   │   │   ├── posts.py
│   │   │   ├── stats.py
│   │   │   └── users.py
│   │   └── system/
│   │       └── media.py            # 媒体文件访问
│   ├── extentions/                 # Flask 扩展
│   │   ├── init_sqlalchemy.py
│   │   ├── init_login.py
│   │   ├── init_cors.py
│   │   ├── init_cache.py
│   │   ├── init_mail.py
│   │   ├── init_avatars.py
│   │   └── hooks.py
│   ├── common/                     # 工具函数
│   │   ├── utils/
│   │   └── script/
│   └── utils/
├── static/
│   └── images/                     # 用户上传的图片
│       └── avatars/                # 用户头像
└── migrations/                     # 数据库迁移

### API 端点
- /api/auth/* - 认证接口（登录/注册/登出）
- /api/users/* - 用户管理
- /api/posts/* - 帖子管理
- /api/boards/* - 板块管理
- /api/admin/* - 后台管理
- /api/stats/* - 统计数据
- /media/<filename> - 媒体文件访问

## 启动方式

\\\ash
cd new_miracle/backend
python app.py
\\\

后端将在 http://localhost:5000 启动

## 验证结果

✅ Python 编译检查通过
✅ 后端服务成功启动
✅ 前后端分离架构完整
✅ API 接口保持完整
✅ 用户上传文件保留
