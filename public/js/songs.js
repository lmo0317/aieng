// songs.js - 팝송 목록 페이지 전용 JS

const songsContainer = document.getElementById('songs-container');

const PAGE_SIZE = 4;

let state = {
    offset: 0,
    total: 0,
    isLoading: false,
};

async function fetchSavedSongs(offset = 0) {
    if (state.isLoading) return;
    state.isLoading = true;

    if (offset === 0) {
        songsContainer.innerHTML = '<div class="loading-state">불러오는 중...</div>';
    } else {
        const oldBtn = document.getElementById('load-more-songs-btn');
        if (oldBtn) oldBtn.closest('.load-more-container').remove();
    }

    try {
        const url = `${window.API_BASE || ''}/api/songs/saved?limit=${PAGE_SIZE}&offset=${offset}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (offset === 0 && (!data.songs || data.songs.length === 0)) {
            songsContainer.innerHTML = `
                <div class="trends-empty-state">
                    <div class="empty-icon">🎵</div>
                    <h3>저장된 팝송이 없습니다</h3>
                    <p>데이터 관리 페이지에서 새로운 팝송을 추가해보세요!</p>
                    <button class="go-settings-btn" onclick="window.location.href='/data.html'">팝송 추가하러 가기</button>
                </div>`;
            return;
        }

        state.total = data.total || 0;
        state.offset = offset + (data.songs ? data.songs.length : 0);

        if (offset === 0) {
            songsContainer.innerHTML = '';
        }

        renderSongs(data.songs || [], offset === 0);
        renderMoreButton();
    } catch (e) {
        console.error('Failed to fetch songs:', e);
        if (offset === 0) songsContainer.innerHTML = '<div class="trends-empty-state">불러오기 실패</div>';
    } finally {
        state.isLoading = false;
    }
}

function renderSongs(songs, isFirstPage) {
    songs.forEach((song, idx) => {
        const isNew = isFirstPage && idx === 0;
        const card = document.createElement('div');
        card.className = 'realtime-trend-card trend-card-row';
        card.innerHTML = `
            <span class="row-date">${song.date || (song.createdAt ? song.createdAt.slice(0, 10) : '')}</span>
            <span class="row-title">${song.title}</span>
            ${isNew ? '<span class="new-badge">NEW</span>' : ''}
            <span class="ai-badge">AI 생성</span>
            <button class="trend-start-btn">학습 시작 →</button>`;

        card.querySelector('.trend-start-btn').addEventListener('click', () => {
            window.location.href = `/learn.html?id=${song.id}&source=songs`;
        });

        songsContainer.appendChild(card);
    });
}

function renderMoreButton() {
    if (state.offset >= state.total) return;

    const remaining = state.total - state.offset;
    const moreBtnContainer = document.createElement('div');
    moreBtnContainer.className = 'load-more-container';
    moreBtnContainer.innerHTML = `
        <button id="load-more-songs-btn" class="load-more-btn">
            <span>이전 팝송 더보기</span>
            <span class="more-count">(${remaining}개 더 있음)</span>
        </button>`;
    songsContainer.appendChild(moreBtnContainer);
    document.getElementById('load-more-songs-btn').addEventListener('click', () => {
        fetchSavedSongs(state.offset);
    });
}

fetchSavedSongs(0);
