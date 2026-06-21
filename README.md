# 学习小洞天

学习小洞天是一个前后端分离的学习交流社区网站。后端使用 Flask，前端使用 Angular，功能包括用户登录注册、帖子发布与评论、站内消息、通知、个人资料和后台管理等。

本项目给老师验收时，推荐使用根目录的一键脚本运行。

## 目录结构

```text
new_miracle/
├── backend/              # Flask 后端
├── frontend/             # Angular 前端
├── setup_environment.bat # Windows 双击配置环境
├── start_project.bat     # Windows 双击启动项目
├── setup_environment.py  # 命令行配置环境
├── start_project.py      # 命令行启动项目
└── README.md             # 项目说明
```

## 运行环境

请先安装：

| 软件 | 建议版本 | 用途 |
| --- | --- | --- |
| Python | 3.11 或更高 | 运行 Flask 后端 |
| Node.js | 20 或更高 | 运行 Angular 前端 |
| npm | 随 Node.js 安装 | 安装前端依赖 |
| MySQL | 8.0 或更高 | 项目数据库 |

安装后可用以下命令检查：

```bash
python --version
node --version
npm --version
mysql --version
```

Windows 如果 `python` 命令不可用，可以尝试使用 `py`。

## 最简单运行方式

如果使用 Windows，推荐直接双击运行：

```text
setup_environment.bat
```

这个脚本会自动完成：

- 检查 Python、Node.js、npm 是否可用
- 调用原项目的 `backend/init_db.py`
- 引导配置 MySQL 数据库账号、密码、数据库名
- 创建数据库并执行迁移
- 初始化测试账号和测试数据
- 安装前端依赖

环境配置完成后，双击运行：

```text
start_project.bat
```

启动成功后浏览器访问：

```text
http://localhost:4200
```

运行期间请不要关闭终端。按 `Ctrl+C` 可以停止前后端服务。

如果习惯使用命令行，也可以执行：

```bash
python setup_environment.py
python start_project.py
```

`.bat` 脚本的好处是：双击运行不会一闪而过，出错时会停在窗口里显示原因；启动项目时会自动打开后端和前端两个命令窗口，更适合老师验收时直接操作。

## 数据库配置说明

后端默认数据库配置文件：

```text
backend/applications/config.py
```

默认数据库连接：

```text
mysql+pymysql://root:123456@localhost:3306/dongtian_test?charset=utf8mb4
```

如果老师电脑上的 MySQL 密码不是 `123456`，不用手动改代码，运行 `python setup_environment.py` 时按提示输入实际 MySQL 密码即可。脚本会调用原项目初始化逻辑并更新配置。

如果需要手动创建数据库，可执行：

```sql
CREATE DATABASE IF NOT EXISTS dongtian_test
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

## 邮箱配置

项目已经内置发件邮箱配置，老师无需额外设置邮箱。

默认使用：

```text
MAIL_SERVER=smtp.qq.com
MAIL_PORT=465
MAIL_USERNAME=1975191950@qq.com
MAIL_DEFAULT_SENDER=1975191950@qq.com
```

注册验证码、找回密码验证码等邮件功能会使用该邮箱发送。

## 测试账号

初始化测试数据后，可使用以下账号登录：

| 角色 | 邮箱 | 密码 |
| --- | --- | --- |
| 管理员 | `zhangsan@163.com` | `123456` |
| 运营员 | `lisi@163.com` | `123456` |
| 审核员 | `wangwu@163.com` | `123456` |

## 访问地址

前端页面：

```text
http://localhost:4200
```

后端服务：

```text
http://localhost:5000
```

API 基础地址：

```text
http://localhost:5000/api
```

主要接口：

| 功能 | 地址 |
| --- | --- |
| 登录注册 | `/api/auth` |
| 用户资料 | `/api/users` |
| 帖子 | `/api/posts` |
| 板块 | `/api/boards` |
| 站内消息 | `/api/messages` |
| 通知 | `/api/notifications` |
| 数据统计 | `/api/stats` |
| 后台管理 | `/api/admin` |
| 媒体文件 | `/media/<filename>` |

## 手动运行方式

如果一键脚本失败，可以按下面步骤手动运行。

### 1. 后端

```bash
cd backend
python -m venv .venv
```

Windows：

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS / Linux：

```bash
source .venv/bin/activate
```

安装依赖：

```bash
pip install -r requirements.txt
```

初始化数据库：

```bash
python init_db.py
```

启动后端：

```bash
python app.py
```

### 2. 前端

另开一个终端：

```bash
cd frontend
npm install
npm start
```

## 常见问题

### 1. PowerShell 无法激活虚拟环境

如果 `.\.venv\Scripts\Activate.ps1` 被系统策略阻止，可以用管理员身份打开 PowerShell，执行：

```powershell
Set-ExecutionPolicy RemoteSigned
```

然后重新打开终端。

### 2. 数据库连接失败

请检查：

- MySQL 服务是否已启动
- MySQL 用户名和密码是否正确
- 数据库端口是否为 `3306`
- 当前用户是否有创建数据库和数据表的权限

### 3. 前端页面打开但接口报错

请确认后端正在运行：

```text
http://localhost:5000
```

前端需要请求后端的 `http://localhost:5000/api`。

### 4. 端口被占用

默认端口：

```text
后端：5000
前端：4200
```

如果端口被占用，请关闭占用端口的程序后重新启动。

### 5. 上传图片失败

上传文件默认保存到：

```text
backend/static/images
```

请确保该目录存在并可写。
