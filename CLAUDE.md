# Trend Eng - AI 영어 학습 플랫폼

한국어 사용자 대상 트렌드 기반 영어 학습 서비스. 실시간 뉴스/팝송으로 학습 콘텐츠를 AI 자동 생성하며 토스 미니앱으로 배포.

---

## 기술 스택

**Backend**: Express.js, WebSocket (ws), SQLite3
**AI**: Google Gemini, Groq, GLM (Zhipu AI)
**Frontend**: Vanilla JS, Web Speech API, SSE
**DB**: SQLite3 (`db/database.sqlite`)
**배포**: Cafe24 (`git push cafe24 master`)

---

## 핵심 명령어

```bash
npm start                        # 서버 시작 (port 80)
npm run fetch-trends             # 뉴스 트렌드 수집 CLI
git push cafe24 master           # 운영 배포
```

---

## 프로젝트 구조

```
server/
  server.js       # Express 서버, WebSocket, API 엔드포인트
  database.js     # SQLite 스키마 및 자동 마이그레이션
public/
  index.html      # 트렌드 페이지
  songs.html      # 팝송 페이지
  puzzle.html     # 퍼즐 페이지
  learn.html      # 학습 페이지
  js/
    nav.js        # 공통 네비게이션, AI 고지 바텀시트
    trends.js     # 트렌드 목록 렌더링
    songs.js      # 팝송 목록 렌더링
    puzzle.js     # 퍼즐 목록 렌더링
    learn.js      # 학습 인터페이스
  style.css       # 전체 스타일
```

---

## AI 멀티 프로바이더

`getModelProvider()` 모델명 prefix로 자동 감지:
- `glm-*` → Zhipu GLM
- `llama-*`, `mixtral-*`, `gemma*`, `openai/*`, `moonshotai/*`, `qwen/*` → Groq
- 그 외 → Gemini

---

## 주요 API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | /api/trends/saved | 저장된 트렌드 목록 |
| GET | /api/songs/saved | 저장된 팝송 목록 |
| GET | /api/puzzles | 퍼즐 목록 |
| POST | /api/trends/fetch | 뉴스 트렌드 수집 (SSE) |
| POST | /api/songs/fetch | 팝송 분석 |
| POST | /api/generate | 학습 문장 생성 |
| GET | /api/settings | 설정 조회 |
| POST | /api/settings | 설정 저장 |
| WS | /ws/chat | AI 튜터 채팅 |

---

## DB 스키마

**global_settings** (id=1 단일 행)
geminiApiKey, glmApiKey, groqApiKey, geminiModel, chatModel, systemPrompt

**trends**
id, title, category, summary, keywords, sentences(JSON), difficulty, date, type(news/song), createdAt

**puzzles**
id(TEXT), title, category, difficulty, date, wordCount, source, data(JSON), createdAt

**learning_history**
id, topic, difficulty, sentences(JSON), quiz, createdAt

---

## 환경변수 (.env)

```
GEMINI_API_KEY=
GLM_API_KEY=
GROQ_API_KEY=
PORT=80
SESSION_SECRET=
```

---

## 토스 미니앱 정책 준수

- **AI 사전 고지**: 최초 1회 바텀시트 팝업 (`nav.js`, localStorage 저장)
- **AI 결과물 표시**: 각 콘텐츠 카드에 `AI 생성` 배지
- **로그인**: 토스 로그인만 허용 (소셜 로그인 불가)
- **결제**: 디지털 상품은 인앱결제만 사용

---

## 코드 컨벤션

- 비동기 함수 전체 try-catch
- DB 쿼리 파라미터화 (SQL injection 방지)
- API 응답: `{ success: true, data }` / `{ error: "CODE", message: "..." }`
- SSE 이벤트: fetching → analyzing → generating → complete

---

Version: 1.1.0
Last Updated: 2026-04-05
