@echo off
REM Trend Eng News Automation Script for Windows
echo.
echo =========================================
echo   TREND ENG NEWS AUTOMATION SCRIPT
echo =========================================
echo.
cd /d %~dp0 /home/lmo0317ea/aieng
echo.
echo [실행] gemini CLI를 호출하여 뉴스 10개 생성 시작...
echo.
call bash news.sh
echo.
echo [완료] 뉴스 생성 완료!
echo.
echo =========================================
echo.
pause
