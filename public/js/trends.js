// trends.js - 트렌드 목록 페이지 전용 JS

const realtimeTrendsContainer = document.getElementById('realtime-trends-container');

// 카테고리 정규화: DB에 이미 저장된 영어 카테고리도 한글로 표시
const _CAT_MAP = {
    'ENTERTAINMENT':'연예','Entertainment':'연예','entertainment':'연예',
    'SPORTS':'스포츠','Sports':'스포츠','sports':'스포츠',
    'TECHNOLOGY':'테크','Technology':'테크','technology':'테크','TECH':'테크','Tech':'테크','tech':'테크',
    'POLITICS':'정치','Politics':'정치','politics':'정치',
    'FINANCE':'금융','Finance':'금융','finance':'금융',
    'BUSINESS':'경제','Business':'경제','business':'경제',
    'ECONOMY':'경제','Economy':'경제','economy':'경제',
    'HEALTH':'건강','Health':'건강','health':'건강',
    'SCIENCE':'과학','Science':'과학','science':'과학',
    'WORLD':'세계','World':'세계','world':'세계',
    'NATION':'국내','Nation':'국내','nation':'국내',
    'GENERAL':'일반','General':'일반','general':'일반',
};
function normCat(cat) {
    if (!cat) return '일반';
    const p = String(cat).split('/')[0].trim();
    return _CAT_MAP[p] || _CAT_MAP[p.toUpperCase()] || _CAT_MAP[cat] || '일반';
}

const PAGE_SIZE = 4;
const TREND_CATEGORY = window.TREND_CATEGORY || null;

let state = {
    offset: 0,
    total: 0,
    isLoading: false,
    hasRendered: false,
};

let _newBadgeShown = false;

async function fetchRealtimeTrends(offset = 0) {
    if (state.isLoading) return;
    state.isLoading = true;

    // 첫 로드면 로딩 스피너 표시
    if (offset === 0) {
        realtimeTrendsContainer.innerHTML = '<div class="loading-state">불러오는 중...</div>';
        _newBadgeShown = false;
    } else {
        const oldMoreBtn = document.getElementById('load-more-trends-btn');
        if (oldMoreBtn) oldMoreBtn.closest('.load-more-container').remove();
    }

    try {
        const catParam = TREND_CATEGORY ? `&category=${encodeURIComponent(TREND_CATEGORY)}` : '';
        const url = `${window.API_BASE || ''}/api/trends/saved?limit=${PAGE_SIZE}&offset=${offset}${catParam}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (offset === 0 && (!data.trends || data.trends.length === 0)) {
            showEmptyState();
            return;
        }

        state.total = data.total || 0;
        state.offset = offset + (data.trends ? data.trends.length : 0);

        if (offset === 0) {
            realtimeTrendsContainer.innerHTML = '';
        }

        renderTrends(data.trends || []);
        renderMoreButton();
    } catch (e) {
        console.error('Error fetching trends:', e);
        if (offset === 0) showEmptyState();
    } finally {
        state.isLoading = false;
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

function renderTrends(trends) {
    const today = new Date().toISOString().split('T')[0];

    // 날짜별 그룹핑
    const groups = {};
    trends.forEach(item => {
        const date = item.date || '기타';
        if (!groups[date]) groups[date] = [];
        groups[date].push(item);
    });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    dates.forEach(date => {
        // 이미 해당 날짜 헤더가 있으면 그 dateGrid에 추가
        let dateGrid = realtimeTrendsContainer.querySelector(`[data-date-grid="${date}"]`);
        if (!dateGrid) {
            const dateHeader = document.createElement('div');
            dateHeader.className = 'trends-date-header';
            const displayDate = date === today ? `오늘 (${date})` : date;
            dateHeader.innerHTML = `<h3>📅 ${displayDate}</h3>`;
            realtimeTrendsContainer.appendChild(dateHeader);

            dateGrid = document.createElement('div');
            dateGrid.className = 'trends-date-grid';
            dateGrid.dataset.dateGrid = date;
            realtimeTrendsContainer.appendChild(dateGrid);
        }

        groups[date].forEach(item => {
            const card = document.createElement('div');
            card.className = 'realtime-trend-card';

            const _cat = normCat(item.category);
            const catClass = `cat-${_cat.replace(/\s+/g, '')}`;
            const dateTimeStr = item.createdAt ? (() => {
                const d = new Date(item.createdAt.replace(' ', 'T') + 'Z');
                const yyyy = d.getFullYear();
                const mm   = String(d.getMonth() + 1).padStart(2, '0');
                const dd   = String(d.getDate()).padStart(2, '0');
                const hh   = String(d.getHours()).padStart(2, '0');
                const mi   = String(d.getMinutes()).padStart(2, '0');
                return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
            })() : '';

            const isNew = !_newBadgeShown;
            _newBadgeShown = true;
            card.innerHTML = `
                <div class="trend-card-meta">
                    <span class="trend-category ${catClass}">${_cat}</span>
                    ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                    <span class="ai-badge">AI 생성</span>
                    ${dateTimeStr ? `<span class="trend-card-time">${dateTimeStr}</span>` : ''}
                </div>
                <h4 class="trend-card-title">${item.title}</h4>
                <button class="trend-start-btn">학습 시작 →</button>`;

            card.querySelector('.trend-start-btn').addEventListener('click', () => {
                window.location.href = `/learn.html?id=${item.id}&source=trends`;
            });

            dateGrid.appendChild(card);
        });
    });
}

function renderMoreButton() {
    if (state.offset >= state.total) return;

    const remaining = state.total - state.offset;
    const moreBtnContainer = document.createElement('div');
    moreBtnContainer.className = 'load-more-container';
    moreBtnContainer.innerHTML = `
        <button id="load-more-trends-btn" class="load-more-btn">
            <span>이전 트렌드 더보기</span>
            <span class="more-count">(${remaining}개 더 있음)</span>
        </button>`;
    realtimeTrendsContainer.appendChild(moreBtnContainer);
    document.getElementById('load-more-trends-btn').addEventListener('click', () => {
        fetchRealtimeTrends(state.offset);
    });
}

fetchRealtimeTrends(0);
