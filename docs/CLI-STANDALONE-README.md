# Claude Code CLI 뉴스 트렌드 수집기

Trend Eng 프로젝트를 위한 **Claude Code CLI 전용** 뉴스 트렌드 수집기입니다.

## 핵심 특징

✅ **Claude Code CLI가 직접 처리**: RSS 수집부터 AI 분석까지 Claude Code가 직접
✅ **LLM API 직접 호출**: 서버를 거치지 않고 Claude Code가 Gemini/Groq API 직접 호출
✅ **토큰 효율성**: LLM 응답을 DB에 저장하여 토큰 절약
✅ **서버는 DB 저장만**: 서버는 단순히 분석된 데이터를 DB에 저장만 담당

## 아키텍처

```
┌───────────────────────────────┐
│   Claude Code CLI (본 스크립트)  │
│  ┌──────────────────────────┐  │
│  │ 1. RSS 수집               │  │
│  │ 2. LLM API 직접 호출      │  │
│  │ 3. 분석 및 문장 생성       │  │
│  └──────────────────────────┘  │
└───────────┬───────────────────┘
            │
            │ POST /api/trends/save
            │ (분석된 데이터만 전송)
            ▼
┌───────────────────────────────┐
│          서버 (DB 저장만)       │
│  ┌──────────────────────────┐  │
│  │ SQLite DB에 저장          │  │
│  └──────────────────────────┘  │
└───────────────────────────────┘
```

## 설치

```bash
npm install
```

## 사용법

> **전제 조건**: 웹 서버(`server.js`)가 이미 실행 중이어야 합니다.

### Claude Code CLI에서 실행

```bash
# npm 스크립트
npm run fetch-trends:standalone

# 또는 직접 실행
node fetch-trends-standalone.js
```

### 3. Claude Code 스킬로 실행

Claude Code 대화창에서:

```
뉴스 트렌드 수집해줘
```

## 실행 예시

```
========================================
  Claude Code CLI 뉴스 트렌드 수집기
========================================

📡 Google News RSS 수집 중...
✅ 10개 뉴스 수집 완료

🤖 AI 뉴스 분석 시작...
   (1/10) AI 기술 혁신 가속화...
   (2/10) 미국 대선 결과...
   ...

✍️  학습 문장 생성 시작...
   (1/10) 10개 문장 생성 완료
   (2/10) 10개 문장 생성 완료
   ...

💾 서버 DB에 저장 중...
✅ 10개 트렌드 저장 완료!

📊 웹 대시보드에서 확인하세요: http://localhost:3000/data.html

✨ 모든 작업 완료!
```

## 데이터 흐름

### 1. 뉴스 수집
- Google News RSS에서 5개 카테고리 수집
- 중복 제거 후 상위 10개 선정

### 2. AI 분석 (Claude Code 직접)
- Gemini API로 각 뉴스 분석
- 요약과 키워드 추출

### 3. 학습 문장 생성 (Claude Code 직접)
- 각 뉴스당 10개 영어 학습 문장 생성
- 한국어 번역 및 어휘 포함

### 4. DB 저장 (서버 API)
- 분석 완료된 데이터를 `/api/trends/save`로 전송
- SQLite DB에 영구 저장

## API 엔드포인트

### POST /api/trends/save
Claude Code CLI가 분석한 트렌드 데이터를 받아 DB에 저장합니다.

**Request:**
```json
{
  "trends": [
    {
      "title": "AI 기술 혁신",
      "category": "테크",
      "summary": "인공지능 기술이...",
      "keywords": ["AI", "기술", "혁신"],
      "sentences": [
        {
          "en": "AI technology is advancing rapidly.",
          "ko": "AI 기술이 빠르게 발전하고 있습니다.",
          "voca": ["advancing", "rapidly"]
        }
      ],
      "difficulty": "level3"
    }
  ]
}
```

## 설정

### .env 파일

```env
GEMINI_API_KEY=your_gemini_api_key_here
GLM_API_KEY=your_glm_api_key_here
PORT=80
```

### 지원하는 LLM

- **Gemini**: gemini-2.0-flash-exp (기본값)
- **GLM**: zhipuai (선택 가능)

## 웹과의 차이점

| 항목 | 웹 인터페이스 | Claude Code CLI |
|------|--------------|-----------------|
| RSS 수집 | 서버 | Claude Code |
| LLM API 호출 | 서버 | **Claude Code 직접** |
| 분석 처리 | 서버 | **Claude Code** |
| DB 저장 | 서버가 직접 | 서버 API로 요청 |
| 결과 | 동일 | **완전 동일** |

## 자동화

### cron을 이용한 정기 실행

```bash
# crontab -e
# 매일 오전 9시에 뉴스 트렌드 수집
0 9 * * * cd /path/to/trend-eng && npm run fetch-trends:standalone
```

### GitHub Actions

```yaml
name: Fetch Daily Trends
on:
  schedule:
    - cron: '0 0 * * *'
jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run fetch-trends:standalone
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

## 파일 구조

```
trend-eng/
├── fetch-trends-standalone.js   # 본 스크립트
├── server.js                     # DB 저장 API 서버
├── database.sqlite               # DB
├── .env                          # API 키 설정
└── .claude/skills/
    └── fetch-news-trends.md      # Claude Code 스킬
```

## 문제 해결

### 서버 연결 실패
```
❌ 서버 연결 실패: 서버가 실행 중인지 확인하세요
```

**해결:** 서버를 먼저 시작하세요
```bash
npm start
```

### API 키 미설정
```
❌ GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다
```

**해결:** `.env` 파일에 API 키를 설정하세요

## 라이선스

ISC
