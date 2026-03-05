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
const explanationDiv = document.getElementById('explanation');
const vocaDiv = document.getElementById('voca');

homeBtn.addEventListener('click', () => {
    // Reset state
    currentCount = 0;
    sentences = [];
    document.getElementById('topic').value = '';

    // Switch sections
    learningSection.classList.add('hidden');
    setupSection.classList.remove('hidden');
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
    sentenceKo.innerHTML = formatAnalysis(current.ko);

    // analysis에서 품사 분석과 설명 분리
    const analysisText = current.analysis;
    const newlineIndex = analysisText.indexOf('\n');

    if (newlineIndex !== -1) {
        // 첫 번째 줄: 품사 분석
        const posaAnalysis = analysisText.substring(0, newlineIndex);
        // 두 번째 줄부터: 문장 설명 (남은 \n 제거)
        const sentenceExplanation = analysisText.substring(newlineIndex + 1).replace(/\n/g, '');

        analysisDiv.innerHTML = `<strong>📝 품사 분석:</strong><br/>${posaAnalysis}`;
        explanationDiv.innerHTML = `<strong>💡 문장 설명:</strong><br/>${sentenceExplanation}`;
    } else {
        // 분리가 안 된 경우 (구버전 호환)
        analysisDiv.innerHTML = `<strong>📝 품사 분석:</strong><br/>${analysisText}`;
        explanationDiv.innerHTML = '';
    }

    if (current.voca && current.voca.length > 0) {
        vocaDiv.innerHTML = `<strong>📖 단어/표현 정리:</strong><br/>` + current.voca.join('<br/>');
    } else {
        vocaDiv.innerHTML = '';
    }

    sentenceKo.classList.add('hidden');
    analysisDiv.classList.add('hidden');
    explanationDiv.classList.add('hidden');
    vocaDiv.classList.add('hidden');
    revealBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');

    currentCountSpan.textContent = currentCount + 1;
}

function formatAnalysis(analysis) {
    return analysis.replace(/\n/g, '<br>');
}

revealBtn.addEventListener('click', () => {
    sentenceKo.classList.remove('hidden');
    analysisDiv.classList.remove('hidden');
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
    explanationDiv.classList.add('hidden');
    vocaDiv.classList.add('hidden');
    nextBtn.classList.add('hidden');
    finishBtn.classList.remove('hidden');
}
