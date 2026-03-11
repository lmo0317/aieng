@echo off
echo ============================================
echo Trend Eng CLI Tool
echo ============================================
echo.

node cli-fetch-trends.js %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error occurred. Please check if:
    echo 1. Node.js is installed
    echo 2. Dependencies are installed (npm install)
    echo 3. Server is running (npm start)
    echo.
    pause
)
