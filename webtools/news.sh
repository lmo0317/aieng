#!/bin/bash
# Trend Eng News Automation Script
# 이 스크립트는 Gemini CLI를 호출하여 사용자 지침에 따른 뉴스 콘텐츠를 생성합니다.

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")"

echo "⏳ Gemini CLI를 호출하여 10개의 뉴스를 생성 중입니다..."
echo "📍 대상: 엔터, 스포츠, 테크, 경제, 정치 순"

# 상세 프롬프트와 함께 Gemini 실행 (-y: 자동 승인 모드)
/home/lmo0317ea/.nvm/versions/node/v22.22.1/bin/gemini -y "/news 10개 만들어줘. 트렌드는 엔터, 스포츠, 테크, 경제, 정치 순으로 선정하고 설명은 SKILL.md 지침에 따라 문장당 5문장 이상 아주 자세하고 꼼꼼하게 넣어줘. 반드시 기사당 10문장을 꽉 채워야 하며, aieng.cafe24.com 서버 반영과 텔레그램 결과 보고까지 완벽하게 마쳐줘."

if [ $? -eq 0 ]; then
    echo "✅ 모든 작업이 성공적으로 완료되었습니다."
else
    echo "❌ 작업 중 오류가 발생했습니다."
fi
