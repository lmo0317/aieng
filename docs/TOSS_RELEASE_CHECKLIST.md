# 🚀 Toss Apps in Toss 출시 준비 체크리스트

Trend Eng 프로젝트의 토스(Toss) 앱 내 출시를 위한 현재 상태 점검 및 잔여 작업 현황입니다.

## 📊 현재 진행률 요약 (Overall Progress: 85%)
- **UI/UX (TDS 연동)**: 🟢 95% (디자인 시스템 가이드 준수 완료)
- **브릿지 기능 연동**: 🟢 90% (핵심 브릿지 API 연동 완료)
- **백엔드 인증**: 🔴 20% (**Mock 데이터 상태**, 실구현 필요)
- **정책 및 에셋**: 🟢 100% (AI 공시 및 규격 썸네일 준비 완료)

---

## ✅ 완료된 항목 (Completed)

### 1. UI/UX & 디자인 (TDS 적용)
- [x] 모든 페이지(`index`, `learn`, `review`, `songs`, `topic`, `puzzle`)에 **토스 표준 헤더**(`toss-header`) 적용.
- [x] 버튼 및 컴포넌트에 **TDS 스타일 가이드** 반영 (Border-radius 14px/16px, 컬러 시스템 등).
- [x] 토스 전용 로딩 스피너(`toss-loader`) 및 오버레이 구현.
- [x] 웹뷰 **Safe Area** 대응 (상단 노치 및 하단 홈 바 영역 여백 처리).

### 2. 토스 브릿지(Toss Bridge) 연동
- [x] 하드웨어/스와이프 **뒤로가기 버튼** 대응 (`window.toss.bridge.onBackPressed`).
- [x] 네이티브 알림창(`showAlert`) 및 확인창(`showConfirm`) 브릿지 래퍼 함수 구현.
- [x] 앱 종료 처리 (`window.toss.bridge.exit()`) 연동.

### 3. 정책 및 마케팅 에셋
- [x] **AI 사용 고지**: 'Apps in Toss' 정책에 따른 첫 진입 시 AI 안내 바(`ai-notice-bar`) 노출 로직 구현.
- [x] **규격 썸네일**: 앱 노출용 가로형 썸네일(1,932 × 828px) 제작 완료 (`logo/trend-eng-thumbnail-1932x828.png`).

---

## 🛠️ 반드시 해야 할 일 (To-Do: Critical)

### 1. 백엔드 인증 시스템 실구현 (Phase 3) - **최우선 순위**
- [ ] `server/server.js` 내 `/api/toss/auth`의 **Mock 로직 제거**.
- [ ] 토스 인증 서버(`https://api.toss.im/v1/bridge/auth/verify`)와 통신하여 `accessToken` 검증 로직 구현.
- [ ] 인증 성공 시 DB 사용자 정보 생성/업데이트 및 세션 쿠키 발급 로직 연동.

### 2. 환경 변수(Environment Variables) 설정
- [ ] 토스 개발자 센터에서 발급받은 아래 키 값을 `.env`에 등록:
    - `TOSS_CLIENT_ID`: 토스 앱 식별자
    - `TOSS_CLIENT_SECRET`: 인증 검증용 시크릿 키
- [ ] 서버 코드에서 `process.env.TOSS_CLIENT_ID` 등을 참조하도록 수정.

### 3. 브릿지 예외 처리 강화
- [ ] 토스 외부(일반 브라우저) 진입 시 브릿지 호출 에러 방지 로직 보완.
- [ ] 토큰 만료 또는 인증 실패 시 `getAuthToken()` 재호출 로직 점검.

---

## 🧪 테스트 및 최종 검수 (QA)

- [ ] **실기기 테스트**: 실제 iOS/Android 토스 앱의 테스트 환경(Sandbox)에서 전체 학습 흐름 점검.
- [ ] **다크모드 대응**: 토스 앱 내 다크모드 설정 시 텍스트 가독성 및 헤더 배경색 점검.
- [ ] **성능 점검**: 웹뷰 내 이미지 로딩 속도 및 AI 응답 지연 시 사용자 경험(UX) 확인.

---

## 📅 향후 일정 (Roadmap)
1. **D-Day -3**: 백엔드 인증 연동 및 테스트 서버 배포.
2. **D-Day -2**: 토스 개발자 파트너 전용 테스트 환경에서 최종 검수.
3. **D-Day -1**: 최종 승인 요청 및 운영 환경 배포.
