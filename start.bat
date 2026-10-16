@echo off
echo ======================================================================
echo                Starting SpendiFy FinTech Platform
echo ======================================================================
echo.

echo [+] Starting AI Service (Port 8000)...
start "Spendify AI Service" cmd /k "cd ai-service && .\.venv\Scripts\python -m app.main"

echo [+] Starting Backend Server (Port 5000)...
start "Spendify Backend" cmd /k "cd server && npm run dev"

echo [+] Starting Frontend Client (Port 3000)...
start "Spendify Frontend" cmd /k "cd client && npm run dev"

echo.
echo ======================================================================
echo SpendiFy services are starting up!
echo  - Frontend UI:   http://localhost:3000
echo  - Backend API:   http://localhost:5000/health
echo  - AI ML Service: http://localhost:8000/health
echo.
echo To stop the platform and close all windows, run: terminate.bat
echo ======================================================================
echo.
pause
