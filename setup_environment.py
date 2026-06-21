#!/usr/bin/env python3
"""Project setup helper.

This script keeps the original backend initialization flow by delegating
database, virtualenv, and backend dependency setup to backend/init_db.py.
It only adds frontend dependency installation from the project root.
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
    print(f"\n$ {' '.join(command)}")
    return subprocess.call(command, cwd=str(cwd))


def require_command(command: str, install_hint: str) -> None:
    if shutil.which(command):
        return
    print(f"[ERROR] 未找到命令：{command}")
    print(install_hint)
    raise SystemExit(1)


def install_frontend_dependencies() -> None:
    require_command("npm", "请先安装 Node.js 20 或更高版本，安装后会自带 npm。")

    print("\n" + "=" * 60)
    print("前端依赖安装")
    print("=" * 60)

    if (FRONTEND / "package-lock.json").exists():
        code = run(["npm", "ci"], FRONTEND)
        if code != 0:
            print("\nnpm ci 执行失败，改用 npm install 重试。")
            code = run(["npm", "install"], FRONTEND)
    else:
        code = run(["npm", "install"], FRONTEND)

    if code != 0:
        raise SystemExit("[ERROR] 前端依赖安装失败，请检查 Node.js/npm 或网络环境。")


def main() -> None:
    print("=" * 60)
    print("学习小洞天 - 环境配置脚本")
    print("=" * 60)
    print("本脚本会先调用 backend/init_db.py，沿用原项目的后端初始化逻辑。")
    print("随后安装 frontend 的 npm 依赖。")

    if not (BACKEND / "init_db.py").exists():
        raise SystemExit("[ERROR] 未找到 backend/init_db.py")
    if not (FRONTEND / "package.json").exists():
        raise SystemExit("[ERROR] 未找到 frontend/package.json")

    print("\n" + "=" * 60)
    print("后端环境和数据库初始化")
    print("=" * 60)
    print("请按提示完成虚拟环境、依赖、MySQL 数据库和测试数据初始化。")
    print("如果已经手动安装过依赖，可在 init_db.py 的提示中选择 N。")

    code = run([sys.executable, "init_db.py"], BACKEND)
    if code != 0:
        raise SystemExit("[ERROR] backend/init_db.py 执行失败，请检查上方错误信息。")

    install_frontend_dependencies()

    print("\n" + "=" * 60)
    print("环境配置完成")
    print("=" * 60)
    print("下一步运行：python start_project.py")


if __name__ == "__main__":
    main()
