#!/bin/bash
# Trend Eng Crossword Puzzle Automation Script
# 이 스크립트는 Gemini CLI를 호출하여 오늘의 생활영어 가로세로 퍼즐을 생성합니다.

# 프로젝트 디렉토리로 이동 후 루트로 한 단계 더 이동
cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)/.."
cd "$PROJECT_ROOT"

# 크론잡/CI 실행을 위한 환경 변수 설정 (NVM 노드 경로 추가)
export PATH="/home/lmo0317ea/.nvm/versions/node/v22.22.1/bin:$PATH"

# 인자 처리: $1은 주제, $2는 단어 수
TOPIC=${1:-"생활영어"}
COUNT=${2:-"8"}

# 환경 변수 설정 (인코딩 및 터미널 안정화)
export LANG=ko_KR.UTF-8
export PYTHONIOENCODING=utf-8
export CI=true

echo "🚀 Trend Eng 가로세로 퍼즐 자동 생성을 시작합니다..."
echo "⏳ Gemini CLI를 호출하여 ${COUNT}개의 단어로 퍼즐을 생성 중입니다..."
echo "📍 대상 주제: ${TOPIC}"

# 상세 프롬프트와 함께 Gemini 실행 (-y: 자동 승인 모드)
# /puzzle 스킬을 사용하여 무결성이 검증된 퍼즐을 생성하고 서버에 저장합니다.
/home/lmo0317ea/.nvm/versions/node/v22.22.1/bin/gemini -m "gemini-3.1-flash-lite-preview" -y "/puzzle ${TOPIC} ${COUNT}개 생성해서 운영 서버(https://aieng.duckdns.org)에 반영해줘. 모든 결과 보고는 텔레그램으로 전송해줘."

if [ $? -eq 0 ]; then
    echo "✅ 퍼즐 생성 작업이 성공적으로 완료되었습니다."
else
    echo "❌ 퍼즐 생성 중 오류가 발생했습니다."
    exit 1
fi
