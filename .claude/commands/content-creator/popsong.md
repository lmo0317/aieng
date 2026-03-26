---
name: popsong
description: >
  🎵 팝송 가사 기반 영어 학습 콘텐츠 생성기. 6개 전문 Agent가 협력하여
  가사 분석, 번역, 문법 설명, 어휘 정리, 퀴즈, 품질 검수, DB 저장을 수행합니다.
license: Apache-2.0
compatibility: Trend Eng project
allowed-tools: Agent Read Write Bash Grep
user-invocable: true
metadata:
  version: "2.0.0"
  category: "content-creation"
  status: "active"
  updated: "2026-03-17"
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

# 🎵 Popsong Learning - Agent 기반 파이프라인

6개 전문 Agent가 협력하여 고품질 팝송 영어 학습 콘텐츠를 생성합니다.

## 🤖 Agent 파이프라인

### Phase 1: 데이터 초기화 (선택)
**Agent**: tech-implementer
- 기존 팝송 데이터 삭제 요청 시 실행
- `/api/songs/saved` 조회 후 해당 곡 ID 삭제
- DB 정리 및 환경 설정

**조건**: "삭제하고" 또는 "초기화" 키워드 포함 시만 실행

### Phase 2: 가사 분석
**Agent**: song-lyrics-analyst
- 사용자가 제공한 가사 텍스트 심층 분석
- 핵심 주제, 감정 톤, 문화적 배경 파악
- verse / chorus / bridge 구조 파악
- 학습 가치 높은 문장 10개 선정
  - 슬랭·관용구 포함 문장 우선
  - 문법 포인트 명확한 문장 선정
  - 너무 단순하거나 반복되는 후렴구 제외

**출력**: 분석 리포트 + 학습 대상 문장 10개 (원문 그대로)

### Phase 3: 영어 교육
**Agent**: english-tutor
- 선정된 가사 문장 → 자연스러운 한국어 번역
- 문장 구조 분석 (N형식 / S·V·O·C·M 태그 + 한글 명칭)
- 1타 강사 스타일 문법·뉘앙스 설명 (최소 4문장)
  - ① 전체 맥락 해석
  - ② 핵심 문법 포인트
  - ③ 가사 특유 뉘앙스 (슬랭·비유·축약형 등)
  - ④ 실생활 활용 팁
- 핵심 어휘 추출 (형식: `단어(품사): 뜻 - 맥락/주의`)

**출력**: 완성된 학습 콘텐츠 (en, ko, sentence_structure, explanation, voca)

### Phase 4: 퀴즈 생성
**Agent**: quiz-maker
- 학습한 어휘로 10개 복습 퀴즈 생성
- 4지선다형 (multiple_choice) + 빈칸채우기 (fill_in_blank) 혼합
- 가사·음악 특유 표현 중심으로 출제

**출력**: 10개 퀴즈 (type, word, question, options, answer)

### Phase 5: 품질 검수
**Agent**: qa-reviewer
- TRUST 5 품질 기준 전체 검증
- **한자 탐지** (HARD RULE: 1개라도 발견 시 즉시 rejected → 재생성 요청)
- JSON 구조 무결성 검증 (모든 필수 필드 존재 여부)
- 한국어 번역 품질 검증 (가사 뉘앙스 보존 여부)
- Emoji 포함 여부 검사

**출력**: 검증 통과 콘텐츠 OR 에러 리포트 (실패 항목 명시)

### Phase 6: 기술 구현
**Agent**: tech-implementer
- 검증된 콘텐츠를 JSON 형식으로 변환
- `output/` 디렉토리에 타임스탬프 파일로 저장
- 서버 API (`/api/songs/save`) 호출로 DB 반영
  - `type: "song"` 필드 반드시 포함
  - `category` 필드: 장르 (Pop / R&B / Rock / Hip-Hop 등)
- 임시 파일 정리

**출력**: 저장된 JSON 파일 + 서버 DB 반영 확인

---

## 🛠️ 사용법

### 기본 실행 (가사 직접 입력)
```
/popsong
제목: Bruno Mars - Die With A Smile
가사:
[가사 내용 붙여넣기]
```

### 제목만 입력 (가사 자동 검색)
```
/popsong Bruno Mars - Die With A Smile
```
→ song-lyrics-analyst가 알려진 가사로 분석 진행

### 삭제 후 생성
```
/popsong 삭제하고 Bruno Mars - Die With A Smile
```
→ 기존 같은 곡 데이터 삭제 후 새로 생성

---

## 📊 출력 형식

```json
{
  "title": "Bruno Mars - Die With A Smile",
  "type": "song",
  "category": "Pop",
  "content": [
    {
      "song_title": "Die With A Smile",
      "artist": "Bruno Mars, Lady Gaga",
      "genre": "Pop, R&B",
      "sentences": [
        {
          "en": "I'd never leave you this way",
          "ko": "나는 절대 너를 이렇게 두고 떠나지 않을 거야",
          "sentence_structure": "1형식 / S(I) + V(would never leave) + O(you) + M(this way)",
          "explanation": "① 가사 전체 맥락에서 이 문장은 사랑하는 사람에 대한 절대적 헌신을 표현합니다. ② 'I would'의 축약형 'I'D'는 가정법 조동사로 '(어떤 상황에서도) ~할 것이다'라는 강한 의지를 나타냅니다. ③ 'never leave ... this way'는 단순히 '떠나지 않겠다'가 아니라 '이런 식으로는 절대 두고 가지 않겠다'는 뉘앙스로, 상황의 방식까지 강조하는 표현입니다. ④ 일상에서 'I'd never do that to you'처럼 응용하면 강한 다짐이나 약속을 표현할 수 있습니다.",
          "voca": ["leave(동사): 떠나다, 두고 가다 - 단순 이동이 아닌 관계적 이탈을 암시", "this way(부사구): 이런 식으로 - 방법/방식 강조"]
        }
      ],
      "quiz": [
        {
          "type": "multiple_choice",
          "word": "leave",
          "question": "가사에서 'I'd never leave you this way'의 'leave'가 가장 가까운 뜻은?",
          "options": ["떠나다", "남기다", "허락하다", "기다리다"],
          "answer": "떠나다"
        }
      ]
    }
  ]
}
```

---

## 📋 품질 기준 (TRUST 5)

**Testable**: JSON 파싱 100% 성공, 모든 필수 필드 존재
**Readable**: 자연스러운 한국어 번역, 가사 뉘앙스 보존
**Understandable**: Level3 난이도 부합, 문법 설명 4단계 준수
**Secured**: JSON escape 올바름, 한자·Emoji 미포함
**Trackable**: 에러 추적 가능, 검증 로그 존재

---

## ⚠️ 제약 사항

**JSON Escape**:
- ✅ Single Quote(`'`)만 사용
- ❌ Double Quote(`"`) 문장 내부 절대 사용 금지
- ❌ 한자 절대 사용 금지
- ❌ Emoji 절대 사용 금지

**난이도**: Level3 (중상급)
- 실제 가사 원문 표현 활용
- 슬랭·관용구·축약형 설명 포함
- 음악적 뉘앙스 보존

**가사 처리 원칙**:
- 너무 단순한 후렴구 반복 문장 제외
- 문법적으로 불완전한 파편 문장 제외
- 학습 가치 높은 완성 문장 우선 선정

---

## 🔄 실행 흐름

```
[1] tech-implementer (선택 - 삭제 요청 시만)
   기존 곡 데이터 삭제
   ↓
[2] song-lyrics-analyst
   가사 분석 → 학습 문장 10개 선정
   ↓
[3] english-tutor
   번역 + 문법 분석 + 가사 뉘앙스 설명
   ↓
[4] quiz-maker
   어휘 기반 10개 퀴즈 생성
   ↓
[5] qa-reviewer
   TRUST 5 검증 + 한자/Emoji 체크
   ↓
[6] tech-implementer
   JSON 저장 + DB 반영 (/api/songs/save)
   ↓
✅ 완료
```
