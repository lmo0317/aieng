/**
 * chat-page.js - /chat 전용 페이지 JS
 * chat.js(모달 버전)와 독립적으로 동작
 */

const TEACHER_PERSONAS = {
    korean: {
        name: 'Sophie 선생님',
        avatarText: '🇰🇷',
        avatarClass: 'tc-avatar-kor',
        systemPrompt: `당신은 'Trend Eng'의 친절한 한국어 영어 선생님 "Sophie 선생님"입니다.

## 가장 중요한 규칙:
1. **무조건 한국어로만 대화하세요** - 절대 영어로 답변하지 마세요
2. 학생이 영어로 말해도 한국어로 설명해주세요
3. 영어 예문은 한국어 번역과 함께 제시하세요

## 선생님의 교육 스타일:
- 친절하고 격려하는 말투 사용
- 복잡한 문법도 쉽게 설명
- 일상생활 예시로 이해하기 쉽게
- 자주 칭찬과 격려 제공`
    },
    native: {
        name: 'Alex 선생님',
        avatarText: '🇺🇸',
        avatarClass: 'tc-avatar-nat',
        systemPrompt: `You are Teacher Alex, a friendly NATIVE ENGLISH SPEAKER and an expert English tutor.

## Your Communication Rule:
1. **Always respond to the student ONLY in English** in your main reply.
2. **Analyze the student's latest English message** for any grammatical errors, unnatural phrasings, or better vocabulary choices.
3. At the very end of your response, provide two hidden sections:
   - Use [KOR_TRANS] for the Korean translation of your reply.
   - Use [CORRECTIONS] for a brief, friendly explanation strictly in KOREAN (한국어로만) about the student's mistakes.`
    }
};

const State = {
    socket: null,
    isConnected: false,
    selectedTeacher: null,
    teacherPersona: null,
    currentAiMessageTextDiv: null,
    aiTextBuffer: ''
};

// DOM
const teacherSelectionEl = document.getElementById('teacher-selection');
const chatInterfaceEl    = document.getElementById('chat-interface');
const chatMessages       = document.getElementById('chat-messages');
const chatInput          = document.getElementById('chat-input');
const chatSendBtn        = document.getElementById('chat-send-btn');
const chatStatusIndicator = document.getElementById('chat-status-indicator');
const chatStatusText     = document.getElementById('chat-status-text');
const chatHeaderAvatar   = document.getElementById('chat-header-avatar');
const chatTeacherName    = document.getElementById('chat-teacher-name');
const changeTeacherBtn   = document.getElementById('change-teacher-btn');

// ── 초기화 ─────────────────────────────────────────────
const saved = localStorage.getItem('preferredTeacher');
if (saved && TEACHER_PERSONAS[saved]) {
    selectTeacher(saved);
} else {
    showTeacherSelection();
}

// ── 선생님 선택 ─────────────────────────────────────────
function showTeacherSelection() {
    teacherSelectionEl.classList.remove('hidden');
    chatInterfaceEl.classList.add('hidden');
}

document.querySelectorAll('.teacher-card').forEach(card => {
    card.addEventListener('click', () => selectTeacher(card.dataset.teacher));
    const btn = card.querySelector('.teacher-select-btn');
    if (btn) btn.addEventListener('click', e => { e.stopPropagation(); selectTeacher(card.dataset.teacher); });
});

changeTeacherBtn.addEventListener('click', () => {
    if (State.socket) State.socket.close();
    State.selectedTeacher = null;
    State.teacherPersona  = null;
    chatMessages.innerHTML = '<div class="chat-welcome-message" id="chat-welcome">안녕하세요! 무엇이든 물어보세요.</div>';
    showTeacherSelection();
});

function selectTeacher(teacherType) {
    State.selectedTeacher = teacherType;
    State.teacherPersona  = TEACHER_PERSONAS[teacherType];
    localStorage.setItem('preferredTeacher', teacherType);

    const p = State.teacherPersona;
    chatHeaderAvatar.textContent = p.avatarText;
    chatHeaderAvatar.className   = 'chat-header-avatar ' + (p.avatarClass || '');
    chatTeacherName.textContent  = p.name;

    teacherSelectionEl.classList.add('hidden');
    chatInterfaceEl.classList.remove('hidden');

    connectWebSocket();
}

// ── WebSocket ───────────────────────────────────────────
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl    = `${protocol}//${window.location.host}/ws/chat`;
    State.socket   = new WebSocket(wsUrl);

    State.socket.onopen = () => {
        State.isConnected = true;
        updateStatus('AI 연결됨', 'active');

        // 선생님 페르소나 전송
        State.socket.send(JSON.stringify({
            type: 'persona',
            teacher: State.selectedTeacher,
            systemPrompt: State.teacherPersona.systemPrompt
        }));

        // 현재 학습 주제 전송 (learn 페이지에서 넘어온 경우)
        const topic = sessionStorage.getItem('currentTopic');
        if (topic) {
            State.socket.send(JSON.stringify({ type: 'context', topic }));
        }
    };

    State.currentAiMessageTextDiv = null;
    State.aiTextBuffer = '';

    State.socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'text') {
                State.aiTextBuffer += data.text;
                hideTypingIndicator();

                let cleanText = State.aiTextBuffer;
                let translationText = '';
                let correctionsText = '';

                if (State.selectedTeacher === 'native') {
                    const transParts = cleanText.split('[KOR_TRANS]');
                    cleanText = transParts[0];
                    if (transParts.length > 1) {
                        const corrParts = transParts[1].split('[CORRECTIONS]');
                        translationText = corrParts[0].trim();
                        if (corrParts.length > 1) correctionsText = corrParts[1].trim();
                    }
                }

                cleanText = cleanText.trim();
                if (cleanText.length === 0) return;

                if (!State.currentAiMessageTextDiv) {
                    const p = State.teacherPersona;
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'chat-message chat-message-ai';
                    msgDiv.innerHTML = `<div class="chat-ai-avatar ${p.avatarClass || ''}">${p.avatarText}</div><div class="chat-message-bubble"><div class="chat-message-text"></div></div>`;
                    chatMessages.appendChild(msgDiv);
                    State.currentAiMessageTextDiv = msgDiv.querySelector('.chat-message-text');
                    document.getElementById('chat-welcome')?.remove();
                }

                State.currentAiMessageTextDiv.textContent = cleanText;

                const parentMsg = State.currentAiMessageTextDiv.closest('.chat-message');
                if (translationText) parentMsg.setAttribute('data-translation', translationText);
                if (correctionsText) parentMsg.setAttribute('data-corrections', correctionsText);

                chatMessages.scrollTop = chatMessages.scrollHeight;

            } else if (data.type === 'turn_complete') {
                if (State.selectedTeacher === 'native' && State.currentAiMessageTextDiv) {
                    const aiMsg = State.currentAiMessageTextDiv.closest('.chat-message');
                    const translation = aiMsg.getAttribute('data-translation');
                    const corrections = aiMsg.getAttribute('data-corrections');

                    if (translation) {
                        const actionsDiv = getOrCreateActionsDiv(aiMsg);
                        addTranslationToggle(aiMsg, translation, actionsDiv);
                    }
                    if (corrections) {
                        const userMsgs = document.querySelectorAll('.chat-message-user');
                        if (userMsgs.length > 0) {
                            const lastUser = userMsgs[userMsgs.length - 1];
                            const actionsDiv = getOrCreateActionsDiv(lastUser);
                            addCorrectionsToggle(lastUser, corrections, actionsDiv);
                        }
                    }
                }
                State.currentAiMessageTextDiv = null;
                State.aiTextBuffer = '';

            } else if (data.type === 'error') {
                window.showAlert('서버 오류: ' + data.message);
            }
        } catch (e) {
            console.error('[Chat] Message parse error:', e);
        }
    };

    State.socket.onclose = () => {
        State.isConnected = false;
        updateStatus('연결 끊김', 'inactive');
    };
}

// ── 메시지 전송 ─────────────────────────────────────────
function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !State.isConnected) return;

    State.currentAiMessageTextDiv = null;
    State.aiTextBuffer = '';

    addUserMessage(text);
    showTypingIndicator();
    State.socket.send(JSON.stringify({ type: 'text', text }));
    chatInput.value = '';
}

chatSendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

// ── UI 헬퍼 ────────────────────────────────────────────
function addUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message chat-message-user';
    msgDiv.innerHTML = `<div class="chat-message-bubble"><div class="chat-message-text">${text}</div></div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    document.getElementById('chat-welcome')?.remove();
}

function showTypingIndicator() {
    hideTypingIndicator();
    const p = State.teacherPersona;
    const wrap = document.createElement('div');
    wrap.className = 'chat-message chat-message-ai typing-indicator-wrap';
    wrap.innerHTML = `<div class="chat-ai-avatar ${p?.avatarClass || ''}">${p?.avatarText || 'AI'}</div><div class="typing-indicator"><span></span><span></span><span></span></div>`;
    chatMessages.appendChild(wrap);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    document.querySelector('.typing-indicator-wrap')?.remove();
}

function updateStatus(text, type) {
    chatStatusIndicator.classList.remove('hidden');
    chatStatusText.textContent = text;
}

function getOrCreateActionsDiv(parentMsg) {
    let div = parentMsg.querySelector('.message-actions');
    if (!div) {
        div = document.createElement('div');
        div.className = 'message-actions';
        parentMsg.querySelector('.chat-message-bubble').appendChild(div);
    }
    return div;
}

function addTranslationToggle(parentMsg, translation, actionsDiv) {
    const btn = document.createElement('button');
    btn.className = 'translate-btn';
    btn.innerHTML = '<span>🌐</span> 번역';
    const div = document.createElement('div');
    div.className = 'translation-text hidden';
    div.textContent = translation;
    btn.addEventListener('click', () => { div.classList.toggle('hidden'); btn.classList.toggle('active'); });
    actionsDiv.appendChild(btn);
    parentMsg.querySelector('.chat-message-bubble').appendChild(div);
}

function addCorrectionsToggle(parentMsg, corrections, actionsDiv) {
    const btn = document.createElement('button');
    btn.className = 'translate-btn';
    btn.innerHTML = '<span>✨</span> 문장 교정';
    const div = document.createElement('div');
    div.className = 'corrections-text hidden';
    div.textContent = corrections;
    btn.addEventListener('click', () => { div.classList.toggle('hidden'); btn.classList.toggle('active'); });
    actionsDiv.appendChild(btn);
    parentMsg.querySelector('.chat-message-bubble').appendChild(div);
}
