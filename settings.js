const form = document.getElementById('settings-form');
const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');
const deleteBtn = document.getElementById('delete-btn');
const apiStatus = document.getElementById('api-status');
const statusIndicator = apiStatus.querySelector('.status-indicator');
const statusText = apiStatus.querySelector('.status-text');
const currentKeyInfo = document.getElementById('current-key-info');
const keyPreview = document.getElementById('key-preview');
const modelPreview = document.getElementById('model-preview');
const currentModelBadge = document.getElementById('current-model-badge');
const toast = document.getElementById('toast');
const usageInfo = document.getElementById('usage-info');
const providerTabs = document.querySelectorAll('.provider-tab');

const providerConfig = {
    glm: {
        name: 'z.ai (GLM)',
        apiKeyLabel: 'z.ai API Key',
        apiKeyPlaceholder: 'sk-...',
        apiKeyHelp: 'API Key는 <a href="https://open.bigmodel.cn/usercenter/apikeys" target="_blank">z.ai 콘솔</a>에서 발급받을 수 있습니다.',
        modelHelp: '💡 <strong>GLM-4.7-Flash</strong>는 무료로 사용할 수 있는 모델입니다.',
        models: [
            { value: 'glm-4.7-flash', label: 'GLM-4.7-Flash (무료, 권장)' },
            { value: 'glm-4.7', label: 'GLM-4.7' }
        ]
    },
    groq: {
        name: 'Groq',
        apiKeyLabel: 'Groq API Key',
        apiKeyPlaceholder: 'gsk_...',
        apiKeyHelp: 'API Key는 <a href="https://console.groq.com/keys" target="_blank">Groq 콘솔</a>에서 발급받을 수 있습니다.',
        modelHelp: '💡 Groq는 매우 빠른 추론 속도를 제공합니다.',
        models: [
            { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (권장)' },
            { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7b' },
            { value: 'gemma2-9b-it', label: 'Gemma 2 9B' }
        ]
    }
};

const modelNames = {
    'glm-4.7-flash': 'GLM-4.7-Flash (무료)',
    'glm-4.7': 'GLM-4.7',
    'llama-3.3-70b-versatile': 'Llama 3.3 70B',
    'mixtral-8x7b-32768': 'Mixtral 8x7b',
    'gemma2-9b-it': 'Gemma 2 9B'
};

const modelBadgeClasses = {
    'glm-4.7-flash': 'flash',
    'glm-4.7': 'glm',
    'llama-3.3-70b-versatile': 'groq',
    'mixtral-8x7b-32768': 'groq',
    'gemma2-9b-it': 'groq'
};

let currentProvider = 'glm';

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();

        currentProvider = data.provider || 'glm';
        updateProviderUI(currentProvider);

        if (data.hasApiKey) {
            statusIndicator.classList.remove('inactive');
            statusIndicator.classList.add('active');
            statusText.textContent = 'API Key가 설정됨';
            currentKeyInfo.classList.remove('hidden');
            keyPreview.textContent = data.apiKeyPreview;
            deleteBtn.classList.remove('hidden');
        } else {
            statusIndicator.classList.remove('inactive');
            statusText.textContent = 'API Key가 설정되지 않음';
            currentKeyInfo.classList.add('hidden');
            deleteBtn.classList.add('hidden');
        }

        if (data.model) {
            modelSelect.value = data.model;
            modelPreview.textContent = modelNames[data.model] || data.model;
            updateModelBadge(data.model);
        } else {
            let defaultModel;
            if (currentProvider === 'glm') {
                defaultModel = 'glm-4.7-flash';
            } else if (currentProvider === 'groq') {
                defaultModel = 'llama-3.3-70b-versatile';
            }
            modelPreview.textContent = modelNames[defaultModel];
            updateModelBadge(defaultModel);
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        statusIndicator.classList.add('inactive');
        statusText.textContent = '설정을 불러오는데 실패했습니다';
    }
}

async function loadUsage() {
    try {
        const response = await fetch('/api/usage');
        const data = await response.json();

        if (data.error) {
            usageInfo.textContent = data.error;
            return;
        }

        if (data.provider === 'groq') {
            usageInfo.textContent = 'Groq는 사용량 확인 기능을 제공하지 않습니다.';
            return;
        }

        let displayStr = '';

        function formatResetTime(timestamp) {
            if (!timestamp) return ' | 갱신: -';
            const date = new Date(timestamp);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return ` | 갱신: ${month}.${day} ${hours}:${minutes}`;
        }

        let limitsArray = null;
        if (data.data && data.data.limits) {
            limitsArray = data.data.limits;
        } else if (data.limits) {
            limitsArray = data.limits;
        }

        if (limitsArray && limitsArray.length > 0) {
            let strParts = limitsArray.map(lim => {
                let label = '';
                if (lim.type === 'TIME_LIMIT') {
                    label = 'Monthly';
                } else if (lim.type === 'TOKENS_LIMIT') {
                    label = '5 Hours';
                } else {
                    label = 'Quota';
                }

                const consumed = lim.consumed ?? lim.currentValue ?? 0;
                let limitStr = lim.limit ?? lim.usage;
                const resetStr = formatResetTime(lim.nextResetTime);

                let displayVal = '';
                if (lim.percentage !== undefined) {
                    displayVal = `${lim.percentage}%`;
                } else if (limitStr !== undefined && limitStr !== '?') {
                    displayVal = `${Math.round((consumed / limitStr) * 100)}%`;
                } else {
                    displayVal = `${consumed}`;
                }

                return `<strong>[${label}]</strong> ${displayVal}${resetStr}`;
            });

            displayStr = strParts.reverse().join('<br>');
            usageInfo.innerHTML = displayStr;
        } else if (data.consumed !== undefined || data.currentValue !== undefined) {
            const consumed = data.consumed ?? data.currentValue ?? 0;
            const limit = data.limit ?? data.usage ?? '?';
            usageInfo.innerHTML = `사용: ${consumed} / ${limit}`;
        } else {
            usageInfo.textContent = '사용량 정보 분석 중...';
        }
    } catch (error) {
        console.error('Failed to fetch usage:', error);
        usageInfo.textContent = '사용량 확인 실패';
    }
}

function updateProviderUI(provider) {
    const config = providerConfig[provider];

    // Update tab styles
    providerTabs.forEach(tab => {
        if (tab.dataset.provider === provider) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update form labels and help text
    document.getElementById('api-key-label').textContent = config.apiKeyLabel;
    apiKeyInput.placeholder = config.apiKeyPlaceholder;
    document.getElementById('api-key-help').innerHTML = config.apiKeyHelp;
    document.getElementById('model-help').innerHTML = config.modelHelp;

    // Update model options
    modelSelect.innerHTML = config.models.map(model =>
        `<option value="${model.value}">${model.label}</option>`
    ).join('');

    // Clear input and hide current key info
    apiKeyInput.value = '';
    currentKeyInfo.classList.add('hidden');
    deleteBtn.classList.add('hidden');
}

// Provider tab click handlers
providerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const newProvider = tab.dataset.provider;
        currentProvider = newProvider;
        updateProviderUI(newProvider);
        statusIndicator.classList.remove('active');
        statusIndicator.classList.add('inactive');
        statusText.textContent = 'API Key가 설정되지 않음';
    });
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (!apiKey) {
        showToast('API Key를 입력해주세요', 'error');
        return;
    }

    const requestBody = { provider: currentProvider };
    if (currentProvider === 'glm') {
        requestBody.glmApiKey = apiKey;
        requestBody.glmModel = model;
    } else if (currentProvider === 'groq') {
        requestBody.groqApiKey = apiKey;
        requestBody.groqModel = model;
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
            await loadUsage();
        } else {
            showToast(data.error || '저장에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('Failed to save settings:', error);
        showToast('저장에 실패했습니다', 'error');
    }
});

deleteBtn.addEventListener('click', async () => {
    if (!confirm('정말로 API Key를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            await loadSettings();
            await loadUsage();
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

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function updateModelBadge(model) {
    currentModelBadge.textContent = `현재: ${modelNames[model] || model}`;
    currentModelBadge.className = 'model-badge ' + (modelBadgeClasses[model] || '');
}

// 모델 선택 시 배지 업데이트
modelSelect.addEventListener('change', () => {
    updateModelBadge(modelSelect.value);
});

loadSettings();
loadUsage();
