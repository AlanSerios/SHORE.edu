@echo off
echo ========================================================
echo        SHORE 5.0 - App Startup
echo ========================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python from python.org and try again.
    pause
    exit /b
)

:: Use the environment's Python directly. Its copied activate.bat contains a stale absolute path.
set "VENV_PYTHON=backend\venv\Scripts\python.exe"
IF NOT EXIST "%VENV_PYTHON%" (
    echo [1/4] Creating Python virtual environment in backend\...
    python -m venv backend\venv
)

:: Install requirements from backend/requirements.txt
echo [2/4] Installing/Verifying required dependencies...
"%VENV_PYTHON%" -m pip install -r backend\requirements.txt --quiet --disable-pip-version-check
IF ERRORLEVEL 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b
)

:: Build the current frontend so port 5000 serves the same UI as Vite.
echo [3/4] Building current frontend...
pushd frontend
IF NOT EXIST "node_modules" call npm install
call npm run build
IF ERRORLEVEL 1 (
    popd
    echo [ERROR] Frontend build failed.
    pause
    exit /b
)
popd

:: Start the root server; it serves frontend/dist and the API together.
echo [4/4] Starting SHORE...
echo.
echo  SHORE is running at: http://localhost:5000
echo.
echo  Do not close this window while using the app!
echo.

:: Use a unique path so an older service worker cannot match cached HTML.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5000/launch/%RANDOM%%RANDOM%'"

:: Run from the project root so Flask resolves frontend/dist correctly.
"%VENV_PYTHON%" server.py
pause
