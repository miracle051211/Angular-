# 学习小洞天

#### 应用结构
项目采用了 Flask 的应用工厂模式，具有清晰的模块化结构：

```应用结构
miracle-dt (master)
├─applications  # 项目核心模块
│  ├─common  # 公共模块（初始化数据库、公用函数）
│  ├─extensions  # 注册项目插件
│  ├─forms  # 注册表单
│  ├─models  # 数据库模型
│  ├─views  # 视图部分
│  ├─config.py  # 项目配置
│  └─__init__.py  # 项目初始化入口
├─static  # 静态资源文件
├─templates  # 静态模板文件
├─app.py  # 程序入口
└─init_db.py  # 初始化数据库
```

#### 项目安装

## 推荐自动安装项目即运行init_db.py初始化项目，可完成虚拟环境搭建，数据库初始化，项目依赖安装。

```bash
python init_db.py
```

## 或者手动安装项目
> **🥰提示** 项目依赖的库在 `requirements.txt` 中，推荐使用虚拟环境安装。

# 修改配置
> **🥰提示** 配置文件位于  `applications/config.py` ，打开配置文件看到 `BaseConfig` 类和 `DevelopmentConfig` 类下的默认配置文件，
项目启动时，会调用 `applications/__init__.py` ，这个文件中加载了`DevelopmentConfig`的配置，
# 虚拟环境安装项目依赖
> **🥰提示** 推荐使用虚拟环境安装。
```bash
python -m venv XXX
# 进入虚拟环境下
venv\Scripts\activate.bat  # Windows 提示命令符
venv\Scripts\Activate.ps1  # Windows Powershell
source venv/bin/activate  # Linux
# 使用 pip 安装
pip install -r requirements.txt
## 初始化数据库
flask db upgrade
flask admin init
# 运行项目
python app.py
```



### 项目初始用户以及其密码

默认管理员为 `zhangsan@163.com` ，密码默认为 `123456` 。
默认运营为 `lisi@163.com` ，密码默认为 `123456` 。
默认稽查为 `wangwu@163.com` ，密码默认为 `123456` 。


