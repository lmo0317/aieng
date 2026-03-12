# Trend Eng - 맞춤형 트렌드 Chat API Quick Start Guide

## 1단계: API Key 설정

### .env 파일 확인 또는 생성

`.env` 파일에 Gemini API Key를 추가하세요:

```bash
# 이미 있는 경우 확인
GEMINI_API_KEY=your_actual_gemini_api_key_here

# 또는 데이터베이스를 통해 설정 가능 (런타임)
```

### API Key가 없는 경우

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 방문
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. API Key 생성 및 복사
4. `.env` 파일에 붙여넣기

## 2단계: 서버 시작

```bash
# 종속성 설치 (이미 설치된 경우 생략)
npm install

# 서버 시작
node server.js
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 3단계: 채팅 API 테스트

### 옵션 A: 웹 인터페이스 사용 (권장)

1. 브라우저에서 `http://localhost:3000/test-chat-api.html` 열기
2. 메시지 입력 후 "전송" 버튼 클릭
3. 실시간 스트리밍 응답 확인

### 옵션 B: cURL 테스트

```bash
# Windows CMD
curl -X POST "http://localhost:3000/api/chat" ^
  -H "Content-Type: application/json" ^
  -d "{\"message\": \"Hello! Introduce yourself.\", \"temperature\": 0.7}" ^
  --no-buffer

# Git Bash / Linux / Mac
curl -X POST "http://localhost:3000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! Introduce yourself.", "temperature": 0.7}' \
  --no-buffer
```

### 옵션 C: JavaScript 테스트

```javascript
// 브라우저 콘솔 또는 Node.js 스크립트에서 실행

async function testChat() {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: '안녕하세요! 자기소개 부탁드려요.',
            temperature: 0.7
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data:')) {
                try {
                    const data = JSON.parse(line.slice(5).trim());
                    if (data.text) {
                        fullText += data.text;
                        console.log('Received:', data.text);
                    }
                } catch (e) {}
            }
        }
    }

    console.log('Full response:', fullText);
}

testChat();
```

## 4단계: 응답 확인

성공적인 경우 다음과 같은 SSE 이벤트를 받게 됩니다:

```
event: session
data: {"sessionId":"session_1234567890_abc"}

event: start
data: {"message":"응답 생성을 시작합니다..."}

event: chunk
data: {"text":"안녕하세요! ","done":false}

event: chunk
data: {"text":"저는 Gemini 2.5 Flash 기반 AI 어시스턴트입니다. ","done":false}

event: done
data: {"text":"안녕하세요! 저는 Gemini 2.5 Flash 기반 AI 어시스턴트입니다.","message":"응답 생성이 완료되었습니다."}
```

## 문제 해결

### "API Key가 설정되지 않았습니다" 에러

**해결 방법:**
```bash
# .env 파일 확인
cat .env

# API Key 추가
echo "GEMINI_API_KEY=your_key_here" >> .env

# 서버 재시작
node server.js
```

### "유효하지 않은 API Key입니다" 에러

**해결 방법:**
1. API Key가 올바른지 확인
2. API Key가 만료되지 않았는지 확인
3. Google Cloud Console에서 API Key가 활성화되어 있는지 확인

### SSE 연결이 즉시 종료됨

**해결 방법:**
1. 방화벽 설정 확인
2. 프록시 설정 확인
3. 브라우저 콘솔에서 에러 메시지 확인

## 다음 단계

- [ ] 프로덕션 환경에 맞게 세션 저장소 Redis로 변경
- [ ] 속도 제한 (Rate Limiting) 구현
- [ ] 모니터링 및 로깅 추가
- [ ] 보안 헤더 강화

## 도움말

자세한 문서는 [CHAT-API-README.md](./CHAT-API-README.md)를 참조하세요.
