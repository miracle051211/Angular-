#!/usr/bin/env python3
"""学习小洞天环境配置脚本。

本脚本面向老师验收场景：
1. 检查 Python、Node.js、npm。
2. 调用原项目 backend/init_db.py，引导完成后端环境和数据库初始化。
3. 自动安装前端依赖。
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


def run(command: list[str], cwd: Path) -> int:
    print(f"\n执行命令：{' '.join(command)}")
    return subprocess.call(command, cwd=str(cwd))


def require_command(command: str, message: str) -> None:
    if shutil.which(command):
        return
    print(f"\n[错误] 未找到命令：{command}")
    print(message)
    raise SystemExit(1)


def install_frontend_dependencies() -> None:
    print("\n" + "=" * 60)
    print("安装前端依赖")
    print("=" * 60)

    require_command("npm", "请先安装 Node.js 20 或更高版本。安装 Node.js 后会自带 npm。")

    package_lock = FRONTEND / "package-lock.json"
    if package_lock.exists():
        code = run(["npm", "ci"], FRONTEND)
        if code != 0:
            print("\nnpm ci 失败，自动改用 npm install 重试。")
            code = run(["npm", "install"], FRONTEND)
    else:
        code = run(["npm", "install"], FRONTEND)

    if code != 0:
        raise SystemExit("\n[错误] 前端依赖安装失败，请检查 Node.js、npm 或网络环境。")


def main() -> None:
    print("=" * 60)
    print("学习小洞天 - 一键配置环境")
    print("=" * 60)

    require_command("node", "请先安装 Node.js 20 或更高版本。")
    require_command("npm", "请先安装 Node.js 20 或更高版本。")

    if not (BACKEND / "init_db.py").exists():
        raise SystemExit("[错误] 未找到 backend/init_db.py")
    if not (FRONTEND / "package.json").exists():
        raise SystemExit("[错误] 未找到 frontend/package.json")

    print("\n第一步：后端环境和数据库初始化")
    print("接下来会调用原项目的 backend/init_db.py。")
    print("请根据提示输入 MySQL 地址、账号、密码和数据库名。")
    print("如果询问是否初始化测试数据，建议输入 Y。")

    code = run([sys.executable, "init_db.py"], BACKEND)
    if code != 0:
        raise SystemExit("\n[错误] 后端初始化失败，请检查 MySQL 是否启动，以及账号密码是否正确。")

    print("\n第二步：前端依赖安装")
    install_frontend_dependencies()

    print("\n" + "=" * 60)
    print("环境配置完成")
    print("=" * 60)
    print("现在可以运行：python start_project.py")


if __name__ == "__main__":
    main()
