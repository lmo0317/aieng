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

homeBtn.addEventListener('click', () => {
    // Reset state
    currentCount = 0;
    sentences = [];
    document.getElementById('topic').value = '';

    // Switch sections
    learningSection.classList.add('hidden');
    setupSection.classList.remove('hidden');
    
    // Stop any playing audio
    window.speechSynthesis.cancel();
});

startBtn.addEventListener('click', async () => {
    const topic = document.getElementById('topic').value;
    const difficulty = document.getElementById('difficulty').value;

    if (!topic) {
        alert('주제를 입력해 주세요!');
        return;
    }

    setupSection.classList.add('hidden');
    learningSection.classList.remove('hidden');
    ttsBtn.classList.add('hidden');

    await fetchSentences(topic, difficulty);
    showSentence();
});

async function fetchSentences(topic, difficulty) {
    sentenceEn.textContent = '문장을 생성 중입니다... 잠시만 기다려 주세요.';

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, difficulty })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('API Error:', data);
            sentenceEn.textContent = `오류 발생: ${data.error || '알 수 없는 오류가 발생했습니다.'}`;
            if (data.details) {
                console.error('Error details:', data.details);
            }
            return;
        }

        if (!data.sentences || !Array.isArray(data.sentences)) {
            throw new Error('올바른 문장 데이터를 받지 못했습니다.');
        }

        sentences = data.sentences;
        currentCount = 0;
        showSentence();
    } catch (error) {
        console.error('Error fetching sentences:', error);
        sentenceEn.textContent = '문장을 불러오는데 실패했습니다. ' + (error.message || '서버를 확인해 주세요.');
    }
}

function showSentence() {
    if (currentCount >= sentences.length) {
        finishLearning();
        return;
    }

    // Stop previous audio
    window.speechSynthesis.cancel();

    const current = sentences[currentCount];
    sentenceEn.textContent = current.en;
    sentenceKo.innerHTML = formatAnalysis(current.ko);
    
    ttsBtn.classList.remove('hidden');

    // 새롭게 정리된 요구사항에 맞춘 필드 매핑
    
    // 3. 품사 분석
    if (current.parts_of_speech) {
        analysisDiv.innerHTML = `<strong>📝 품사 분석:</strong><br/>${formatPartsOfSpeech(current.parts_of_speech)}`;
    } else {
        analysisDiv.innerHTML = '';
    }

    // 3.5 문장 형식 및 구조 분석
    if (current.sentence_structure) {
        structureDiv.innerHTML = `<strong>🧩 문장 구조:</strong><br/>${current.sentence_structure}`;
    } else {
        structureDiv.innerHTML = '';
    }

    // 4. 해석 설명
    if (current.explanation) {
        explanationDiv.innerHTML = `<strong>💡 문장 설명:</strong><br/>${formatAnalysis(current.explanation)}`;
    } else {
        explanationDiv.innerHTML = '';
    }

    // 5. 단어 및 숙어
    if (current.voca && Array.isArray(current.voca) && current.voca.length > 0) {
        vocaDiv.innerHTML = `<strong>📖 단어/표현 정리:</strong><br/>` + current.voca.join('<br/>');
    } else {
        vocaDiv.innerHTML = '';
    }

    sentenceKo.classList.add('hidden');
    analysisDiv.classList.add('hidden');
    structureDiv.classList.add('hidden');
    explanationDiv.classList.add('hidden');
    vocaDiv.classList.add('hidden');
    revealBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');

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

// TTS (Text-to-Speech) 기능
ttsBtn.addEventListener('click', () => {
    if (currentCount >= sentences.length) return;
    
    const current = sentences[currentCount];
    if (!current || !current.en) return;

    // 이미 읽고 있다면 취소
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(current.en);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // 살짝 천천히 읽어주기 (학습용)
    
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
    alert('오늘의 학습을 모두 마쳤습니다! 수고하셨습니다.');
    location.reload();
});

function finishLearning() {
    sentenceEn.textContent = '모든 학습이 완료되었습니다!';
    sentenceKo.classList.add('hidden');
    analysisDiv.classList.add('hidden');
    structureDiv.classList.add('hidden');
    explanationDiv.classList.add('hidden');
    vocaDiv.classList.add('hidden');
    nextBtn.classList.add('hidden');
    finishBtn.classList.remove('hidden');
}
