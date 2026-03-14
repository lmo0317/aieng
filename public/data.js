// 데이터 관리 페이지 전용 JS
const manageSongsList = document.getElementById('manage-songs-list');
const manageTrendsList = document.getElementById('manage-trends-list');

// 페이지 로드 시 즉시 데이터 로드
document.addEventListener('DOMContentLoaded', () => {
    loadManagementLists();
});

// 관리 데이터 로드
async function loadManagementLists() {
    manageSongsList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">로딩 중...</p>';
    manageTrendsList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">로딩 중...</p>';

    try {
        // 팝송 가져오기
        const songsResp = await fetch('/api/songs/saved');
        const songsData = await songsResp.json();
        renderManageList(manageSongsList, songsData.songs || [], 'song');

        // 뉴스 트렌드 가져오기
        const trendsResp = await fetch('/api/trends/saved');
        const trendsData = await trendsResp.json();
        renderTrendsByDate(manageTrendsList, trendsData.trends || []);
    } catch (err) {
        console.error('Failed to load management lists:', err);
        showToast('데이터를 불러오는데 실패했습니다.', 'error');
    }
}

// 팝송 리스트 렌더링 (기존 방식 유지)
function renderManageList(container, items, type) {
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">저장된 ${type === 'song' ? '팝송이' : '트렌드가'} 없습니다.</p>`;
        return;
    }

    items.forEach(item => {
        const itemDiv = createItemElement(item, type);
        container.appendChild(itemDiv);
    });
}

// 뉴스 트렌드 날짜별 렌더링
function renderTrendsByDate(container, items) {
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">저장된 트렌드가 없습니다.</p>`;
        return;
    }

    // 날짜별로 그룹화
    const groups = {};
    items.forEach(item => {
        const date = item.date || '날짜 미지정';
        if (!groups[date]) groups[date] = [];
        groups[date].push(item);
    });

    // 날짜 역순으로 정렬하여 표시
    const sortedDates = Object.keys(groups).sort().reverse();

    sortedDates.forEach(date => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        dateGroup.style.marginBottom = '2rem';
        dateGroup.style.padding = '15px';
        dateGroup.style.background = '#fff';
        dateGroup.style.borderRadius = '15px';
        dateGroup.style.border = '1px solid #e2e8f0';

        // 날짜 헤더 및 해당 날짜 삭제 버튼
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '12px';
        header.style.paddingBottom = '10px';
        header.style.borderBottom = '2px solid var(--primary-light)';

        const dateTitle = document.createElement('h4');
        dateTitle.textContent = `📅 ${date}`;
        dateTitle.style.margin = '0';
        dateTitle.style.color = 'var(--text-main)';

        const bulkDelBtn = document.createElement('button');
        bulkDelBtn.innerHTML = '🗑️ 이 날짜 전체 삭제';
        bulkDelBtn.style.padding = '6px 12px';
        bulkDelBtn.style.fontSize = '0.8rem';
        bulkDelBtn.style.background = '#ef4444';
        bulkDelBtn.style.color = 'white';
        bulkDelBtn.style.border = 'none';
        bulkDelBtn.style.borderRadius = '8px';
        bulkDelBtn.style.cursor = 'pointer';
        bulkDelBtn.style.fontWeight = '700';

        bulkDelBtn.onclick = async () => {
            if (confirm(`${date}의 모든 뉴스 데이터를 삭제하시겠습니까?`)) {
                try {
                    const resp = await fetch('/api/trends/clear-today', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date })
                    });
                    if (resp.ok) {
                        showToast(`${date} 데이터가 삭제되었습니다.`);
                        loadManagementLists();
                    } else {
                        showToast('삭제에 실패했습니다.', 'error');
                    }
                } catch (err) {
                    showToast('삭제 중 오류가 발생했습니다.', 'error');
                }
            }
        };

        header.appendChild(dateTitle);
        header.appendChild(bulkDelBtn);
        dateGroup.appendChild(header);

        // 해당 날짜의 아이템들
        const itemsList = document.createElement('div');
        itemsList.style.display = 'flex';
        itemsList.style.flexDirection = 'column';
        itemsList.style.gap = '8px';

        groups[date].forEach(item => {
            const itemDiv = createItemElement(item, 'news');
            itemsList.appendChild(itemDiv);
        });

        dateGroup.appendChild(itemsList);
        container.appendChild(dateGroup);
    });
}

// 개별 아이템 엘리먼트 생성 헬퍼
function createItemElement(item, type) {
    const itemDiv = document.createElement('div');
    itemDiv.style.display = 'flex';
    itemDiv.style.justifyContent = 'space-between';
    itemDiv.style.alignItems = 'center';
    itemDiv.style.padding = '10px 12px';
    itemDiv.style.background = '#f8fafc';
    itemDiv.style.borderRadius = '10px';
    itemDiv.style.border = '1px solid #e2e8f0';

    const infoDiv = document.createElement('div');
    infoDiv.style.display = 'flex';
    infoDiv.style.flexDirection = 'column';
    infoDiv.style.gap = '2px';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = item.title;
    titleSpan.style.fontWeight = '600';
    titleSpan.style.fontSize = '0.95rem';
    titleSpan.style.color = 'var(--text-main)';

    const metaSpan = document.createElement('span');
    metaSpan.textContent = type === 'song' ? `${item.date || ''} | ${item.category || ''}` : `${item.category || ''}`;
    metaSpan.style.fontSize = '0.75rem';
    metaSpan.style.color = 'var(--text-muted)';

    infoDiv.appendChild(titleSpan);
    infoDiv.appendChild(metaSpan);

    const delBtn = document.createElement('button');
    delBtn.innerHTML = '🗑️';
    delBtn.title = '삭제';
    delBtn.style.padding = '5px 8px';
    delBtn.style.background = 'transparent';
    delBtn.style.border = 'none';
    delBtn.style.cursor = 'pointer';
    delBtn.style.fontSize = '1rem';

    delBtn.onclick = async () => {
        if (confirm(`'${item.title}'을(를) 삭제하시겠습니까?`)) {
            try {
                const resp = await fetch(`/api/trends/${item.id}`, { method: 'DELETE' });
                if (resp.ok) {
                    showToast('삭제되었습니다.');
                    loadManagementLists();
                } else {
                    showToast('삭제에 실패했습니다.', 'error');
                }
            } catch (err) {
                showToast('삭제 중 오류가 발생했습니다.', 'error');
            }
        }
    };

    itemDiv.appendChild(infoDiv);
    itemDiv.appendChild(delBtn);
    return itemDiv;
}

// 토스트 메시지 함수
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
