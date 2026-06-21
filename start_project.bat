@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo Miracle - Start Project
echo ========================================
echo.

if not exist "backend\app.py" (
    echo [ERROR] backend\app.py was not found.
    echo Please make sure this file is in the new_miracle root folder.
    echo.
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo [ERROR] frontend\package.json was not found.
    echo Please make sure this file is in the new_miracle root folder.
    echo.
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo [ERROR] frontend\node_modules was not found.
    echo Please run setup_environment.bat first.
    echo.
    pause
    exit /b 1
)

set "PY_EXE=%CD%\backend\.venv\Scripts\python.exe"
if not exist "%PY_EXE%" set "PY_EXE=%CD%\backend\miraclevenv\Scripts\python.exe"
if not exist "%PY_EXE%" (
    where python >nul 2>nul
    if %errorlevel%==0 (
        set "PY_EXE=python"
    ) else (
        where py >nul 2>nul
        if %errorlevel%==0 (
            set "PY_EXE=py"
        ) else (
            echo [ERROR] Python was not found.
            echo Please run setup_environment.bat first.
            echo.
            pause
            exit /b 1
        )
    )
)

where npm >nul 2>nul
if not %errorlevel%==0 (
    echo [ERROR] npm was not found.
    echo Please install Node.js or run setup_environment.bat first.
    echo.
    pause
    exit /b 1
)

echo Starting backend and frontend...
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:4200
echo.

start "Miracle Backend" cmd /k "cd /d ""%CD%\backend"" && ""%PY_EXE%"" app.py"
start "Miracle Frontend" cmd /k "cd /d ""%CD%\frontend"" && npm start"

echo Two command windows have been opened.
echo Keep both windows open while using the project.
echo Open this URL in your browser:
echo http://localhost:4200
echo.
pause
