@echo off
chcp 437 >nul
set TREND_ID=%1
if "%TREND_ID%"=="" (
    echo Usage: test_shorts.bat [trend_id]
    echo Example: test_shorts.bat 306
    exit /b 1
)
echo === Shorts Test (ID: %TREND_ID%) ===
python "%~dp0generate_shorts.py" %TREND_ID%
