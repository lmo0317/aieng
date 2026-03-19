const CAFE24_API = 'http://aieng.cafe24app.com/api';

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

document.addEventListener('DOMContentLoaded', async () => {
    const manageSongsList = document.getElementById('manage-songs-list');
    const manageTrendsList = document.getElementById('manage-trends-list');
    const clearTodayBtn = document.getElementById('clearTodayBtn');

    let adminKey = '';

    // 관리자 키 가져오기 (Cafe24)
    try {
        const res = await fetch(`${CAFE24_API}/admin-key`);
        const data = await res.json();
        adminKey = data.key;
    } catch (err) {
        console.error('Admin key fetch failed:', err);
    }

    // 데이터 로드
    async function loadData() {
        try {
            const songRes = await fetch(`${CAFE24_API}/songs/saved`);
            const songData = await songRes.json();
            renderList(manageSongsList, songData.songs || [], 'song');

            const trendRes = await fetch(`${CAFE24_API}/trends/saved`);
            const trendData = await trendRes.json();
            renderList(manageTrendsList, trendData.trends || [], 'trend');
        } catch (err) {
            console.error('Data load failed:', err);
            manageSongsList.innerHTML = '<p style="color:#ef4444; padding:20px;">로드 실패 - 서버 연결 확인</p>';
            manageTrendsList.innerHTML = '<p style="color:#ef4444; padding:20px;">로드 실패 - 서버 연결 확인</p>';
        }
    }

    // 리스트 렌더링
    function renderList(container, items, type) {
        container.innerHTML = '';
        if (items.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">데이터가 없습니다.</p>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'item-row';

            const cat = type === 'trend' ? normCat(item.category) : '';
            const meta = type === 'song'
                ? `Level: ${item.difficulty}`
                : `${item.date || '날짜 미지정'} | ${cat}`;

            row.innerHTML = `
                <div class="item-info">
                    <div class="item-title">${item.title}</div>
                    <div class="item-meta">${meta}</div>
                </div>
                <button class="btn-delete" data-id="${item.id}" data-type="${type}">삭제</button>
            `;
            container.appendChild(row);
        });

        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const title = e.target.closest('.item-row').querySelector('.item-title').textContent;

                if (!confirm(`'${title}' 데이터를 정말 삭제하시겠습니까?`)) return;

                try {
                    const res = await fetch(`${CAFE24_API}/trends/${id}`, {
                        method: 'DELETE',
                        headers: { 'x-admin-key': adminKey }
                    });
                    const result = await res.json();
                    if (result.success) {
                        alert('삭제되었습니다.');
                        loadData();
                    } else {
                        alert('삭제 실패: ' + result.error);
                    }
                } catch (err) {
                    alert('에러 발생: ' + err.message);
                }
            });
        });
    }

    // 오늘 뉴스 전체 삭제
    clearTodayBtn.addEventListener('click', async () => {
        const today = new Date().toISOString().split('T')[0];
        if (!confirm(`${today} 날짜의 뉴스 데이터를 모두 삭제하시겠습니까?`)) return;

        try {
            const res = await fetch(`${CAFE24_API}/trends/clear-today`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': adminKey
                },
                body: JSON.stringify({ date: today })
            });
            const result = await res.json();
            if (result.success) {
                alert(`${result.deleted}개의 데이터가 삭제되었습니다.`);
                loadData();
            } else {
                alert('삭제 실패: ' + result.error);
            }
        } catch (err) {
            alert('에러 발생: ' + err.message);
        }
    });

    loadData();
});
