// punchline.js - 명대사 목록 페이지 전용 JS

const punchlineContainer = document.getElementById('punchline-container');

const PAGE_SIZE = 4;

const TYPE_ICONS = {
    'Movie':     '🎬',
    'Animation': '🎨',
    'Drama':     '📺',
    'Song':      '🎵',
};

const TYPE_LABELS = {
    'Movie':     '영화',
    'Animation': '애니',
    'Drama':     '드라마',
    'Song':      '팝송',
};

function getTypeInfo(title) {
    for (const [key, icon] of Object.entries(TYPE_ICONS)) {
        if (title.startsWith(key + ':')) {
            return { icon, label: TYPE_LABELS[key], key };
        }
    }
    return { icon: '🎬', label: '명대사', key: '' };
}

let state = {
    offset: 0,
    total: 0,
    isLoading: false,
};

async function fetchPunchlines(offset = 0) {
    if (state.isLoading) return;
    state.isLoading = true;

    if (offset === 0) {
        punchlineContainer.innerHTML = '<div class="loading-state">불러오는 중...</div>';
    } else {
        const oldBtn = document.getElementById('load-more-punchline-btn');
        if (oldBtn) oldBtn.closest('.load-more-container').remove();
    }

    try {
        const url = `${window.API_BASE || ''}/api/punchline/saved?limit=${PAGE_SIZE}&offset=${offset}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (offset === 0 && (!data.items || data.items.length === 0)) {
            punchlineContainer.innerHTML = `
                <div class="trends-empty-state">
                    <div class="empty-icon">🎬</div>
                    <h3>저장된 명대사가 없습니다</h3>
                    <p>Gemini에서 /punchline 스킬을 실행해 콘텐츠를 추가해보세요!</p>
                </div>`;
            return;
        }

        state.total = data.total || 0;
        state.offset = offset + (data.items ? data.items.length : 0);

        if (offset === 0) {
            punchlineContainer.innerHTML = '';
        }

        renderPunchlines(data.items || [], offset === 0);
        renderMoreButton();
    } catch (e) {
        console.error('Failed to fetch punchlines:', e);
        if (offset === 0) punchlineContainer.innerHTML = '<div class="trends-empty-state">불러오기 실패</div>';
    } finally {
        state.isLoading = false;
    }
}

function renderPunchlines(items, isFirstPage) {
    items.forEach((item, idx) => {
        const isNew = isFirstPage && idx === 0;
        const { icon, label } = getTypeInfo(item.title);

        // title에서 type prefix 제거해서 깔끔하게 표시
        const displayTitle = item.title.replace(/^(Movie|Animation|Drama|Song):\s*/, '');

        const card = document.createElement('div');
        card.className = 'realtime-trend-card trend-card-row punchline-card';
        card.innerHTML = `
            <span class="row-date">${item.date || (item.createdAt ? item.createdAt.slice(0, 10) : '')}</span>
            <span class="punchline-type-badge">${icon} ${label}</span>
            <span class="row-title">${displayTitle}</span>
            ${isNew ? '<span class="new-badge">NEW</span>' : ''}
            <span class="ai-badge">AI 생성</span>
            <button class="trend-start-btn">학습 시작 →</button>`;

        card.querySelector('.trend-start-btn').addEventListener('click', () => {
            window.location.href = `/learn.html?id=${item.id}&source=songs`;
        });

        punchlineContainer.appendChild(card);
    });
}

function renderMoreButton() {
    if (state.offset >= state.total) return;

    const remaining = state.total - state.offset;
    const moreBtnContainer = document.createElement('div');
    moreBtnContainer.className = 'load-more-container';
    moreBtnContainer.innerHTML = `
        <button id="load-more-punchline-btn" class="load-more-btn">
            <span>이전 명대사 더보기</span>
            <span class="more-count">(${remaining}개 더 있음)</span>
        </button>`;
    punchlineContainer.appendChild(moreBtnContainer);
    document.getElementById('load-more-punchline-btn').addEventListener('click', () => {
        fetchPunchlines(state.offset);
    });
}

fetchPunchlines(0);
