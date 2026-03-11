# Trend Eng CLI 도구

Trend Eng 웹 애플리케이션의 CLI 인터페이스로, 웹과 **완전 동일한 기능**을 제공합니다.

## 특징

✅ **웹과 완전 동일**: 웹의 "실시간 뉴스 트렌드 수집" 버튼과 동일한 API 사용
✅ **토큰 절약**: LLM 컨텍스트가 아닌 DB에 저장하여 토큰 효율적
✅ **자동화**: cron, GitHub Actions 등에서 사용 가능
✅ **실시간 모니터링**: 진행 상황을 CLI에서 실시간 확인

## 설치

```bash
# 이미 설치된 경우 생략
npm install
```

## 사용법

### 1. 뉴스 트렌드 수집

웹의 "🔍 실시간 뉴스 트렌드 수집 시작" 버튼과 완전 동일합니다.

```bash
# npm 스크립트 사용
npm run fetch-trends

# 또는 직접 실행
node cli-fetch-trends.js
```

**실행 예시:**
```
🔍 실시간 뉴스 트렌드 수집 시작...

📡 뉴스 트렌드 수집 중...
🤖 뉴스 요약 분석 중... (1/10) [10%]
🤖 뉴스 요약 분석 중... (2/10) [20%]
...
✍️  학습 콘텐츠 생성 중... (1/10) [65%]
...
✅ 트렌드가 성공적으로 DB에 저장되었습니다!
✨ 트렌드가 성공적으로 DB에 저장되었습니다!
📊 웹 대시보드에서 확인하세요: http://localhost:3000/data.html
```

### 2. 팝송 가사 저장

웹의 "💾 팝송 저장 및 AI 분석 시작" 버튼과 완전 동일합니다.

```bash
node cli-fetch-trends.js --song "곡 제목" "가사 내용" "난이도"
```

**예시:**
```bash
node cli-fetch-trends.js --song "Bruno Mars - Die With A Smile" "I've been knowing you for a while..." "level3"
```

**난이도 옵션:** `level1`, `level2`, `level3`, `level4`, `level5`

### 3. 도움말

```bash
node cli-fetch-trends.js --help
```

## API 엔드포인트

CLI 도구는 웹과 동일한 API 엔드포인트를 사용합니다:

### 뉴스 트렌드 수집
- **POST** `/api/trends/fetch` - 트렌드 수집 시작
- **SSE** `/api/trends/events` - 진행 상황 실시간 수신

### 팝송 저장
- **POST** `/api/songs/fetch` - 팝송 저장 및 AI 분석

## 자동화 예시

### cron을 이용한 매일 자동 수집

```bash
# crontab -e
# 매일 오전 9시에 뉴스 트렌드 수집
0 9 * * * cd /path/to/trend-eng && npm run fetch-trends
```

### GitHub Actions 예시

```yaml
name: Fetch Daily Trends
on:
  schedule:
    - cron: '0 0 * * *'  # 매일 자정
jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run fetch-trends
```

## 웹과의 동일성 보장

| 항목 | 웹 인터페이스 | CLI 도구 |
|------|--------------|----------|
| API 엔드포인트 | POST /api/trends/fetch | 동일 |
| 데이터 소스 | Google News RSS | 동일 |
| AI 분석 | Gemini/Groq API | 동일 |
| DB 저장 | SQLite | 동일 |
| 진행 모니터링 | SSE | 동일 |
| 결과 | 완전 동일 | 완전 동일 |

## 문제 해결

### 서버 연결 실패
```
❌ 서버 연결 실패: 서버가 실행 중인지 확인하세요.
```

**해결:** 서버를 먼저 시작하세요
```bash
npm start
# 또는
node server.js
```

### API Key 미설정
```
❌ API 오류: Gemini API Key가 설정되지 않았습니다.
```

**해결:** 웹 설정 페이지(http://localhost:3000/settings.html)에서 API Key를 설정하세요.

## 프로젝트 구조

```
trend-eng/
├── cli-fetch-trends.js      # CLI 도구 (본 파일)
├── server.js                 # 서버 (API 제공)
├── data.html                 # 웹 인터페이스
├── database.sqlite           # DB
└── .claude/skills/           # Claude 스킬
    └── moai-trend-eng-cli.md
```

## MoAI 스킬 연동

Claude Code에서 다음과 같이 사용할 수 있습니다:

```
fetch trends
save song "Bruno Mars - Die With A Smile" <lyrics> level3
```

## 라이선스

ISC
