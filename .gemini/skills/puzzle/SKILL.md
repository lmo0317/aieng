# 🧩 Crossword Puzzle - Automated Integrity Pipeline

## 🔴 SYSTEM MANDATE: Absolute Title Rule (최우선 제목 규칙)
이 스킬이 생성하는 모든 퍼즐의 제목(`title`)은 **반드시** 다음의 단일 형식을 엄격히 준수해야 합니다. 이 규칙은 어떤 상황에서도 예외가 없습니다.

- **표준 형식**: `[Main Topic]: [Sub-topic]` (대주제와 소주제를 콜론으로 연결)
- **금지 단어 (DO NOT USE)**:
  - `Vocabulary Challenge`, `영어 퀴즈`, `영어 퍼즐`, `Lesson 1`, `N강`, `퀴즈` 등 모호한 단어 절대 금지.
  - 주제와 상관없는 단순 수식어나 순번 사용 금지.
- **모범 사례 (Best Practices)**:
  - `Travel: Airport Essentials` (O)
  - `Business: Successful Meeting` (O)
  - `School Life: Classroom Supplies` (O)
  - `Daily Life: General Expressions` (O)

---

## 🚀 Overview
전용 **'Puzzle Engine'**을 사용하여 100% 무결성이 검증된 가로세로 퍼즐을 생성합니다. AI의 수동 좌표 계산을 금지하며, 알고리즘에 의해 8방향 인접 및 철자 불일치가 원천 차단된 데이터만 산출합니다.

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

### Phase 1: Topic & Word Selection
1. 주제(`topic`)를 분석하여 대주제와 구체적인 소주제를 도출합니다.
2. 도출된 대주제와 소주제를 조합하여 **`[Main Topic]: [Sub-topic]`** 형식의 제목을 먼저 확정합니다.
3. 주제에 맞는 신규 단어 6~8개를 선정합니다.
4. **중복 체크**: `node .gemini/skills/puzzle/scripts/check-duplicates.js [단어1] [단어2] ...` 명령을 실행하여 기존 퍼즐과 중복되는 단어가 있는지 확인합니다.

### Phase 2: Engine Execution
- `node .gemini/skills/puzzle/scripts/puzzle-engine.js [단어1] [단어2] ...` 명령을 실행합니다.
- 엔진이 레이아웃 생성에 성공하면 산출된 JSON 좌표 정보를 그대로 사용합니다.
- 실패 시, 다른 단어 조합으로 다시 시도합니다.

### Phase 3: Server Sync
- 확정된 **표준 제목**과 좌표 데이터를 `save-to-server.js`를 통해 운영 서버에 저장합니다.

---

## 🛡️ Guardrails
1. **제목 변조 금지**: 생성 프로세스 도중 제목 끝에 `Vocabulary Challenge` 등을 임의로 덧붙이는 행위를 절대 금지합니다.
2. **수동 계산 금지**: AI가 임의로 `startX`, `startY`를 수정하는 행위를 절대 금지합니다.
3. **무결성 마크**: 엔진을 통과한 데이터만 "Certified" 퍼즐로 간주합니다.

---

## ✅ Usage Example
```
/puzzle 생활영어 6
```
- 결과 보고 시 플레이 링크를 반드시 포함합니다.
