#!/bin/bash
# Trend Eng News Automation Script

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

/home/lmo0317ea/.nvm/versions/node/v22.22.1/bin/gemini -m "gemini-3.1-flash-lite-preview" -y "/news 요청한 수량 총합 ${COUNT}개만 정확히 생성해줘. 주제: ${TOPIC}. 모든 규칙은 /news 스킬 지침(SKILL.md)을 엄격히 준수하여 운영 서버(https://minohlee.mooo.com)에 반영해줘."

if [ $? -eq 0 ]; then
    echo "✅ 모든 작업이 성공적으로 완료되었습니다."
else
    echo "❌ 작업 중 오류가 발생했습니다."
fi
