---
name: news
description: >
  5전문 Agent 기반 뉴스 영어 학습 콘텐츠 생성 시스템. Google News RSS에서 트렌딩 뉴스를 수집하고,
  뉴스 수집, 콘텐츠 생성, 영어 교육, 품질 검수, 기술 구현 단계를 거쳐
  JSON 파일과 서버 DB로 학습 데이터를 저장합니다.
license: Apache-2.0
compatibility: Trend Eng project (D:\work\dev\web\aieng)
allowed-tools: Bash Read Edit Write Grep Glob Task
user-invocable: true
metadata:
  version: "3.0.0"
  category: "tool"
  status: "active"
  updated: "2026-03-14"
  tags: "trend-eng, news-trends, multi-agent, llm, rss, json, api"
  aliases: "fetch-news-trends"
  argument-hint: "Execute without arguments to run 5-agent news learning content generation pipeline"

# MoAI Extension: Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 150
  level2_tokens: 5000

# MoAI Extension: Triggers
triggers:
  keywords: ["뉴스 트렌드", "뉴스 수집", "트렌드 분석", "news trends", "fetch trends", "영어 학습"]
  agents: []
  phases: ["run"]
---

# News - 5전문 Agent 기반 영어 학습 콘텐츠 생성

Google News 트렌딩 뉴스를 기반으로 1타 강자 스타일 영어 학습 콘텐츠를 생성합니다.

## 5전문 Agent 파이프라인

### [1] news-collector (뉴스 수집 전문가)
**역할**: Google News RSS 가져오기, XML 파싱, 카테고리 분류

**담당 업무**:
- Bash curl로 RSS 피드 직접 요청 (API 미사용)
- XML 파싱으로 뉴스 아이템 추출
- 5개 카테고리 분류 (정치, 연애, 스포츠, 테크, 금융)
- 중복 제거 및 데이터 검증
- Top 10 트렌딩 뉴스 선정

**출력**: 10개 뉴스 객체 (title, titleKorean, link, description, category, pubDate)

---

### [2] content-generator (콘텐츠 생성자)
**역할**: 뉴스 기반 영어 학습 문장 10개 생성

**담당 업무**:
- 뉴스 기사 핵심 주제 분석
- Level3 (중상급) 난이도 영어 문장 생성
- 비즈니스 영어 적절성 확보
- 문법 다양성 (현재완료, 수동태, 조동사, 복문)
- 자연스러운 뉴스 스타일 영어 표현

**출력**: 기사당 10개 영어 문장 (difficulty: level3)

---

### [3] english-tutor (영어 선생님)
**역할**: 번역, 문법 해석, 어휘 정리

**담당 업무**:
- 영어 문장 → 자연스러운 한국어 번역
- 문장 구조 분석 (S/V/O/SC/OC/IO 태그)
- 문법 포인트 상세 설명 (시제, 단어 뉘앙스)
- 핵심 어휘 추출 및 정의
- 1타 강자 스타일 교육적 설명

**출력**: 완성된 학습 콘텐츠 (english, korean, analysis, explanation, vocabulary)

**주의사항**:
- ✅ Single Quote(`'`)만 사용
- ❌ Double Quote(`"`) 절대 사용 금지 (JSON 에러)
- ❌ 한자(한자, 中字 등) 절대 사용 금지
- ❌ Emoji 절대 사용 금지

---

### [4] qa-reviewer (품질 검수관)
**역할**: TRUST 5 품질 기준 검증

**담당 업무**:
- JSON 구조 무결성 검증
- TRUST 5 품질 기준 확인 (Testable, Readable, Understandable, Secured, Trackable)
- 한자 탐지 (HARD RULE: 1개라도 발견 시 rejected)
- 한국어 번역 품질 검증
- 어휘 적절성 및 정확성 확인
- 문장 구조 분석 정확성 검증

**출력**: 검증된 콘텐츠 OR 에러 리포트

---

### [5] tech-implementer (기술 구현가)
**역할**: JSON 저장 및 서버 DB 반영

**담당 업무**:
- 콘텐츠를 JSON 형식으로 변환 및 escape 처리
- C:\Users\lmo03\Downloads\news_guide.json 파일 저장
- JSON 파싱 검증 (read-back test)
- 서버 API (/api/trends/save) 호출로 DB 반영
- 임시 파일 정리

**출력**: 저장된 JSON 파일 + 서버 DB 반영 확인

---

## 실행 흐름

```
[1] news-collector
   Google News RSS → XML 파싱 → 10개 뉴스 추출
   ↓
[2] content-generator (뉴스별 순차 처리)
   뉴스 분석 → 10개 영어 문장 생성 (Level3)
   ↓
[3] english-tutor (문장별 순차 처리)
   번역 + 문법 분석 + 어휘 정리 → 완성된 학습 콘텐츠
   ↓
[4] qa-reviewer (최종 검증)
   TRUST 5 검증 + 한자 체크 → 검증된 콘텐츠
   ↓
[5] tech-implementer
   JSON 변환 → 파일 저장 → 서버 DB 반영 → 완료
```

## 사용법

Claude Code에서 다음과 같이 실행합니다:

```
뉴스 트렌드 수집해줘
```

또는

```
/news
```

## 출력 결과

### 1. JSON 파일 저장
**경로**: `C:\Users\lmo03\Downloads\news_guide.json`

**구조**:
```json
{
  "title": "뉴스 기반 영어 학습 가이드 (10개 기사 통합)",
  "content": [
    {
      "news_title": "이란 전쟁 소식: 실시간 업데이트",
      "category": "정치",
      "sentences": [
        {
          "english": "Oil prices have surged following recent attacks on shipping vessels.",
          "korean": "최근 선박 공격 이후 유가가 급등했습니다.",
          "analysis": "S(Oil prices: 주어) + V(have surged: 현재완료 동사) + Prep Phrase(following recent attacks: 전치사구)",
          "explanation": "현재완료 시제를 사용합니다. 현재완료는 '과거에 시작된 행동이 현재까지 영향을 미치고 있음'을 나타냅니다.",
          "vocabulary": "surge: 급등하다, following: ~에 따른"
        }
        // ... 총 10개 문장
      ]
    }
    // ... 총 10개 기사
  ]
}
```

### 2. 서버 DB 반영
**API**: `POST /api/trends/save`
- JSON 파일 내용을 서버 DB에 저장
- trends 테이블에 기사별 저장
- 학습 history 자동 생성

## 카테고리별 분포 가이드라인

총 10개 트렌드에 대해 균등 분포:
- **정치**: 2개
- **연애**: 2개
- **스포츠**: 2개
- **테크**: 2개
- **금융**: 2개

## 난이도 설정

**Level3 (중상급)**:
- 시제: 현재완료, 미래, 수동태
- 어휘: 비즈니스 중급 3000단어
- 문장 길이: 15-20단어
- 복문 접속사: because, when, if

## 품질 기준 (TRUST 5)

**Testable**: JSON 파싱 100% 성공, 모든 필수 필드 존재
**Readable**: 자연스러운 한국어 번역, 명확한 설명
**Understandable**: Level3 난이도 부합, 문맥 일관성
**Secured**: JSON escape 올바름, 한자 미포함
**Trackable**: 에러 추적 가능, 검증 로그 존재

## 뉴스 소스

**RSS URL**: `https://news.google.com/rss`
- Bash curl로 직접 요청 (API 미사용)
- 최신 트렌딩 뉴스 자동 수집
- 5개 카테고리로 자동 분류

## Agent 전문 분야

| Agent | 전문 분야 | 주요 도구 |
|-------|-----------|----------|
| news-collector | RSS 파싱, 데이터 수집 | Bash, Grep, Glob |
| content-generator | 영어 콘텐츠 생성 | Read, Write |
| english-tutor | 영어 교육, 번역 | Read, Write |
| qa-reviewer | 품질 검증, TRUST 5 | Read, Grep |
| tech-implementer | JSON, API, 파일 I/O | Bash, Write, Read |

## 참고

- 각 Agent는 독립적인 전문 영역을 담당
- Agent 간 데이터 전달은 구조화된 JSON 형식
- 실패 시 에러 로그와 복구 제안 제공
- 진행 상황은 실시간으로 표시됩니다
