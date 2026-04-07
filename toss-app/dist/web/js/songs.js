// songs.js - 팝송 목록 페이지 전용 JS

const songsContainer = document.getElementById('songs-container');

async function fetchSavedSongs() {
    try {
        const resp = await fetch((window.API_BASE || '') + '/api/songs/saved');
        const data = await resp.json();
        renderSavedSongs(data.songs || []);
    } catch (e) {
        console.error('Failed to fetch songs:', e);
    }
}

function renderSavedSongs(songs) {
    songsContainer.innerHTML = '';

    if (songs.length === 0) {
        songsContainer.innerHTML = `
            <div class="trends-empty-state">
                <div class="empty-icon">🎵</div>
                <h3>저장된 팝송이 없습니다</h3>
                <p>데이터 관리 페이지에서 새로운 팝송을 추가해보세요!</p>
                <button class="go-settings-btn" onclick="window.location.href='/data.html'">팝송 추가하러 가기</button>
            </div>`;
        return;
    }

    // API가 createdAt DESC 정렬이므로 첫 번째가 최신
    const newestSongId = songs[0].id;

    songs.forEach(song => {
        const isNew = song.id === newestSongId;
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

fetchSavedSongs();
