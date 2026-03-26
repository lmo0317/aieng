@echo off
:: Trend Eng Popsong Automation Batch File (Windows Local)
chcp 65001 > nul

:: 인자 처리: %1은 가수, %2는 노래 제목
set "ARTIST=%~1"
if "%ARTIST%"=="" set "ARTIST=Artist"
set "SONG=%~2"
if "%SONG%"=="" set "SONG=Song Title"

:: 터미널 에러 방지를 위한 환경 변수 강제 설정
set CI=true
set TERM=dumb
set FORCE_COLOR=0

echo 🚀 Trend Eng 팝송 학습 콘텐츠 생성을 시작합니다...
echo ⏳ AI 분석 및 서버 저장 과정이 2-3분 정도 소요될 수 있습니다.
echo 📍 대상: %ARTIST% - %SONG%

:: 절대 경로 대신 현재 폴더의 상위(루트)를 기준으로 gemini 실행
cd ..
:: 모델을 특정하지 않고 시스템 기본 모델(Auto)을 사용하도록 변경
:: 인코딩 오류 방지를 위해 프롬프트를 간결하게 수정 (SKILL.md 지침 기반 자동 실행)
gemini -y "/popsong %ARTIST% - %SONG% content generation based on SKILL.md"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ 팝송 학습 콘텐츠 및 퀴즈 생성이 모두 완료되었습니다!
) else (
    echo.
    echo ❌ 작업 중 오류가 발생했습니다. (AI 서버가 불안정할 수 있으니 잠시 후 다시 시도해 주세요.)
)
