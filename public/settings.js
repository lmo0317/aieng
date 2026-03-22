const modelsForm = document.getElementById('models-form');
const promptForm = document.getElementById('prompt-form');
const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');
const apiStatusBadge = document.getElementById('api-status-badge');
const modelStatusBadge = document.getElementById('model-status-badge');
const systemPromptInput = document.getElementById('system-prompt');
const saveGeminiBtn = document.getElementById('save-gemini-btn');
const deleteGeminiBtn = document.getElementById('delete-gemini-btn');
const resetPromptBtn = document.getElementById('reset-prompt-btn');
const toast = document.getElementById('toast');

// Gemini 모델 목록 (정확한 API ID 맵핑)
const geminiModels = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' }
];

// 모델 선택 옵션 초기화
modelSelect.innerHTML = geminiModels.map(model => 
    `<option value="${model.value}">${model.label}</option>`
).join('');

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();

        // 1. API 상태 요약 배지 업데이트
        if (data.hasApiKey) {
            apiStatusBadge.textContent = '연결됨';
            apiStatusBadge.className = 'status-badge active';
            deleteGeminiBtn.classList.remove('hidden');
        } else {
            apiStatusBadge.textContent = '연결 안 됨';
            apiStatusBadge.className = 'status-badge inactive';
            deleteGeminiBtn.classList.add('hidden');
        }

        // 2. 모델 상태 요약 배지 업데이트
        if (data.model) {
            modelSelect.value = data.model;
            const modelObj = geminiModels.find(m => m.value === data.model);
            modelStatusBadge.textContent = modelObj ? modelObj.label.split(' (')[0] : data.model;
        } else {
            modelStatusBadge.textContent = '미설정';
        }

        // 3. 시스템 프롬프트
        if (data.systemPrompt) {
            systemPromptInput.value = data.systemPrompt;
        }

    } catch (error) {
        console.error('Failed to load settings:', error);
        apiStatusBadge.textContent = '로드 실패';
    }
}

// 모델 저장 핸들러
modelsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const model = modelSelect.value;
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ geminiModel: model })
        });
        if (response.ok) {
            showToast('모델 설정이 적용되었습니다.', 'success');
            await loadSettings();
        }
    } catch (error) {
        showToast('저장에 실패했습니다.', 'error');
    }
});

// API Key 저장 핸들러
saveGeminiBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return showToast('API Key를 입력하세요.', 'error');
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ geminiApiKey: key })
        });
        if (response.ok) {
            showToast('API Key가 저장되었습니다.', 'success');
            apiKeyInput.value = '';
            await loadSettings();
        }
    } catch (error) {
        showToast('저장에 실패했습니다.', 'error');
    }
});

// API Key 삭제 핸들러
deleteGeminiBtn.addEventListener('click', async () => {
    if (!confirm('Gemini API Key를 삭제하시겠습니까?')) return;
    try {
        const response = await fetch('/api/settings', { method: 'DELETE' });
        if (response.ok) {
            showToast('삭제되었습니다.', 'success');
            await loadSettings();
        }
    } catch (error) {
        showToast('삭제 실패.', 'error');
    }
});

// 프롬프트 저장 핸들러
promptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const systemPrompt = systemPromptInput.value.trim();
    if (!systemPrompt) return showToast('프롬프트를 입력하세요.', 'error');
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt })
        });
        if (response.ok) {
            showToast('프롬프트가 저장되었습니다.', 'success');
            await loadSettings();
        }
    } catch (error) {
        showToast('저장 실패.', 'error');
    }
});

// 프롬프트 초기화 핸들러
resetPromptBtn.addEventListener('click', async () => {
    if (!confirm('프롬프트를 초기화하시겠습니까?')) return;
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt: 'RESET' })
        });
        showToast('초기화되었습니다.', 'success');
        await loadSettings();
    } catch (error) {
        showToast('초기화 실패.', 'error');
    }
});

// 데이터 동기화 핸들러
const syncBtn = document.getElementById('sync-btn');
const syncStatus = document.getElementById('sync-status');
const syncProgressFill = document.getElementById('sync-progress-fill');
const syncStatusText = document.getElementById('sync-status-text');
const syncResult = document.getElementById('sync-result');

syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = '동기화 중...';
    syncStatus.classList.remove('hidden');
    syncResult.classList.add('hidden');
    syncProgressFill.style.width = '0%';
    syncStatusText.textContent = 'aieng.cafe24app.com에 연결 중...';

    // 애니메이션용 진행 시뮬레이션
    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 85) { progress += 5; syncProgressFill.style.width = progress + '%'; }
    }, 400);

    try {
        const response = await fetch('/api/sync', { method: 'POST' });
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error(`서버 응답 오류 (${response.status}): 서버를 재시작해주세요.`);
        }
        const data = await response.json();

        clearInterval(progressInterval);
        syncProgressFill.style.width = '100%';

        if (data.success) {
            const r = data.results;
            const errMsg = r.errors && r.errors.length > 0
                ? `<div class="sync-errors">⚠️ 오류: ${r.errors.join(', ')}</div>` : '';
            syncResult.innerHTML = `
                <div class="sync-result-success">
                    <strong>✅ 동기화 완료!</strong>
                    <div class="sync-counts">
                        <span class="sync-count">📰 뉴스 <b>${r.news}개</b> 추가</span>
                        <span class="sync-count">🎵 팝송 <b>${r.songs}개</b> 추가</span>
                        <span class="sync-count">🧩 퍼즐 <b>${r.puzzles}개</b> 추가</span>
                        <span class="sync-count">⏭️ 중복 <b>${r.skipped}개</b> 건너뜀</span>
                    </div>
                    ${errMsg}
                </div>`;
            syncStatusText.textContent = '동기화 완료!';
            showToast(`동기화 완료: 뉴스 ${r.news}개, 팝송 ${r.songs}개, 퍼즐 ${r.puzzles}개 추가됨`, 'success');
        } else {
            syncResult.innerHTML = `<div class="sync-result-error">❌ 동기화 실패: ${data.error}</div>`;
            syncStatusText.textContent = '동기화 실패';
            showToast('동기화에 실패했습니다.', 'error');
        }
        syncResult.classList.remove('hidden');
    } catch (error) {
        clearInterval(progressInterval);
        syncResult.innerHTML = `<div class="sync-result-error">❌ 오류: ${error.message}</div>`;
        syncResult.classList.remove('hidden');
        syncStatusText.textContent = '오류 발생';
        showToast('동기화 중 오류가 발생했습니다.', 'error');
    } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = '🔄 원격 데이터 동기화';
    }
});

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

loadSettings();
