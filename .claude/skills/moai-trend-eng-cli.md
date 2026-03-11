---
name: moai-trend-eng-cli
description: >
  Trend Eng 프로젝트의 CLI 도구로 웹 인터페이스와 동일한 뉴스 트렌드 수집 및 팝송 저장 기능을 제공합니다.
  웹의 '실시간 뉴스 트렌드 수집' 버튼과 완전 동일하게 POST /api/trends/fetch API를 호출하고,
  SSE /api/trends/events로 진행 상황을 추적합니다.
license: Apache-2.0
compatibility: Designed for Trend Eng project (D:\work\dev\web\aieng)
allowed-tools: Read Write Edit Bash Grep Glob
user-invocable: true
metadata:
  version: "1.0.0"
  category: "tool"
  status: "active"
  updated: "2026-03-11"
  tags: "trend-eng, news-trends, cli, api"
  argument-hint: "fetch-trends | save-song <title> <lyrics> <difficulty>"

# MoAI Extension: Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 150
  level2_tokens: 3000

# MoAI Extension: Triggers
triggers:
  keywords: ["트렌드", "뉴스", "팝송", "가사", "trends", "fetch", "song"]
  agents: []
  phases: []
---

# Trend Eng CLI Tool

Trend Eng 웹 애플리케이션의 CLI 인터페이스로, 웹과 완전 동일한 기능을 제공합니다.

## 기능

### 1. 실시간 뉴스 트렌드 수집
- 웹의 "실시간 뉴스 트렌드 수집 시작" 버튼과 완전 동일
- `POST /api/trends/fetch` API 호출
- SSE로 진행 상황 실시간 모니터링
- 결과를 SQLite DB에 자동 저장

### 2. 팝송 가사 저장
- 웹의 팝송 저장 기능과 완전 동일
- `POST /api/songs/fetch` API 호출
- AI 분석 후 DB 저장

## 사용법

### 뉴스 트렌드 수집
```bash
# Claude Code CLI에서
fetch trends
```

### 팝송 저장
```bash
# Claude Code CLI에서
save song "Bruno Mars - Die With A Smile" <lyrics> level3
```

## API 엔드포인트

### POST /api/trends/fetch
뉴스 트렌드 수집을 시작합니다.

**Request:**
```json
POST /api/trends/fetch
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "트렌드가 성공적으로 저장되었습니다."
}
```

### SSE /api/trends/events
진행 상황을 실시간으로 받습니다.

**Events:**
- `fetching`: 뉴스 수집 중
- `analyzing`: AI 분석 중
- `generating`: 학습 콘텐츠 생성 중
- `complete`: 완료
- `error`: 오류 발생

### POST /api/songs/fetch
팝송 가사를 저장합니다.

**Request:**
```json
POST /api/songs/fetch
Content-Type: application/json

{
  "title": "Bruno Mars - Die With A Smile",
  "lyrics": "...",
  "difficulty": "level3"
}
```

## 프로젝트 구조

- **서버**: `D:\work\dev\web\aieng\server.js`
- **DB**: `D:\work\dev\web\aieng\database.sqlite`
- **웹 인터페이스**: `D:\work\dev\web\aieng\data.html`

## 웹-CLI 동일성 보장

이 스킬은 웹 인터페이스와 동일한 API를 사용하므로:
- 완전 동일한 데이터 처리
- 완전 동일한 AI 모델 사용
- 완전 동일한 DB 저장
- 웹과 CLI의 결과 완전 일치
