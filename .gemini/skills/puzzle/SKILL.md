# 🧩 Crossword Puzzle - Brain Training Pipeline

## 🚀 Overview
사용자의 관심사나 특정 주제에 기반한 **영어 가로세로 퍼즐(Crossword)**을 생성합니다. 
생성된 퍼즐은 Trend Eng 프로젝트 DB에 저장되어 실제 웹 서비스(`/puzzle/play`)에서 즉시 플레이 가능합니다.

---

## 📋 Mandatory Workflow (필수 워크플로우)

### Phase 1: Parameter Parsing (인수 파싱)
- **topic**: 주제 (기본값: `오늘의 트렌드`)
- **category**: `tech|sports|entertainment|politics|economy|popsong|general` 중 하나 (기본값: `general`)
- **difficulty**: `easy|medium|hard` 중 하나 (기본값: `medium`)
- **count**: 가로/세로 단어 각각의 개수, `3|4|5` 중 하나 (기본값: `3`)

### Phase 2: Word Selection (단어 및 클루 생성)
- 주제와 난이도에 맞는 단어 **(count × 2)**개를 선정합니다.
- **easy**: 4~6글자, **medium**: 5~8글자, **hard**: 7글자 이상.
- `clue`: 짧고 명확한 영어 설명 (15단어 이내).
- `clue_ko`: 한국어 번역 힌트.

### Phase 3: Layout Design (그리드 설계 - 핵심)
- **배치 규칙**:
    1. **교차 필수**: 모든 단어는 최소 1개 이상 다른 단어와 교차해야 함.
    2. **인접 금지**: 교차점 외에는 다른 단어와 상하좌우로 붙어있으면 안 됨.
    3. **간격 유지**: 같은 방향 단어 사이는 최소 1행/1열 공백 필요.
- **그리드 크기**: 
    - count=3: 8×8 권장
    - count=4: 10×10 권장
    - count=5: 12×12 최대

### Phase 4: Server Sync (운영 서버 저장)
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
2. **교차 검증**: 가로 단어와 세로 단어가 만나는 지점의 글자가 반드시 일치하는지 확인하십시오.
3. **번호 배정**: 그리드 좌측 상단부터 우측 하단 방향으로 번호를 배정하십시오.
4. **UI 호환성**: 모바일 화면을 고려하여 12×12 크기를 넘지 않도록 합니다.

---

## ✅ Usage Example
```
/puzzle AI기술 tech hard 5
```
- 결과 보고 시 게임 플레이 링크(`http://aieng.cafe24app.com/puzzle/play?id={puzzle-id}`)를 포함하여 보고합니다.
