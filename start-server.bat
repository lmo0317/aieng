@echo off
echo ========================================
echo  Trend Eng Server Starting...
echo ========================================
echo.

cd /d C:\work\git\web\aieng

echo Killing existing node processes...
taskkill /F /IM node.exe >nul 2>&1

echo Starting server...
node server.js

pause
