#!/bin/bash
# Trend Eng Popsong Automation Script
# 이 스크립트는 Gemini CLI를 호출하여 사용자 지침에 따른 팝송 학습 콘텐츠를 생성합니다.

# 프로젝트 디렉토리로 이동 후 루트로 한 단계 더 이동
cd "$(dirname "$0")"
cd ..

# 크론잡 실행을 위한 환경 변수 설정 (NVM 노드 경로 추가)
export PATH="/home/lmo0317ea/.nvm/versions/node/v22.22.1/bin:$PATH"

# 인자 처리: $1은 가수 이름, $2는 노래 제목
ARTIST=${1:-"Artist"}
SONG=${2:-"Song Title"}

# 환경 변수 설정 (인코딩 및 터미널 안정화)
export LANG=ko_KR.UTF-8
export PYTHONIOENCODING=utf-8
export CI=true

echo "🚀 Trend Eng 팝송 학습 콘텐츠 생성을 시작합니다..."
echo "⏳ Gemini CLI를 호출하여 팝송 학습 콘텐츠를 생성 중입니다..."
echo "📍 대상: ${ARTIST} - ${SONG}"

# 상세 프롬프트와 함께 Gemini 실행 (-y: 자동 승인 모드)
# 모델을 특정하지 않고 시스템 기본 모델(Auto)을 사용하도록 변경
/home/lmo0317ea/.nvm/versions/node/v22.22.1/bin/gemini -y "/popsong ${ARTIST} - ${SONG}. 가사 전체를 분석해서 SKILL.md 지침에 따라 1타 강사 스타일로 아주 자세하고 꼼꼼하게 만들어줘. 문장 구조 분석과 뉘앙스 설명(4문장 이상)을 완벽하게 넣고, https://minohlee.mooo.com 서버 저장과 텔레그램 결과 보고까지 완벽하게 마쳐줘."

if [ $? -eq 0 ]; then
    echo "✅ 모든 작업이 성공적으로 완료되었습니다."
else
    echo "❌ 작업 중 오류가 발생했습니다."
fi
