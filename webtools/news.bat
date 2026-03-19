@echo off
:: Trend Eng News Automation Batch File (Windows Local)
chcp 65001 > nul

:: 터미널 에러 방지를 위한 환경 변수 강제 설정
set CI=true
set TERM=dumb
set FORCE_COLOR=0

echo 🚀 Trend Eng 뉴스 생성 자동화를 시작합니다...
echo ⏳ AI 서버 상태에 따라 5-10분 정도 소요될 수 있습니다. (503 에러 발생 시 자동 재시도됨)

:: 절대 경로 대신 현재 폴더의 상위(루트)를 기준으로 gemini 실행
cd ..
gemini -y "/news 10개 만들어줘. 트렌드는 엔터,스포츠,테크,경제,정치 순으로 선정하고 설명 자세하고 꼼꼼하게 넣어줘. aieng.cafe24.com에 반영도 꼭하고 결과는 텔레그램으로 알려줘."

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ 뉴스 콘텐츠 및 퀴즈 생성이 모두 완료되었습니다!
) else (
    echo.
    echo ❌ 작업 중 오류가 발생했습니다. (AI 서버가 불안정할 수 있으니 잠시 후 다시 시도해 주세요.)
)
