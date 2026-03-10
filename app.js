let currentCount = 0;
let sentences = [];

const trendsSection = document.getElementById('trends-section');
const songsSection = document.getElementById('songs-section');
const topicSection = document.getElementById('topic-section');
const learningSection = document.getElementById('learning-section');
const realtimeTrendsContainer = document.getElementById('realtime-trends-container');
const songsContainer = document.getElementById('songs-container');

const startBtn = document.getElementById('start-btn');
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

const navTrends = document.getElementById('nav-trends');
const navSongs = document.getElementById('nav-songs');
const navTopic = document.getElementById('nav-topic');

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
    // 모든 섹션 목록
    const allSections = [trendsSection, songsSection, topicSection, learningSection];
    const allNavLinks = [navTrends, navSongs, navTopic];

    // 학습 화면에서 나갈 때 상태 초기화
    if (sectionId === 'trends-section' || sectionId === 'songs-section' || sectionId === 'topic-section') {
        resetLearningState();
    }

    // 모든 섹션 숨기기
    allSections.forEach(section => {
        if (section) section.classList.add('hidden');
    });

    // 모든 내비게이션 링크 활성화 해제
    allNavLinks.forEach(link => {
        if (link) link.classList.remove('active');
    });

    // 대상 섹션 보이기
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');

    // 해당 내비게이션 링크 활성화
    if (sectionId === 'trends-section') navTrends.classList.add('active');
    if (sectionId === 'songs-section') navSongs.classList.add('active');
    if (sectionId === 'topic-section') navTopic.classList.add('active');

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

let trendsPagination = {
    allDates: [],
    groups: {},
    currentPage: 0,
    itemsPerPage: 3 // 한 번에 보여줄 날짜 수
};

function renderRealtimeTrends(trends) {
    realtimeTrendsContainer.innerHTML = '';

    // 날짜별로 그룹화 초기화
    trendsPagination.groups = {};
    trends.forEach(item => {
        const date = item.date || '기타';
        if (!trendsPagination.groups[date]) trendsPagination.groups[date] = [];
        trendsPagination.groups[date].push(item);
    });

    // 날짜 역순(최신순)으로 전체 목록 저장
    trendsPagination.allDates = Object.keys(trendsPagination.groups).sort((a, b) => b.localeCompare(a));
    trendsPagination.currentPage = 0;

    // 첫 페이지 렌더링
    renderNextTrendsPage();
}

function renderNextTrendsPage() {
    const start = trendsPagination.currentPage * trendsPagination.itemsPerPage;
    const end = start + trendsPagination.itemsPerPage;
    const datesToShow = trendsPagination.allDates.slice(start, end);

    if (datesToShow.length === 0 && trendsPagination.currentPage === 0) {
        realtimeTrendsContainer.innerHTML = '<div class="trends-empty-state">트렌드가 없습니다.</div>';
        return;
    }

    // 기존의 "더보기" 버튼 제거
    const oldMoreBtn = document.getElementById('load-more-trends-btn');
    if (oldMoreBtn) oldMoreBtn.remove();

    datesToShow.forEach(date => {
        // 날짜 헤더 추가
        const dateHeader = document.createElement('div');
        dateHeader.className = 'trends-date-header';
        
        const today = new Date().toISOString().split('T')[0];
        const displayDate = date === today ? `오늘 (${date})` : date;
        dateHeader.innerHTML = `<h3>📅 ${displayDate}</h3>`;
        realtimeTrendsContainer.appendChild(dateHeader);

        const dateGrid = document.createElement('div');
        dateGrid.className = 'trends-date-grid';

        // 그룹 내에서 카테고리별로 정렬
        const sortedItems = trendsPagination.groups[date].sort((a, b) => (a.category || '').localeCompare(b.category || ''));

        sortedItems.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'realtime-trend-card';

            const keywords = item.keywords ? JSON.parse(item.keywords) : [];
            const keywordsHtml = keywords.map(kw => `<span class="trend-keyword">${kw}</span>`).join('');
            
            const catClass = `cat-${(item.category || '일반').replace(/\s+/g, '')}`;

            card.innerHTML = `
                <span class="trend-category ${catClass}">${item.category || '일반'}</span>
                <span class="trend-card-title">${item.title}</span>
                <div class="trend-card-info">
                    ${keywordsHtml ? `<div class="trend-card-keywords">${keywordsHtml}</div>` : ''}
                    <button class="trend-start-btn">학습 시작</button>
                </div>
            `;

            const startBtn = card.querySelector('.trend-start-btn');
            startBtn.dataset.title = item.title;

            startBtn.addEventListener('click', async () => {
                const topic = startBtn.dataset.title;
                if (!topic) return;
                await startLearningFromTrend(topic);
            });

            dateGrid.appendChild(card);
        });

        realtimeTrendsContainer.appendChild(dateGrid);
    });

    // 다음 페이지가 있으면 "더보기" 버튼 추가
    if (end < trendsPagination.allDates.length) {
        const moreBtnContainer = document.createElement('div');
        moreBtnContainer.className = 'load-more-container';
        moreBtnContainer.innerHTML = `
            <button id="load-more-trends-btn" class="load-more-btn">
                <span>이전 트렌드 더보기</span>
                <span class="more-count">(${trendsPagination.allDates.length - end}일치 더 있음)</span>
            </button>
        `;
        realtimeTrendsContainer.appendChild(moreBtnContainer);

        document.getElementById('load-more-trends-btn').addEventListener('click', () => {
            trendsPagination.currentPage++;
            renderNextTrendsPage();
        });
    }
}

// 트렌드에서 학습 시작
async function startLearningFromTrend(topic) {
    if (!topic) return;

    showSection('learning-section');
    sessionStorage.setItem('currentTopic', topic);

    sentenceEn.textContent = '저장된 학습 데이터를 불러오는 중...';

    // 저장된 학습 데이터만 확인 (신규 생성 fallback 제거)
    try {
        console.log('Fetching cached trend for:', topic);
        const response = await fetch(`/api/trends/by-title?title=${encodeURIComponent(topic)}`);
        const data = await response.json();

        if (response.ok && data.trend && data.trend.sentences) {
            // 저장된 데이터가 있으면 바로 사용
            const savedSentences = JSON.parse(data.trend.sentences);

            if (savedSentences && savedSentences.length > 0) {
                console.log('✅ Using cached sentences for trend:', topic);
                sentences = savedSentences;
                currentCount = 0;
                showSentence();
                sendTopicToChat(topic);
                return;
            }
        }
        
        // 데이터가 없는 경우 경고창 후 메인으로 이동
        alert('해당 트렌드의 학습 데이터가 존재하지 않습니다. 설정 페이지에서 트렌드를 다시 생성해주세요.');
        showSection('trends-section');
    } catch (error) {
        console.error('❌ Error fetching cached trend:', error);
        alert('학습 데이터를 불러오는 중 오류가 발생했습니다.');
        showSection('trends-section');
    }
}

// 초기화
fetchRealtimeTrends();

// 팝송 목록 가져오기 및 렌더링
async function fetchSavedSongs() {
    try {
        const response = await fetch('/api/songs/saved');
        const data = await response.json();
        renderSavedSongs(data.songs || []);
    } catch (error) {
        console.error('Failed to fetch songs:', error);
    }
}

function renderSavedSongs(songs) {
    songsContainer.innerHTML = '';

    if (songs.length === 0) {
        songsContainer.innerHTML = `
            <div class="trends-empty-state">
                <div class="empty-icon">🎵</div>
                <h3>저장된 팝송이 없습니다</h3>
                <p>데이터 관리 페이지에서 새로운 팝송을 추가해보세요!</p>
                <button class="go-settings-btn" onclick="window.location.href='/data.html'">팝송 추가하러 가기</button>
            </div>
        `;
        return;
    }

    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'realtime-trend-card';
        
        card.innerHTML = `
            <span class="trend-category cat-연애">POP SONG</span>
            <span class="trend-card-title">${song.title}</span>
            <div class="trend-card-info">
                <button class="trend-start-btn">학습 시작</button>
            </div>
        `;

        card.querySelector('.trend-start-btn').addEventListener('click', async () => {
            await startLearningFromTrend(song.title);
        });

        songsContainer.appendChild(card);
    });
}

// 내비게이션 이벤트
navTrends.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('trends-section');
    fetchRealtimeTrends();
});

navSongs.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('songs-section');
    fetchSavedSongs();
});

navTopic.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('topic-section');
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
