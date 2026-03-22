@echo off
:: Trend Eng News Automation Batch File (Windows Local)
chcp 65001 > nul

:: 인자 처리: %1은 개수, %2는 주제
set COUNT=%1
if "%COUNT%"=="" set COUNT=10
set TOPIC=%2
if "%TOPIC%"=="" set TOPIC="엔터,스포츠,테크,경제,정치"

:: 터미널 에러 방지를 위한 환경 변수 강제 설정
set CI=true
set TERM=dumb
set FORCE_COLOR=0

echo 🚀 Trend Eng 뉴스 생성 자동화를 시작합니다...
echo ⏳ AI 서버 상태에 따라 5-10분 정도 소요될 수 있습니다. (503 에러 발생 시 자동 재시도됨)
echo 📍 설정: %COUNT%개, 주제: %TOPIC%

:: 절대 경로 대신 현재 폴더의 상위(루트)를 기준으로 gemini 실행
cd ..
gemini -m "gemini-3.1-pro-preview" -y "/news 총합 %COUNT%개만 만들어줘. 트렌드는 %TOPIC% 중에서 선정하되, **반드시 google_web_search로 오늘(2026-03-20)의 실시간 속보를 검색해서 작성**해줘. **[필수 준수 사항: 1. 카테고리(category)는 반드시 '경제', '테크' 등 한글로만 작성할 것. 2. 문장 구조 분석(sentence_structure)은 S, V, O 같은 약어 대신 '주어', '동사', '목적어' 등 한글 명칭을 사용하고 '[주어: ...] + [동사: ...]' 형태로 깔끔하게 정리할 것. 3. 퀴즈는 무조건 4지 선다 객관식(multiple_choice)으로만 10개 생성할 것 (빈칸 채우기 절대 금지). 4. 결과는 반드시 운영 서버(http://aieng.cafe24app.com)에 즉시 저장할 것.]** 뻔한 기술 업데이트나 예전 소식은 절대 금지하며, 구체적인 수치와 최신 인물 동정이 포함된 '날 것'의 뉴스여야 해. 설명 자세하고 꼼꼼하게 넣어줘. 결과는 텔레그램으로 알려줘."

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ 뉴스 콘텐츠 및 퀴즈 생성이 모두 완료되었습니다!
) else (
    echo.
    echo ❌ 작업 중 오류가 발생했습니다. (AI 서버가 불안정할 수 있으니 잠시 후 다시 시도해 주세요.)
)
