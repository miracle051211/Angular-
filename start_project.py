#!/usr/bin/env python3
"""Start backend and frontend development servers."""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


def backend_python() -> Path:
    candidates = [
        BACKEND / ".venv" / "Scripts" / "python.exe",
        BACKEND / ".venv" / "bin" / "python",
        BACKEND / "miraclevenv" / "Scripts" / "python.exe",
        BACKEND / "miraclevenv" / "bin" / "python",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return Path(sys.executable)


def start_process(name: str, command: list[str], cwd: Path) -> subprocess.Popen:
    print(f"[START] {name}: {' '.join(command)}")
    return subprocess.Popen(command, cwd=str(cwd))


def main() -> None:
    if not (BACKEND / "app.py").exists():
        raise SystemExit("[ERROR] 未找到 backend/app.py")
    if not (FRONTEND / "package.json").exists():
        raise SystemExit("[ERROR] 未找到 frontend/package.json")
    if not (FRONTEND / "node_modules").exists():
        raise SystemExit("[ERROR] 未找到 frontend/node_modules，请先运行 python setup_environment.py")

    python_cmd = str(backend_python())
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"

    print("=" * 60)
    print("学习小洞天 - 启动前后端")
    print("=" * 60)
    print("后端地址：http://localhost:5000")
    print("前端地址：http://localhost:4200")
    print("按 Ctrl+C 可同时停止前后端。")
    print()

    processes = [
        start_process("backend", [python_cmd, "app.py"], BACKEND),
        start_process("frontend", [npm_cmd, "start"], FRONTEND),
    ]

    try:
        while True:
            for process in processes:
                if process.poll() is not None:
                    raise SystemExit(process.returncode)
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n正在停止服务...")
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()


if __name__ == "__main__":
    main()
