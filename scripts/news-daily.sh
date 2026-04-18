#!/bin/bash
# Trend Eng - 카테고리별 뉴스 학습 데이터 자동 생성 (Linux)
# 사용법: ./scripts/news-daily.sh [개수]  (기본값: 각 카테고리당 2개)

set -e

COUNT="${1:-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "============================================"
echo " Trend Eng 뉴스 학습 데이터 생성 시작"
echo " 카테고리: 정치 / 테크 / 엔터"
echo " 카테고리당 생성 개수: ${COUNT}개"
echo " 시작 시각: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

run_category() {
  local category="$1"
  local count="$2"

  echo ""
  echo "--------------------------------------------"
  echo " [${category}] 뉴스 생성 시작 (${count}개)"
  echo " 시각: $(date '+%H:%M:%S')"
  echo "--------------------------------------------"

  if gemini -y "/news ${category} ${count}개"; then
    echo " [${category}] ✅ 완료"
  else
    echo " [${category}] ❌ 오류 발생 (계속 진행)"
  fi
}

# 정치
run_category "정치" "$COUNT"

# 카테고리 간 간격 (API 과부하 방지)
echo ""
echo "⏳ 다음 카테고리까지 30초 대기..."
sleep 30

# 테크
run_category "테크" "$COUNT"

echo ""
echo "⏳ 다음 카테고리까지 30초 대기..."
sleep 30

# 엔터 (연애+스포츠)
run_category "엔터" "$COUNT"

echo ""
echo "============================================"
echo " 전체 완료: $(date '+%Y-%m-%d %H:%M:%S')"
echo " 총 생성: $((COUNT * 3))개 (정치 ${COUNT} + 테크 ${COUNT} + 엔터 ${COUNT})"
echo "============================================"
