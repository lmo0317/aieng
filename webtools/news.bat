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
:: 모델을 특정하지 않고 시스템 기본 모델(Auto)을 사용하도록 변경
:: 인코딩 오류 방지를 위해 프롬프트를 간결하게 수정 (SKILL.md 지침 기반 자동 실행)
gemini -y "/news generate %COUNT% items on topic: %TOPIC% based on SKILL.md"


if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ 뉴스 콘텐츠 및 퀴즈 생성이 모두 완료되었습니다!
) else (
    echo.
    echo ❌ 작업 중 오류가 발생했습니다. (AI 서버가 불안정할 수 있으니 잠시 후 다시 시도해 주세요.)
)
