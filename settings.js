const form = document.getElementById('settings-form');
const promptForm = document.getElementById('prompt-form');
const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');
const chatModelSelect = document.getElementById('chat-model-select');
const systemPromptInput = document.getElementById('system-prompt');
const deleteBtn = document.getElementById('delete-btn');
const resetPromptBtn = document.getElementById('reset-prompt-btn');
const apiStatus = document.getElementById('api-status');
const statusIndicator = apiStatus.querySelector('.status-indicator');
const statusText = apiStatus.querySelector('.status-text');
const currentKeyInfo = document.getElementById('current-key-info');
const keyPreview = document.getElementById('key-preview');
const modelPreview = document.getElementById('model-preview');
const currentModelBadge = document.getElementById('current-model-badge');
const currentChatModelBadge = document.getElementById('current-chat-model-badge');
const toast = document.getElementById('toast');

const models = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (학습 권장)' },
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (최신/속도최적)' }
];

const chatModels = [
    { value: 'gemini-2.5-flash-native-audio', label: 'Gemini 2.5 Flash Native Audio (대화 권장/무료)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }
];

const modelNames = {
    'gemini-3.1-flash-lite-preview': 'Gemini 3.1 Flash Lite',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-flash-native-audio': 'Gemini 2.5 Flash Native Audio'
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

loadSettings();
