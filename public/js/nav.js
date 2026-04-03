// 공통 nav: pathname 기반으로 active 클래스 자동 설정
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#' && href === path) {
            link.classList.add('active');
        }
        if (href === '/' && (path === '/' || path === '/index.html')) {
            link.classList.add('active');
        }
    });

    // AI 사용 공시 — Toss Apps in Toss 정책: 첫 진입 시 AI 사용 고지
    const NOTICE_KEY = 'trendeng_ai_notice_v1';
    if (!localStorage.getItem(NOTICE_KEY)) {
        const headerSection = document.querySelector('.header-section');
        if (headerSection) {
            const bar = document.createElement('div');
            bar.className = 'ai-notice-bar';
            bar.innerHTML = `
                <span>🤖</span>
                <span class="ai-notice-text">이 서비스는 <strong>AI(인공지능)</strong>를 활용하여 영어 학습 콘텐츠(뉴스 분석, 학습 문장, 퀴즈, 채팅 튜터)를 자동 생성합니다.</span>
                <button class="ai-notice-close" aria-label="닫기">✕</button>`;
            bar.querySelector('.ai-notice-close').addEventListener('click', () => {
                bar.remove();
                localStorage.setItem(NOTICE_KEY, '1');
            });
            headerSection.insertAdjacentElement('afterend', bar);
        }
    }
});
