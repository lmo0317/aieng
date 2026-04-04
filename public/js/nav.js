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
        if (href === '/review' && path === '/review.html') {
            link.classList.add('active');
        }
        if (href === '/songs' && path === '/songs.html') {
            link.classList.add('active');
        }
        if (href === '/puzzle' && path === '/puzzle.html') {
            link.classList.add('active');
        }
    });

    // AI 사용 공시 — Toss Apps in Toss 정책: 첫 진입 시 AI 사용 고지
    const NOTICE_KEY = 'trendeng_ai_notice_v1';
    if (!localStorage.getItem(NOTICE_KEY)) {
        const header = document.querySelector('.toss-header');
        if (header) {
            const bar = document.createElement('div');
            bar.className = 'ai-notice-bar';
            bar.style.marginTop = '10px';
            bar.innerHTML = `
                <span>🤖</span>
                <span class="ai-notice-text">이 서비스는 <strong>AI(인공지능)</strong>를 활용하여 콘텐츠를 자동 생성합니다.</span>
                <button class="ai-notice-close" aria-label="닫기">✕</button>`;
            bar.querySelector('.ai-notice-close').addEventListener('click', () => {
                bar.remove();
                localStorage.setItem(NOTICE_KEY, '1');
            });
            header.insertAdjacentElement('afterend', bar);
        }
    }

    // 토스 브리지 연동: 하드웨어 뒤로가기 버튼 대응
    if (window.toss && window.toss.bridge) {
        window.toss.bridge.onBackPressed(() => {
            const path = window.location.pathname;
            if (path === '/' || path === '/index.html') {
                window.toss.bridge.exit();
            } else {
                window.history.back();
            }
        });

        // 토스 인증 연동 (Phase 3)
        checkTossAuth();
    }
});

// 글로벌 알림/확인 함수 (Phase 4: TDS 대응)
window.showAlert = function(message) {
    if (window.toss && window.toss.bridge) {
        window.toss.bridge.showAlert({ message });
    } else {
        alert(message);
    }
};

window.showConfirm = async function(message) {
    if (window.toss && window.toss.bridge) {
        const { result } = await window.toss.bridge.showConfirm({ message });
        return result === 'confirm';
    } else {
        return confirm(message);
    }
};

async function checkTossAuth() {
    if (!window.toss || !window.toss.bridge) return;

    try {
        // 이미 인증된 세션이 있는지 확인 (서버 API 호출)
        const sessionRes = await fetch('/api/user/session');
        const session = await sessionRes.json();

        if (!session.authenticated) {
            // 인증되지 않은 경우 토스 브릿지로 토큰 요청
            const { token } = await window.toss.bridge.getAuthToken();
            if (token) {
                // 서버에 토큰 전달하여 로그인 처리
                const loginRes = await fetch('/api/toss/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                const loginData = await loginRes.json();
                if (loginData.success) {
                    updateUserUI(loginData.user);
                }
            }
        } else {
            updateUserUI(session.user);
        }
    } catch (e) {
        console.error('Toss Auth Error:', e);
    }
}

function updateUserUI(user) {
    // 헤더 등에 사용자 정보 표시 로직 (필요 시 구현)
    console.log('User Authenticated:', user.name);
}

// ─── Admin Check ───────────────────────────────────────────────────
function checkAdminStatus() {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const isAdmin = cookies.some(c => c.startsWith('admin_token='));
    
    if (isAdmin) {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.remove('hidden');
        });
    }
}

document.addEventListener('DOMContentLoaded', checkAdminStatus);
