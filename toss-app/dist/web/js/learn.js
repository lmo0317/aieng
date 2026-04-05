/**
 * learn.js - 학습 페이지 전용 JS
 * URL 파라미터: ?id=42&source=trends  또는  ?topic=...&difficulty=...&source=topic
 */

let sentences = [];
let currentCount = 0;
let quizData = [];
let currentQuizIndex = 0;
let quizScore = 0;

const params = new URLSearchParams(window.location.search);
const itemId     = params.get('id');
const topicParam = params.get('topic');
const difficulty = params.get('difficulty') || 'level3';
const source     = params.get('source') || 'trends';  // 뒤로 갈 섹션

// 출처 섹션 URL 맵
const SOURCE_URL = { trends: '/', songs: '/songs', topic: '/topic' };
const backUrl = SOURCE_URL[source] || '/';

// DOM
const sentenceEn   = document.getElementById('sentence-en');
const sentenceKo   = document.getElementById('sentence-ko');
const structureDiv = document.getElementById('structure');
const explanationDiv = document.getElementById('explanation');
const vocaDiv      = document.getElementById('voca');
const ttsBtn       = document.getElementById('tts-btn');
const revealBtn    = document.getElementById('reveal-btn');
const nextBtn      = document.getElementById('next-btn');
const finishBtn    = document.getElementById('finish-btn');
const startQuizBtn = document.getElementById('start-quiz-btn');
const skipToQuizBtn = document.getElementById('skip-to-quiz-btn');
const currentCountSpan = document.getElementById('current-count');

const learningSection = document.getElementById('learning-section');
const quizSection     = document.getElementById('quiz-section');
const quizCurrentCount = document.getElementById('quiz-current-count');
const quizScoreDisplay = document.getElementById('quiz-score');
const quizLoading     = document.getElementById('quiz-loading');
const quizContent     = document.getElementById('quiz-content');
const quizTypeLabel   = document.getElementById('quiz-type-label');
const quizQuestion    = document.getElementById('quiz-question');
const quizOptions     = document.getElementById('quiz-options');
const quizInputContainer = document.getElementById('quiz-input-container');
const quizSubmitBtn   = document.getElementById('quiz-submit-btn');
const quizFeedback    = document.getElementById('quiz-feedback');
const quizNextBtn     = document.getElementById('quiz-next-btn');
const quizFinishBtn   = document.getElementById('quiz-finish-btn');

// ── 초기 진입 ────────────────────────────────────────────
if (itemId) {
    loadFromId(itemId);
} else if (topicParam) {
    generateFromTopic(topicParam, difficulty);
} else {
    window.location.href = '/';
}

// ── 콘텐츠 로드 ──────────────────────────────────────────
async function loadFromId(id) {
    sentenceEn.textContent = '저장된 학습 데이터를 불러오는 중...';
    try {
        const resp = await fetch((window.API_BASE || '') + `/api/trends/by-id/${id}`);
        const data = await resp.json();
        if (resp.ok && data.trend && data.trend.sentences) {
            let savedSentences = data.trend.sentences;
            if (typeof savedSentences === 'string') savedSentences = JSON.parse(savedSentences);
            let savedQuiz = data.trend.quiz;
            if (typeof savedQuiz === 'string') savedQuiz = JSON.parse(savedQuiz);

            if (Array.isArray(savedSentences) && savedSentences.length > 0) {
                sentences = savedSentences;
                quizData  = Array.isArray(savedQuiz) ? savedQuiz : [];
                currentCount = 0;
                sessionStorage.setItem('currentTopic', data.trend.title || '');
                showSentence();
                sendTopicToChat(data.trend.title || '');
                if (quizData.length > 0 && skipToQuizBtn) {
                    skipToQuizBtn.classList.remove('hidden');
                    skipToQuizBtn.onclick = () => startQuizBtn.click();
                }
                return;
            }
        }
        window.showAlert('학습 데이터가 없거나 형식이 올바르지 않습니다.');
        window.location.href = backUrl;
    } catch (e) {
        console.error(e);
        window.showAlert('학습 데이터를 불러오는 중 오류가 발생했습니다.');
        window.location.href = backUrl;
    }
}

async function generateFromTopic(topic, diff) {
    sentenceEn.textContent = 'AI가 맞춤형 학습 콘텐츠를 생성하고 있습니다...';
    ttsBtn.classList.add('hidden');
    try {
        const resp = await fetch((window.API_BASE || '') + '/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, difficulty: diff })
        });
        const data = await resp.json();
        if (!resp.ok) {
            sentenceEn.textContent = `생성 실패: ${data.error || '알 수 없는 오류'}`;
            return;
        }
        if (!data.sentences || !Array.isArray(data.sentences)) throw new Error('데이터 형식 오류');
        sentences = data.sentences;
        quizData  = [];
        currentCount = 0;
        sessionStorage.setItem('currentTopic', topic);
        showSentence();
        sendTopicToChat(topic);
    } catch (e) {
        console.error(e);
        sentenceEn.textContent = '콘텐츠를 불러오는 중 오류가 발생했습니다.';
    }
}

// ── 학습 화면 ──────────────────────────────────────────
function showSentence() {
    if (currentCount >= sentences.length) { finishLearning(); return; }

    window.speechSynthesis.cancel();
    const cur = sentences[currentCount];

    sentenceEn.textContent = cur.en;
    sentenceKo.innerHTML   = formatAnalysis(cur.ko);
    ttsBtn.classList.remove('hidden');

    structureDiv.innerHTML = cur.sentence_structure
        ? `<div class="section-label">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
               문장 구조
           </div>
           <div class="section-body">${highlightStructure(cur.sentence_structure)}</div>`
        : '';

    explanationDiv.innerHTML = cur.explanation
        ? `<div class="section-label">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
               AI 학습 가이드
           </div>
           <div class="section-body">${formatAnalysis(cur.explanation)}</div>`
        : '';

    if (cur.voca && Array.isArray(cur.voca) && cur.voca.length > 0) {
        const vocaHtml = cur.voca.map(v => renderVocaItem(typeof v === 'string' ? v : `${v.word}: ${v.mean}`)).join('');
        vocaDiv.innerHTML = `<div class="section-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            핵심 어휘
        </div><div class="section-body"><div class="voca-list">${vocaHtml}</div></div>`;
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
    if (startQuizBtn) startQuizBtn.classList.add('hidden');

    currentCountSpan.textContent = `${currentCount + 1} / ${sentences.length}`;
}

function finishLearning() {
    sentenceEn.textContent = '모든 세션을 클리어했습니다! 🏆';
    sentenceKo.classList.add('hidden');
    structureDiv.classList.add('hidden');
    explanationDiv.classList.add('hidden');
    vocaDiv.classList.add('hidden');
    nextBtn.classList.add('hidden');
    finishBtn.classList.remove('hidden');
    if (startQuizBtn) startQuizBtn.classList.remove('hidden');
}

// ── 버튼 이벤트 ──────────────────────────────────────────
revealBtn.addEventListener('click', () => {
    sentenceKo.classList.remove('hidden');
    structureDiv.classList.remove('hidden');
    explanationDiv.classList.remove('hidden');
    if (vocaDiv.innerHTML !== '') vocaDiv.classList.remove('hidden');
    revealBtn.classList.add('hidden');
    if (currentCount + 1 < sentences.length) {
        nextBtn.classList.remove('hidden');
    } else {
        finishBtn.classList.remove('hidden');
        if (startQuizBtn) startQuizBtn.classList.remove('hidden');
    }
});

nextBtn.addEventListener('click', () => { currentCount++; showSentence(); });

finishBtn.addEventListener('click', () => {
    window.showAlert('오늘의 트레이닝 완료! 고생하셨습니다. 🔥');
    window.location.href = backUrl;
});

// ── TTS ──────────────────────────────────────────────────
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {};
}

ttsBtn.addEventListener('click', async () => {
    if (currentCount >= sentences.length) return;
    const cur = sentences[currentCount];
    if (!cur || !cur.en) return;
    try {
        ttsBtn.disabled = true;
        ttsBtn.classList.add('playing');
        await speakWithBestVoice(cur.en);
        ttsBtn.disabled = false;
        ttsBtn.classList.remove('playing');
    } catch (e) {
        ttsBtn.disabled = false;
        ttsBtn.classList.remove('playing');
    }
});

function speakWithBestVoice(text) {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) { reject(new Error('TTS 미지원')); return; }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang   = 'en-US';
        utterance.rate   = 0.85;
        utterance.pitch  = 1.0;
        utterance.volume = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const preferred = ['Google US English','Microsoft David','Microsoft Zira','Samantha','Daniel'];
        const engVoices = voices.filter(v => v.lang.startsWith('en-'));
        let selected = null;
        for (const p of preferred) { selected = engVoices.find(v => v.name.includes(p)); if (selected) break; }
        if (!selected && engVoices.length > 0) selected = engVoices[0];
        if (selected) utterance.voice = selected;
        utterance.onend  = () => resolve();
        utterance.onerror = e => reject(e.error);
        window.speechSynthesis.speak(utterance);
    });
}

// ── 퀴즈 ──────────────────────────────────────────────────
if (startQuizBtn) {
    startQuizBtn.addEventListener('click', () => {
        if (!quizData || quizData.length === 0) { window.showAlert('이 학습 세션에는 퀴즈가 없습니다.'); return; }
        learningSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        quizLoading.classList.add('hidden');
        quizContent.classList.remove('hidden');
        quizNextBtn.classList.add('hidden');
        quizFinishBtn.classList.add('hidden');
        quizFeedback.classList.add('hidden');
        currentQuizIndex = 0;
        quizScore = 0;
        showQuiz();
    });
}

function showQuiz() {
    const q = quizData[currentQuizIndex];
    quizCurrentCount.textContent = `${currentQuizIndex + 1} / ${quizData.length}`;
    quizScoreDisplay.textContent = quizScore;
    quizFeedback.classList.add('hidden');
    quizNextBtn.classList.add('hidden');
    quizQuestion.textContent = q.question;

    if (q.type === 'multiple_choice') {
        quizTypeLabel.textContent = '4지 선다형';
        quizOptions.classList.remove('hidden');
        quizInputContainer.classList.add('hidden');
        quizOptions.innerHTML = '';
        const shuffledOptions = [...q.options];
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }
        shuffledOptions.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option-btn';
            btn.textContent = opt;
            btn.onclick = () => handleQuizAnswer(opt, q.answer, btn);
            quizOptions.appendChild(btn);
        });
    } else {
        quizTypeLabel.textContent = '빈칸 채우기';
        quizOptions.classList.add('hidden');
        quizInputContainer.classList.remove('hidden');
        quizSubmitBtn.disabled = false;
        
        // Defensive check for missing word or answer
        const word = (q.word || q.answer || "").trim();
        if (!word) {
            console.error('Quiz data missing word/answer:', q);
            quizQuestion.innerHTML = "데이터 오류: 퀴즈를 표시할 수 없습니다.";
            quizSubmitBtn.disabled = true;
            return;
        }

        const hint = q.question.match(/\(힌트: (.*?)\)/);
        const hintPattern = hint ? hint[1] : '_'.repeat(word.length);
        quizQuestion.innerHTML = q.question.split(' (힌트:')[0];
        const boxesContainer = document.getElementById('quiz-char-boxes');
        boxesContainer.innerHTML = '';
        for (let i = 0; i < word.length; i++) {
            const hintChar = hintPattern[i] || '_';
            const box = document.createElement('div');
            box.className = 'char-box';
            box.dataset.index = i;
            if (hintChar !== '_') { box.textContent = hintChar; box.classList.add('hint'); }
            else { box.classList.add('empty'); box.onclick = () => focusBox(i); }
            boxesContainer.appendChild(box);
        }
        focusBox(hintPattern.indexOf('_'));
        window.onkeydown = (e) => {
            const focused = document.querySelector('.char-box.focused');
            if (!focused) return;
            const index = parseInt(focused.dataset.index);
            if (e.key === 'Backspace') { focused.textContent = ''; findPrevEmpty(index); }
            else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) { focused.textContent = e.key; findNextEmpty(index); }
            else if (e.key === 'Enter') quizSubmitBtn.click();
        };
        quizSubmitBtn.onclick = () => {
            const boxes = document.querySelectorAll('.char-box');
            let ans = '';
            boxes.forEach(b => ans += b.textContent || '');
            handleQuizAnswer(ans, q.answer, quizSubmitBtn);
            window.onkeydown = null;
        };
    }
}

function focusBox(index) {
    if (index === -1) return;
    document.querySelectorAll('.char-box').forEach(b => b.classList.remove('focused'));
    const t = document.querySelector(`.char-box[data-index="${index}"]`);
    if (t && !t.classList.contains('hint')) t.classList.add('focused');
}
function findNextEmpty(cur) {
    const boxes = document.querySelectorAll('.char-box');
    for (let i = cur + 1; i < boxes.length; i++) { if (boxes[i].classList.contains('empty')) { focusBox(i); return; } }
}
function findPrevEmpty(cur) {
    const boxes = document.querySelectorAll('.char-box');
    for (let i = cur - 1; i >= 0; i--) { if (boxes[i].classList.contains('empty')) { focusBox(i); return; } }
}

function handleQuizAnswer(userAnswer, correctAnswer, btnElement) {
    const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
    const q = quizData[currentQuizIndex];
    if (q.type === 'multiple_choice') {
        document.querySelectorAll('.quiz-option-btn').forEach(b => b.disabled = true);
        if (isCorrect) btnElement.classList.add('correct');
        else {
            btnElement.classList.add('wrong');
            document.querySelectorAll('.quiz-option-btn').forEach(b => { if (b.textContent === correctAnswer) b.classList.add('correct'); });
        }
    } else {
        btnElement.disabled = true;
        document.querySelectorAll('.char-box').forEach((box, i) => {
            box.classList.remove('focused');
            if (isCorrect) box.classList.add('correct');
            else { box.classList.add('wrong'); box.textContent = correctAnswer[i]; }
        });
    }
    quizFeedback.classList.remove('hidden');
    quizFeedback.className = 'quiz-feedback ' + (isCorrect ? 'success' : 'error');
    if (isCorrect) { quizScore += 10; quizScoreDisplay.textContent = quizScore; quizFeedback.textContent = '정답입니다!'; }
    else quizFeedback.textContent = `오답입니다. 정답: ${correctAnswer}`;
    if (currentQuizIndex + 1 < quizData.length) quizNextBtn.classList.remove('hidden');
    else quizFinishBtn.classList.remove('hidden');
}

if (quizNextBtn) {
    quizNextBtn.addEventListener('click', () => {
        currentQuizIndex++;
        quizFeedback.classList.add('hidden');
        quizNextBtn.classList.add('hidden');
        window.onkeydown = null;
        showQuiz();
    });
}

if (quizFinishBtn) {
    quizFinishBtn.addEventListener('click', () => {
        window.showAlert(`퀴즈 완료! 최종 점수: ${quizScore} / ${quizData.length * 10}점`);
        window.location.href = backUrl;
    });
}

// ── 채팅 연동 ────────────────────────────────────────────
function sendTopicToChat(topic) {
    if (typeof ChatState !== 'undefined' && ChatState.socket && ChatState.socket.readyState === WebSocket.OPEN) {
        ChatState.socket.send(JSON.stringify({ type: 'context', topic }));
    }
}

// ── 텍스트 포맷 유틸 ─────────────────────────────────────
function highlightStructure(text) {
    const formMatch = text.match(/^(\d형식|제\d형식)/);
    let badge = '';
    let body = text;
    if (formMatch) {
        badge = `<span class="struct-form-badge">${formMatch[1]}</span>`;
        body  = text.replace(/^(\d형식|제\d형식)\s*[\/\-]?\s*/, '');
    }
    body = body
        .replace(/\bS\(([^)]*)\)/g,           '<span class="stag stag-s">S($1)</span>')
        .replace(/\bV\(([^)]*)\)/g,           '<span class="stag stag-v">V($1)</span>')
        .replace(/\bO\(([^)]*)\)/g,           '<span class="stag stag-o">O($1)</span>')
        .replace(/\b(SC|OC|IO|C)\(([^)]*)\)/g,'<span class="stag stag-c">$1($2)</span>')
        .replace(/\bM\(([^)]*)\)/g,           '<span class="stag stag-m">M($1)</span>');
    return badge + body;
}

function formatAnalysis(text) {
    const circled = ['①','②','③','④','⑤'];
    const parts = text.split(/(①|②|③|④|⑤)/);
    if (parts.length <= 1) return text.replace(/\n/g, '<br>');
    let html = parts[0] ? `<p style="margin:0 0 .4rem;color:var(--text-2)">${parts[0].trim()}</p>` : '';
    for (let i = 1; i < parts.length; i += 2) {
        const num     = parts[i];
        const content = (parts[i + 1] || '').replace(/^\s*/, '').replace(/\n/g, '<br>');
        const idx     = circled.indexOf(num) + 1;
        html += `<div class="exp-point"><span class="exp-num">${idx}</span><span class="exp-text">${content}</span></div>`;
    }
    return html;
}

function renderVocaItem(raw) {
    const posMatch = raw.match(/^([^(：:]+)\(([^)]+)\)\s*[：:]\s*(.+)$/);
    if (posMatch) {
        const [, word, pos, rest] = posMatch;
        const dashIdx = rest.indexOf(' - ');
        const mean = dashIdx !== -1 ? rest.substring(0, dashIdx).trim() : rest.trim();
        const tip  = dashIdx !== -1 ? rest.substring(dashIdx + 3).trim() : '';
        return `<div class="voca-item">
            <div class="voca-head"><span class="voca-word">${word.trim()}</span><span class="voca-pos">${pos}</span></div>
            <span class="voca-mean">${mean}</span>
            ${tip ? `<span class="voca-tip">— ${tip}</span>` : ''}
        </div>`;
    }
    const colonIdx = raw.indexOf(':');
    if (colonIdx !== -1) {
        return `<div class="voca-item">
            <div class="voca-head"><span class="voca-word">${raw.substring(0, colonIdx).trim()}</span></div>
            <span class="voca-mean">${raw.substring(colonIdx + 1).trim()}</span>
        </div>`;
    }
    return `<div class="voca-item"><div class="voca-head"></div><span class="voca-mean">${raw}</span></div>`;
}
