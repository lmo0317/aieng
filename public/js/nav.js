// 공통 nav: pathname 기반으로 active 클래스 자동 설정
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#' && href === path) {
            link.classList.add('active');
        }
        // 루트 경로 처리
        if (href === '/' && (path === '/' || path === '/index.html')) {
            link.classList.add('active');
        }
    });
});
