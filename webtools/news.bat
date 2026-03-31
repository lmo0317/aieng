@echo off
:: Trend Eng News Automation (Minimalist - Fixed Path)
chcp 65001 > nul

:: 인자 처리: %1은 생성할 뉴스 개수 (기본값 1)
set "COUNT=%~1"
if "%COUNT%"=="" set "COUNT=1"

echo 🚀 Trend Eng 뉴스 %COUNT%개 생성을 시작합니다... (Auto Mode)

:: 배치 파일이 있는 폴더(%~dp0)의 상위 폴더(루트)로 이동
cd /d "%~dp0.."

:: 이제 루트 디렉토리에서 gemini 실행 (스킬 인식 보장)
gemini -y "/news %COUNT%개"

if %ERRORLEVEL% equ 0 (
    echo ✅ 작업이 완료되었습니다!
) else (
    echo ❌ 작업 중 오류가 발생했습니다.
)
