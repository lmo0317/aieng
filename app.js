let currentCount = 0;
let sentences = [];

const setupSection = document.querySelector('.setup-section');
const learningSection = document.getElementById('learning-section');
const startBtn = document.getElementById('start-btn');
const homeBtn = document.getElementById('home-btn');
const revealBtn = document.getElementById('reveal-btn');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');
const currentCountSpan = document.getElementById('current-count');

const sentenceEn = document.getElementById('sentence-en');
const sentenceKo = document.getElementById('sentence-ko');
const analysisDiv = document.getElementById('analysis');
const structureDiv = document.getElementById('structure');
const explanationDiv = document.getElementById('explanation');
const vocaDiv = document.getElementById('voca');
const ttsBtn = document.getElementById('tts-btn');

const trendsContainer = document.getElementById('trends-container');
const topicInput = document.getElementById('topic');

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
            // 모든 카드에서 active 클래스 제거 후 현재 카드에 추가
            document.querySelectorAll('.trend-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            topicInput.focus();
        });
        trendsContainer.appendChild(card);
    });
}

// 페이지 로드 시 트랜드 실행
fetchTrends();

homeBtn.addEventListener('click', () => {
    // 상태 리셋
    currentCount = 0;
    sentences = [];
    topicInput.value = '';

    // 섹션 전환
    learningSection.classList.add('hidden');
    setupSection.classList.remove('hidden');
    
    // 재생 중인 오디오 중단
    window.speechSynthesis.cancel();
});

startBtn.addEventListener('click', async () => {
    const topic = topicInput.value;
    const difficulty = document.getElementById('difficulty').value;

    if (!topic) {
        alert('학습할 주제를 입력하거나 추천 키워드를 선택해 주세요.');
        return;
    }

    setupSection.classList.add('hidden');
    learningSection.classList.remove('hidden');
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

    // 분석 섹션들 데이터 채우기
    if (current.parts_of_speech) {
        analysisDiv.innerHTML = `<strong>📝 품사 구조 분석:</strong><br/>${formatPartsOfSpeech(current.parts_of_speech)}`;
    } else {
        analysisDiv.innerHTML = '';
    }

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

    // 초기 상태 설정
    sentenceKo.classList.add('hidden');
    analysisDiv.classList.add('hidden');
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

function formatPartsOfSpeech(text) {
    if (!text) return '';
    const parts = text.split('/').map(p => p.trim()).filter(p => p);
    
    const formattedHtml = parts.map(part => {
        const match = part.match(/(.+?)\((.+?)\)/);
        if (match) {
            const word = match[1].trim();
            const role = match[2].trim();
            return `<span class="pos-text-item"><span class="pos-word">${word}</span> <span class="pos-role">(${role})</span></span>`;
        }
        return `<span class="pos-text-item"><span class="pos-word">${part}</span></span>`;
    }).join('<span class="pos-separator"> / </span>');
    
    return `<div class="pos-text-container">${formattedHtml}</div>`;
}

// TTS 기능
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
    analysisDiv.classList.remove('hidden');
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
    alert('오늘의 날먹 트레이닝 완료! 고생하셨습니다. 🍖🔥');
    location.reload();
});

function finishLearning() {
    sentenceEn.textContent = '모든 세션을 클리어했습니다! 🏆';
    sentenceKo.classList.add('hidden');
    analysisDiv.classList.add('hidden');
    structureDiv.classList.add('hidden');
    explanationDiv.classList.add('hidden');
    vocaDiv.classList.add('hidden');
    nextBtn.classList.add('hidden');
    finishBtn.classList.remove('hidden');
}
