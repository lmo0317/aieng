// 탭 전환 관련
const tabAdd = document.getElementById('tab-add');
const tabManage = document.getElementById('tab-manage');
const sectionAdd = document.getElementById('section-add');
const sectionManage = document.getElementById('section-manage');

const manageSongsList = document.getElementById('manage-songs-list');
const manageTrendsList = document.getElementById('manage-trends-list');

tabAdd.addEventListener('click', () => {
    tabAdd.style.background = 'var(--primary)';
    tabAdd.style.color = 'white';
    tabAdd.style.border = 'none';
    
    tabManage.style.background = 'white';
    tabManage.style.color = 'var(--primary)';
    tabManage.style.border = '2px solid var(--primary)';
    
    sectionAdd.classList.remove('hidden');
    sectionManage.classList.add('hidden');
});

tabManage.addEventListener('click', () => {
    tabManage.style.background = 'var(--primary)';
    tabManage.style.color = 'white';
    tabManage.style.border = 'none';
    
    tabAdd.style.background = 'white';
    tabAdd.style.color = 'var(--primary)';
    tabAdd.style.border = '2px solid var(--primary)';
    
    sectionAdd.classList.add('hidden');
    sectionManage.classList.remove('hidden');
    
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
        renderManageList(manageTrendsList, trendsData.trends || [], 'news');
    } catch (err) {
        console.error('Failed to load management lists:', err);
        showToast('데이터를 불러오는데 실패했습니다.', 'error');
    }
}

function renderManageList(container, items, type) {
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">저장된 ${type === 'song' ? '팝송이' : '트렌드가'} 없습니다.</p>`;
        return;
    }

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.style.display = 'flex';
        itemDiv.style.justifyContent = 'space-between';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.padding = '12px 15px';
        itemDiv.style.background = '#f8fafc';
        itemDiv.style.borderRadius = '10px';
        itemDiv.style.border = '1px solid #e2e8f0';

        const infoDiv = document.createElement('div');
        infoDiv.style.display = 'flex';
        infoDiv.style.flexDirection = 'column';
        infoDiv.style.gap = '4px';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = item.title;
        titleSpan.style.fontWeight = '600';
        titleSpan.style.color = 'var(--text-main)';

        const metaSpan = document.createElement('span');
        metaSpan.textContent = `${item.date || ''} | ${item.category || ''}`;
        metaSpan.style.fontSize = '0.8rem';
        metaSpan.style.color = 'var(--text-muted)';

        infoDiv.appendChild(titleSpan);
        infoDiv.appendChild(metaSpan);

        const delBtn = document.createElement('button');
        delBtn.innerHTML = '🗑️ 삭제';
        delBtn.style.padding = '6px 12px';
        delBtn.style.fontSize = '0.85rem';
        delBtn.style.background = '#fee2e2';
        delBtn.style.color = '#ef4444';
        delBtn.style.border = '1px solid #fecaca';
        delBtn.style.borderRadius = '8px';
        delBtn.style.cursor = 'pointer';
        delBtn.style.fontWeight = '600';

        delBtn.onclick = async () => {
            if (confirm(`'${item.title}'을(를) 삭제하시겠습니까?`)) {
                try {
                    const resp = await fetch(`/api/trends/${item.id}`, { method: 'DELETE' });
                    if (resp.ok) {
                        showToast('삭제되었습니다.');
                        loadManagementLists();
                    }
                } catch (err) {
                    showToast('삭제에 실패했습니다.', 'error');
                }
            }
        };

        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(delBtn);
        container.appendChild(itemDiv);
    });
}

// 기존 로직들...
const fetchTrendsBtn = document.getElementById('fetch-trends-btn');
const trendsProgress = document.getElementById('trends-progress');
const trendsProgressBar = document.getElementById('trends-progress-bar');
const trendsProgressText = document.getElementById('trends-progress-text');

// 토스트 메시지 함수 (style.css/settings.css 의 toast 스타일 재사용을 위해 body에 동적 생성)
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

fetchTrendsBtn.addEventListener('click', async () => {
    // API Key 확인
    const settingsResponse = await fetch('/api/settings');
    const settingsData = await settingsResponse.json();

    const provider = settingsData.model ? (
        settingsData.model.includes('glm') ? 'glm' : 
        settingsData.model.includes('llama') || settingsData.model.includes('mixtral') || settingsData.model.includes('gemma') || settingsData.model.includes('openai') || settingsData.model.includes('qwen') || settingsData.model.includes('kimi') ? 'groq' : 'gemini'
    ) : 'gemini';

    let hasKey = false;
    if (provider === 'glm') hasKey = settingsData.hasGLMApiKey;
    else if (provider === 'groq') hasKey = settingsData.hasGroqApiKey;
    else hasKey = settingsData.hasApiKey;

    if (!hasKey) {
        showToast('먼저 설정 페이지에서 API Key를 설정해주세요', 'error');
        return;
    }

    // 진행 상태 표시
    fetchTrendsBtn.disabled = true;
    fetchTrendsBtn.textContent = '⏳ 트렌드 수집 중...';
    trendsProgress.classList.remove('hidden');
    trendsProgressBar.style.width = '10%';
    trendsProgressBar.style.backgroundColor = ''; 
    trendsProgressText.textContent = '뉴스 트렌드 수집 준비 중...';

    // SSE 연결
    const eventSource = new EventSource('/api/trends/events');

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Trends progress:', data);

        const { status, message, current, total } = data;

        trendsProgressText.textContent = message;

        if (status === 'fetching') {
            const progress = total > 0 ? 10 + (current / total) * 30 : 20;
            trendsProgressBar.style.width = `${Math.min(progress, 40)}%`;
        } else if (status === 'analyzing') {
            const progress = 40 + (current / total) * 25;
            trendsProgressBar.style.width = `${progress}%`;
        } else if (status === 'generating') {
            const progress = 65 + (current / total) * 30;
            trendsProgressBar.style.width = `${progress}%`;
        } else if (status === 'complete') {
            trendsProgressBar.style.width = '100%';
            trendsProgressText.textContent = message;
            showToast(message, 'success');
        } else if (status === 'error') {
            trendsProgressBar.style.width = '100%';
            trendsProgressBar.style.backgroundColor = '#ef4444';
            showToast(message, 'error');
        }
    };

    eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
    };

    try {
        const response = await fetch('/api/trends/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || '트렌드를 가져오는 데 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to fetch trends:', error);
        showToast('트렌드를 가져오는 데 실패했습니다', 'error');
    } finally {
        setTimeout(() => {
            eventSource.close();
            fetchTrendsBtn.disabled = false;
            fetchTrendsBtn.textContent = '🔍 실시간 트렌드 수집 시작';
            
            setTimeout(() => {
                trendsProgress.classList.add('hidden');
                trendsProgressBar.style.backgroundColor = ''; 
            }, 500);
        }, 3500);
    }
});

// Pop Song 관련 요소
const saveSongBtn = document.getElementById('save-song-btn');
const songTitleInput = document.getElementById('song-title');
const songLyricsInput = document.getElementById('song-lyrics');
const songDifficultySelect = document.getElementById('song-difficulty');
const songProgressArea = document.getElementById('song-progress-area');
const songProgressBar = document.getElementById('song-progress-bar');
const songProgressText = document.getElementById('song-progress-text');

saveSongBtn.addEventListener('click', async () => {
    const title = songTitleInput.value.trim();
    const lyrics = songLyricsInput.value.trim();
    const difficulty = songDifficultySelect.value;

    if (!title || !lyrics) {
        showToast('곡 제목과 가사를 모두 입력해주세요', 'error');
        return;
    }

    saveSongBtn.disabled = true;
    saveSongBtn.textContent = '⏳ AI 분석 및 저장 중...';
    
    // 팝송 전용 진행률 바 표시 및 초기화
    songProgressArea.classList.remove('hidden');
    songProgressBar.style.width = '0%';
    songProgressText.textContent = '팝송 가사 분석 준비 중...';

    // SSE 연결
    const eventSource = new EventSource('/api/trends/events');

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const { status, message, current, total } = data;

        // 팝송 전용 텍스트 및 바 업데이트
        songProgressText.textContent = message;

        if (status === 'analyzing') {
            const progress = total > 0 ? (current / total) * 90 : 50;
            songProgressBar.style.width = `${progress}%`;
        } else if (status === 'complete') {
            songProgressBar.style.width = '100%';
            showToast(message, 'success');
        } else if (status === 'error') {
            songProgressBar.style.width = '100%';
            songProgressBar.style.backgroundColor = '#ef4444';
            showToast(message, 'error');
        }
    };

    try {
        const response = await fetch('/api/songs/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, lyrics, difficulty })
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || '저장에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to save song:', error);
        showToast('저장 중 오류가 발생했습니다', 'error');
    } finally {
        setTimeout(() => {
            eventSource.close();
            saveSongBtn.disabled = false;
            saveSongBtn.textContent = '💾 팝송 저장 및 AI 분석 시작';
            
            setTimeout(() => {
                songProgressArea.classList.add('hidden');
                songProgressBar.style.backgroundColor = ''; 
            }, 500);
        }, 3500);
    }
});
