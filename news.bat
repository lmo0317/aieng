@echo off
:: Trend Eng News Automation Batch File
:: Gemini CLI를 호출하여 오늘자 뉴스 데이터를 삭제하고 10개를 새롭게 생성합니다.

chcp 65001 > nul
echo 🚀 Gemini CLI를 호출하여 최신 뉴스 트렌드를 수집하고 학습 콘텐츠(10개)를 생성합니다...
echo ⏳ 이 작업은 약 2~3분 정도 소요될 수 있습니다. 잠시만 기다려주세요.

:: Gemini CLI 실행 (YOLO 모드 적용)
:: -y 옵션은 사용자 확인 절차를 건너뛰고 모든 작업을 즉시 수행합니다.
gemini -y "/news 삭제하고 10개 만들어줘"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ 뉴스 콘텐츠 및 퀴즈 생성이 모두 완료되었습니다!
    echo 🌐 이제 브라우저에서 최신 트렌드를 확인해보세요.
) else (
    echo.
    echo ❌ 작업 중 오류가 발생했습니다. Gemini CLI 상태를 확인해주세요.
)

pause
