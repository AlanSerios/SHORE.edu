@echo off
echo ========================================================
echo        SHORE 5.0 - Report Generator Startup
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

:: Check if virtual environment exists
IF NOT EXIST "venv\Scripts\activate.bat" (
    echo [1/3] Creating Python virtual environment...
    python -m venv venv
)

:: Activate virtual environment
call venv\Scripts\activate.bat

:: Install requirements quietly
echo [2/3] Installing/Verifying required dependencies...
pip install -r requirements.txt --quiet --disable-pip-version-check
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b
)

:: Start Flask server
echo [3/3] Starting Local Server...
echo The web app will open automatically in your default browser.
echo Do not close this window while using the app!
echo.

:: Open browser after a 2 second delay (gives server time to start)
start "" "http://127.0.0.1:5000"

:: Run the Flask app
python server.py
pause
