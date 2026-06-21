@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo Miracle - Setup Environment
echo ========================================
echo.

where python >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON_CMD=python"
) else (
    where py >nul 2>nul
    if %errorlevel%==0 (
        set "PYTHON_CMD=py"
    ) else (
        echo [ERROR] Python was not found.
        echo Please install Python 3.11 or later first.
        echo.
        pause
        exit /b 1
    )
)

where node >nul 2>nul
if not %errorlevel%==0 (
    echo [ERROR] Node.js was not found.
    echo Please install Node.js 20 or later first.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if not %errorlevel%==0 (
    echo [ERROR] npm was not found.
    echo Please reinstall Node.js.
    echo.
    pause
    exit /b 1
)

echo Running setup_environment.py...
echo.
%PYTHON_CMD% setup_environment.py

echo.
if not %errorlevel%==0 (
    echo [ERROR] Setup failed. Please check the messages above.
) else (
    echo Setup finished successfully.
    echo You can now double-click start_project.bat.
)
echo.
pause
