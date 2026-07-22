@echo off
echo ======================================================================
echo              Terminating SpendiFy FinTech Platform
echo ======================================================================
echo.

echo [!] Terminating processes on Port 5000 (Express Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo Killing process PID %%a
    taskkill /F /PID %%a 2>nul
)

echo [!] Terminating processes on Port 3000 (React Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process PID %%a
    taskkill /F /PID %%a 2>nul
)

echo [!] Terminating processes on Port 8000 (Python AI Service)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo Killing process PID %%a
    taskkill /F /PID %%a 2>nul
)

echo [!] Closing Command Prompt windows...
taskkill /F /FI "WINDOWTITLE eq Spendify Backend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Spendify Frontend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Spendify AI Service*" 2>nul

echo.
echo ======================================================================
echo All SpendiFy services have been terminated successfully.
echo ======================================================================
echo.
pause
