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

const saveSongBtn = document.getElementById('save-song-btn');
const songTitleInput = document.getElementById('song-title');
const songLyricsInput = document.getElementById('song-lyrics');
const songDifficultySelect = document.getElementById('song-difficulty');
const songProgress = document.getElementById('song-progress');

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
    
    // 진행률 바 표시 및 초기화
    trendsProgress.classList.remove('hidden');
    trendsProgressBar.style.width = '0%';
    trendsProgressBar.style.backgroundColor = '#7c3aed'; // 팝송은 보라색 계열
    trendsProgressText.textContent = '팝송 가사 분석 준비 중...';

    // SSE 연결
    const eventSource = new EventSource('/api/trends/events');

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const { status, message, current, total } = data;

        trendsProgressText.textContent = message;

        if (status === 'analyzing') {
            const progress = total > 0 ? (current / total) * 90 : 50;
            trendsProgressBar.style.width = `${progress}%`;
        } else if (status === 'complete') {
            trendsProgressBar.style.width = '100%';
            showToast(message, 'success');
        } else if (status === 'error') {
            trendsProgressBar.style.width = '100%';
            trendsProgressBar.style.backgroundColor = '#ef4444';
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
                trendsProgress.classList.add('hidden');
                trendsProgressBar.style.backgroundColor = ''; 
            }, 500);
        }, 3500);
    }
});
