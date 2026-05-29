#!/usr/bin/env python3
""" 
数据库初始化脚本
快速配置和初始化数据库，包括虚拟环境创建和依赖安装
""" 

import os
import sys
import getpass
import subprocess
from urllib.parse import quote_plus


# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 重要：不要在顶部导入与应用/数据库相关的模块，避免缓存旧配置
# 所有应用相关的导入都应该在函数内部，确保在配置文件更新后再导入


def create_virtualenv():
    """创建虚拟环境"""
    print("\n" + "=" * 50)
    print("虚拟环境配置")
    print("=" * 50)
    
    venv_name = input("请输入虚拟环境名称 [默认: miraclevenv]: ").strip() or "miraclevenv"
    venv_path = os.path.join(os.path.dirname(__file__), venv_name)
    
    if os.path.exists(venv_path):
        print(f"⚠️  虚拟环境目录 {venv_name} 已存在")
        return venv_path
    
    print(f"\n正在创建虚拟环境 {venv_name}...")
    
    try:
        # 使用 venv 模块创建虚拟环境
        import venv
        venv.create(venv_path, with_pip=True)
        print(f"✓ 虚拟环境 {venv_name} 创建成功")
        return venv_path
    except Exception as e:
        print(f"✗ 创建虚拟环境失败: {e}")
        return None



def install_requirements(venv_path=None):
    """安装 requirements.txt 中的依赖"""
    print("\n" + "=" * 50)
    print("依赖安装")
    print("=" * 50)
    
    requirements_file = os.path.join(os.path.dirname(__file__), "requirements.txt")
    
    if not os.path.exists(requirements_file):
        print(f"✗ 未找到 requirements.txt 文件: {requirements_file}")
        return False
    
    print(f"\n正在安装依赖，这可能需要几分钟时间...")
    print(f"使用国内镜像源加速安装...")
    
    try:
        if venv_path:
            # 使用虚拟环境中的 pip
            if sys.platform.startswith('win'):
                pip_path = os.path.join(venv_path, 'Scripts', 'pip.exe')
            else:
                pip_path = os.path.join(venv_path, 'bin', 'pip')
        else:
            # 使用系统 pip
            pip_path = [sys.executable, '-m', 'pip']
        
        # 首先尝试安装不包含Pillow的依赖
        print("正在安装基础依赖...")
        if venv_path:
            result = subprocess.run(
                [pip_path, 'install', '-r', requirements_file, '-i', 'https://pypi.tuna.tsinghua.edu.cn/simple', '--verbose'],
                text=True,
                cwd=os.path.dirname(__file__)
            )
        else:
            result = subprocess.run(
                pip_path + ['install', '-r', requirements_file, '-i', 'https://pypi.tuna.tsinghua.edu.cn/simple', '--verbose'],
                text=True,
                cwd=os.path.dirname(__file__)
            )
        
        # 检查结果，如果Pillow导致失败，单独处理
        if result.returncode != 0:
            print("基础依赖安装失败，正在尝试分别安装依赖...")
            # 单独安装Pillow，使用预编译的wheel
            print("正在安装 Pillow...")
            if venv_path:
                pillow_result = subprocess.run(
                    [pip_path, 'install', 'Pillow', '-i', 'https://pypi.tuna.tsinghua.edu.cn/simple', '--only-binary=all'],
                    text=True,
                    cwd=os.path.dirname(__file__)
                )
            else:
                pillow_result = subprocess.run(
                    pip_path + ['install', 'Pillow', '-i', 'https://pypi.tuna.tsinghua.edu.cn/simple', '--only-binary=all'],
                    text=True,
                    cwd=os.path.dirname(__file__)
                )
            
            if pillow_result.returncode != 0:
                print("警告: Pillow 安装失败，但将继续安装其他依赖")
            else:
                print("✓ Pillow 安装成功")
            
            # 安装其他依赖
            print("正在安装其他依赖...")
            if venv_path:
                result = subprocess.run(
                    [pip_path, 'install', '-r', requirements_file, '-i', 'https://pypi.tuna.tsinghua.edu.cn/simple', '--verbose', '--no-deps'],
                    text=True,
                    cwd=os.path.dirname(__file__)
                )
            else:
                result = subprocess.run(
                    pip_path + ['install', '-r', requirements_file, '-i', 'https://pypi.tuna.tsinghua.edu.cn/simple', '--verbose', '--no-deps'],
                    text=True,
                    cwd=os.path.dirname(__file__)
                )
        
        if result.returncode == 0:
            print("✓ 所有依赖安装成功")
            return True
        else:
            print(f"✗ 依赖安装失败")
            return False
    except Exception as e:
        print(f"✗ 执行安装命令失败: {e}")
        return False



def init_admin_data():
    """初始化管理员数据（复用 commands 模块中的函数）"""
    print("\n开始初始化管理员数据...")
    # 在这里导入需要的函数
    from applications.common.script.commands import create_permission, create_role, create_test_user, create_board, create_test_post
    create_permission()
    create_role()
    create_test_user()
    create_board()
    create_test_post()
    print("\n✓ 管理员数据初始化完成")



def get_db_config():
    """获取数据库配置信息"""
    print("=" * 50)
    print("数据库配置")
    print("=" * 50)
    
    # 获取用户输入
    host = input("请输入数据库主机地址 [默认: localhost]: ") or "localhost"
    port = input("请输入数据库端口 [默认: 3306]: ") or "3306"
    username = input("请输入数据库用户名 [默认: root]: ") or "root"
    # 直接使用普通input获取密码，确保所有环境都能正常输入
    password = input("请输入数据库密码: ")
    db_name = input("请输入数据库名称 [默认: dongtian]: ") or "dongtian"
    
    return {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "db_name": db_name
    }



def test_db_connection(config):
    """测试数据库连接"""
    import pymysql
    
    print("\n正在测试数据库连接...")
    
    try:
        conn = pymysql.connect(
            host=config["host"],
            port=int(config["port"]),
            user=config["username"],
            password=config["password"],
            charset='utf8mb4'
        )
        print("✓ 数据库连接成功")
        conn.close()
        return True
    except Exception as e:
        print(f"✗ 数据库连接失败: {e}")
        return False



def create_database(config):
    """创建数据库"""
    import pymysql
    
    print("\n正在创建数据库...")
    
    try:
        conn = pymysql.connect(
            host=config["host"],
            port=int(config["port"]),
            user=config["username"],
            password=config["password"],
            charset='utf8mb4'
        )
        cursor = conn.cursor()
        
        # 创建数据库
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{config['db_name']}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"✓ 数据库 `{config['db_name']}` 创建/确认成功")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"✗ 创建数据库失败: {e}")
        return False



def update_config_file(config):
    """更新配置文件"""
    import re  # 确保正则表达式库被导入
    print("\n正在更新配置文件...")
    
    config_file_path = os.path.join(os.path.dirname(__file__), "applications", "config.py")
    
    try:
        with open(config_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print(f"当前配置文件内容: {content}")
        print(f"新的数据库名称: {config['db_name']}")
        
        # 使用 quote_plus 处理特殊字符
        quoted_password = quote_plus(config["password"])
        new_db_uri = f'mysql+pymysql://{config["username"]}:{quoted_password}@{config["host"]}:{config["port"]}/{config["db_name"]}?charset=utf8mb4'
        
        print(f"新的数据库URI: {new_db_uri}")
        
        # 替换 DevelopmentConfig 和 TestingConfig 中的 SQLALCHEMY_DATABASE_URI，支持单引号和双引号
        content = re.sub(r'SQLALCHEMY_DATABASE_URI = ["\'].*?["\']', f"SQLALCHEMY_DATABASE_URI = '{new_db_uri}'", content, flags=re.MULTILINE)
        
        print(f"更新后的配置内容: {content}")
        
        with open(config_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✓ 配置文件更新成功")
        return True
    except Exception as e:
        print(f"✗ 更新配置文件失败: {e}")
        import traceback
        traceback.print_exc()
        return False



def run_migrations(venv_path=None):
    """运行数据库迁移"""
    print("\n正在执行数据库迁移...")
    
    # 抑制 Alembic 的 INFO 日志输出
    import logging
    logging.basicConfig(level=logging.WARNING)  # 只显示 WARNING 级别及以上的日志
    
    # 也可以单独设置 Alembic 日志级别
    logging.getLogger('alembic').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy').setLevel(logging.WARNING)
    
    try:
        # 强制重新加载配置模块，避免缓存
        if 'applications.config' in sys.modules:
            del sys.modules['applications.config']
        if 'app' in sys.modules:
            del sys.modules['app']
        if 'applications' in sys.modules:
            del sys.modules['applications']
            del sys.modules['applications.extentions']
            del sys.modules['applications.extentions.init_sqlalchemy']
        
        # 直接在 Python 代码中执行迁移，避免使用 flask cli 命令
        from app import create_app
        app = create_app()
        
        with app.app_context():
            from flask_migrate import upgrade
            from applications.extentions.init_sqlalchemy import db
            
            print(f"当前使用的数据库URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
            print("执行数据库升级...")
            upgrade()
            
            print("✓ 数据库迁移成功")
            print("数据库表已创建完成")
            return True
            
    except Exception as e:
        print(f"✗ 数据库迁移失败: {e}")
        import traceback
        traceback.print_exc()
        return False



def main():
    """主函数"""
    print("欢迎使用 洞天论坛 初始化工具")
    print("\n该工具将帮助您快速配置虚拟环境、安装依赖和初始化项目数据库")
    
    # 询问是否需要创建虚拟环境
    print("\n" + "=" * 50)
    print("虚拟环境设置")
    print("=" * 50)
    install_venv = input("是否要创建并激活虚拟环境? (y/N): ").strip().lower()
    venv_path = None
    if install_venv in ['y', 'yes', '是']:
        venv_path = create_virtualenv()
        if not venv_path:
            print("\n❌ 虚拟环境创建失败")
            return False
    
    # 询问是否需要安装依赖
    print("\n" + "=" * 50)
    print("依赖安装")
    print("=" * 50)
    install_deps = input("是否要安装项目依赖 (requirements.txt)? (y/N): ").strip().lower()
    if install_deps in ['y', 'yes', '是']:
        if not install_requirements(venv_path):
            print("\n❌ 依赖安装失败")
            return False
    
    # 获取数据库配置
    config = get_db_config()
    
    # 测试连接
    if not test_db_connection(config):
        print("\n❌ 无法连接到数据库，请检查配置后重试")
        return False
    
    # 创建数据库
    if not create_database(config):
        print("\n❌ 数据库创建失败，请检查权限后重试")
        return False
    
    # 更新配置文件
    if not update_config_file(config):
        print("\n❌ 配置文件更新失败")
        return False
    
    # 运行迁移
    if not run_migrations(venv_path):
        print("\n❌ 数据库初始化失败")
        return False

    # 询问用户是否要初始化管理员数据
    print("\n" + "=" * 50)
    print("管理员数据初始化")
    print("=" * 50)
    init_admin = input("是否要同时初始化管理员数据、权限、角色和测试数据? (y/N): ").strip().lower()
    if init_admin in ['y', 'yes', '是']:
        # 强制重新加载所有相关模块
        if 'applications.config' in sys.modules:
            del sys.modules['applications.config']
        if 'app' in sys.modules:
            del sys.modules['app']
        if 'applications' in sys.modules:
            del sys.modules['applications']
        # 初始化 Flask 应用上下文
        from app import create_app
        app = create_app()
        
        with app.app_context():
            print(f"初始化管理员数据使用的数据库URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
            init_admin_data()
    
    print("\n" + "=" * 50)
    print("🎉 初始化完成！")
    print("=" * 50)
    print("\n")
    print("请按照以下步骤操作: ")
    print("1. 激活虚拟环境 (如需，不是必须): ")
    if sys.platform.startswith('win'):
        print(f"   Windows: {venv_path}\\\\Scripts\\\\activate")
    else:
        print(f"   Linux/macOS: source {venv_path}/bin/activate")
    print("2. 启动项目: python app.py")
    print("\n")
    print("默认管理员信息: ")
    print("   用户名: zhangsan@163.com")
    print("   密码: 123456")


if __name__ == "__main__":
    main()