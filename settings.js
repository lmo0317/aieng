const form = document.getElementById('settings-form');
const apiKeyInput = document.getElementById('api-key');
const deleteBtn = document.getElementById('delete-btn');
const apiStatus = document.getElementById('api-status');
const statusIndicator = apiStatus.querySelector('.status-indicator');
const statusText = apiStatus.querySelector('.status-text');
const currentKeyInfo = document.getElementById('current-key-info');
const keyPreview = document.getElementById('key-preview');
const toast = document.getElementById('toast');

// Load current settings on page load
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');

        if (response.status === 401) {
            window.location.href = '/';
            return;
        }

        const data = await response.json();

        if (data.hasApiKey) {
            statusIndicator.classList.remove('active');
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
    } catch (error) {
        console.error('Failed to load settings:', error);
        statusIndicator.classList.add('inactive');
        statusText.textContent = '설정을 불러오는데 실패했습니다';
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showToast('API Key를 입력해주세요', 'error');
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ glmApiKey: apiKey })
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

// Initial load
loadSettings();
