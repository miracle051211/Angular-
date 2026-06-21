# 学习小洞天

学习小洞天是一个前后端分离的学习交流社区网站。后端使用 Flask，前端使用 Angular，主要功能包括用户登录注册、帖子发布与评论、站内消息、通知、个人资料、后台管理等。

## 目录结构

```text
new_miracle/
├── backend/      # Flask 后端
├── frontend/     # Angular 前端
├── setup_environment.py   # 一键配置环境脚本
├── start_project.py       # 一键启动前后端脚本
└── README.md              # 项目运行说明
```

## 一、运行环境

请先在电脑上安装以下软件：

| 软件 | 建议版本 | 说明 |
| --- | --- | --- |
| Python | 3.11 或更高 | 后端运行环境 |
| Node.js | 20 或更高 | 前端运行环境，安装后会自带 npm |
| npm | 11 或更高 | 前端依赖管理工具 |
| MySQL | 8.0 或更高 | 项目数据库 |

安装完成后，可以在终端中检查版本：

```bash
python --version
node --version
npm --version
mysql --version
```

如果 Windows 上 `python` 命令不可用，可以尝试使用 `py` 代替。

## 二、一键运行方式

可以优先使用项目根目录下的两个 Python 脚本：

```text
setup_environment.py
start_project.py
```

第一次运行项目时，先双击或在终端执行：

```bash
python setup_environment.py
```

这个脚本会自动完成：

- 检查 Python、Node.js、npm 是否已安装
- 调用 `backend/init_db.py`，沿用原项目的后端初始化逻辑
- 根据 `backend/init_db.py` 的提示配置虚拟环境、安装后端依赖、初始化 MySQL 数据库和测试数据
- 安装前端依赖 `frontend/package-lock.json`

注意：执行数据库初始化前，请先确认 MySQL 已启动，并且 `backend/applications/config.py` 里的数据库账号、密码和数据库名正确。

环境配置完成后，运行：

```bash
python start_project.py
```

这个脚本会在当前终端中同时启动两个服务：

- 后端 Flask：`http://localhost:5000`
- 前端 Angular：`http://localhost:4200`

运行期间请保持该终端不要关闭，然后在浏览器访问：

```text
http://localhost:4200
```

如果脚本运行失败，可以继续按照下面的手动步骤安装和启动。

## 三、准备数据库

后端默认连接的数据库配置在：

```text
backend/applications/config.py
```

默认配置为：

```text
数据库类型：MySQL
地址：localhost
端口：3306
用户名：root
密码：123456
数据库名：dongtian_test
```

对应连接地址：

```text
mysql+pymysql://root:123456@localhost:3306/dongtian_test?charset=utf8mb4
```

如果老师电脑上的 MySQL 用户名、密码或数据库名不同，请先修改 `backend/applications/config.py` 里的 `SQLALCHEMY_DATABASE_URI`。

可以手动创建数据库：

```sql
CREATE DATABASE IF NOT EXISTS dongtian_test
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

也可以在后面的 `python init_db.py` 步骤中根据提示创建数据库。

## 四、后端密钥和邮箱配置

项目不会把真实邮箱授权码提交到代码仓库。后端会从环境变量读取密钥和邮件配置：

| 环境变量 | 说明 |
| --- | --- |
| `MIRACLE_SECRET_KEY` | Flask/JWT 签名密钥，生产环境必须修改 |
| `MAIL_SERVER` | 邮箱 SMTP 服务，默认 `smtp.qq.com` |
| `MAIL_PORT` | 邮箱 SMTP 端口，默认 `465` |
| `MAIL_USE_SSL` | 是否启用 SSL，默认 `true` |
| `MAIL_USERNAME` | 发件邮箱账号 |
| `MAIL_PASSWORD` | 邮箱授权码，不是邮箱登录密码 |
| `MAIL_DEFAULT_SENDER` | 默认发件人，通常和 `MAIL_USERNAME` 一致 |

Windows PowerShell 示例：

```powershell
$env:MIRACLE_SECRET_KEY="please-change-this"
$env:MAIL_USERNAME="your-email@qq.com"
$env:MAIL_PASSWORD="your-mail-auth-code"
$env:MAIL_DEFAULT_SENDER="your-email@qq.com"
```

macOS / Linux 示例：

```bash
export MIRACLE_SECRET_KEY="please-change-this"
export MAIL_USERNAME="your-email@qq.com"
export MAIL_PASSWORD="your-mail-auth-code"
export MAIL_DEFAULT_SENDER="your-email@qq.com"
```

## 五、安装后端依赖

打开第一个终端，进入项目后端目录：

```bash
cd new_miracle/backend
```

创建虚拟环境：

```bash
python -m venv .venv
```

Windows PowerShell 激活虚拟环境：

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS / Linux 激活虚拟环境：

```bash
source .venv/bin/activate
```

安装后端依赖：

```bash
pip install -r requirements.txt
```

如果下载较慢，可以使用国内镜像：

```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

## 六、初始化数据库

确认 MySQL 服务已经启动，然后在 `backend` 目录执行：

```bash
python init_db.py
```

脚本会提示是否创建虚拟环境、是否安装依赖、数据库地址、用户名、密码、数据库名，以及是否初始化测试数据。

推荐选择：

```text
是否创建虚拟环境：如果已经手动创建，选 N
是否安装依赖：如果已经执行 pip install，选 N
数据库地址：localhost
数据库端口：3306
数据库用户名：root
数据库密码：按本机 MySQL 实际密码填写
数据库名：dongtian_test
是否初始化测试数据：Y
```

如果不用交互脚本，也可以手动执行：

```bash
flask db upgrade
flask admin init
```

初始化成功后，会创建基础表结构、权限角色、测试账号、板块和测试帖子。

## 七、启动后端

继续在第一个终端中执行：

```bash
python app.py
```

后端默认地址：

```text
http://localhost:5000
```

API 基础地址：

```text
http://localhost:5000/api
```

注意：后端终端需要保持运行，不要关闭。

## 八、安装前端依赖

打开第二个终端，进入前端目录：

```bash
cd new_miracle/frontend
```

安装前端依赖：

```bash
npm ci
```

如果 `npm ci` 报错，可以改用：

```bash
npm install
```

## 九、启动前端

继续在第二个终端中执行：

```bash
npm start
```

前端默认地址：

```text
http://localhost:4200
```

浏览器打开 `http://localhost:4200` 即可访问网站。

本地开发时，前端会请求：

```text
http://localhost:5000/api
```

所以运行项目时需要同时启动后端和前端。

## 十、测试账号

初始化测试数据后，可以使用以下账号登录：

| 角色 | 邮箱 | 密码 |
| --- | --- | --- |
| 管理员 | `zhangsan@163.com` | `123456` |
| 运营员 | `lisi@163.com` | `123456` |
| 审核员 | `wangwu@163.com` | `123456` |

## 十一、主要 API 地址

本地开发 API 基础地址：

```text
http://localhost:5000/api
```

主要接口分组：

| 功能 | 地址 |
| --- | --- |
| 认证登录 | `/api/auth` |
| 用户资料 | `/api/users` |
| 帖子 | `/api/posts` |
| 板块 | `/api/boards` |
| 站内消息 | `/api/messages` |
| 通知 | `/api/notifications` |
| 数据统计 | `/api/stats` |
| 后台管理 | `/api/admin` |
| 媒体文件 | `/media/<filename>` |

前端中的 API 配置文件：

```text
frontend/src/environments/environment.ts
frontend/src/environments/environment.prod.ts
```

开发环境默认：

```text
http://localhost:5000/api
```

生产环境默认：

```text
/api
```

## 十二、前端构建与部署

部署前在 `frontend` 目录执行：

```bash
npm ci
npm run build
```

构建产物目录：

```text
frontend/dist/frontend
```

可以将该目录交给 Nginx、Apache 或其他静态资源服务器托管。

如果前端和后端部署在同一个域名下，建议：

- 静态网站指向 `frontend/dist/frontend`
- `/api` 反向代理到 Flask 后端
- `/media` 反向代理到 Flask 后端，用于访问上传文件

## 十三、常见问题

### 1. PowerShell 无法激活虚拟环境

如果执行 `.\.venv\Scripts\Activate.ps1` 被系统策略阻止，可以以管理员身份打开 PowerShell，执行：

```powershell
Set-ExecutionPolicy RemoteSigned
```

然后重新打开终端再激活虚拟环境。

### 2. 数据库连接失败

请检查：

- MySQL 服务是否已启动
- `backend/applications/config.py` 中的用户名、密码、端口、数据库名是否正确
- 数据库是否已经创建
- MySQL 用户是否有创建表的权限

### 3. 前端页面打开但接口报错

请确认后端是否正在运行：

```text
http://localhost:5000
```

本地开发时前端会请求 `http://localhost:5000/api`，后端未启动会导致登录、帖子、消息等功能无法使用。

### 4. 端口被占用

默认端口：

```text
后端：5000
前端：4200
```

如果端口被占用，请先关闭占用端口的程序，或修改对应启动配置。

### 5. 上传图片失败

上传文件默认保存到：

```text
backend/static/images
```

如果部署到服务器，请确保该目录存在并且后端进程有写入权限。

## 十四、推荐首次运行顺序

```text
1. 安装 Python、Node.js、MySQL
2. 启动 MySQL
3. 修改 backend/applications/config.py 中的数据库连接
4. 优先执行 python setup_environment.py
5. setup_environment.py 中选择初始化数据库和测试数据
6. 执行 python start_project.py 启动前后端
7. 浏览器访问 http://localhost:4200

如果不使用脚本，也可以按手动方式：

```text
1. 进入 backend，创建虚拟环境并安装 requirements.txt
2. 执行 python init_db.py 初始化数据库和测试数据
3. 执行 python app.py 启动后端
4. 打开第二个终端，进入 frontend
5. 执行 npm ci 安装前端依赖
6. 执行 npm start 启动前端
7. 浏览器访问 http://localhost:4200
```
```
