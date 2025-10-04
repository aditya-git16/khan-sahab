@echo off
REM Khan Sahab Restaurant - Windows Run Script
REM Batch script to run both backend and frontend

echo.
echo ========================================
echo   Khan Sahab Restaurant Management
echo ========================================
echo.

REM Get the directory where the script is located
cd /d "%~dp0"

echo Starting Backend Server...
echo.

REM Start backend in a new window
start "Khan Sahab Backend" cmd /k "cd backend && .\venv\Scripts\activate && python app.py"

REM Wait a few seconds for backend to start
timeout /t 5 /nobreak >nul

echo Starting Frontend Development Server...
echo.

REM Start frontend in a new window
start "Khan Sahab Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo   Application Starting...
echo ========================================
echo.
echo Backend running at: http://localhost:5001
echo Frontend running at: http://localhost:4000
echo.
echo Two new windows have been opened:
echo  1. Backend Server (Python Flask)
echo  2. Frontend Server (React)
echo.
echo Close those windows to stop the servers.
echo.
echo Press any key to exit this window...
pause >nul

