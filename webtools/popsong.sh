#!/bin/bash
# Trend Eng Popsong Automation Script
# 이 스크립트는 Gemini CLI를 호출하여 사용자 지침에 따른 팝송 학습 콘텐츠를 생성합니다.

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")"

# 인자 처리: $1은 가수 이름, $2는 노래 제목
ARTIST=${1:-"Artist"}
SONG=${2:-"Song Title"}

echo "⏳ Gemini CLI를 호출하여 팝송 학습 콘텐츠를 생성 중입니다..."
echo "📍 대상: ${ARTIST} - ${SONG}"

# 상세 프롬프트와 함께 Gemini 실행 (-y: 자동 승인 모드)
# -m 옵션을 사용하여 최신 고성능 모델(gemini-3.1-pro-preview)을 지정합니다.
/home/lmo0317ea/.nvm/versions/node/v22.22.1/bin/gemini -m "gemini-3.1-pro-preview" -y "/popsong ${ARTIST} - ${SONG}. 가사 전체를 분석해서 SKILL.md 지침에 따라 1타 강사 스타일로 아주 자세하고 꼼꼼하게 만들어줘. 문장 구조 분석과 뉘앙스 설명(4문장 이상)을 완벽하게 넣고, aieng.cafe24.com 서버 저장과 텔레그램 결과 보고까지 완벽하게 마쳐줘."

if [ $? -eq 0 ]; then
    echo "✅ 모든 작업이 성공적으로 완료되었습니다."
else
    echo "❌ 작업 중 오류가 발생했습니다."
fi
