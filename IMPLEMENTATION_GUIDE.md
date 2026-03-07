# AI 음성 대화 시스템 - 빠른 구현 가이드

## 🚀 5분 빠른 시작

### 1단계: 파일 확인

다음 파일들이 생성되었는지 확인하세요:

```
✅ index.html (수정됨)
✅ style.css (수정됨)
✅ chat.js (새 파일)
✅ CHAT_README.md (문서)
✅ chat-api-example.js (API 예제)
```

### 2단계: 백엔드 설정

기존 `server.js`에 `/api/chat` 엔드포인트를 추가하세요:

```javascript
// server.js
app.use(express.json());

// AI 챗봇 API
app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;

    // SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        // AI 응답 생성
        const response = await generateResponse(message, history);

        // 스트리밍 전송
        res.write(`data: ${JSON.stringify({ content: response, done: false })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
        res.end();
    }
});

async function generateResponse(message, history) {
    // AI 모델 호출 로직 구현
    return "AI 응답 메시지";
}
```

### 3단계: 서버 시작

```bash
npm start
# 또는
node server.js
```

### 4단계: 브라우저에서 테스트

1. `http://localhost:3000` 접속
2. 우측 하단 보라색 버튼 클릭
3. 채팅 시작!

## 🎨 커스터마이징

### 색상 변경

`style.css`에서 그라데이션 색상 수정:

```css
.ai-chat-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* 원하는 색상으로 변경 */
}
```

### 버튼 위치 변경

```css
.ai-chat-btn {
    bottom: 30px;    /* 하단 위치 */
    right: 30px;     /* 우측 위치 */
}
```

### 모달 크기 변경

```css
.chat-modal-container {
    max-width: 500px;  /* 원하는 너비 */
    height: 600px;     /* 원하는 높이 */
}
```

## 🔧 주요 함수 참조

### 음성 인식 시작
```javascript
startVoiceRecognition();  // chat.js
```

### 텍스트 음성 변환
```javascript
speakText("안녕하세요");  // chat.js
```

### 메시지 전송
```javascript
sendMessage("안녕!");  // chat.js
```

### 모달 제어
```javascript
openChatModal();   // 열기
closeChatModal();  // 닫기
```

## 🐛 일반적인 문제 해결

### 문제: 음성 인식이 작동하지 않음

**원인:** HTTPS가 아닌 환경
**해결:** 로컬 개발 시 `localhost` 사용 또는 HTTPS 설정

### 문제: 마이크 권한 거부

**해결:** 브라우저 설정 → 사이트 설정 → 마이크 권한 허용

### 문제: API 연결 실패

**확인:**
1. 서버가 실행 중인가?
2. `/api/chat` 엔드포인트가 구현되었는가?
3. CORS 설정이 올바른가?

### 문제: 음성이 안 들림

**해결:**
1. 볼륨 확인
2. 브라우저 오디오 권한 확인
3. 한국어 보이스 설치 확인

## 📱 모바일 테스트

### iOS Safari
1. 설정 → Safari → 마이크 권한 허용
2. HTTPS 연결 필수

### Android Chrome
1. 사이트 설정 → 마이크 권한 허용
2. Chrome 25+ 버전 필요

## 🔒 보안 체크리스트

- [ ] HTTPS 사용 (음성 인식 필수)
- [ ] API 인증 구현
- [ ] 입력값 검증
- [ ].rate limiting 적용
- [ ] 민감 정보 로깅 제외

## 📊 성능 모니터링

### 브라우저 개발자 도구

```javascript
// 콘솔에서 상태 확인
console.log(ChatState);

// 음성 인식 상태
console.log('녹음 중:', ChatState.isRecording);
console.log('말하는 중:', ChatState.isSpeaking);
```

### 네트워크 모니터링

1. 개발자 도구 → Network 탭
2. `/api/chat` 요청 확인
3. SSE 스트리밍 확인

## 🎯 다음 단계

1. **백엔드 연동:** `chat-api-example.js` 참조하여 AI 모델 통합
2. **사용자 인증:** 로그인 사용자별 대화 기록 저장
3. **대화 내보내기:** 텍스트 파일로 다운로드 기능
4. **테마 지원:** 다크 모드 추가
5. **PWA 변환:** 오프라인 지원

## 📞 도움말

자세한 문서: `CHAT_README.md`
API 예제: `chat-api-example.js`

---

**구현 완료!** 🎉

이제 AIEng 프로젝트에서 음성 대화 기능을 사용할 수 있습니다!
