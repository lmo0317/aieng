// songs.js - 팝송 목록 페이지 전용 JS

const songsContainer = document.getElementById('songs-container');

async function fetchSavedSongs() {
    try {
        const resp = await fetch('/api/songs/saved');
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

    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'realtime-trend-card';
        card.innerHTML = `
            <div class="trend-card-top">
                <span class="trend-category cat-연애">POP SONG</span>
            </div>
            <div class="trend-card-body">
                <h4 class="trend-card-title">${song.title}</h4>
            </div>
            <div class="trend-card-footer">
                <button class="trend-start-btn">학습 시작 →</button>
            </div>`;

        card.querySelector('.trend-start-btn').addEventListener('click', () => {
            window.location.href = `/learn?id=${song.id}&source=songs`;
        });

        songsContainer.appendChild(card);
    });
}

fetchSavedSongs();
