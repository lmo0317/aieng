@echo off
:: Trend Eng Puzzle Automation (Minimalist - Fixed Path)
chcp 65001 > nul

:: 인자 처리: 입력된 모든 인자를 퍼즐 주제나 명령어로 취급
set "PUZZLE_ARG=%*"
if "%PUZZLE_ARG%"=="" (
    echo 🚀 주제 없이 기본 퍼즐 생성을 시작합니다...
    set "PUZZLE_ARG=신규 퍼즐 생성"
) else (
    echo 🚀 Trend Eng 퍼즐 '%PUZZLE_ARG%' 생성을 시작합니다... (Auto Mode)
)

:: 배치 파일이 있는 폴더(%~dp0)의 상위 폴더(루트)로 이동
cd /d "%~dp0.."

:: 이제 루트 디렉토리에서 gemini 실행 (스킬 인식 보장)
gemini -y "/puzzle %PUZZLE_ARG%"

if %ERRORLEVEL% equ 0 (
    echo ✅ 퍼즐 생성이 완료되었습니다!
) else (
    echo ❌ 작업 중 오류가 발생했습니다.
)
