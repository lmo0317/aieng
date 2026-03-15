---
name: deploy
description: >
  [카페24 배포 전용] 로컬 변경 사항을 커밋하고 카페24 Node.js 호스팅 서버로 푸시합니다.
  Node v14 호환성 및 DB 보호 규칙을 철저히 준수합니다.
---

# 🚀 Cafe24 Auto-Deployment Skill

이 스킬은 로컬 개발 환경에서 완성된 코드를 카페24 운영 서버로 안전하게 배포하는 워크플로우를 담당합니다.

## 🛠️ 주요 명령어
1.  **배포 실행**: `/deploy` 또는 `/deploy 카페24에 배포해줘`
    *   모든 변경 사항을 스테이징 및 커밋합니다.
    *   `cafe24` 원격 저장소로 `master` 브랜치를 푸시합니다.

## 📋 배포 체크리스트 (Pre-flight Check)
1.  **Node.js 버전**: 서버가 v14임을 인지하고, `node:` 접두사 문법이나 최신 라이브러리 사용을 지양합니다.
2.  **데이터베이스 보호**: `.gitignore`에 `db/database.sqlite`가 포함되어 서버의 DB를 덮어쓰지 않는지 확인합니다.
3.  **포트 설정**: `server.js`의 포트가 `8001` 또는 `process.env.PORT`를 사용 중인지 확인합니다.
4.  **엔트리 포인트**: 루트에 `web.js`가 존재하고 `server/server.js`를 정상적으로 호출하는지 확인합니다.

## 📂 실행 프로세스
1.  **Staging & Commit**: `git add .`, `git commit -m "deploy: [timestamp] update"`
2.  **Push**: `git push cafe24 master`
    *   비밀번호(`woodhair249@`) 자동 입력을 시도하되, 실패 시 사용자에게 수동 입력을 안내합니다.
3.  **Clean up**: 배포를 위해 생성된 임시 스크립트는 즉시 삭제합니다.

## ⚠️ 주의 사항
*   배포 후 카페24 관리 콘솔에서 앱을 **[중지] -> [실행]** 해야 변경 사항이 즉시 반영될 수 있습니다.
*   `.env` 파일은 서버에 올라가지 않으므로, 환경 변수는 카페24 콘솔에서 별도로 관리해야 합니다.
