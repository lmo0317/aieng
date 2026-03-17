---
name: news
description: >
  [1타 강사 가이드] 전문 Agent 기반 뉴스 영어 학습 콘텐츠 생성기.
  6개 전문 Agent가 협력하여 뉴스 수집, 번역, 설명, 어휘, 퀴즈, 검수, 저장을 수행합니다.
license: Apache-2.0
compatibility: Trend Eng project
allowed-tools: Bash Read Write Edit Grep Glob Agent
user-invocable: true
metadata:
  version: "4.0.0"
  category: "workflow"
  status: "active"
  updated: "2026-03-16"
  tags: "news, english-learning, multi-agent, 1타-강사"
  aliases: "fetch-news, news-trends"

# Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 150
  level2_tokens: 5000

# Triggers
triggers:
  keywords: ["뉴스", "news", "영어 학습", "트렌드", "trends"]
  agents: []
  phases: ["run"]
---

# 🚀 News Learning - Agent 기반 파이프라인

6개 전문 Agent가 협력하여 고품질 뉴스 영어 학습 콘텐츠를 생성합니다.

## 🤖 Agent 파이프라인

### Phase 1: 데이터 초기화 (선택)
**Agent**: tech-implementer
- 오늘 날짜의 기존 뉴스 데이터 삭제
- DB 정리 및 환경 설정

### Phase 2: 뉴스 수집
**Agent**: news-collector
- Google News RSS를 Bash curl로 직접 요청
- XML 파싱으로 트렌딩 뉴스 추출
- 카테고리 분류 (정치, 연애, 스포츠, 테크, 금융)
- 중복 제거 및 데이터 검증

**출력**: 10개 뉴스 객체 (title, category, link, description, pubDate)

### Phase 3: 콘텐츠 생성
**Agent**: content-generator
- 뉴스 기사 핵심 주제 분석
- Level3 (중상급) 난이도 영어 문장 10개 생성
- 비즈니스 영어 적절성 확보
- 문법 다양성 (현재완료, 수동태, 조동사, 복문)

**출력**: 기사당 10개 영어 문장

### Phase 4: 영어 교육
**Agent**: english-tutor
- 영어 문장 → 자연스러운 한국어 번역
- 문장 구조 분석 (S/V/O/SC/OC/IO 태그 + 한글 명칭)
- 1타 강사 스타일 문법/뉘앙스 설명 (최소 3문장)
- 핵심 어휘 추출 및 정의

**출력**: 완성된 학습 콘텐츠 (en, ko, sentence_structure, explanation, voca)

### Phase 5: 퀴즈 생성
**Agent**: quiz-maker
- 학습한 어휘로 10개 복습 퀴즈 생성
- 4지선다형 + 빈칸채우기 혼합
- 어휘 확인 및 학습 강화

**출력**: 10개 퀴즈 (type, word, question, options, answer)

### Phase 6: 품질 검수
**Agent**: qa-reviewer
- TRUST 5 품질 기준 검증
- 한자 탐지 (HARD RULE: 1개라도 발견 시 rejected)
- JSON 구조 무결성 검증
- 한국어 번역 품질 검증

**출력**: 검증된 콘텐츠 OR 에러 리포트

### Phase 7: 기술 구현
**Agent**: tech-implementer
- 콘텐츠를 JSON 형식으로 변환
- output/ 디렉토리에 타임스탬프 파일로 저장
- 서버 API (/api/trends/save) 호출로 DB 반영
- 임시 파일 정리

**출력**: 저장된 JSON 파일 + 서버 DB 반영 확인

## 🛠️ 사용법

### 기본 실행
```
/news
```
→ 모든 Agent가 순차적으로 실행되어 10개 뉴스 학습 콘텐츠 생성

### 개수 지정
```
/news 3개 만들어줘
```
→ 3개 뉴스만 처리

### 삭제 후 생성
```
/news 삭제하고 5개 만들어줘
```
→ 기존 데이터 삭제 후 5개 생성

## 📊 출력 형식

### JSON 파일 구조
```json
{
  "title": "뉴스 기반 영어 학습 가이드 (N개 기사 통합)",
  "content": [
    {
      "news_title": "한글 제목",
      "category": "정치|연애|스포츠|테크|금융",
      "sentences": [
        {
          "en": "English sentence",
          "ko": "한국어 번역",
          "sentence_structure": "S(주어) + V(동사) + O(목적어)",
          "explanation": "1타 강사의 상세 설명 (3문장 이상)",
          "voca": ["word: meaning"]
        }
      ],
      "quiz": [
        {
          "type": "multiple_choice",
          "word": "apple",
          "question": "질문",
          "options": ["보기1", "보기2", "보기3", "보기4"],
          "answer": "정답"
        }
      ]
    }
  ]
}
```

## 📋 품질 기준 (TRUST 5)

**Testable**: JSON 파싱 100% 성공, 모든 필수 필드 존재
**Readable**: 자연스러운 한국어 번역, 명확한 설명
**Understandable**: Level3 난이도 부합, 문맥 일관성
**Secured**: JSON escape 올바름, 한자 미포함, **news_title/category 한글 필수**
**Trackable**: 에러 추적 가능, 검증 로그 존재

## 🎯 카테고리별 분포

총 10개 트렌드에 대해 균등 분포:
- **정치**: 2개
- **연애**: 2개
- **스포츠**: 2개
- **테크**: 2개
- **금융**: 2개

## ⚠️ 제약 사항

**한글 필수**:
- ✅ news_title: 반드시 한글로 작성
- ✅ category: 반드시 한글로 작성 (정치/연애/스포츠/테크/금융)
- ❌ 영어 제목/카테고리 절대 사용 금지

**JSON Escape**:
- ✅ Single Quote(`'`)만 사용
- ❌ Double Quote(`"`) 절대 사용 금지
- ❌ 한자 절대 사용 금지
- ❌ Emoji 절대 사용 금지

**난이도**: Level3 (중상급)
- 시제: 현재완료, 미래, 수동태
- 어휘: 비즈니스 중급 3000단어
- 문장 길이: 15-20단어
- 복문 접속사: because, when, if

## 🔄 실행 흐름

```
[1] tech-implementer (선택)
   오늘 데이터 삭제
   ↓
[2] news-collector
   RSS 수집 → 10개 뉴스 추출
   ↓
[3] content-generator (순차 처리)
   뉴스 분석 → 10개 문장 생성
   ↓
[4] english-tutor (문장별 처리)
   번역 + 문법 분석 + 어휘 정리
   ↓
[5] quiz-maker
   10개 퀴즈 생성
   ↓
[6] qa-reviewer
   TRUST 5 검증 + 한자 체크 + news_title/category 한글 확인
   ↓
[7] tech-implementer
   JSON 저장 + DB 반영
   ↓
✅ 완료
```
