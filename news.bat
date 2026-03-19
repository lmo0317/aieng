@echo off
:: Trend Eng News Automation Batch File (Windows Local)
:: 이 파일은 사용자님의 PC에서 서버로 명령을 보낼 때 참고하거나 사용합니다.

chcp 65001 > nul
echo 🚀 Trend Eng 뉴스 생성 자동화를 시작합니다...
echo ⏳ 이 작업은 10개 기사(100문장) 생성으로 인해 약 5-10분 정도 소요될 수 있습니다.

:: 서버에 접속하여 Gemini 명령 실행 (사용자님의 프롬프트 반영)
:: 주의: 아래의 <SERVER_IP> 부분을 실제 서버 주소로 변경하여 사용하세요.
:: ssh lmo0317ea@<SERVER_IP> "cd ~/aieng && gemini -y '/news 10개 만들어줘. 트렌드는 엔터,스포츠,테크,경제,정치 순으로 선정하고 설명 자세하고 꼼꼼하게 넣어줘. aieng.cafe24.com에 반영도 꼭하고 결과는 텔레그램으로 알려줘.'"

:: 만약 서버 내부에서 실행 중이라면 아래 명령이 작동합니다.
gemini -y "/news 10개 만들어줘. 트렌드는 엔터,스포츠,테크,경제,정치 순으로 선정하고 설명 자세하고 꼼꼼하게 넣어줘. aieng.cafe24.com에 반영도 꼭하고 결과는 텔레그램으로 알려줘."

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ 뉴스 콘텐츠 및 퀴즈 생성이 모두 완료되었습니다!
    echo 🌐 텔레그램 보고를 확인하고 aieng.cafe24.com 에서 학습을 시작하세요.
) else (
    echo.
    echo ❌ 작업 중 오류가 발생했습니다. Gemini CLI 상태를 확인해주세요.
)

pause
