// API 베이스 URL 설정 (Vite 빌드 시 __API_BASE__ 가 치환됨)
window.API_BASE = (typeof __API_BASE__ !== 'undefined' && __API_BASE__ !== '')
  ? __API_BASE__
  : '';
