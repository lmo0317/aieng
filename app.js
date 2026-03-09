let currentCount = 0;
let sentences = [];

const trendsSection = document.getElementById('trends-section');
const topicSection = document.getElementById('topic-section');
const paragraphSection = document.getElementById('paragraph-section');
const learningSection = document.getElementById('learning-section');
const realtimeTrendsContainer = document.getElementById('realtime-trends-container');

const startBtn = document.getElementById('start-btn');
const paragraphStartBtn = document.getElementById('paragraph-start-btn');
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

const topicInput = document.getElementById('topic');
const paragraphInput = document.getElementById('paragraph');

const navTrends = document.getElementById('nav-trends');
const navTopic = document.getElementById('nav-topic');
const navParagraph = document.getElementById('nav-paragraph');

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
    if (sectionId === 'trends-section' || sectionId === 'topic-section') {
        resetLearningState();
    }

    [trendsSection, topicSection, learningSection].forEach(section => {
        if (section) section.classList.add('hidden');
    });

    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');

    window.speechSynthesis.cancel();

    // 학습 섹션으로 전환 시 채팅 대화 초기화
    if (sectionId === 'learning-section') {
        resetChatConversation();
    }

    // 브라우저 뒤로가기 버튼 지원을 위해 상태 저장
    if (pushState) {
        history.pushState({ sectionId }, '', '');
    }
}

// 채팅 대화 초기화 함수
function resetChatConversation() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    // 기존 채팅 메시지 모두 제거
    const messages = chatMessages.querySelectorAll('.chat-message');
    messages.forEach(msg => msg.remove());

    // 기존 환영 메시지도 제거
    const welcome = chatMessages.querySelector('.chat-welcome-message');
    if (welcome) welcome.remove();

    // 환영 메시지 다시 추가 (이미 없는 경우에만)
    if (!chatMessages.querySelector('.chat-welcome-message')) {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'chat-welcome-message';
        welcomeDiv.innerHTML = `
            안녕하세요! Trend Eng AI 튜터입니다.<br>
            실시간 음성 및 화상 대화로 영어 실력을 키워보세요!<br>
            하단의 마이크나 상단의 비디오 버튼을 눌러 시작하세요.
        `;
        chatMessages.appendChild(welcomeDiv);
    }

    // 채팅 상태 초기화 (ChatState 변수가 있는 경우)
    if (typeof ChatState !== 'undefined') {
        ChatState.currentAiMessageTextDiv = null;
        ChatState.aiTextBuffer = '';
    }

    console.log('[App] Chat conversation reset');
}

// 브라우저 뒤로가기/앞으로가기 버튼 감지
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.sectionId) {
        showSection(event.state.sectionId, false);
    } else {
        // 초기 상태 (메인화면 - 실시간 트렌드)
        showSection('trends-section', false);
    }
});

// 초기 실행 시 현재 상태 저장
history.replaceState({ sectionId: 'trends-section' }, '', '');

// 실시간 트렌드 불러오기
async function fetchRealtimeTrends() {
    try {
        const response = await fetch('/api/trends/saved');
        const data = await response.json();

        if (data.trends && Array.isArray(data.trends) && data.trends.length > 0) {
            renderRealtimeTrends(data.trends);
        } else {
            showEmptyTrendsState();
        }
    } catch (error) {
        console.error('Error fetching realtime trends:', error);
        showEmptyTrendsState();
    }
}

function showEmptyTrendsState() {
    realtimeTrendsContainer.innerHTML = `
        <div class="trends-empty-state">
            <div class="empty-icon">🔍</div>
            <h3>아직 트렌드가 없습니다</h3>
            <p>설정 페이지에서 '실시간 트렌드 찾기'를 눌러 최신 트렌드를 가져오세요!</p>
            <button id="go-settings-btn" class="go-settings-btn">설정으로 이동</button>
        </div>
    `;

    // 설정으로 이동 버튼 이벤트
    const goSettingsBtn = document.getElementById('go-settings-btn');
    if (goSettingsBtn) {
        goSettingsBtn.addEventListener('click', () => {
            window.location.href = '/settings.html';
        });
    }
}

function renderRealtimeTrends(trends) {
    realtimeTrendsContainer.innerHTML = '';

    trends.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'realtime-trend-card';

        const keywords = item.keywords ? JSON.parse(item.keywords) : [];
        const keywordsHtml = keywords.map(kw => `<span class="trend-keyword">${kw}</span>`).join('');

        card.innerHTML = `
            <span class="trend-category">${item.category || '일반'}</span>
            <span class="trend-card-title">${item.title}</span>
            <div class="trend-card-info">
                ${keywordsHtml ? `<div class="trend-card-keywords">${keywordsHtml}</div>` : ''}
                <button class="trend-start-btn" data-title="${item.title}">학습 시작</button>
            </div>
        `;

        // 학습 시작 버튼 이벤트
        const startBtn = card.querySelector('.trend-start-btn');
        startBtn.addEventListener('click', async () => {
            const topic = startBtn.dataset.title;
            console.log('Starting learning for trend:', topic);
            await startLearningFromTrend(topic);
        });

        realtimeTrendsContainer.appendChild(card);
    });
}

// 트렌드에서 학습 시작
async function startLearningFromTrend(topic) {
    const difficulty = 'level3'; // 기본 난이도

    showSection('learning-section');
    sessionStorage.setItem('currentTopic', topic);

    sentenceEn.textContent = '저장된 학습 데이터를 확인하는 중...';

    // 먼저 저장된 학습 데이터가 있는지 확인
    try {
        console.log('Fetching cached trend for:', topic);
        const response = await fetch(`/api/trends/by-title?title=${encodeURIComponent(topic)}`);
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok && data.trend && data.trend.sentences) {
            // 저장된 데이터가 있으면 바로 사용
            const savedSentences = JSON.parse(data.trend.sentences);

            if (savedSentences && savedSentences.length > 0) {
                console.log('✅ Using cached sentences for trend:', topic, savedSentences.length, 'sentences');
                // 저장된 데이터 사용
                sentences = savedSentences;
                currentCount = 0;
                showSentence();
                sendTopicToChat(topic);
                return;
            } else {
                console.log('❌ Cached sentences are empty');
            }
        } else {
            console.log('❌ No cached trend found or no sentences');
        }
    } catch (error) {
        console.error('❌ Error fetching cached trend:', error);
    }

    // 저장된 데이터가 없으면 새로 생성
    console.log('🔄 Generating new sentences for:', topic);
    fetchSentences(topic, difficulty);
}

// 초기화
fetchRealtimeTrends();

// 내비게이션 이벤트
navTrends.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('trends-section');
    fetchRealtimeTrends();
});

navTopic.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('topic-section');
});

navParagraph.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('paragraph-section');
});

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

// 문단 입력 학습 시작
paragraphStartBtn.addEventListener('click', async () => {
    const paragraph = paragraphInput.value.trim();
    const difficulty = document.getElementById('paragraph-difficulty').value;

    if (!paragraph) {
        alert('학습할 문단을 입력해 주세요.');
        return;
    }

    showSection('learning-section');
    ttsBtn.classList.add('hidden');

    await analyzeParagraph(paragraph, difficulty);
});

// 문단 분석 및 학습 함수
async function analyzeParagraph(paragraph, difficulty) {
    sentenceEn.textContent = 'AI가 문장별로 분석하고 있습니다...';

    try {
        const response = await fetch('/api/analyze-paragraph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paragraph, difficulty })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('API Error:', data);
            sentenceEn.textContent = `분석 실패: ${data.error || '알 수 없는 오류'}`;
            return;
        }

        if (!data.sentences || !Array.isArray(data.sentences)) {
            throw new Error('데이터 형식이 올바르지 않습니다.');
        }

        // 세션 스토리지에 문단 저장
        sessionStorage.setItem('currentParagraph', paragraph);
        sessionStorage.setItem('currentTopic', '문장 분석 학습');

        sentences = data.sentences;
        currentCount = 0;

        // 진행률 텍스트 업데이트
        currentCountSpan.textContent = `${currentCount + 1} / ${sentences.length}`;

        showSentence();

        // 채팅 서버에 문단 전송
        sendTopicToChat('문장 분석 학습: ' + paragraph.substring(0, 50) + '...');
    } catch (error) {
        console.error('Error analyzing paragraph:', error);
        sentenceEn.textContent = '문단 분석 중 오류가 발생했습니다.';
    }
}

// 채팅 서버에 주제 전송 함수
function sendTopicToChat(topic) {
    // WebSocket이 연결되어 있고, ChatState가 있는 경우
    if (typeof ChatState !== 'undefined' && ChatState.socket && ChatState.socket.readyState === WebSocket.OPEN) {
        ChatState.socket.send(JSON.stringify({
            type: 'context',
            topic: topic
        }));
        console.log('[App] Topic sent to chat:', topic);
    } else {
        console.log('[App] Chat not connected, topic saved in sessionStorage');
    }
}

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

        // 현재 주제를 세션 스토리지에 저장 (채팅 연동용)
        sessionStorage.setItem('currentTopic', topic);

        sentences = data.sentences;
        currentCount = 0;
        showSentence();

        // 채팅 서버에 주제 재전송
        sendTopicToChat(topic);
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

    // 진행률 업데이트
    currentCountSpan.textContent = `${currentCount + 1} / ${sentences.length}`;
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
