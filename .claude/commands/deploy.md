---
name: deploy
description: >
  aieng 서버에 배포합니다. 사용자가 "배포", "deploy", "서버 재시작", "git 최신화",
  "서버에 반영", "push 반영" 등을 요청할 때 사용합니다.
  SSH로 43.106.114.167에 접속해 git pull 후 서버를 재시작합니다.
license: Apache-2.0
allowed-tools: Bash
user-invocable: true
metadata:
  version: "1.2.0"
  category: "devops"
  status: "active"
  updated: "2026-04-10"
  tags: "deploy, ssh, git, restart, server"
  author: "Trend Eng Team"
---

# Deploy - aieng 서버 배포

원격 서버(43.106.114.167)에 SSH 접속하여 최신 코드를 반영하고 서버를 재시작합니다.

## 서버 환경

- **접속**: `ssh root@43.106.114.167` (키 인증, ~/.ssh/id_ed25519)
- **경로**: `~/aieng`
- **실행 방식**: `screen -dmS aieng` 세션에서 `npm start`

## 실행 절차

### 1단계: git pull

```bash
ssh -o StrictHostKeyChecking=no root@43.106.114.167 "cd ~/aieng && git stash && git pull origin master 2>&1"
```

결과 확인:
- `Already up to date.` → 최신 상태
- 파일 변경 목록 → 업데이트 성공
- 오류 → 사용자에게 알리고 중단

### 2단계: 서버 재시작

**주의**: nginx(SSL 프록시)는 절대 건드리지 않음. Node.js(포트 8001)만 재시작.

```bash
ssh -o StrictHostKeyChecking=no root@43.106.114.167 "
  screen -S aieng -X quit 2>/dev/null || true
  kill -9 \$(lsof -ti:8001) 2>/dev/null || true
  sleep 1
  cd ~/aieng
  screen -dmS aieng bash -c 'PORT=8001 npm start > server.log 2>&1'
  sleep 4
  ss -tlnp | grep ':8001' && echo SERVER_RUNNING || (echo FAILED && tail -10 ~/aieng/server.log)
"
```

`SERVER_RUNNING` 확인 시 성공.

### 3단계: 결과 출력

성공 시:
```
배포 완료!

서버: 43.106.114.167
브랜치: master
상태: 서버 재시작 완료

사이트: https://aieng.duckdns.org
```

실패 시: `server.log` 마지막 10줄과 오류 원인 출력

## 오류 처리

- git pull 충돌: 충돌 파일 목록 출력 후 중단
- 포트 충돌(EADDRINUSE): `kill -9 $(lsof -ti:8001)` 으로 Node만 종료 후 재시도 (nginx 건드리지 말 것)
- 서버 미시작: server.log 마지막 10줄 출력
