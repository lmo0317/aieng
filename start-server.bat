@echo off
echo ========================================
echo  Trend Eng Server Starting...
echo ========================================
echo.

cd /d %~dp0

echo Killing existing node processes...
taskkill /F /IM node.exe >nul 2>&1

echo Starting server...
node server/server.js

pause
