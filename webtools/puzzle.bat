@echo off
:: Trend Eng Puzzle Automation (Minimalist)
chcp 65001 > nul

:: 인자 처리: 입력된 모든 인자를 퍼즐 주제나 명령어로 취급
set "PUZZLE_ARG=%*"
if "%PUZZLE_ARG%"=="" (
    echo 🚀 주제 없이 기본 퍼즐 생성을 시작합니다...
    set "PUZZLE_ARG=신규 퍼즐 생성"
) else (
    echo 🚀 Trend Eng 퍼즐 '%PUZZLE_ARG%' 생성을 시작합니다... (Auto Mode)
)

:: 루트 디렉토리로 이동하여 gemini 실행
cd ..
gemini -y "/puzzle %PUZZLE_ARG%"

if %ERRORLEVEL% equ 0 (
    echo ✅ 퍼즐 생성이 완료되었습니다!
) else (
    echo ❌ 작업 중 오류가 발생했습니다.
)
