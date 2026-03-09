const modelsForm = document.getElementById('models-form');
const promptForm = document.getElementById('prompt-form');
const apiKeyInput = document.getElementById('api-key');
const glmApiKeyInput = document.getElementById('glm-api-key');
const groqApiKeyInput = document.getElementById('groq-api-key');
const modelSelect = document.getElementById('model-select');
const chatModelSelect = document.getElementById('chat-model-select');
const systemPromptInput = document.getElementById('system-prompt');
const saveGlmBtn = document.getElementById('save-glm-btn');
const deleteGlmBtn = document.getElementById('delete-glm-btn');
const saveGroqBtn = document.getElementById('save-groq-btn');
const deleteGroqBtn = document.getElementById('delete-groq-btn');
const saveGeminiBtn = document.getElementById('save-gemini-btn');
const deleteGeminiBtn = document.getElementById('delete-gemini-btn');
const resetPromptBtn = document.getElementById('reset-prompt-btn');
const fetchTrendsBtn = document.getElementById('fetch-trends-btn');
const viewTrendsBtn = document.getElementById('view-trends-btn');
const apiStatus = document.getElementById('api-status');
const glmApiStatus = document.getElementById('glm-api-status');
const groqApiStatus = document.getElementById('groq-api-status');
const statusIndicator = apiStatus.querySelector('.status-indicator');
const glmStatusIndicator = glmApiStatus.querySelector('.status-indicator');
const groqStatusIndicator = groqApiStatus.querySelector('.status-indicator');
const statusText = apiStatus.querySelector('.status-text');
const glmStatusText = glmApiStatus.querySelector('.status-text');
const groqStatusText = groqApiStatus.querySelector('.status-text');
const glmKeyPreviewInline = document.getElementById('glm-key-preview-inline');
const groqKeyPreviewInline = document.getElementById('groq-key-preview-inline');
const geminiKeyPreviewInline = document.getElementById('gemini-key-preview-inline');
const currentModelInfo = document.getElementById('current-model-info');
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
    { value: 'glm-4.7', label: 'Z.ai GLM 4.7 (한국어 특화 - 1차 추천)' },
    { value: 'openai/gpt-oss-120b', label: 'Groq GPT-OSS 120B (고성능)' },
    { value: 'moonshotai/kimi-k2-instruct', label: 'Groq Kimi K2 (대화 특화)' },
    { value: 'qwen/qwen3-32b', label: 'Groq Qwen 3 32B (고효율)' },
    { value: 'llama-3.3-70b-versatile', label: 'Groq Llama 3.3 70B (초고속 - 2차 추천)' },
    { value: 'llama-3.1-8b-instant', label: 'Groq Llama 3.1 8B Instant (매우 빠름)' },
    { value: 'mixtral-8x7b-32768', label: 'Groq Mixtral 8x7B (고성능)' },
    { value: 'gemma2-9b-it', label: 'Groq Gemma 2 9B (가벼움)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (안정적 - 3차 추천)' },
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (최신)' }
];

const chatModels = [
    { value: 'gemini-2.5-flash-native-audio-latest', label: 'Gemini 2.5 Flash Native Audio (대화 전용/무료)' },
    { value: 'openai/gpt-oss-120b', label: 'Groq GPT-OSS 120B' },
    { value: 'moonshotai/kimi-k2-instruct', label: 'Groq Kimi K2' },
    { value: 'qwen/qwen3-32b', label: 'Groq Qwen 3 32B' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (최신/속도최적)' },
    { value: 'glm-4.7', label: 'Z.ai GLM 4.7 (한국어 특화)' },
    { value: 'llama-3.3-70b-versatile', label: 'Groq Llama 3.3 70B (초고속)' }
];

const modelNames = {
    'glm-4.7': 'Z.ai GLM 4.7',
    'openai/gpt-oss-120b': 'Groq GPT-OSS 120B',
    'moonshotai/kimi-k2-instruct': 'Groq Kimi K2',
    'qwen/qwen3-32b': 'Groq Qwen 3 32B',
    'llama-3.3-70b-versatile': 'Groq Llama 3.3 70B',
    'llama-3.1-8b-instant': 'Groq Llama 3.1 8B Instant',
    'mixtral-8x7b-32768': 'Groq Mixtral 8x7B',
    'gemma2-9b-it': 'Groq Gemma 2 9B',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-3.1-flash-lite-preview': 'Gemini 3.1 Flash Lite',
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

        // GLM API Key 상태 업데이트
        if (data.hasGLMApiKey) {
            glmStatusIndicator.classList.remove('inactive');
            glmStatusIndicator.classList.add('active');
            glmStatusText.textContent = '설정됨';
            glmKeyPreviewInline.textContent = `(${data.glmApiKeyPreview})`;
            deleteGlmBtn.classList.remove('hidden');
        } else {
            glmStatusIndicator.classList.remove('active');
            glmStatusIndicator.classList.add('inactive');
            glmStatusText.textContent = '설정되지 않음';
            glmKeyPreviewInline.textContent = '';
            deleteGlmBtn.classList.add('hidden');
        }

        // Groq API Key 상태 업데이트
        if (data.hasGroqApiKey) {
            groqStatusIndicator.classList.remove('inactive');
            groqStatusIndicator.classList.add('active');
            groqStatusText.textContent = '설정됨';
            groqKeyPreviewInline.textContent = `(${data.groqApiKeyPreview})`;
            deleteGroqBtn.classList.remove('hidden');
        } else {
            groqStatusIndicator.classList.remove('active');
            groqStatusIndicator.classList.add('inactive');
            groqStatusText.textContent = '설정되지 않음';
            groqKeyPreviewInline.textContent = '';
            deleteGroqBtn.classList.add('hidden');
        }

        // Gemini API Key 상태 업데이트
        if (data.hasApiKey) {
            statusIndicator.classList.remove('inactive');
            statusIndicator.classList.add('active');
            statusText.textContent = '설정됨';
            geminiKeyPreviewInline.textContent = `(${data.apiKeyPreview})`;
            deleteGeminiBtn.classList.remove('hidden');
        } else {
            statusIndicator.classList.remove('active');
            statusIndicator.classList.add('inactive');
            statusText.textContent = '설정되지 않음';
            geminiKeyPreviewInline.textContent = '';
            deleteGeminiBtn.classList.add('hidden');
        }

        // 모델 선택 업데이트
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

        // 시스템 프롬프트 업데이트
        if (data.systemPrompt) {
            systemPromptInput.value = data.systemPrompt;
        }

    } catch (error) {
        console.error('Failed to load settings:', error);
        statusIndicator.classList.add('inactive');
        statusText.textContent = '로드 실패';
    }
}

// GLM API Key 저장 버튼 핸들러
saveGlmBtn.addEventListener('click', async () => {
    const glmApiKey = glmApiKeyInput.value.trim();

    if (!glmApiKey) {
        showToast('GLM API Key를 입력해주세요', 'error');
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ glmApiKey })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('GLM API Key가 저장되었습니다.', 'success');
            glmApiKeyInput.value = '';
            await loadSettings();
        } else {
            showToast(data.error || '저장에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to save GLM API Key:', error);
        showToast('저장에 실패했습니다', 'error');
    }
});

// Groq API Key 저장 버튼 핸들러
saveGroqBtn.addEventListener('click', async () => {
    const groqApiKey = groqApiKeyInput.value.trim();

    if (!groqApiKey) {
        showToast('Groq API Key를 입력해주세요', 'error');
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ groqApiKey })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Groq API Key가 저장되었습니다.', 'success');
            groqApiKeyInput.value = '';
            await loadSettings();
        } else {
            showToast(data.error || '저장에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to save Groq API Key:', error);
        showToast('저장에 실패했습니다', 'error');
    }
});

// Gemini API Key 저장 버튼 핸들러
saveGeminiBtn.addEventListener('click', async () => {
    const geminiApiKey = apiKeyInput.value.trim();

    if (!geminiApiKey) {
        showToast('Gemini API Key를 입력해주세요', 'error');
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ geminiApiKey })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Gemini API Key가 저장되었습니다.', 'success');
            apiKeyInput.value = '';
            await loadSettings();
        } else {
            showToast(data.error || '저장에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to save Gemini API Key:', error);
        showToast('저장에 실패했습니다', 'error');
    }
});

// 모델 저장 폼 핸들러
modelsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const model = modelSelect.value;
    const chatModel = chatModelSelect.value;

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                geminiModel: model,
                chatModel: chatModel
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('모델 설정이 저장되었습니다.', 'success');
            await loadSettings();
        } else {
            showToast(data.error || '저장에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to save model settings:', error);
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

// GLM API Key 삭제 버튼 핸들러
deleteGlmBtn.addEventListener('click', async () => {
    if (!confirm('GLM API Key를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch('/api/settings/glm', { method: 'DELETE' });
        const data = await response.json();

        if (response.ok) {
            showToast('GLM API Key가 삭제되었습니다.', 'success');
            await loadSettings();
        } else {
            showToast(data.error || '삭제에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to delete GLM API Key:', error);
        showToast('삭제에 실패했습니다', 'error');
    }
});

// Groq API Key 삭제 버튼 핸들러
deleteGroqBtn.addEventListener('click', async () => {
    if (!confirm('Groq API Key를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch('/api/settings/groq', { method: 'DELETE' });
        const data = await response.json();

        if (response.ok) {
            showToast('Groq API Key가 삭제되었습니다.', 'success');
            await loadSettings();
        } else {
            showToast(data.error || '삭제에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to delete Groq API Key:', error);
        showToast('삭제에 실패했습니다', 'error');
    }
});

// Gemini API Key 삭제 버튼 핸들러
deleteGeminiBtn.addEventListener('click', async () => {
    if (!confirm('Gemini API Key를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch('/api/settings', { method: 'DELETE' });
        const data = await response.json();

        if (response.ok) {
            showToast('Gemini API Key가 삭제되었습니다.', 'success');
            await loadSettings();
        } else {
            showToast(data.error || '삭제에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to delete Gemini API Key:', error);
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
