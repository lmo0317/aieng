@echo off
:: Trend Eng Popsong Automation (Minimalist)
chcp 65001 > nul

:: 인자 처리: 입력된 모든 인자를 노래 정보(가수 - 제목)로 취급
set "SONG_INFO=%*"
if "%SONG_INFO%"=="" (
    echo ❌ 노래 정보(가수 - 제목)를 입력해주세요.
    echo 예: popsong.bat Bruno Mars - Die With A Smile
    exit /b 1
)

echo 🚀 Trend Eng 팝송 '%SONG_INFO%' 분석 및 생성을 시작합니다... (Auto Mode)

:: 루트 디렉토리로 이동하여 gemini 실행
cd ..
gemini -y "/popsong %SONG_INFO%"

if %ERRORLEVEL% equ 0 (
    echo ✅ 작업이 완료되었습니다!
) else (
    echo ❌ 작업 중 오류가 발생했습니다.
)
