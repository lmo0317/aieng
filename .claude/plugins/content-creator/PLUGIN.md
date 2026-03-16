---
name: content-creator
description: >
  🎨 컨텐츠 제작자 플러그인 - 뉴스, 팝송, 유튜브, 팟캐스트 등 다양한 소스에서
  고품질 영어 학습 콘텐츠를 생성하는 전문 Agent 시스템입니다.
license: Apache-2.0
compatibility: Trend Eng project
version: "1.0.0"
metadata:
  category: "content-creation"
  status: "active"
  updated: "2026-03-16"
  tags: "english-learning, news, popsong, multi-agent"

# Plugin Info
commands:
  - news: 뉴스 기반 영어 학습 콘텐츠 생성
  - popsong: 팝송 가사 기반 영어 학습 콘텐츠 생성
  - youtube: 유튜브 영상 기반 영어 학습 콘텐츠 생성 ( coming soon)
  - podcast: 팟캐스트 기반 영어 학습 콘텐츠 생성 ( coming soon)

agents:
  shared:
    - content-generator: 콘텐츠 생성 (영어 문장)
    - english-tutor: 영어 교육 (번역, 문법)
    - quiz-maker: 퀴즈 생성 (복습 문제)
    - qa-reviewer: 품질 검수 (TRUST 5)
    - tech-implementer: 기술 구현 (JSON, DB)
  specialized:
    - news-collector: 뉴스 수집 (RSS)
    - song-lyrics-analyst: 가사 분석
---

# 🎨 Content Creator Plugin

다양한 소스에서 고품질 영어 학습 콘텐츠를 생성하는 전문 Agent 시스템입니다.

## 🚀 사용 가능한 명령어

### /news
Google News 트렌딩에서 뉴스를 수집하고 영어 학습 콘텐츠를 생성합니다.

### /popsong
팝송 가사를 분석하여 영어 학습 콘텐츠를 생성합니다.

## 🤖 Agent 구조

### 공통 Agent (모든 명령어 사용)
- **content-generator**: 영어 학습 문장 생성
- **english-tutor**: 번역, 문법 분석, 1타 강사 스타일 설명
- **quiz-maker**: 어휘 복습 퀴즈 생성
- **qa-reviewer**: TRUST 5 품질 기준 검증
- **tech-implementer**: JSON 저장 및 서버 DB 반영

### 전용 Agent (특정 명령어만 사용)
- **news-collector**: 뉴스 RSS 수집, XML 파싱
- **song-lyrics-analyst**: 팝송 가사 분석, 주제 추출

## 🔄 워크플로우

```
사용자 명령 (/news, /popsong)
  ↓
[1] 데이터 소스 전용 Agent
   - news-collector 또는 song-lyrics-analyst
  ↓
[2] content-generator
   - 학습 문장 10개 생성
  ↓
[3] english-tutor
   - 번역, 문법 분석, 어휘 정리
  ↓
[4] quiz-maker
   - 복습 퀴즈 10개 생성
  ↓
[5] qa-reviewer
   - TRUST 5 품질 검증
  ↓
[6] tech-implementer
   - JSON 저장, DB 반영
  ↓
✅ 완료
```

## 📊 출력 형식

모든 명령어는 동일한 JSON 형식으로 출력:

```json
{
  "title": "컨텐츠 제목",
  "type": "news|popsong|youtube|podcast",
  "content": [
    {
      "source_title": "소스 제목",
      "category": "카테고리",
      "sentences": [...],     // 10개 학습 문장
      "quiz": [...]           // 10개 퀴즈
    }
  ]
}
```

## 🎯 품질 기준 (TRUST 5)

**Testable**: JSON 파싱 100% 성공
**Readable**: 자연스러운 한국어 번역
**Understandable**: Level3 난이도 부합
**Secured**: JSON escape 올바름, 한자 미포함
**Trackable**: 에러 추적 가능

## 📈 확장 로드맵

- [x] **news**: Google News 트렌딩
- [x] **popsong**: 팝송 가사 분석
- [ ] **youtube**: 유튜브 자막 활용
- [ ] **podcast**: 팟캐스트 스크립트 활용
- [ ] **article**: 뉴스 article 전문 활용
