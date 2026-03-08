@echo off
echo ========================================
echo  AIEng Server Starting...
echo ========================================
echo.

:: 현재 배치 파일이 위치한 폴더로 이동
cd /d "%~dp0"

echo Killing existing node processes...
taskkill /F /IM node.exe >nul 2>&1

echo Starting server on port 80...
node server.js

pause
