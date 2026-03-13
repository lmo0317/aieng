---
name: fetch-news-trends
description: >
  🔥 1타 강자 스타일 영어 학습 콘텐츠 생성기! Google News 트렌드를 직접 가져와서 발음, 문법, 비즈니스 뉘앙스, 실전 예시, 문화적 배경까지 완벽하게 정리해드립니다. 
  사용자가 "트렌드 뉴스", "뉴스 영어 공부", "get trends" 등을 요청할 때 이 스킬을 활성화하여 학습 가이드(JSON)를 생성하세요.

  📁 결과는 JSON 파일로 저장됩니다 (C:\Users\lmo03\Downloads\news_guide.json)
  ⚠️ DB는 저장하지 않고 JSON 파일로만 생성합니다!
---

# 🎓 Fetch News Trends (1타 강자 스타일)

이 스킬은 최신 뉴스 트렌드를 기반으로 **1타 강자(Star Instructor)** 스타일의 고품질 영어 학습 콘텐츠를 생성합니다.

## 🎯 핵심 워크플로우

1.  **뉴스 수집**: `curl` 또는 Node.js 스크립트를 사용하여 Google News RSS(`https://news.google.com/rss`)를 직접 가져옵니다.
2.  **트렌드 추출**: 5~10개의 최신 트렌딩 토픽을 선정합니다. (정치, 금융, 테크, 스포츠, 연애 등 균형 있게 구성)
3.  **학습 콘텐츠 생성**: 각 토픽당 10개씩, 총 50~100개의 학습 문장을 생성합니다.
4.  **JSON 파일 저장**: 지정된 경로(`C:\Users\lmo03\Downloads\news_guide.json`)에 저장합니다.

## 🎓 콘텐츠 생성 가이드라인 (Level 3 - 중급)

모든 문장은 **Level 3 (Intermediate)** 수준으로 생성하며, 다음 필드를 반드시 포함해야 합니다:

- `news_title`: **기사 제목 (반드시 한글로 번역!)**
- `category`: 카테고리 (정치, 연애, 스포츠, 테크, 금융 중 하나)
- `sentences`: 학습 문장 배열 (10개)
    - `english`: 영어 문장 (15~20단어, 현재완료/미래 시제/복문 활용)
    - `korean`: 자연스러운 한국어 번역
    - `analysis`: 문장 구조 분석 (예: S(주어) + V(동사) + O(목적어) ...)
    - `explanation`: **1타 강자 스타일 상세 설명** (뉘앙스, 문법 포인트, 실전 팁 포함)
    - `vocabulary`: 핵심 어휘 및 숙어 (문자열: "단어: 뜻, 단어2: 뜻2")

### ⚠️ 1타 강자 스타일 규칙 (HARD)
- **친근하고 재미있는 톤**: "이거 진짜 중요해요! 😎", "원어민 필수템 👍" 등 이모지와 코멘트 활용
- **한자(Hanja) 사용 금지**: 모든 한자 표현은 한글로 풀어서 작성하세요.
- **JSON Escape 주의**: `explanation` 필드 내에서 Double Quote(`"`) 사용을 피하고 Single Quote(`'`)를 사용하세요.

## 📁 출력 JSON 구조

```json
{
  "title": "뉴스 기반 영어 학습 가이드 (N개 기사 통합)",
  "content": [
    {
      "news_title": "한글로 번역된 뉴스 제목",
      "category": "정치",
      "sentences": [
        {
          "english": "Sentence content...",
          "korean": "한국어 해석...",
          "analysis": "S(주어) + V(동사)...",
          "explanation": "1타 강사 스타일의 친절하고 상세한 설명! 😎",
          "vocabulary": "word: meaning, word2: meaning2"
        }
      ]
    }
  ]
}
```

## 🛠️ 실행 도구 및 스크립트
- 필요시 `scripts/` 폴더 내의 도우미 스크립트를 활용하세요.
- RSS 수집 시 Rate Limit을 피하기 위해 직접적인 HTTP 요청을 권장합니다.
