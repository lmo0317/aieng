---
name: popsong
description: >
  🎵 팝송 가사 기반 영어 학습 콘텐츠 생성기. 가사를 분석하여 1타 강사 스타일의
  학습 문장, 번역, 문법 설명, 어휘 정리, 퀴즈를 생성합니다.
license: Apache-2.0
compatibility: Trend Eng project
allowed-tools: Agent Read Write Bash Grep
user-invocable: true
metadata:
  version: "1.0.0"
  category: "content-creation"
  status: "active"
  updated: "2026-03-16"
  tags: "popsong, lyrics, english-learning, music"

# Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 150
  level2_tokens: 3000

# Triggers
triggers:
  keywords: ["팝송", "popsong", "가사", "lyrics", "음악", "music", "song"]
  agents: []
  phases: ["run"]
---

# 🎵 Popsong - 팝송 가사 기반 영어 학습 콘텐츠 생성

팝송 가사를 분석하여 1타 강사 스타일의 영어 학습 콘텐츠를 생성합니다.

## 🛠️ 사용법

### 기본 실행
```
/popsong
```
→ 가사와 제목을 입력받아 분석

### 제목과 가사 함께 입력
```
/popsong "Bruno Mars - Die With A Smile"
가사 내용...
```

## 🤖 Agent 파이프라인

### Phase 1: 가사 분석
**Agent**: song-lyrics-analyst
- 가사 텍스트 분석
- 핵심 주제 및 키워드 추출
- 문화적 배경 파악
- 학습에 적합한 문장 선정 (최대 10개)

**출력**: 가사 분석 결과 + 학습 대상 문장 10개

### Phase 2: 콘텐츠 생성
**Agent**: content-generator
- 가사 문장을 바탕으로 Level3 영어 학습 문장 생성
- 실제 가사 표현 활용
- 비즈니스/일상 영어 적절성 확보

**출력**: 10개 영어 학습 문장

### Phase 3: 영어 교육
**Agent**: english-tutor
- 가사 문장의 자연스러운 번역
- 문장 구조 분석 (S/V/O 태그)
- 1타 강사 스타일 문법/뉘앙스 설명
- 가사 특유의 표현(슬랭, 관용구) 설명

**출력**: 완성된 학습 콘텐츠 (en, ko, sentence_structure, explanation, voca)

### Phase 4: 퀴즈 생성
**Agent**: quiz-maker
- 가사에 나온 어휘로 10개 복습 퀴즈 생성
- 4지선다형 + 빈칸채우기 혼합
- 음악 관련 표현 중심

**출력**: 10개 퀴즈

### Phase 5: 품질 검수
**Agent**: qa-reviewer
- TRUST 5 품질 기준 검증
- 한자 탐지
- 가사 번역 적절성 확인

**출력**: 검증된 콘텐츠

### Phase 6: 기술 구현
**Agent**: tech-implementer
- JSON 형식 변환
- output/ 디렉토리에 저장
- 서버 API (/api/songs/save) 호출
- type: "song"으로 지정

**출력**: 저장된 JSON 파일 + DB 반영

## 📊 출력 형식

```json
{
  "title": "팝송 기반 영어 학습 가이드",
  "type": "song",
  "content": [
    {
      "song_title": "Bruno Mars - Die With A Smile",
      "artist": "Bruno Mars, Lady Gaga",
      "sentences": [
        {
          "en": "I'd never leave you this way",
          "ko": "나는 너를 이렇게 두고 떠나지 않을 거야",
          "sentence_structure": "S(I) + V(would never leave) + O(you) + Adv(this way)",
          "explanation": "'would never'는 강한 의지를 나타냅니다. 가사에서 'never leave you this way'는 '절대 이렇게 떠나지 않겠다'는 다짐을 표현합니다.",
          "voca": ["leave: 떠나다", "this way: 이렇게"]
        }
      ],
      "quiz": [
        {
          "type": "multiple_choice",
          "word": "leave",
          "question": "'leave'의 올바른 뜻은?",
          "options": ["떠나다", "만나다", "사랑하다", "기다리다"],
          "answer": "떠나다"
        }
      ]
    }
  ]
}
```

## 🎯 팝송 특수 고려사항

### 가사 표현 처리
- **슬랭/관용구**: 원뜻과 가사에서의 뉘앙스 모두 설명
- **문학적 표현**: 시적 허용이나 비유적 표현 설명
- **축약형**: I'd, You're 등 축약형 문법 설명

### 문화적 배경
- 서양 문화적 맥락 설명
- 음악 장르 특유의 표현 소개

## ⚠️ 제약 사항

**JSON Escape**:
- ✅ Single Quote(`'`)만 사용
- ❌ Double Quote(`"`) 절대 사용 금지
- ❌ 한자 절대 사용 금지

**난이도**: Level3 (중상급)
- 실제 가사 표현 활용
- 대화 자연스러움 유지
- 음악적 뉘앙스 보존

## 🔄 실행 흐름

```
[1] song-lyrics-analyst
   가사 분석 → 10개 문장 선정
   ↓
[2] content-generator
   가사 기반 학습 문장 생성
   ↓
[3] english-tutor
   번역 + 문법 분석 + 가사 표현 설명
   ↓
[4] quiz-maker
   10개 퀴즈 생성
   ↓
[5] qa-reviewer
   품질 검증
   ↓
[6] tech-implementer
   JSON 저장 + DB 반영
   ↓
✅ 완료
```
