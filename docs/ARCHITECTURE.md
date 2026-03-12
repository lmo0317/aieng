# Trend Eng - 맞춤형 트렌드 AI 음성 대화 시스템 아키텍처

## 시스템 구조도

```
┌─────────────────────────────────────────────────────────────────┐
│                     Trend Eng 사용자 브라우저                       │
│                                                                   │
│  ┌──────────────┐         ┌──────────────────┐                  │
│  │ 플로팅 버튼   │ ──────▶ │  채팅 모달 UI     │                  │
│  │ (FAB)        │         │  - 메시지 영역     │                  │
│  └──────────────┘         │  - 입력 영역       │                  │
│                           │  - 상태 표시       │                  │
│                           └────────┬─────────┘                  │
│                                    │                            │
│                           ┌────────▼─────────┐                  │
│                           │   chat.js         │                  │
│                           │  - UI 제어        │                  │
│                           │  - 상태 관리      │                  │
│                           └────────┬─────────┘                  │
│                                    │                            │
│           ┌────────────────────────┼────────────────┐           │
│           │                        │                │           │
│  ┌────────▼─────────┐    ┌────────▼────────┐  ┌───▼────────┐   │
│  │  SpeechRecognition│   │SpeechSynthesis  │  │ Fetch API  │   │
│  │  (음성 인식)      │   │ (음성 합성)      │  │ (HTTP/SSE) │   │
│  │                   │   │                 │  │            │   │
│  │  - 마이크 입력    │   │  - 텍스트→음성   │  │ - /api/chat│   │
│  │  - STT 변환      │   │  - 스피커 출력   │  │ - SSE 스트림│   │
│  └───────────────────┘   └──────────────────┘  └────┬───────┘   │
│           │                        │                │           │
└───────────┼────────────────────────┼────────────────┼───────────┘
            │                        │                │
            │ Web Speech API         │                │
            │                        │                │
            ▼                        ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         백엔드 서버                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Express.js 서버                        │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │            POST /api/chat 엔드포인트               │  │   │
│  │  │                                                     │  │   │
│  │  │  1. 요청 파싱 (message, history)                   │  │   │
│  │  │  2. AI 모델 호출                                  │  │   │
│  │  │  3. 스트리밍 응답 (SSE)                           │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                           │                               │   │
│  │                           ▼                               │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │              AI 모델 (Gemini Pro)                  │  │   │
│  │  │                                                     │  │   │
│  │  │  - 대화 컨텍스트 관리                             │  │   │
│  │  │  - 자연어 이능 및 생성                            │  │   │
│  │  │  - 스트리밍 응답 지원                             │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## 데이터 흐름

### 음성 입력 흐름

```
사용자 발화
    │
    ▼
[마이크] ──▶ SpeechRecognition
                  │
                  ▼
            텍스트 변환
                  │
                  ▼
        자동 메시지 전송
                  │
                  ▼
            [chat.js]
                  │
                  ▼
          Fetch API 호출
                  │
                  ▼
         POST /api/chat
                  │
                  ▼
          [백엔드 서버]
                  │
                  ▼
            AI 모델 처리
                  │
                  ▼
          SSE 스트리밍 응답
                  │
                  ▼
           실시간 메시지 표시
                  │
                  ▼
        SpeechSynthesis 음성 출력
                  │
                  ▼
            [스피커] ──▶ 사용자
```

### 텍스트 입력 흐름

```
사용자 입력
    │
    ▼
[입력창] ──▶ [Enter/전송 버튼]
                  │
                  ▼
         sendMessage(text)
                  │
                  ▼
          UI 메시지 추가
                  │
                  ▼
          Fetch API 호출
                  │
                  ▼
         POST /api/chat
                  │
                  ▼
          AI 응답 스트리밍
                  │
                  ▼
         실시간 텍스트 표시
                  │
                  ▼
         자동 음성 재생
```

## 상태 관리

```javascript
ChatState {
    isModalOpen: boolean,      // 모달 표시 상태
    isRecording: boolean,      // 음성 녹음 중
    isSpeaking: boolean,       // 음성 재생 중
    isProcessing: boolean,     // AI 처리 중
    messages: Array<{          // 대화 히스토리
        role: 'user' | 'assistant',
        content: string
    }>,
    recognition: SpeechRecognition | null,
    synthesis: SpeechSynthesis | null,
    currentUtterance: SpeechSynthesisUtterance | null
}
```

## 컴포넌트 구조

```
index.html
    │
    ├─── AI Chat Button (FAB)
    │        │
    │        └─── click ──▶ openChatModal()
    │
    └─── Chat Modal
             │
             ├─── Header
             │      ├─── Title: "AI 음성 대화"
             │      └─── Close Button
             │
             ├─── Messages Area
             │      ├─── Welcome Message
             │      ├─── User Messages (right-aligned)
             │      ├─── AI Messages (left-aligned)
             │      └─── Typing Indicator
             │
             └─── Input Area
                    ├─── Status Indicator
                    ├─── Text Input
                    ├─── Mic Button ──▶ startVoiceRecognition()
                    └─── Send Button ──▶ sendMessage()
```

## API 인터페이스

### 요청 형식

```http
POST /api/chat
Content-Type: application/json

{
    "message": "안녕하세요",
    "history": [
        {
            "role": "user",
            "content": "이전 메시지"
        },
        {
            "role": "assistant",
            "content": "이전 응답"
        }
    ]
}
```

### 응답 형식 (SSE)

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"content": "안", "done": false}
data: {"content": "녕", "done": false}
data: {"content": "하", "done": false}
data: {"content": "세", "done": false}
data: {"content": "요", "done": false}
data: {"content": "!", "done": false}
data: {"done": true}
```

## 보안 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                   보안 계층                              │
│                                                           │
│  1. HTTPS 암호화                                         │
│     ├─── 전송 데이터 암호화                              │
│     └─── 음성 데이터 보호                                │
│                                                           │
│  2. 인증/인가                                            │
│     ├─── 세션 기반 인증                                  │
│     ├─── 사용자별 대화 기록 격리                         │
│     └─── API 토큰 검증                                  │
│                                                           │
│  3. 입력 검증                                             │
│     ├─── 메시지 길이 제한                                │
│     ├─── XSS 방지                                        │
│     └─── SQL Injection 방지                              │
│                                                           │
│  4. Rate Limiting                                        │
│     ├─── 요청 빈도 제한                                  │
│     └─── DDoS 방지                                       │
│                                                           │
│  5. 데이터 프라이버시                                     │
│     ├─── 음성 데이터 로컬 처리                           │
│     ├─── 민감 정보 로깅 제외                             │
│     └─── 대화 기록 암호화 저장                           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 성능 최적화 전략

### 프론트엔드

1. **코드 분할**
   - chat.js 별도 로딩
   - Web Speech API 지연 초기화

2. **메모리 관리**
   - 메시지 히스토리 최근 10개만 유지
   - 이벤트 리스너 적정 제거

3. **렌더링 최적화**
   - 가상 스크롤 (대용량 메시지)
   - 애니메이션 GPU 가속

4. **네트워크 최적화**
   - SSE 스트리밍으로 실시간 업데이트
   - 요청 디바운싱

### 백엔드

1. **AI 모델 최적화**
   - 스트리밍 응답으로 대기 시간 최소화
   - 캐싱 계층 도입

2. **연결 관리**
   - SSE 연결 풀링
   - 타임아웃 처리

3. **확장성**
   - 무상태 엔드포인트
   - 수평 스케일링 가능

## 브라우저 호환성 매트릭스

| 기능 | Chrome | Edge | Safari | Firefox |
|------|--------|------|--------|---------|
| 음성 인식 | ✅ 25+ | ✅ 79+ | ⚠️ 14.5+ | ❌ |
| 음성 합성 | ✅ 33+ | ✅ 14+ | ✅ 7+ | ✅ 49+ |
| SSE | ✅ 6+ | ✅ 10+ | ✅ 5+ | ✅ 6+ |
| Fetch API | ✅ 42+ | ✅ 14+ | ✅ 10.1+ | ✅ 39+ |

## 확장 가능성

### 1. 다국어 지원
```javascript
recognition.lang = 'en-US'; // 영어
recognition.lang = 'ja-JP'; // 일본어
```

### 2. 음성 커스터마이징
```javascript
utterance.rate = 1.2;   // 속도
utterance.pitch = 0.8;  // 피치
utterance.volume = 0.5; // 볼륨
```

### 3. PWA 변환
```javascript
// Service Worker로 오프라인 지원
// 설치 가능한 앱으로 변환
```

### 4. 다중 AI 모델
```javascript
// OpenAI, Claude, Gemini 등
// 모델별 엔드포인트 구현
```

---

**아키텍처 버전:** 1.0.0
**마지막 업데이트:** 2026-03-07
