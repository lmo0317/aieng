document.addEventListener('DOMContentLoaded', async () => {
    const manageSongsList = document.getElementById('manage-songs-list');
    const manageTrendsList = document.getElementById('manage-trends-list');
    const clearTodayBtn = document.getElementById('clearTodayBtn');

    const API_BASE = '/api';
    let adminKey = '';

    // 관리자 키 가져오기
    try {
        const res = await fetch('/api/admin-key');
        const data = await res.json();
        adminKey = data.key;
    } catch (err) {
        console.error('Admin key fetch failed:', err);
    }

    // 데이터 로드 함수
    async function loadData() {
        try {
            // 팝송 로드
            const songRes = await fetch(`${API_BASE}/songs/saved`);
            const songData = await songRes.json();
            renderList(manageSongsList, songData.songs || [], 'song');

            // 뉴스 트렌드 로드
            const trendRes = await fetch(`${API_BASE}/trends/saved`);
            const trendData = await trendRes.json();
            renderList(manageTrendsList, trendData.trends || [], 'trend');
        } catch (err) {
            console.error('Data load failed:', err);
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
            
            const meta = type === 'song' ? `Level: ${item.difficulty}` : `${item.date || '날짜 미지정'} | ${item.category}`;
            
            row.innerHTML = `
                <div class="item-info">
                    <div class="item-title">${item.title}</div>
                    <div class="item-meta">${meta}</div>
                </div>
                <button class="btn-delete" data-id="${item.id}" data-type="${type}">삭제</button>
            `;
            container.appendChild(row);
        });

        // 삭제 이벤트 연결
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const title = e.target.closest('.item-row').querySelector('.item-title').textContent;
                
                if (!confirm(`'${title}' 데이터를 정말 삭제하시겠습니까?`)) return;

                try {
                    const res = await fetch(`${API_BASE}/trends/${id}`, {
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
            const res = await fetch(`${API_BASE}/trends/clear-today`, {
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

    // 초기 로드
    loadData();
});
