let currentCount = 0;
let sentences = [];

const setupSection = document.getElementById('setup-section');
const reviewSection = document.getElementById('review-section');
const learningSection = document.getElementById('learning-section');
const historyList = document.getElementById('history-list');

const startBtn = document.getElementById('start-btn');
const homeBtn = document.getElementById('home-btn');
const revealBtn = document.getElementById('reveal-btn');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');
const currentCountSpan = document.getElementById('current-count');

const sentenceEn = document.getElementById('sentence-en');
const sentenceKo = document.getElementById('sentence-ko');
const structureDiv = document.getElementById('structure');
const explanationDiv = document.getElementById('explanation');
const vocaDiv = document.getElementById('voca');
const ttsBtn = document.getElementById('tts-btn');

const trendsContainer = document.getElementById('trends-container');
const topicInput = document.getElementById('topic');

const navReview = document.getElementById('nav-review');
const navHome = document.getElementById('nav-home');
const backToMain = document.getElementById('back-to-main');

// 학습 상태 초기화 함수
function resetLearningState() {
    currentCount = 0;
    sentences = [];
    
    // UI 텍스트 초기화
    sentenceEn.textContent = '문장을 불러오는 중...';
    sentenceKo.innerHTML = '';
    structureDiv.innerHTML = '';
    explanationDiv.innerHTML = '';
    vocaDiv.innerHTML = '';
    
    // UI 노출 상태 초기화
    sentenceKo.classList.add('hidden');
    structureDiv.classList.add('hidden');
    explanationDiv.classList.add('hidden');
    vocaDiv.classList.add('hidden');
    
    revealBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
    finishBtn.classList.add('hidden');
    ttsBtn.classList.add('hidden');
    
    currentCountSpan.textContent = '0';
    
    // TTS 중단
    window.speechSynthesis.cancel();
}

// 섹션 전환 유틸리티 (히스토리 지원)
function showSection(sectionId, pushState = true) {
    // 학습 화면에서 나갈 때 상태 초기화
    if (sectionId === 'setup-section' || sectionId === 'review-section') {
        resetLearningState();
    }

    [setupSection, reviewSection, learningSection].forEach(section => {
        if (section) section.classList.add('hidden');
    });
    
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');
    
    window.speechSynthesis.cancel();

    // 브라우저 뒤로가기 버튼 지원을 위해 상태 저장
    if (pushState) {
        history.pushState({ sectionId }, '', '');
    }
}

// 브라우저 뒤로가기/앞으로가기 버튼 감지
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.sectionId) {
        showSection(event.state.sectionId, false);
    } else {
        // 초기 상태 (메인화면)
        showSection('setup-section', false);
    }
});

// 초기 실행 시 현재 상태 저장
history.replaceState({ sectionId: 'setup-section' }, '', '');

// 트랜드 불러오기
async function fetchTrends() {
    try {
        const response = await fetch('/api/trends');
        const data = await response.json();
        
        if (data.trends && Array.isArray(data.trends)) {
            renderTrends(data.trends);
        } else {
            trendsContainer.innerHTML = '<div class="trends-loading">학습 트랜드를 불러올 수 없습니다.</div>';
        }
    } catch (error) {
        console.error('Error fetching trends:', error);
        trendsContainer.innerHTML = '<div class="trends-loading">데이터 연결 상태를 확인해 주세요.</div>';
    }
}

function renderTrends(trends) {
    trendsContainer.innerHTML = '';
    
    trends.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'trend-card';
        
        const categoryClass = `badge-${item.category.toLowerCase()}`;
        
        card.innerHTML = `
            <div class="card-top">
                <span class="card-category ${categoryClass}">${item.category}</span>
            </div>
            <div class="card-title">${item.title}</div>
        `;
        
        card.title = item.title;
        
        card.addEventListener('click', () => {
            topicInput.value = item.title;
            document.querySelectorAll('.trend-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            topicInput.focus();
        });
        trendsContainer.appendChild(card);
    });
}

// 히스토리 불러오기
async function fetchHistory() {
    historyList.innerHTML = '<div class="history-loading">학습 기록을 불러오는 중...</div>';
    try {
        const response = await fetch('/api/history');
        const data = await response.json();
        
        if (data.history && data.history.length > 0) {
            renderHistory(data.history);
        } else {
            historyList.innerHTML = '<div class="history-empty">아직 학습 기록이 없습니다. 새로운 학습을 시작해 보세요!</div>';
        }
    } catch (error) {
        console.error('Error fetching history:', error);
        historyList.innerHTML = '<div class="history-empty">기록을 불러오지 못했습니다.</div>';
    }
}

function renderHistory(history) {
    historyList.innerHTML = '';
    history.forEach(item => {
        const date = new Date(item.createdAt).toLocaleDateString('ko-KR', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        const card = document.createElement('div');
        card.className = 'history-item';
        card.innerHTML = `
            <div class="history-info">
                <div class="history-topic">${item.topic}</div>
                <div class="history-meta">
                    <span class="history-difficulty">${item.difficulty.toUpperCase()}</span>
                    <span class="history-date">📅 ${date}</span>
                </div>
            </div>
            <button class="delete-history-btn" title="삭제">🗑️</button>
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-history-btn')) return;
            loadHistoryDetail(item.id);
        });
        
        card.querySelector('.delete-history-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('이 학습 기록을 삭제하시겠습니까?')) {
                await deleteHistory(item.id);
            }
        });
        
        historyList.appendChild(card);
    });
}

async function loadHistoryDetail(id) {
    try {
        const response = await fetch(`/api/history/${id}`);
        if (!response.ok) throw new Error('데이터를 가져오지 못했습니다.');
        
        const data = await response.json();
        sentences = data.sentences;
        currentCount = 0;
        
        showSection('learning-section');
        showSentence();
    } catch (error) {
        alert('복습 데이터를 불러오는 데 실패했습니다.');
    }
}

async function deleteHistory(id) {
    try {
        const response = await fetch(`/api/history/${id}`, { method: 'DELETE' });
        if (response.ok) {
            fetchHistory();
        }
    } catch (error) {
        alert('삭제 중 오류가 발생했습니다.');
    }
}

// 초기화
fetchTrends();

// 내비게이션 이벤트
navHome.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('setup-section');
});

navReview.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('review-section');
    fetchHistory();
});

if (backToMain) backToMain.addEventListener('click', () => showSection('setup-section'));
if (homeBtn) homeBtn.addEventListener('click', () => showSection('setup-section'));

startBtn.addEventListener('click', async () => {
    const topic = topicInput.value;
    const difficulty = document.getElementById('difficulty').value;

    if (!topic) {
        alert('학습할 주제를 입력하거나 추천 키워드를 선택해 주세요.');
        return;
    }

    showSection('learning-section');
    ttsBtn.classList.add('hidden');

    await fetchSentences(topic, difficulty);
});

async function fetchSentences(topic, difficulty) {
    sentenceEn.textContent = 'AI가 맞춤형 학습 콘텐츠를 생성하고 있습니다...';

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, difficulty })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('API Error:', data);
            sentenceEn.textContent = `생성 실패: ${data.error || '알 수 없는 오류'}`;
            return;
        }

        if (!data.sentences || !Array.isArray(data.sentences)) {
            throw new Error('데이터 형식이 올바르지 않습니다.');
        }

        sentences = data.sentences;
        currentCount = 0;
        showSentence();
    } catch (error) {
        console.error('Error fetching sentences:', error);
        sentenceEn.textContent = '콘텐츠를 불러오는 중 오류가 발생했습니다.';
    }
}

function showSentence() {
    if (currentCount >= sentences.length) {
        finishLearning();
        return;
    }

    window.speechSynthesis.cancel();

    const current = sentences[currentCount];
    sentenceEn.textContent = current.en;
    sentenceKo.innerHTML = formatAnalysis(current.ko);
    
    ttsBtn.classList.remove('hidden');

    if (current.sentence_structure) {
        structureDiv.innerHTML = `<strong>🧩 문장 구성 요소:</strong><br/>${current.sentence_structure}`;
    } else {
        structureDiv.innerHTML = '';
    }

    if (current.explanation) {
        explanationDiv.innerHTML = `<strong>💡 AI 학습 가이드:</strong><br/>${formatAnalysis(current.explanation)}`;
    } else {
        explanationDiv.innerHTML = '';
    }

    if (current.voca && Array.isArray(current.voca) && current.voca.length > 0) {
        vocaDiv.innerHTML = `<strong>📖 주요 어휘 및 표현:</strong><br/>` + current.voca.join('<br/>');
    } else {
        vocaDiv.innerHTML = '';
    }

    sentenceKo.classList.add('hidden');
    structureDiv.classList.add('hidden');
    explanationDiv.classList.add('hidden');
    vocaDiv.classList.add('hidden');
    revealBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
    finishBtn.classList.add('hidden');

    currentCountSpan.textContent = currentCount + 1;
}

function formatAnalysis(analysis) {
    return analysis.replace(/\n/g, '<br>');
}

ttsBtn.addEventListener('click', () => {
    if (currentCount >= sentences.length) return;
    
    const current = sentences[currentCount];
    if (!current || !current.en) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(current.en);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; 
    
    window.speechSynthesis.speak(utterance);
});

revealBtn.addEventListener('click', () => {
    sentenceKo.classList.remove('hidden');
    structureDiv.classList.remove('hidden');
    explanationDiv.classList.remove('hidden');
    if (vocaDiv.innerHTML !== '') {
        vocaDiv.classList.remove('hidden');
    }
    revealBtn.classList.add('hidden');

    if (currentCount + 1 < sentences.length) {
        nextBtn.classList.remove('hidden');
    } else {
        finishBtn.classList.remove('hidden');
    }
});

nextBtn.addEventListener('click', () => {
    currentCount++;
    showSentence();
});

finishBtn.addEventListener('click', () => {
    alert('오늘의 트레이닝 완료! 고생하셨습니다. 🔥');
    location.reload();
});

function finishLearning() {
    sentenceEn.textContent = '모든 세션을 클리어했습니다! 🏆';
    sentenceKo.classList.add('hidden');
    structureDiv.classList.add('hidden');
    explanationDiv.classList.add('hidden');
    vocaDiv.classList.add('hidden');
    nextBtn.classList.add('hidden');
    finishBtn.classList.remove('hidden');
}
