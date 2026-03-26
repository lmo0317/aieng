// 공통 nav: pathname 기반으로 active 클래스 자동 설정 + 로그인 상태 표시
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link[href], .admin-menu-item[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#' && href === path) {
            link.classList.add('active');
        }
        if (href === '/' && (path === '/' || path === '/index.html')) {
            link.classList.add('active');
        }
    });

    const adminToggleBtn = document.getElementById('admin-toggle-btn');
    const adminSubmenu = document.getElementById('admin-submenu');

    // 관리자 서브메뉴 토글
    if (adminToggleBtn && adminSubmenu) {
        adminToggleBtn.addEventListener('click', () => {
            adminSubmenu.classList.toggle('hidden');
            adminToggleBtn.classList.toggle('active');
        });

        // 현재 페이지가 관리자 메뉴 항목이면 자동 펼치기
        const adminPaths = ['/settings.html', '/topic', '/chat'];
        if (adminPaths.includes(path)) {
            adminSubmenu.classList.remove('hidden');
            adminToggleBtn.classList.add('active');
        }
    }

    // 로그인 상태 확인 후 nav에 반영
    fetch('/api/auth/status')
        .then(r => r.json())
        .then(data => {
            const authBtn = document.getElementById('nav-auth-btn');

            if (adminToggleBtn) {
                adminToggleBtn.style.display = data.isAdmin ? '' : 'none';
            }

            if (!authBtn) return;
            if (data.loggedIn) {
                authBtn.innerHTML = `<img src="${data.user.picture}" class="nav-avatar" alt="프로필"> <span>${data.user.name.split(' ')[0]}</span>`;
                authBtn.href = '/auth/logout';
                authBtn.title = '로그아웃';
            } else {
                authBtn.innerHTML = '🔑 <span>로그인</span>';
                authBtn.href = '/auth/google';
                authBtn.title = '구글로 로그인';
            }
        })
        .catch(() => {});
});
