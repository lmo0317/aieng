let currentCount = 0;
let sentences = [];

const setupSection = document.querySelector('.setup-section');
const learningSection = document.getElementById('learning-section');
const startBtn = document.getElementById('start-btn');
const revealBtn = document.getElementById('reveal-btn');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');
const currentCountSpan = document.getElementById('current-count');

const sentenceEn = document.getElementById('sentence-en');
const sentenceKo = document.getElementById('sentence-ko');
const analysisDiv = document.getElementById('analysis');

const vocaDiv = document.getElementById('voca');

startBtn.addEventListener('click', async () => {
    const topic = document.getElementById('topic').value;
    const difficulty = document.getElementById('difficulty').value;

    if (!topic) {
        alert('주제를 입력해 주세요!');
        return;
    }

    setupSection.classList.add('hidden');
    learningSection.classList.remove('hidden');

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
        sentences = data.sentences;
        currentCount = 0;
    } catch (error) {
        console.error('Error fetching sentences:', error);
        sentenceEn.textContent = '문장을 불러오는데 실패했습니다. 서버를 확인해 주세요.';
    }
}

function showSentence() {
    if (currentCount >= sentences.length) {
        finishLearning();
        return;
    }

    const current = sentences[currentCount];
    sentenceEn.textContent = current.en;
    sentenceKo.textContent = current.ko;
    analysisDiv.innerHTML = formatAnalysis(current.analysis);

    if (current.voca && current.voca.length > 0) {
        vocaDiv.innerHTML = `<strong>📖 단어/표현 정리:</strong><br/>` + current.voca.join('<br/>');
    } else {
        vocaDiv.innerHTML = '';
    }

    sentenceKo.classList.add('hidden');
    analysisDiv.classList.add('hidden');
    vocaDiv.classList.add('hidden');
    revealBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');

    currentCountSpan.textContent = currentCount + 1;
}

function formatAnalysis(analysis) {
    // LLM이 줄바꿈으로 준 내용을 HTML로 변환
    return analysis.replace(/\n/g, '<br>');
}

revealBtn.addEventListener('click', () => {
    sentenceKo.classList.remove('hidden');
    analysisDiv.classList.remove('hidden');
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
    vocaDiv.classList.add('hidden');
    nextBtn.classList.add('hidden');
    finishBtn.classList.remove('hidden');
}
