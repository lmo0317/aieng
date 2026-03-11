---
name: fetch-news-trends
description: >
  Claude Code CLI가 직접 Google News RSS에서 뉴스 트렌드를 수집하고 LLM API로 분석한 후,
  서버의 DB 저장 API(/api/trends/save)로 결과를 전송합니다. 웹과 완전 동일한 결과를 DB에 저장합니다.
license: Apache-2.0
compatibility: Trend Eng project (D:\work\dev\web\aieng)
allowed-tools: Bash Read Edit Write Grep Glob
user-invocable: true
metadata:
  version: "2.0.0"
  category: "tool"
  status: "active"
  updated: "2026-03-11"
  tags: "trend-eng, news-trends, llm, rss, api"
  argument-hint: "Execute without arguments to fetch and analyze news trends"

# MoAI Extension: Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 120
  level2_tokens: 4000

# MoAI Extension: Triggers
triggers:
  keywords: ["뉴스 트렌드", "뉴스 수집", "트렌드 분석", "news trends", "fetch trends"]
  agents: []
  phases: []
---

# Fetch News Trends

Claude Code CLI가 직접 뉴스 트렌드를 수집하고 분석하여 서버 DB에 저장합니다.

## 작업 흐름

1. **Google News RSS 수집**: 5개 카테고리에서 최신 뉴스 수집
2. **LLM 직접 호출**: Claude Code가 Gemini/Groq API로 각 뉴스 분석
3. **학습 콘텐츠 생성**: 영어 학습 문장 10개 생성
4. **서버 DB 저장**: `/api/trends/save` API로 결과 전송

## 사용법

Claude Code에서 다음과 같이 실행합니다:

```
뉴스 트렌드 수집해줘
```

## 실행 방식

이 스킬은 **서버를 통하지 않고 직접** LLM API를 호출합니다:

- ✅ Claude Code가 직접 RSS 파싱
- ✅ Claude Code가 직접 LLM API 호출
- ✅ Claude Code가 직접 결과 처리
- ✅ 최종 결과만 서버에 전송하여 DB 저장

## API 엔드포인트

### POST /api/trends/save
이미 분석된 트렌드 데이터를 DB에 저장합니다.

**Request:**
```json
{
  "trends": [
    {
      "title": "뉴스 제목",
      "category": "테크",
      "summary": "요약 내용",
      "keywords": ["키워드1", "키워드2"],
      "sentences": [
        {
          "en": "English sentence",
          "ko": "한국어 번역",
          "voca": ["vocabulary"]
        }
      ],
      "difficulty": "level3"
    }
  ]
}
```

## 뉴스 소스

- 전체: https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko
- 테크: https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko
- 스포츠: https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko
- 연애: https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko
- 정치: https://news.google.com/rss/headlines/section/topic/POLITICS?hl=ko&gl=KR&ceid=KR:ko

## 웹과의 동일성

| 항목 | 웹 | Claude Code CLI |
|------|----|----|
| 뉴스 소스 | Google News RSS | 동일 |
| LLM API | 서버가 호출 | Claude Code가 직접 호출 |
| 분석 로직 | 서버 처리 | Claude Code 처리 |
| DB 저장 | 서버가 직접 저장 | 서버 API로 저장 |
| 최종 결과 | 완전 동일 | 완전 동일 |

## 참고

- 서버는 DB 저장 전용 API만 제공합니다
- LLM API 키는 `.env` 파일에서 읽습니다
- 진행 상황은 실시간으로 표시됩니다
