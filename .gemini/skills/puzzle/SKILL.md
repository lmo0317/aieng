# 🧩 Crossword Puzzle - Automated Integrity Pipeline

## 🚨 CRITICAL: Title Formatting Rule (제목 형식 엄격 준수)
퍼즐의 제목은 학습자가 주제를 직관적으로 파악할 수 있도록 반드시 다음 규칙을 따라야 합니다.

- **표준 형식**: `[Main Topic]: [Sub-topic]` (대주제와 소주제를 콜론으로 구분)
- **금기 사항**:
  - `Vocabulary Challenge`, `영어 퀴즈`, `Lesson 1` 등 의미 없는 접미사나 단순 순번 사용 금지.
  - 주제가 드러나지 않는 모호한 단어 사용 금지.
- **예시**: 
  - `Travel: Airport Essentials` (O) / `Travel: Lesson 1` (X)
  - `Business: Successful Meeting` (O) / `Business: Vocabulary Challenge` (X)
  - `Nature: Wild Animals` (O) / `Nature: Puzzle` (X)

---

## 🚀 Overview
이 스킬은 전용 **'Puzzle Engine'**을 사용하여 100% 무결성이 검증된 가로세로 퍼즐을 생성합니다. 
AI의 수동 좌표 계산을 금지하며, 알고리즘에 의해 8방향 인접 및 철자 불일치가 원천 차단된 데이터만 산출합니다.

---

## 🚨 CRITICAL: The Engine-First Rule (엔진 우선 원칙)
모든 퍼즐 생성 요청 시, AI는 직접 좌표를 계산하지 않고 반드시 다음 엔진을 실행해야 합니다.

### 🛠️ 실행 도구: `scripts/puzzle-engine.js`
- **입력**: 단어 리스트 (최소 3개, 권장 6개)
- **기능**:
    1. **8방향 인접 검사**: 교차점을 제외한 모든 칸 주위에 글자가 없는지 확인.
    2. **백트래킹**: 유효한 레이아웃이 나올 때까지 수천 번의 조합 시도.
    3. **자동 좌표 산출**: 1-indexed 기반의 `startX`, `startY` 자동 계산.

---

## 📋 Mandatory Workflow (필수 워크플로우)

### Phase 1: Word Selection
- 주제에 맞는 신규 단어 6~8개를 선정합니다.
- **중복 체크**: `node .gemini/skills/puzzle/scripts/check-duplicates.js [단어1] [단어2] ...` 명령을 실행하여 기존 퍼즐과 중복되는 단어가 있는지 확인합니다.
- 중복 발견 시 다른 단어로 대체하여 다시 검사합니다.
- 모든 단어가 Unique 할 때 다음 단계로 진행합니다.

### Phase 2: Engine Execution
- `node .gemini/skills/puzzle/scripts/puzzle-engine.js [단어1] [단어2] ...` 명령을 실행합니다.
- 엔진이 레이아웃 생성에 성공하면 산출된 JSON 좌표 정보를 그대로 사용합니다.
- 실패 시, 다른 단어 조합으로 다시 시도합니다.

### Phase 3: Server Sync
- 엔진이 산출한 무결한 좌표 데이터를 `save-to-server.js`를 통해 운영 서버에 저장합니다.

---

## 🛡️ Guardrails
1. **수동 계산 금지**: AI가 임의로 `startX`, `startY`를 수정하는 행위를 절대 금지합니다.
2. **무결성 마크**: 엔진을 통과한 데이터만 "Certified" 퍼즐로 간주합니다.

---

## ✅ Usage Example
```
/puzzle 생활영어 general medium 6
```
- 결과 보고 시 플레이 링크를 반드시 포함합니다.
