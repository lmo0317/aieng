# 🧩 Crossword Puzzle - Automated Integrity Pipeline

## 🚀 Overview
이 스킬은 사용자가 입력한 **'단어의 개수'**만으로 무작위 테마의 가로세로 퍼즐을 생성합니다. AI가 직접 좌표를 계산하지 않고 전용 엔진을 통해 무결성이 검증된 데이터만 산출합니다.

---

## 📋 Mandatory Workflow (필수 워크플로우)

### Phase 1: Word & Title Selection
1. **단어 선정**: 입력받은 개수(기본 6~8개)만큼의 영어 단어를 AI가 자유롭게 선정합니다. 
   - 일상, 기술, 자연 등 매번 다른 테마를 권장합니다.
2. **제목 생성 (Naming Convention)**: 아래 규칙에 따라 일관성 있게 제목을 생성합니다.
   - **구조**: `[Theme]: [Catchy Phrase]` 또는 `[Action Word] with [Topic]`
   - **언어**: 영문 (필요 시 한글 부제 병기 가능)
   - **톤**: 학습 의욕을 고취하는 긍정적이고 역동적인 표현 사용
   - **예시**: *Space Journey: Cosmic Words*, *Cooking Class: Kitchen Essentials*
3. **중복 체크**: `node .gemini/skills/puzzle/scripts/check-duplicates.js [단어1] [단어2] ...` 명령을 실행하여 기존 퍼즐과 중복되는 단어가 있는지 확인합니다. 중복 시 단어를 교체합니다.

### Phase 2: Engine Execution
- `node .gemini/skills/puzzle/scripts/puzzle-engine.js [단어1] [단어2] ...` 명령을 실행합니다.
- 엔진이 레이아웃 생성에 성공하면 산출된 JSON 좌표 정보를 그대로 사용합니다.
- 실패 시, 다른 단어 조합으로 다시 시도합니다.

### Phase 3: Server Sync
- 엔진이 산출한 데이터와 생성된 **'제목'**을 `save-to-server.js`를 통해 서버에 저장합니다.

---

## ✅ Usage Example
```
/puzzle 6
```
- 결과 보고 시 생성된 제목과 플레이 링크를 함께 제공합니다.
