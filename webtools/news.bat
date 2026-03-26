@echo off
:: Trend Eng News Automation Batch File (Windows Local)
:: 인코딩 고정 (UTF-8)
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
set NODE_OPTIONS=--max-old-space-size=4096
set LANG=ko_KR.UTF-8

:: 인자 처리: %1은 개수, %2는 주제
set "COUNT=%~1"
if "%COUNT%"=="" set "COUNT=10"
set "TOPIC=%~2"
if "%TOPIC%"=="" set "TOPIC=엔터,스포츠,테크,경제,정치"

:: 터미널 에러 방지를 위한 환경 변수 강제 설정
set CI=true
set TERM=dumb
set FORCE_COLOR=0
set NO_UPDATE_NOTIFIER=1

echo 🚀 Trend Eng 뉴스 생성 자동화를 시작합니다...
echo ⏳ AI 서버 상태에 따라 5-10분 정도 소요될 수 있습니다. (503 에러 발생 시 자동 재시도됨)
echo 📍 설정: %COUNT%개, 주제: %TOPIC%

:: 절대 경로 대신 현재 폴더의 상위(루트)를 기준으로 gemini 실행
cd ..
:: 고성능 모델(gemini-3.1-flash-lite-preview)을 사용하여 상세 지침을 완벽하게 수행합니다.
gemini -m "gemini-3.1-flash-lite-preview" -y "/news 요청한 수량 총합 %COUNT%개만 정확히 생성해줘. 주제: %TOPIC%. 모든 규칙은 /news 스킬 지침(SKILL.md)을 엄격히 준수하여 운영 서버(aieng.cafe24app.com)에 반영해줘."


if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ 뉴스 콘텐츠 및 퀴즈 생성이 모두 완료되었습니다!
) else (
    echo.
    echo ❌ 작업 중 오류가 발생했습니다. (AI 서버가 불안정할 수 있으니 잠시 후 다시 시도해 주세요.)
)
