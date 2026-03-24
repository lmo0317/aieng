# 🧩 Crossword Puzzle - Brain Training Pipeline

## 🚀 Overview
사용자의 관심사나 특정 주제에 기반한 **영어 가로세로 퍼즐(Crossword)**을 생성합니다. 
생성된 퍼즐은 Trend Eng 프로젝트 DB에 저장되어 실제 웹 서비스(`/puzzle/play`)에서 즉시 플레이 가능합니다.

---

## 🚨 CRITICAL: Failure Prevention Protocol (실수 방지 금기 사항)
1. **교차점 글자 일치 (Zero Conflict)**: 가로와 세로 단어가 만나는 지점의 글자가 반드시 일치해야 합니다. **전수 조사(Phase 4)** 없이는 절대로 저장하지 마십시오.
2. **단어 중복 금지**: 이전에 생성된 퍼즐에서 사용된 단어는 다시 사용하지 마십시오. 반드시 사전에 확인하십시오.
3. **레이아웃 독창성**: 단순 계단식 배열을 반복하지 마십시오. 매번 새로운 무작위성을 부여하십시오.

---

## 📋 Mandatory Workflow (필수 워크플로우)

### Phase 1: Parameter Parsing (인수 파싱)
- **topic**: 주제 (기본값: `오늘의 트렌드`)
- **category**: `tech|sports|entertainment|politics|economy|popsong|general` 중 하나 (기본값: `general`)
- **difficulty**: `easy|medium|hard` 중 하나 (기본값: `medium`)
- **count**: 가로/세로 단어 각각의 개수, `3|4|5` 중 하나 (기본값: `3`)

### Phase 2: Duplicate Word Check (단어 중복 확인)
- **실시간 저장소 확인**: 작업을 시작하기 전, **반드시 `http://aieng.cafe24app.com/api/puzzles`를 호출**하여 기존 퍼즐 목록을 가져옵니다.
- **상세 단어 추출**: 최근 생성된 퍼즐들의 데이터를 확인하여 이미 사용된 단어 목록을 파악하십시오.
- **필터링**: 이번에 선정할 단어들이 기존 퍼즐의 `answer`와 겹치지 않도록 **100% 새로운 단어**를 선정하십시오.

### Phase 3: Word Selection (단어 및 클루 생성)
- 주제와 난이도에 맞는 단어 **(count × 2)**개를 선정합니다. (Phase 2에서 확인한 중복 단어 제외)
- **easy**: 4~6글자, **medium**: 5~8글자, **hard**: 7글자 이상.
- `clue`: 짧고 명확한 영어 설명 (15단어 이내).
- `clue_ko`: 한국어 번역 힌트.

### Phase 4: Grid Verification Protocol (교차점 무결성 검증 - 필수)
- **전수 조사**: 퍼즐을 확정하기 전, 모든 교차점(두 단어가 만나는 좌표)을 리스트업하고 해당 좌표의 글자가 **두 단어 모두에서 동일한지** 100% 확인하십시오.
- **검증 예시**:
    - 단어 A(Across, 1,2): **B(1,2), R(2,2), A(3,2), I(4,2), N(5,2)**
    - 단어 B(Down, 3,1): **W(3,1), A(3,2), T(3,3), E(3,4), R(3,5)**
    - 교차점 (3,2): 단어 A의 3번째 글자('A') == 단어 B의 2번째 글자('A') -> **검증 통과**
- **오류 발견 시**: 즉시 좌표를 수정하거나 단어를 교체하여 불일치를 해결하십시오. **글자가 맞지 않는 퍼즐은 절대로 저장하지 마십시오.**

### Phase 5: Server Sync (운영 서버 저장)
- **ID 생성**: `puzzle-{YYYYMMDD}-{NNN}` 형식 (예: `puzzle-20260323-001`).
- **안전 전송**: 데이터를 임시 JSON 파일로 저장한 후 `save-to-server.js`를 통해 전송하십시오.
- **임시 파일 삭제**: 전송 성공 후 반드시 임시 파일을 삭제하십시오.

---

## 🛠️ Data Structure (데이터 규격)

### API Request Body
```json
{
  "id": "puzzle-20260323-001",
  "title": "{주제} 영어 퀴즈",
  "category": "tech",
  "difficulty": "medium",
  "date": "2026-03-23",
  "wordCount": 6,
  "source": "{topic}",
  "data": {
    "version": "1.0",
    "meta": { ... },
    "grid": { "width": 10, "height": 10 },
    "words": [
      {
        "id": "w1",
        "number": 1,
        "answer": "WORD",
        "clue": "Short English clue",
        "clue_ko": "한국어 힌트",
        "direction": "across",
        "startX": 1,
        "startY": 1
      }
    ]
  }
}
```

---

## 🛡️ Guardrails (행동 수칙)
1. **대문자 필수**: `answer`는 반드시 영문 대문자여야 합니다.
2. **교차점 글자 일치**: 가로와 세로 단어가 만나는 지점의 글자가 100% 일치해야 합니다. (불일치 시 저장 금지)
3. **단어 중복 엄금**: 기존 퍼즐에서 사용된 단어(`answer`)를 절대 재사용하지 마십시오.
4. **레이아웃 독창성**: 이전 퍼즐과 동일하거나 매우 유사한(단순 계단식 등) 레이아웃을 반복하지 마십시오. 매번 **완전히 새로운 무작위성**을 부여하십시오.
5. **번호 배정**: 그리드 좌측 상단부터 우측 하단 방향으로 번호를 배정하십시오.
6. **UI 호환성**: 모바일 화면을 고려하여 최대 14×14 크기를 넘지 않도록 합니다.

---

## ✅ Usage Example
```
/puzzle AI기술 tech hard 5
```
- 결과 보고 시 게임 플레이 링크(`http://aieng.cafe24app.com/puzzle/play?id={puzzle-id}`)를 포함하여 보고합니다.
