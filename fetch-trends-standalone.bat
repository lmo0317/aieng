@echo off
echo =========================================
echo   Claude Code CLI 뉴스 트렌드 수집기
echo =========================================
echo.
echo NOTE: Make sure web server is already running
echo.

node server/fetch-trends-standalone.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error occurred. Please check:
    echo 1. Node.js is installed
    echo 2. Dependencies are installed (npm install)
    echo 3. Web server is running (port 3000)
    echo 4. GEMINI_API_KEY is set in .env file
    echo.
    pause
)
