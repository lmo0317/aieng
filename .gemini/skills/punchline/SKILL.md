---
name: punchline
description: >
  🎬 영화·애니메이션·팝송·드라마 명대사 기반 영어 학습 콘텐츠 생성기. 작품 선정, 명대사 5개 추출, 번역, 문법 설명, 어휘 정리, 퀴즈, DB 저장을 수행합니다.
---

# 🎬 Punchline Learning - Star Tutor Pipeline

## 🚨 CRITICAL: Failure Prevention Protocol (실수 방지 금기 사항)
당신은 과거에 다음과 같은 실수를 반복했습니다. **이 섹션을 읽는 즉시 다음 규칙을 뇌리에 각인하십시오.**

1.  **명대사 정확성 최우선**: 기억에 의존하지 말고, `google_web_search`를 통해 실제 대사 원문을 반드시 확인하십시오. 오역이나 변형된 대사는 학습 품질을 심각하게 저하시킵니다.
2.  **5개 고정 준수**: 명대사는 반드시 **정확히 5개**를 추출해야 합니다. 적거나 많으면 안 됩니다.
3.  **작품 주제 통일성**: 5개 명대사는 모두 동일한 작품에서 추출해야 하며, 작품의 핵심 주제나 감정선을 반영해야 합니다.
4.  **제목 형식 엄수**: `title` 필드는 반드시 **'[Type]: Title'** 형식입니다. (예: `Movie: Catch Me If You Can`)

---

## 🤖 단계별 에이전트 역할 (Internal Workflow)

### Phase 0: Work Scout (작품 선정 - 입력이 없을 때 필수)
- **자동 선정 조건**: 사용자가 특정 작품을 제공하지 않은 경우, 이 단계를 실행합니다.
- **선정 기준 (Quality First)**:
    1.  **압도적 인지도**: 전 세계적으로 사랑받는 '인생 영화', '전설적인 애니메이션', '차트 상위권 팝송' 등 대중성이 검증된 작품을 선정합니다. (예: *About Time, Zootopia, Friends, La La Land* 등)
    2.  **영어 학습 적합성**: 대사가 명확하고 실생활에서 응용 가능한 표현이 풍부한 작품.
    3.  **다양성**: 최근에 반복되지 않은 신선하면서도 검증된 작품 선정.
- **동작**: 위 기준에 부합하는 작품을 하나 선정하여 **타입과 제목을 확정**한 후, 즉시 Phase 1로 넘어갑니다.
- **타입 분류**: Movie / Animation / Drama / Song 중 하나로 구분합니다.

### Phase 1: Quote Analyst (명대사 추출)
- 선정된 작품에서 **팬들이 가장 사랑하는 인기 명대사 정확히 5개**를 추출합니다.
- **선정 기준**:
    1.  **인기 & 상징성**: 해당 작품을 떠올리면 바로 생각나는 '시그니처' 대사 위주로 선정합니다.
    2.  **학습 가치**: 원어민의 자연스러운 표현, 유용한 관용구, 중고급 어휘가 포함된 문장.
    3.  **길이**: 학습 효과를 위해 너무 짧은 문장(3단어 이하)보다는 구조 분석이 가능한 적절한 길이의 문장을 선호합니다.
- **원문 확인**: `google_web_search`로 실제 대사 원문을 검색·확인하십시오. (검색어 예: 'Top 10 quotes from [Movie Name]')
- **디테일한 제목 설정 (HARD RULE)**: `title` 필드는 반드시 **'[Type]: Title (Sub-title/Episode/Volume)'** 형식으로 작성하여 학습 테마를 명확히 합니다.
    - 예: `Animation: One Piece (Legendary Quotes from the Summit War)`
    - 예: `Movie: About Time (The Magic of Ordinary Days)`
    - 예: `Drama: Friends (Season 1 Iconic Lines)`
    - 예: `Song: My Heart Will Go On (Titanic OST Special)`

### Phase 2: Star English Tutor (초정밀 1타 강사 교육)
- 추출된 **5개 명대사 전부**에 대해 다음 정보를 생성합니다.
- **자연스러운 번역 (`ko`)**: 직역을 넘어 극 중 상황의 감정선과 뉘앙스를 완벽히 살린 한국어 번역.
- **초정밀 문장 구조 분석 (`sentence_structure`)**:
    - 형식(1~5형식) 명시 필수.
    - 문장 성분(주어, 동사, 목적어 등)은 **한글**로 표기하되, 해당 성분에 대응하는 **영어 단어는 원문 그대로** 유지합니다.
    - 예시: `3형식 / S(주어: I) + V(동사: love) + O(목적어: you)`
- **압도적 디테일의 AI 가이드 (`explanation`)**:
    - 학생에게 1:1 과외를 하듯 아주 자세하고 친절한 말투(`~하세요`, `~입니다!`).
    - **최소 6문장 이상 필수**: 
        ① **장면 맥락**: 어떤 상황에서 누가 누구에게 한 말인지 상세 설명.
        ② **핵심 문법**: 문장에 쓰인 핵심 문법 요소(시제, 가정법, 관계사 등)를 원리부터 설명.
        ③ **뉘앙스 분석**: 원어민이 이 표현을 어떤 느낌(격식, 농담, 감동 등)으로 쓰는지 분석.
        ④ **실전 응용**: 이 구조를 활용해 일상에서 사용할 수 있는 예시 문장이나 팁 제공.
- **핵심 어휘 (`voca`)**: 문장당 3~5개 필수. 형식: `단어(품사): 뜻`

### Phase 3: Quiz Maker (퀴즈 생성)
- 학습한 어휘(`voca`)를 기반으로 **10개 모두 4지 선다 객관식(multiple_choice)**으로 생성합니다. (빈칸 채우기 절대 금지)
- **한글 문제 필수 (HARD RULE)**: 퀴즈 질문(`question`)은 반드시 한국어로 작성하며, 선택지는 반드시 4개여야 합니다.

### Phase 4: QA & Technical Save (운영 서버 저장 - 안전 프로토콜)
- **환경 점검**: 실행 전 `.env` 파일의 `SERVER_URL`이 운영 서버(`http://aieng.duckdns.org`)를 가리키고 있는지 반드시 확인하십시오. 만약 `localhost`로 되어 있다면 운영 서버 주소를 우선적으로 사용하여 전송해야 합니다.
- **안전 전송 (Windows Safe)**: 데이터를 명령어 인자로 직접 전달하지 마십시오.
    1. 반드시 데이터를 임시 JSON 파일(예: `temp_punchline_data.json`)로 먼저 작성하십시오.
    2. 해당 파일 경로를 인자로 하여 `save-to-server.js`를 실행하십시오. (`node .gemini/skills/punchline/scripts/save-to-server.js temp_punchline_data.json`)
    3. 작업 완료 후 임시 파일을 반드시 삭제하십시오.
- **최종 검증**: 스크립트 출력 결과에서 `✅ Server Save SUCCESS!` 또는 `success: true` 메시지를 실제로 확인한 경우에만 성공으로 보고하십시오.
- **구조 검증**: `en`, `ko`, `sentence_structure`, `explanation`, `voca` 필드가 누락되지 않았는지 확인.

### Phase 5: Telegram Notification (최종 보고)
- 서버 저장이 성공하면 **반드시 즉시** 텔레그램 알림을 전송해야 합니다.
- **서버 반영 확인**: 보고서에 반드시 "운영 서버(aieng.duckdns.org) 반영 완료" 문구를 포함하십시오.
- **보고 내용**:
    - 🎬 **작품 제목** ([Type]: Title)
    - 📝 **추출된 명대사 수** (5개 확인)
    - 💡 **생성된 퀴즈 개수** (10개 확인 - 모두 객관식)
    - ✨ **학습 포인트** (작품의 주제나 핵심 문법 요약)
- **말투**: 학생의 성장을 진심으로 응원하는 열정적인 1타 강사의 말투로 정중하고 자세하게 작성하세요.

---

## 📋 출력 JSON 데이터 스키마 (엄수)
```json
{
  "title": "[Type]: Title",
  "source_type": "movie | animation | drama | song",
  "difficulty": "level3",
  "sentences": [
    {
      "en": "Famous quote in English",
      "ko": "한글 번역 (뉘앙스 살린 자연스러운 번역)",
      "sentence_structure": "N형식 / S(주어: ...) + V(동사: ...) + ...",
      "explanation": "1타 강사의 상세 강의 (4문장 이상, 장면 맥락 포함)",
      "voca": ["단어(품사): 뜻", "단어(품사): 뜻"]
    }
  ],
  "quiz": [
    {
      "type": "multiple_choice",
      "question": "한국어 퀴즈 질문",
      "options": ["정답", "오답1", "오답2", "오답3"],
      "answer": "정답"
    }
  ]
}
```

---

## ⚠️ 절대 제약 사항
1. **title**: 반드시 `[Type]: Title` 영문 형식. 예: `Movie: Forrest Gump`
2. **sentences**: 반드시 정확히 **5개**. 더 많거나 적으면 수정.
3. **explanation**: 4문장 미만 또는 단어 뜻만 적는 성의 없는 설명 엄격 금지. 반드시 장면 맥락 포함.
4. **quiz question**: 반드시 한국어.
5. **multiple_choice only**: 빈칸 채우기 유형 절대 금지. 모든 퀴즈는 4지 선다형.
6. **Hanja**: 발견 시 즉시 제거.
7. **원문 확인**: 명대사는 반드시 검색으로 정확한 원문을 확인하십시오.

---

## ✅ 사용 예시
```
/punchline
/punchline Movie: Forrest Gump
/punchline Animation: The Lion King
/punchline Drama: Breaking Bad
/punchline Song: My Heart Will Go On
```
