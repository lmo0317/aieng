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

const usageInfo = document.getElementById('usage-info');

async function updateUsage() {
    try {
        const response = await fetch('/api/usage');
        let data = await response.json();
        console.log('Usage Data:', data);

        // 데이터 구조에 따른 정보 추출
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

            // 사용자가 5 Hours (TOKENS_LIMIT)를 위로 올리기를 원하므로 배열 순서를 뒤집음
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

// 초기 로드 시 실행
updateUsage();

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
