---
name: puzzle
description: >
  영어 가로세로 퍼즐(크로스워드)을 AI로 생성하고 Trend Eng 프로젝트에 저장합니다.
  사용자가 /puzzle을 실행하면 주제, 카테고리, 난이도를 파싱하고 크로스워드 레이아웃을
  설계하여 JSON 파일로 저장한 뒤 게임 URL을 안내합니다.
license: Apache-2.0
compatibility: Designed for Claude Code - Trend Eng project
allowed-tools: Read Write Edit Glob Bash
user-invocable: true
metadata:
  version: "1.1.0"
  category: "workflow"
  status: "active"
  updated: "2026-03-22"
  tags: "puzzle, crossword, english, learning, trend-eng"
  argument-hint: "[주제] [카테고리] [난이도] [갯수]"
  author: "Trend Eng Team"
---

# Puzzle - 영어 크로스워드 퍼즐 생성기

## 게임 UI 특성 (생성 시 반드시 고려)

현재 `puzzle-play.html`의 UI 구조:
- **한 화면**에 그리드 + 힌트 + 알파벳 선택 버튼이 모두 표시됨 (스크롤 없음)
- **힌트 패널**: 현재 선택한 단어의 영어 설명만 1줄로 표시, `한` 버튼으로 한국어 토글
- **입력 방식**: OS 키보드 없음 — 정답 글자 포함 랜덤 10개 알파벳 버튼으로 선택 입력
- **첫 글자(번호 셀)**: 각 단어의 시작 글자는 자동으로 공개됨 (hint-cell)

**클루 작성 기준** (영어 clue가 기본 표시됨):
- `clue`: 짧고 명확한 영어 설명 (1문장, 가능하면 15단어 이내)
- `clue_ko`: 한국어 번역 (토글 시 표시)

**그리드 크기 권장**:
- 모바일 한 화면 기준 최대 **12×12** 이하 권장 (10×10이 최적)
- 15×15는 셀이 너무 작아짐

---

## 인수 파싱

`$ARGUMENTS`에서 다음 값을 추출합니다.

- **topic**: 주제 (기본값: `오늘의 트렌드`)
- **category**: `tech|sports|entertainment|politics|economy|popsong|general` 중 하나 (기본값: `general`)
- **difficulty**: `easy|medium|hard` 중 하나 (기본값: `medium`)
- **count**: 가로/세로 단어 각각의 개수, `3|4|5` 중 하나 (기본값: `3`)

파싱 규칙:
- category 키워드 포함 시 해당 값 설정 (예: "스포츠" → sports, "기술" → tech)
- "easy/쉬움/초급", "hard/어려움/고급" 포함 시 난이도 설정
- 단독 숫자 `3`, `4`, `5` 포함 시 count로 설정
- 나머지 텍스트는 topic으로 사용

파싱 후 확인 메시지 출력:

```
퍼즐 생성 설정:
- 주제: {topic}
- 카테고리: {category}
- 난이도: {difficulty}
- 단어 수: 가로 {count}개 × 세로 {count}개 = 총 {count*2}개

생성을 시작합니다...
```

---

## 프로젝트 경로 확인

- 퍼즐 데이터 디렉터리: `public/puzzle-data/`
- 인덱스 파일: `public/puzzle-data/index.json`

`public/puzzle-data/index.json`이 없으면: "Trend Eng 프로젝트 디렉터리에서 실행해 주세요."

---

## 퍼즐 ID 생성

1. `public/puzzle-data/index.json`을 읽어 오늘 날짜(YYYY-MM-DD)의 퍼즐 수 확인
2. 퍼즐 ID 형식: `puzzle-{YYYYMMDD}-{NNN}` (예: `puzzle-20260322-001`)
3. 오늘 날짜 퍼즐이 없으면 `001`부터 시작

---

## 크로스워드 레이아웃 설계

### 단어 선택

주제·카테고리에 맞는 영어 단어 **count × 2개** 선택 (가로 count개 + 세로 count개).

난이도별 단어 길이:
- **easy**: 4~6글자
- **medium**: 5~8글자
- **hard**: 7글자 이상

### 배치 규칙 (필수)

1. **교차 필수**: 모든 단어는 최소 1개 이상 다른 단어와 교차
2. **인접 금지**: 교차점 외 다른 단어 셀과 상하좌우 인접 금지
3. **평행 단어 간격**: 같은 방향 단어 사이 최소 1행/1열 공백
4. **단어 전후 빈칸**: 시작 전 셀, 끝 다음 셀은 반드시 빈칸
5. **교차 글자 일치**: 교차점의 글자는 두 단어에서 동일해야 함

### 배치 절차

1. 가장 긴 단어를 그리드 중앙에 **가로(across)**로 배치
2. 해당 단어의 글자를 교차점으로 삼아 **세로(down)** 단어 count개 배치
3. 세로 단어의 글자를 교차점으로 삼아 추가 **가로** 단어 (count-1)개 배치
4. 각 배치마다 규칙 1~5 즉시 검증, 위반 시 조정

그리드 크기:
- count=3: 8×8
- count=4: 10×10 (권장)
- count=5: 12×12 (최대)

### 번호 배정

그리드를 좌→우, 위→아래 스캔하며 단어 시작 셀 순서대로 번호 배정.
같은 셀에서 가로/세로 동시 시작 시 동일 번호 공유.

---

## JSON 스키마

```json
{
  "version": "1.0",
  "meta": {
    "id": "puzzle-{YYYYMMDD}-{NNN}",
    "title": "{주제} 영어 퀴즈",
    "date": "YYYY-MM-DD",
    "category": "{category}",
    "difficulty": "{difficulty}",
    "source": "{topic}"
  },
  "grid": { "width": {W}, "height": {H} },
  "words": [
    {
      "id": "w1",
      "number": 1,
      "answer": "WORD",
      "clue": "Short, clear English clue (15 words or less).",
      "clue_ko": "한국어 번역 힌트.",
      "direction": "across",
      "startX": 1,
      "startY": 1
    }
  ]
}
```

필드 규칙:
- `answer`: 대문자 영문자만 (A-Z), 2~15글자
- `clue`: **게임 기본 표시** — 짧고 명확한 영어 (15단어 이내)
- `clue_ko`: 한국어 번역 (플레이어가 토글 버튼으로 확인)
- `startX`, `startY`: 1-indexed

---

## 검증

1. **교차 글자 일치**: across의 (startX+offset-1), down의 (startY+offset-1) 글자 일치 확인
2. **인접 충돌**: 각 단어 셀의 인접 셀이 다른 단어에 속하지 않는지 확인
3. **단어 전후 빈칸**: 시작 전/끝 다음 셀이 같은 방향 단어로 채워지지 않았는지 확인
4. **번호 순서**: number가 좌→우, 위→아래 순서인지 확인

검증 실패 시 해당 문제 수정 후 재검증.

---

## 파일 저장

**퍼즐 JSON**: `public/puzzle-data/{puzzle-id}.json`

**인덱스 업데이트** (`public/puzzle-data/index.json`의 `puzzles` 배열에 추가):

```json
{
  "id": "{puzzle-id}",
  "file": "{puzzle-id}.json",
  "title": "{title}",
  "category": "{category}",
  "difficulty": "{difficulty}",
  "date": "{date}",
  "wordCount": {단어 수},
  "source": "{topic}"
}
```

---

## 결과 출력

```
퍼즐 생성 완료!

제목: {title}
ID: {puzzle-id}
단어 목록 ({N}개):
  1. WORD - English clue (한국어 힌트)
  2. ...

게임 링크: /puzzle/play?data=puzzle-data/{puzzle-id}.json
퍼즐 목록: /puzzle
```

---

## 오류 처리

- 인덱스 파일 없음: "Trend Eng 프로젝트 디렉터리에서 실행해 주세요."
- 단어 배치 실패(5회 재시도): 다른 단어 조합으로 재시도
- JSON 검증 실패: 실패 규칙과 해당 단어 명시 후 수정

---

## 사용 예시

```
/puzzle AI기술 tech hard 5    → 가로 5개, 세로 5개, 총 10단어
/puzzle 생활영어 easy 3       → 가로 3개, 세로 3개, 총 6단어
/puzzle 스포츠 sports medium  → 기본 3개씩
/puzzle                        → 기본값: 오늘의 트렌드, general, medium, 3
```

생성된 퍼즐은 `/puzzle` 목록 페이지에서 즉시 플레이 가능.
