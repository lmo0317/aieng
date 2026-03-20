@echo off
:: Trend Eng Popsong Automation Batch File (Windows Local)
chcp 65001 > nul

:: 인자 처리: %1은 가수, %2는 노래 제목
set ARTIST=%1
if "%ARTIST%"=="" set ARTIST="Artist"
set SONG=%2
if "%SONG%"=="" set SONG="Song Title"

:: 터미널 에러 방지를 위한 환경 변수 강제 설정
set CI=true
set TERM=dumb
set FORCE_COLOR=0

echo 🚀 Trend Eng 팝송 학습 콘텐츠 생성을 시작합니다...
echo ⏳ AI 분석 및 서버 저장 과정이 2-3분 정도 소요될 수 있습니다.
echo 📍 대상: %ARTIST% - %SONG%

:: 절대 경로 대신 현재 폴더의 상위(루트)를 기준으로 gemini 실행
cd ..
gemini -m "gemini-3.1-pro-preview" -y "/popsong %ARTIST% - %SONG%. 가사 전체를 분석해서 SKILL.md 지침에 따라 1타 강사 스타일로 아주 자세하고 꼼꼼하게 만들어줘. 문장 구조 분석과 뉘앙스 설명(4문장 이상)을 완벽하게 넣고, aieng.cafe24.com 서버 저장과 텔레그램 결과 보고까지 완벽하게 마쳐줘."

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ 팝송 학습 콘텐츠 및 퀴즈 생성이 모두 완료되었습니다!
) else (
    echo.
    echo ❌ 작업 중 오류가 발생했습니다. (AI 서버가 불안정할 수 있으니 잠시 후 다시 시도해 주세요.)
)
