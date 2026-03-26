#!/bin/bash
# Trend Eng News Automation Script
# 이 스크립트는 Gemini CLI를 호출하여 뉴스 콘텐츠를 생성하고 텔레그램으로 결과를 보고합니다.

# 프로젝트 디렉토리로 이동 후 루트로 한 단계 더 이동
cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)/.."
cd "$PROJECT_ROOT"

# 크론잡 실행을 위한 환경 변수 설정 (NVM 노드 경로 추가)
export PATH="/home/lmo0317ea/.nvm/versions/node/v22.22.1/bin:$PATH"

# .env 파일에서 환경 변수 로드
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# 인자 처리: $1은 개수, $2는 주제
COUNT=${1:-10}
TOPIC=${2:-"엔터,스포츠,테크,경제,정치"}

# 환경 변수 설정 (인코딩 및 터미널 안정화)
export LANG=ko_KR.UTF-8
export PYTHONIOENCODING=utf-8
export CI=true

echo "🚀 Trend Eng 뉴스 생성 자동화를 시작합니다..."
echo "⏳ Gemini CLI를 호출하여 ${COUNT}개의 뉴스를 생성 중입니다..."
echo "📍 대상 주제: ${TOPIC}"

# 상세 프롬프트와 함께 Gemini 실행 (-y: 자동 승인 모드)
# 실행 결과를 변수에 저장하여 텔레그램으로 전송할 준비를 합니다.
GEMINI_OUTPUT=$(/home/lmo0317ea/.nvm/versions/node/v22.22.1/bin/gemini -m "gemini-3.1-flash-lite-preview" -y "/news 요청한 수량 총합 ${COUNT}개만 정확히 생성해줘. 주제: ${TOPIC}. 모든 규칙은 /news 스킬 지침(SKILL.md)을 엄격히 준수하여 운영 서버(aieng.cafe24app.com)에 반영해줘.")

if [ $? -eq 0 ]; then
    echo "✅ 모든 작업이 성공적으로 완료되었습니다."
    
    # 텔레그램으로 결과 보고
    if [ ! -z "$TELEGRAM_BOT_TOKEN" ] && [ ! -z "$TELEGRAM_CHAT_ID" ]; then
        echo "📤 텔레그램으로 보고서를 전송 중입니다..."
        
        # 메시지 내용 준비 (마크다운 특수문자 처리 생략하고 기본 텍스트로 전송)
        REPORT_TEXT="[Trend Eng 자동화 보고]\n\n${GEMINI_OUTPUT}"
        
        # curl을 사용하여 텔레그램 API 호출
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            -d text="${REPORT_TEXT}" > /dev/null
            
        echo "📲 텔레그램 전송 완료."
    fi
else
    echo "❌ 작업 중 오류가 발생했습니다."
    
    # 에러 알림 전송
    if [ ! -z "$TELEGRAM_BOT_TOKEN" ] && [ ! -z "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            -d text="❌ [Trend Eng] 뉴스 생성 자동화 작업 중 오류가 발생했습니다. 로그를 확인해 주세요." > /dev/null
    fi
fi
