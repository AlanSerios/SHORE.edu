@echo off
echo ========================================================
echo        SHORE 5.0 - Backend Startup
echo ========================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python from python.org and try again.
    pause
    exit /b
)

:: Check if virtual environment exists inside backend/
IF NOT EXIST "backend\venv\Scripts\activate.bat" (
    echo [1/3] Creating Python virtual environment in backend\...
    python -m venv backend\venv
)

:: Activate virtual environment
call backend\venv\Scripts\activate.bat

:: Install requirements from backend/requirements.txt
echo [2/3] Installing/Verifying required dependencies...
pip install -r backend\requirements.txt --quiet --disable-pip-version-check
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b
)

:: Start Flask server from the backend folder
echo [3/3] Starting Backend Server...
echo.
echo  The backend API is now running at: http://127.0.0.1:5000
echo  For the frontend, open a new terminal and run:
echo    cd frontend
echo    npm install
echo    npm run dev
echo.
echo  Do not close this window while using the app!
echo.

:: Open browser after a 2 second delay (gives server time to start)
start "" "http://127.0.0.1:5000"

:: Run the Flask app (CWD stays at SHORE_Web_App root, server.py uses pathlib for relative paths)
python backend\server.py
pause
