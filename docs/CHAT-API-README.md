# Gemini Chat API Documentation

## 개요 (Overview)

Gemini 2.5 Flash를 활용한 실시간 스트리밍 채팅 API입니다. Server-Sent Events (SSE) 기반으로 실시간 응답을 제공하며, 세션 기반 대화 컨텍스트를 지원합니다.

## 주요 기능 (Key Features)

- ✅ **실시간 스트리밍**: SSE 기반으로 텍스트가 생성되는 즉시 전송
- ✅ **대화 컨텍스트**: 세션 ID를 통해 이전 대화 기록 유지
- ✅ **에러 핸들링**: 상세한 에러 메시지 및 코드 제공
- ✅ **보안**: CORS 헤더 설정 및 입력 검증
- ✅ **세션 관리**: 자동 세션 생성, 기록 조회, 초기화 기능

## 엔드포인트 (Endpoints)

### 1. 채팅 메시지 전송 (Send Chat Message)

**POST** `/api/chat`

#### 요청 본문 (Request Body)

```json
{
  "message": "string (필수) - 사용자 메시지",
  "sessionId": "string (선택) - 세션 ID, 미제공 시 자동 생성",
  "systemPrompt": "string (선택) - 시스템 프롬프트",
  "temperature": "number (선택) - 생성 온도 (0.0 ~ 1.0), 기본값 0.7",
  "maxTokens": "number (선택) - 최대 토큰 수, 기본값 8192"
}
```

#### 응답 (Response)

Server-Sent Events (SSE) 스트림 형식:

##### 이벤트: `session`
```json
{
  "sessionId": "session_1234567890_abc123"
}
```

##### 이벤트: `start`
```json
{
  "message": "응답 생성을 시작합니다..."
}
```

##### 이벤트: `chunk`
```json
{
  "text": "생성된 텍스트 청크",
  "done": false
}
```

##### 이벤트: `done`
```json
{
  "text": "전체 응답 텍스트",
  "message": "응답 생성이 완료되었습니다."
}
```

##### 이벤트: `error`
```json
{
  "code": "ERROR_CODE",
  "message": "에러 메시지"
}
```

#### 에러 코드 (Error Codes)

- `INVALID_REQUEST`: 유효하지 않은 요청
- `NO_API_KEY`: API Key가 설정되지 않음
- `INVALID_API_KEY`: 유효하지 않은 API Key
- `QUOTA_EXCEEDED`: API 할당량 초과
- `SAFETY_FILTER`: 안전 정책 위배 콘텐츠
- `INTERNAL_ERROR`: 내부 서버 오류

### 2. 세션 초기화 (Clear Session)

**DELETE** `/api/chat/:sessionId`

#### 응답 (Response)

```json
{
  "success": true,
  "message": "세션이 초기화되었습니다."
}
```

### 3. 대화 기록 조회 (Get Conversation History)

**GET** `/api/chat/:sessionId/history`

#### 응답 (Response)

```json
{
  "sessionId": "session_1234567890_abc123",
  "history": [
    {
      "role": "user",
      "content": "사용자 메시지",
      "timestamp": 1234567890123
    },
    {
      "role": "model",
      "content": "AI 응답",
      "timestamp": 1234567890124
    }
  ]
}
```

## 사용 예시 (Usage Examples)

### JavaScript (Fetch API)

```javascript
async function sendChatMessage(message, sessionId = null) {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: message,
            sessionId: sessionId,
            temperature: 0.7,
            maxTokens: 8192
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('event:')) {
                const event = line.slice(6).trim();
                console.log('Event:', event);
            } else if (line.startsWith('data:')) {
                const data = JSON.parse(line.slice(5).trim());

                if (data.sessionId) {
                    console.log('Session ID:', data.sessionId);
                } else if (data.text) {
                    fullResponse += data.text;
                    console.log('Received chunk:', data.text);
                }
            }
        }
    }

    return fullResponse;
}

// 사용 예시
sendChatMessage('안녕하세요! 자기소개 부탁드려요.')
    .then(response => console.log('Full response:', response));
```

### JavaScript (EventSource)

```javascript
function sendChatWithEventSource(message, sessionId = null) {
    // EventSource는 POST를 지원하지 않으므로 fetch 사용 권장
    // 하지만 채팅방 구독 등에는 사용 가능

    const eventSource = new EventSource('/api/chat');

    eventSource.addEventListener('session', (e) => {
        const data = JSON.parse(e.data);
        console.log('Session ID:', data.sessionId);
    });

    eventSource.addEventListener('chunk', (e) => {
        const data = JSON.parse(e.data);
        console.log('Chunk:', data.text);
    });

    eventSource.addEventListener('done', (e) => {
        const data = JSON.parse(e.data);
        console.log('Done:', data.text);
        eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
        console.error('Error:', e.data);
        eventSource.close();
    });
}
```

### cURL

```bash
curl -X POST "http://localhost:3000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! Can you introduce yourself?",
    "temperature": 0.7
  }' \
  --no-buffer
```

### Python

```python
import requests
import json

def send_chat_message(message, session_id=None):
    url = "http://localhost:3000/api/chat"
    payload = {
        "message": message,
        "sessionId": session_id,
        "temperature": 0.7,
        "maxTokens": 8192
    }

    response = requests.post(url, json=payload, stream=True)

    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('event:'):
                event = line[6:].strip()
                print(f"Event: {event}")
            elif line.startswith('data:'):
                data = json.loads(line[5:].strip())
                if 'text' in data:
                    print(f"Chunk: {data['text']}")
                elif 'sessionId' in data:
                    print(f"Session ID: {data['sessionId']}")

# 사용 예시
send_chat_message("안녕하세요! 자기소개 부탁드려요.")
```

## 환경 설정 (Configuration)

### 필수 환경 변수

```bash
# .env 파일
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 데이터베이스 설정

API Key는 다음 두 가지 방법으로 설정할 수 있습니다:

1. **환경 변수** (권장): `.env` 파일에 `GEMINI_API_KEY` 설정
2. **데이터베이스**: `/api/settings` 엔드포인트를 통해 런타임에 설정

## 테스트 (Testing)

### 1. 웹 인터페이스 테스트

```bash
# 서버 시작
node server.js

# 브라우저에서 test-chat-api.html 열기
# http://localhost:3000/test-chat-api.html
```

### 2. cURL 테스트

```bash
# 테스트 스크립트 실행 (Git Bash 또는 Linux/Mac)
bash test-chat-api.sh
```

### 3. 단위 테스트 예시

```javascript
// 테스트 프레임워크: Jest 또는 Mocha 사용 권장

describe('Chat API', () => {
    test('should create new session', async () => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello!' })
        });

        expect(response.ok).toBe(true);
    });

    test('should return error for invalid request', async () => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '' })
        });

        expect(response.ok).toBe(false);
    });
});
```

## 아키텍처 (Architecture)

### 세션 관리

- **인메모리 저장**: 현재 인메모리 Map에 세션 저장
- **세션 타임아웃**: 30분간 사용하지 않은 세션은 자동 삭제
- **최대 기록 길이**: 세션당 최대 20개의 메시지 기록 유지
- **자동 정리**: 5분마다 만료된 세션 정리

### 프로덕션 배포 시 고려사항

1. **Redis 사용**: 세션 저장소로 Redis 사용하여 분산 환경 지원
2. **세션 지속성**: 데이터베이스에 세션 백업
3. **속도 제한**: API 요청 속도 제한 (Rate Limiting)
4. **모니터링**: SSE 연결 모니터링 및 재연결 로직
5. **보안**: API Key 암호화 저장

### 성능 최적화

- **스트리밍**: 실시간 응답으로 대기 시간 최소화
- **연결 풀링**: HTTP 연결 재사용
- **캐싱**: 반복 요청에 대한 응답 캐싱 (선택 사항)
- **압축**: 텍스트 압축으로 전송 크기 감소

## 보안 고려사항 (Security Considerations)

1. **API Key 보호**: API Key를 클라이언트에 노출하지 않기
2. **입력 검증**: 모든 사용자 입력을 검증하고 sanitize
3. **CORS 설정**: 신뢰할 수 있는 출처만 허용
4. **속도 제한**: 무한 루프 및 DoS 공격 방지
5. **콘텐츠 필터링**: Gemini의 안전 필터 사용

## 문제 해결 (Troubleshooting)

### 일반적인 문제

1. **API Key 오류**
   - `.env` 파일에 `GEMINI_API_KEY`가 있는지 확인
   - API Key가 유효한지 확인

2. **SSE 연결 끊김**
   - 네트워크 연결 확인
   - 프록시 설정 확인
   - 타임아웃 설정 확인

3. **세션 유지 안됨**
   - 세션 ID가 올바르게 전달되는지 확인
   - 세션 타임아웃 설정 확인

## 추가 리소스 (Additional Resources)

- [Gemini API 공식 문서](https://ai.google.dev/docs)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Express.js 가이드](https://expressjs.com/en/guide/routing.html)

## 라이선스 (License)

이 프로젝트는 ISC 라이선스 하에 배포됩니다.

## 지원 (Support)

문제가 있거나 기능 요청이 있으면 이슈를 생성하세요.
