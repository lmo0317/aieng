# AIEng - 영어 공부 웹 프로젝트 📚

좋아하는 주제를 입력하면 AI(GLM-4.7)가 맞춤형 영어 문장을 생성해 주고, 문장 구조 분석까지 제공하는 영어 학습 웹 애플리케이션입니다.

## 🚀 주요 기능

1. **주제 기반 학습**: 사용자가 입력한 관심 주제(예: 축구, 여행, 코딩 등)에 맞춰 학습 문장 생성.
2. **세분화된 난이도 조절**: 레벨 1(왕초보)부터 레벨 5(원어민 수준)까지 5단계로 세분화된 난이도 선택 가능.
3. **단계별 학습**: 하루 10개 문장을 하나씩 학습하며, '정답 및 분석 보기'를 통해 단계적 확인.
4. **상세 문장 분석**: 주어, 동사, 목적어, 관계사 등 문장 구조를 LLM이 상세히 분석하여 제공.
5. **실시간 API 사용량 확인**: `z.ai` 글로벌 API의 실시간 쿼터(Quota)를 화면 상단에서 바로 확인 가능.

## 🛠 기술 스택

- **Frontend**: HTML5, Vanilla CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **API**: Axios (Zhipu AI `z.ai` Global API 연동)
- **Model**: GLM-4.7 (Anthropic 호환 엔드포인트 사용)

## 📂 프로젝트 구조

```text
aieng/
├── server.js          # Express 서버 및 API 연동 로직
├── index.html         # 메인 UI 레이아웃
├── style.css          # 웹 디자인 및 반응형 스타일
├── app.js             # 프론트엔드 학습 로직 및 API 호출
├── .env               # API 키 및 환경 변수 설정
├── package.json       # 프로젝트 의존성 관리
└── docs/
    └── README.md      # 프로젝트 정리 문서 (현재 파일)
```

## 💡 주요 해결 과제 (Troubleshooting)

### 1. API 연동 방식 최적화
초기에는 Zhipu AI 전용 SDK 및 표준 엔드포인트를 시도했으나, 글로벌 결제 계정(`z.ai`)의 경우 **Anthropic 호환 엔드포인트**를 사용해야 정상적으로 크레딧이 인식되는 것을 확인하여 수정했습니다.
- **Endpoint**: `https://api.z.ai/api/anthropic/v1/messages`
- **Model**: `claude-3-5-sonnet-20240620` (Z.ai 글로벌 호환 모델명)

### 2. 실시간 사용량 표시
사용자가 남은 API 쿼터를 확인할 수 있도록 `monitor/usage/quota/limit` 엔드포인트를 연동했습니다. 배열 형태로 들어오는 `limits` 데이터를 파싱하여 화면 상단에 `사용량 / 한도` 형식으로 노출하도록 구현했습니다.

## 📝 실행 방법

1. **의존성 설치**:
   ```bash
   npm install
   ```
2. **API 키 설정**:
   `.env` 파일에 `GLM_API_KEY`를 입력합니다.
3. **서버 실행**:
   ```bash
   node server.js
   ```
4. **접속**: `http://localhost:3000`

---
*Last Updated: 2026-03-04*
