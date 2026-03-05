@echo off
echo ========================================
echo  AIEng Server Starting...
echo ========================================
echo.

cd /d D:\work\dev\web\aieng

echo Killing existing node processes...
taskkill /F /IM node.exe >nul 2>&1

echo Starting server...
node server.js

pause
