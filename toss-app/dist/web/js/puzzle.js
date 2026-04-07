// puzzle.js - 퍼즐 목록 페이지 전용 JS

const puzzleContainer = document.getElementById('puzzle-container');

async function fetchPuzzles() {
    try {
        const res = await fetch((window.API_BASE || '') + '/api/puzzles');
        if (!res.ok) throw new Error('API error');
        const { puzzles } = await res.json();
        renderPuzzles(puzzles || []);
    } catch (e) {
        console.error('Failed to fetch puzzles:', e);
        renderPuzzles([]);
    }
}

function renderPuzzles(puzzles) {
    puzzleContainer.innerHTML = '';

    if (puzzles.length === 0) {
        puzzleContainer.innerHTML = `
            <div class="trends-empty-state">
                <div class="empty-icon">🧩</div>
                <h3>아직 퍼즐이 없습니다</h3>
                <p>스킬로 퍼즐을 생성해보세요!</p>
            </div>`;
        return;
    }

    puzzles.sort((a, b) => b.date.localeCompare(a.date));

    // sort 후 첫 번째가 최신
    const newestPuzzleId = puzzles[0].id;

    puzzles.forEach(p => {
        const isNew = p.id === newestPuzzleId;
        const card = document.createElement('div');
        card.className = 'realtime-trend-card trend-card-row';
        card.innerHTML = `
            <span class="row-date">${p.date || ''}</span>
            <span class="row-title">${p.title}</span>
            ${isNew ? '<span class="new-badge">NEW</span>' : ''}
            <span class="ai-badge">AI 생성</span>
            <button class="trend-start-btn">퍼즐 시작 →</button>`;

        card.querySelector('.trend-start-btn').addEventListener('click', () => {
            window.location.href = `/puzzle-play.html?id=${p.id}`;
        });

        puzzleContainer.appendChild(card);
    });
}

fetchPuzzles();
