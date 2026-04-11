// puzzle.js - 퍼즐 목록 페이지 전용 JS

const puzzleContainer = document.getElementById('puzzle-container');

const PAGE_SIZE = 4;

let state = {
    offset: 0,
    total: 0,
    isLoading: false,
};

async function fetchPuzzles(offset = 0) {
    if (state.isLoading) return;
    state.isLoading = true;

    if (offset === 0) {
        puzzleContainer.innerHTML = '<div class="loading-state">불러오는 중...</div>';
    } else {
        const oldBtn = document.getElementById('load-more-puzzles-btn');
        if (oldBtn) oldBtn.closest('.load-more-container').remove();
    }

    try {
        const url = `${window.API_BASE || ''}/api/puzzles?limit=${PAGE_SIZE}&offset=${offset}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        if (offset === 0 && (!data.puzzles || data.puzzles.length === 0)) {
            puzzleContainer.innerHTML = `
                <div class="trends-empty-state">
                    <div class="empty-icon">🧩</div>
                    <h3>아직 퍼즐이 없습니다</h3>
                    <p>스킬로 퍼즐을 생성해보세요!</p>
                </div>`;
            return;
        }

        state.total = data.total || 0;
        state.offset = offset + (data.puzzles ? data.puzzles.length : 0);

        if (offset === 0) {
            puzzleContainer.innerHTML = '';
        }

        renderPuzzles(data.puzzles || [], offset === 0);
        renderMoreButton();
    } catch (e) {
        console.error('Failed to fetch puzzles:', e);
        if (offset === 0) puzzleContainer.innerHTML = '<div class="trends-empty-state">불러오기 실패</div>';
    } finally {
        state.isLoading = false;
    }
}

let _newBadgeShown = false;

function renderPuzzles(puzzles, isFirstPage) {
    if (isFirstPage) _newBadgeShown = false;

    puzzles.forEach((p) => {
        const isNew = !_newBadgeShown;
        _newBadgeShown = true;

        const dateTimeStr = p.createdAt ? (() => {
            const d = new Date(p.createdAt.replace(' ', 'T') + 'Z');
            const yyyy = d.getFullYear();
            const mm   = String(d.getMonth() + 1).padStart(2, '0');
            const dd   = String(d.getDate()).padStart(2, '0');
            const hh   = String(d.getHours()).padStart(2, '0');
            const mi   = String(d.getMinutes()).padStart(2, '0');
            return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
        })() : (p.date || '');

        const card = document.createElement('div');
        card.className = 'realtime-trend-card';
        card.innerHTML = `
            <div class="trend-card-meta">
                <span class="ai-badge">AI 생성</span>
                ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                ${dateTimeStr ? `<span class="trend-card-time">${dateTimeStr}</span>` : ''}
            </div>
            <h4 class="trend-card-title">${p.title}</h4>
            <button class="trend-start-btn">퍼즐 시작 →</button>`;

        card.querySelector('.trend-start-btn').addEventListener('click', () => {
            window.location.href = `/puzzle-play.html?id=${p.id}`;
        });

        puzzleContainer.appendChild(card);
    });
}

function renderMoreButton() {
    if (state.offset >= state.total) return;

    const remaining = state.total - state.offset;
    const moreBtnContainer = document.createElement('div');
    moreBtnContainer.className = 'load-more-container';
    moreBtnContainer.innerHTML = `
        <button id="load-more-puzzles-btn" class="load-more-btn">
            <span>이전 퍼즐 더보기</span>
            <span class="more-count">(${remaining}개 더 있음)</span>
        </button>`;
    puzzleContainer.appendChild(moreBtnContainer);
    document.getElementById('load-more-puzzles-btn').addEventListener('click', () => {
        fetchPuzzles(state.offset);
    });
}

fetchPuzzles(0);
