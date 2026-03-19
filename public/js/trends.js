// trends.js - 트렌드 목록 페이지 전용 JS

const realtimeTrendsContainer = document.getElementById('realtime-trends-container');

// 카테고리 정규화: DB에 이미 저장된 영어 카테고리도 한글로 표시
const _CAT_MAP = {
    'ENTERTAINMENT':'연애','Entertainment':'연애','entertainment':'연애',
    'SPORTS':'스포츠','Sports':'스포츠','sports':'스포츠',
    'TECHNOLOGY':'테크','Technology':'테크','technology':'테크','TECH':'테크','Tech':'테크','tech':'테크',
    'POLITICS':'정치','Politics':'정치','politics':'정치',
    'FINANCE':'금융','Finance':'금융','finance':'금융','BUSINESS':'금융','Business':'금융',
    'GENERAL':'일반','General':'일반','general':'일반',
};
function normCat(cat) {
    if (!cat) return '일반';
    const p = String(cat).split('/')[0].trim();
    return _CAT_MAP[p] || _CAT_MAP[cat] || cat;
}

let trendsPagination = {
    allDates: [],
    groups: {},
    currentPage: 0,
    itemsPerPage: 3
};

async function fetchRealtimeTrends() {
    try {
        const resp = await fetch('/api/trends/saved');
        const data = await resp.json();
        if (data.trends && Array.isArray(data.trends) && data.trends.length > 0) {
            renderRealtimeTrends(data.trends);
        } else {
            showEmptyState();
        }
    } catch (e) {
        console.error('Error fetching trends:', e);
        showEmptyState();
    }
}

function showEmptyState() {
    realtimeTrendsContainer.innerHTML = `
        <div class="trends-empty-state">
            <div class="empty-icon">🔍</div>
            <h3>아직 트렌드가 없습니다</h3>
            <p>데이터 관리 페이지에서 '실시간 트렌드 수집 시작'을 눌러 최신 트렌드를 가져오세요!</p>
            <button class="go-settings-btn" onclick="window.location.href='/data.html'">데이터 관리로 이동</button>
        </div>`;
}

function renderRealtimeTrends(trends) {
    realtimeTrendsContainer.innerHTML = '';
    trendsPagination.groups = {};
    trends.forEach(item => {
        const date = item.date || '기타';
        if (!trendsPagination.groups[date]) trendsPagination.groups[date] = [];
        trendsPagination.groups[date].push(item);
    });
    trendsPagination.allDates = Object.keys(trendsPagination.groups).sort((a, b) => b.localeCompare(a));
    trendsPagination.currentPage = 0;
    renderNextPage();
}

function renderNextPage() {
    const start = trendsPagination.currentPage * trendsPagination.itemsPerPage;
    const end   = start + trendsPagination.itemsPerPage;
    const dates = trendsPagination.allDates.slice(start, end);

    if (dates.length === 0 && trendsPagination.currentPage === 0) {
        realtimeTrendsContainer.innerHTML = '<div class="trends-empty-state">트렌드가 없습니다.</div>';
        return;
    }

    const oldMoreBtn = document.getElementById('load-more-trends-btn');
    if (oldMoreBtn) oldMoreBtn.remove();

    const today = new Date().toISOString().split('T')[0];

    dates.forEach(date => {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'trends-date-header';
        const displayDate = date === today ? `오늘 (${date})` : date;
        dateHeader.innerHTML = `<h3>📅 ${displayDate}</h3>`;
        realtimeTrendsContainer.appendChild(dateHeader);

        const dateGrid = document.createElement('div');
        dateGrid.className = 'trends-date-grid';

        const sorted = trendsPagination.groups[date].sort((a, b) => (a.category || '').localeCompare(b.category || ''));
        sorted.forEach(item => {
            const card = document.createElement('div');
            card.className = 'realtime-trend-card';

            const keywords = item.keywords ? JSON.parse(item.keywords) : [];
            const kwHtml   = keywords.map(kw => `<span class="trend-keyword">${kw}</span>`).join('');
            const _cat = normCat(item.category);
            const catClass = `cat-${_cat.replace(/\s+/g, '')}`;

            card.innerHTML = `
                <div class="trend-card-top">
                    <span class="trend-category ${catClass}">${_cat}</span>
                </div>
                <div class="trend-card-body">
                    <h4 class="trend-card-title">${item.title}</h4>
                    ${kwHtml ? `<div class="trend-card-keywords">${kwHtml}</div>` : ''}
                </div>
                <div class="trend-card-footer">
                    <button class="trend-start-btn">학습 시작 →</button>
                </div>`;

            card.querySelector('.trend-start-btn').addEventListener('click', () => {
                window.location.href = `/learn?id=${item.id}&source=trends`;
            });

            dateGrid.appendChild(card);
        });

        realtimeTrendsContainer.appendChild(dateGrid);
    });

    if (end < trendsPagination.allDates.length) {
        const moreBtnContainer = document.createElement('div');
        moreBtnContainer.className = 'load-more-container';
        moreBtnContainer.innerHTML = `
            <button id="load-more-trends-btn" class="load-more-btn">
                <span>이전 트렌드 더보기</span>
                <span class="more-count">(${trendsPagination.allDates.length - end}일치 더 있음)</span>
            </button>`;
        realtimeTrendsContainer.appendChild(moreBtnContainer);
        document.getElementById('load-more-trends-btn').addEventListener('click', () => {
            trendsPagination.currentPage++;
            renderNextPage();
        });
    }
}

fetchRealtimeTrends();
