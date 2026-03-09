const form = document.getElementById('settings-form');
const promptForm = document.getElementById('prompt-form');
const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');
const chatModelSelect = document.getElementById('chat-model-select');
const systemPromptInput = document.getElementById('system-prompt');
const deleteBtn = document.getElementById('delete-btn');
const resetPromptBtn = document.getElementById('reset-prompt-btn');
const fetchTrendsBtn = document.getElementById('fetch-trends-btn');
const viewTrendsBtn = document.getElementById('view-trends-btn');
const apiStatus = document.getElementById('api-status');
const statusIndicator = apiStatus.querySelector('.status-indicator');
const statusText = apiStatus.querySelector('.status-text');
const currentKeyInfo = document.getElementById('current-key-info');
const keyPreview = document.getElementById('key-preview');
const modelPreview = document.getElementById('model-preview');
const currentModelBadge = document.getElementById('current-model-badge');
const currentChatModelBadge = document.getElementById('current-chat-model-badge');
const toast = document.getElementById('toast');
const trendsStatusText = document.getElementById('trends-status-text');
const trendsCount = document.getElementById('trends-count');
const trendsProgress = document.getElementById('trends-progress');
const trendsProgressBar = document.getElementById('trends-progress-bar');
const trendsProgressText = document.getElementById('trends-progress-text');

const models = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (학습 권장)' },
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (최신/속도최적)' }
];

const chatModels = [
    { value: 'gemini-2.5-flash-native-audio-latest', label: 'Gemini 2.5 Flash Native Audio (대화 전용/무료)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (최신/속도최적)' }
];

const modelNames = {
    'gemini-3.1-flash-lite-preview': 'Gemini 3.1 Flash Lite',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-flash-native-audio-latest': 'Gemini 2.5 Flash Native Audio'
};

// Initialize model select options
modelSelect.innerHTML = models.map(model =>
    `<option value="${model.value}">${model.label}</option>`
).join('');

chatModelSelect.innerHTML = chatModels.map(model =>
    `<option value="${model.value}">${model.label}</option>`
).join('');

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();

        // UI 업데이트를 위해 API 키 존재 여부 확인
        if (data.hasApiKey) {
            statusIndicator.classList.remove('inactive');
            statusIndicator.classList.add('active');
            statusText.textContent = 'API Key가 설정됨';
            currentKeyInfo.classList.remove('hidden');
            keyPreview.textContent = data.apiKeyPreview;
            deleteBtn.classList.remove('hidden');
        } else {
            statusIndicator.classList.remove('active');
            statusIndicator.classList.add('inactive');
            statusText.textContent = 'API Key가 설정되지 않음';
            currentKeyInfo.classList.add('hidden');
            deleteBtn.classList.add('hidden');
        }

        if (data.model) {
            modelSelect.value = data.model;
            updateModelBadge(data.model);
        }

        if (data.chatModel) {
            chatModelSelect.value = data.chatModel;
            updateChatModelBadge(data.chatModel);
        }

        // 현재 선택된 모델 정보 텍스트 업데이트
        const learningModelName = modelNames[data.model] || data.model || '미설정';
        const chatModelName = modelNames[data.chatModel] || data.chatModel || '미설정';
        modelPreview.textContent = `학습: ${learningModelName} / 대화: ${chatModelName}`;

        if (data.systemPrompt) {
            systemPromptInput.value = data.systemPrompt;
        }

    } catch (error) {
        console.error('Failed to load settings:', error);
        statusIndicator.classList.add('inactive');
        statusText.textContent = '설정을 불러오는데 실패했습니다';
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const chatModel = chatModelSelect.value;

    const requestBody = { 
        geminiModel: model,
        chatModel: chatModel
    };

    if (apiKey) {
        requestBody.geminiApiKey = apiKey;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            apiKeyInput.value = '';
            await loadSettings();
        } else {
            showToast(data.error || '저장에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to save settings:', error);
        showToast('저장에 실패했습니다', 'error');
    }
});

promptForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const systemPrompt = systemPromptInput.value.trim();

    if (!systemPrompt) {
        showToast('프롬프트를 입력해주세요', 'error');
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ systemPrompt })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('프롬프트가 저장되었습니다.', 'success');
            await loadSettings();
        } else {
            showToast(data.error || '프롬프트 저장에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to save prompt:', error);
        showToast('프롬프트 저장에 실패했습니다', 'error');
    }
});

resetPromptBtn.addEventListener('click', async () => {
    if (!confirm('프롬프트를 기본값으로 초기화하시겠습니까? (저장된 내용은 삭제됩니다)')) {
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ systemPrompt: 'RESET' }) // Special flag to reset
        });

        const data = await response.json();

        if (response.ok) {
            showToast('기본 프롬프트로 초기화되었습니다.', 'success');
            await loadSettings();
        } else {
            showToast(data.error || '초기화에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to reset prompt:', error);
        showToast('초기화에 실패했습니다', 'error');
    }
});

deleteBtn.addEventListener('click', async () => {
    if (!confirm('정말로 API Key를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch('/api/DELETE') || await fetch('/api/settings', { method: 'DELETE' });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            await loadSettings();
        } else {
            showToast(data.error || '삭제에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to delete settings:', error);
        showToast('삭제에 실패했습니다', 'error');
    }
});

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function updateModelBadge(model) {
    currentModelBadge.textContent = `현재: ${modelNames[model] || model}`;
}

function updateChatModelBadge(model) {
    currentChatModelBadge.textContent = `현재: ${modelNames[model] || model}`;
}

// 모델 선택 시 배지 업데이트
modelSelect.addEventListener('change', () => {
    updateModelBadge(modelSelect.value);
});

chatModelSelect.addEventListener('change', () => {
    updateChatModelBadge(chatModelSelect.value);
});

// 실시간 트렌드 관련 기능
async function loadTrendsStatus() {
    try {
        const response = await fetch('/api/trends/saved');
        const data = await response.json();

        if (data.trends && data.trends.length > 0) {
            trendsStatusText.textContent = `최신 트렌드 ${data.trends.length}개 저장됨`;
            trendsCount.textContent = `저장된 트렌드: ${data.trends.length}개`;
        } else {
            trendsStatusText.textContent = '아직 트렌드가 없습니다';
            trendsCount.textContent = '저장된 트렌드: 0개';
        }
    } catch (error) {
        console.error('Failed to load trends status:', error);
        trendsStatusText.textContent = '트렌드 상태 확인 실패';
        trendsCount.textContent = '저장된 트렌드: 0개';
    }
}

fetchTrendsBtn.addEventListener('click', async () => {
    // API Key 확인
    const settingsResponse = await fetch('/api/settings');
    const settingsData = await settingsResponse.json();

    if (!settingsData.hasApiKey) {
        showToast('먼저 API Key를 설정해주세요', 'error');
        return;
    }

    // 진행 상태 표시
    fetchTrendsBtn.disabled = true;
    fetchTrendsBtn.textContent = '⏳ 트렌드 수집 중...';
    trendsProgress.classList.remove('hidden');
    trendsProgressBar.style.width = '10%';
    trendsProgressText.textContent = '뉴스 트렌드 수집 준비 중...';

    // SSE 연결
    const eventSource = new EventSource('/api/trends/events');

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Trends progress:', data);

        const { status, message, current, total } = data;

        trendsProgressText.textContent = message;

        if (status === 'fetching') {
            // 수집 중: 10-40%
            const progress = total > 0 ? 10 + (current / total) * 30 : 20;
            trendsProgressBar.style.width = `${Math.min(progress, 40)}%`;
        } else if (status === 'analyzing') {
            // 분석 중: 40-70%
            const progress = 40 + (current / total) * 30;
            trendsProgressBar.style.width = `${progress}%`;
        } else if (status === 'saving') {
            // 저장 중: 70-95%
            const progress = 70 + (current / total) * 25;
            trendsProgressBar.style.width = `${progress}%`;
        } else if (status === 'complete') {
            // 완료: 100%
            trendsProgressBar.style.width = '100%';
            trendsProgressText.textContent = `완료! ${current}개의 트렌드를 찾았습니다.`;
        } else if (status === 'error') {
            trendsProgressBar.style.width = '100%';
            trendsProgressBar.style.backgroundColor = '#ef4444';
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

        if (response.ok) {
            showToast(`${data.trends.length}개의 트렌드를 성공적으로 가져왔습니다!`, 'success');

            // 상태 업데이트
            trendsStatusText.textContent = `최신 트렌드 ${data.trends.length}개 저장됨`;
            trendsCount.textContent = `저장된 트렌드: ${data.trends.length}개`;
        } else {
            showToast(data.error || '트렌드를 가져오는 데 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to fetch trends:', error);
        showToast('트렌드를 가져오는 데 실패했습니다', 'error');
    } finally {
        // SSE 연결 종료
        eventSource.close();

        fetchTrendsBtn.disabled = false;
        fetchTrendsBtn.textContent = '🔍 실시간 트렌드 찾기';

        setTimeout(() => {
            trendsProgress.classList.add('hidden');
            trendsProgressBar.style.backgroundColor = ''; // 색상 초기화
        }, 3000);
    }
});

viewTrendsBtn.addEventListener('click', () => {
    window.location.href = '/';
});

loadSettings();
loadTrendsStatus();
