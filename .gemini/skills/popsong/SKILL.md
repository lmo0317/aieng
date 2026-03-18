---
name: popsong
description: >
  🎵 팝송 가사 기반 영어 학습 콘텐츠 생성기. 가사 분석, 번역, 문법 설명, 어휘 정리, 퀴즈, 품질 검수, DB 저장을 수행합니다.
---

# 🎵 Popsong Learning - Gemini Pipeline

팝송 가사를 분석하여 문법과 표현을 학습하고 서버에 저장합니다.

## 🛠️ 주요 명령어
1.  **팝송 학습 생성**: `/popsong [제목/가사]` (예: `/popsong Bruno Mars - Die With A Smile`)
    *   **워크플로우**: 
        1. **가사 분석**: 제공되거나 검색된 가사에서 학습 가치가 높은 문장 10개를 선정합니다. (슬랭/관용구/문법 포인트 우선)
        2. **영어 교육 (1타 강사)**: 선정된 가사 문장별 번역, 구조 분석(N형식/S·V·O 태그), 4단계 상세 설명(맥락/문법/뉘앙스/실생활 팁)을 제공합니다.
        3. **퀴즈 생성**: 학습 어휘 기반의 10개 복습 퀴즈를 생성합니다. (4지선다/빈칸채우기 혼합)
        4. **품질 검수 (QA)**: TRUST 5 품질 기준 검증, **한자/Emoji 미포함 확인(필수)**, JSON 구조 무결성을 확인합니다.
        5. **기술 구현 (Save)**: 결과를 JSON으로 저장하고 서버 API(`/api/songs/save`)를 호출하여 DB에 반영합니다.

## 📋 1타 강사 검수 기준 (TRUST 5)
- **Testable**: JSON 파싱 100% 성공, 모든 필수 필드 존재
- **Readable**: 가사 특유의 뉘앙스를 살린 자연스러운 번역
- **Understandable**: Level3 난이도 부합, 문법 설명 4단계 준수
- **Secured**: JSON escape 올바름, **한자/Emoji 절대 미포함**
- **Trackable**: 에러 추적 가능, 검증 로그 존재

## ⚠️ 제약 사항 및 규칙
- **JSON Escape**: 문장 내부에서 Double Quote(`"`) 사용 금지, Single Quote(`'`)만 사용.
- **가사 선정**: 학습 가치가 높은 완성된 문장 위주로 선정하며, 너무 단순한 반복구는 제외합니다.
- **서버 URL**: `.env`의 `SERVER_URL`을 최우선으로 사용하며, 없으면 `http://localhost:80`을 사용합니다.
- **API 키**: `.env`의 `ADMIN_API_KEY`를 `X-Admin-Key` 헤더에 담아 전송합니다.

## 📂 관련 스크립트
- `.gemini/skills/popsong/scripts/save-to-server.js`: 생성된 데이터를 서버 API로 전송
