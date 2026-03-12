#!/bin/bash

# Gemini Chat API Test Script
# 이 스크립트는 새로운 /api/chat 엔드포인트를 테스트합니다.

echo "=========================================="
echo "Gemini Chat API Test"
echo "=========================================="
echo ""

# 서버 URL (필요시 수정)
SERVER_URL="http://localhost:3000"

echo "테스트 1: 기본 채팅 메시지 전송"
echo "------------------------------------------"
curl -X POST "${SERVER_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! Can you introduce yourself?",
    "temperature": 0.7,
    "maxTokens": 1000
  }' \
  --no-buffer -v
echo ""
echo ""

echo "테스트 2: 세션 ID를 사용한 대화 continuation"
echo "------------------------------------------"
curl -X POST "${SERVER_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "That'\''s great! Now tell me a joke.",
    "sessionId": "session_1234567890_abc123",
    "temperature": 0.8
  }' \
  --no-buffer -v
echo ""
echo ""

echo "테스트 3: 대화 기록 조회 (세션 ID 필요)"
echo "------------------------------------------"
curl -X GET "${SERVER_URL}/api/chat/session_1234567890_abc123/history" \
  -H "Content-Type: application/json" \
  -v
echo ""
echo ""

echo "테스트 4: 세션 초기화"
echo "------------------------------------------"
curl -X DELETE "${SERVER_URL}/api/chat/session_1234567890_abc123" \
  -H "Content-Type: application/json" \
  -v
echo ""
echo ""

echo "=========================================="
echo "테스트 완료!"
echo "=========================================="
echo ""
echo "참고:"
echo "- 위 테스트들은 curl을 사용한 예시입니다"
echo "- 실제 사용에서는 test-chat-api.html을 브라우저에서 열어 테스트하세요"
echo "- SSE 스트림을 보려면 --no-buffer 옵션이 필요합니다"
echo ""
