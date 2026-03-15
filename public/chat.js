/**
 * AI Text Chat System JavaScript (Modified: Text Only)
 */

const ChatState = {
    isOpen: false,
    isConnected: false,
    socket: null,
    currentAiMessageTextDiv: null,
    aiTextBuffer: '',
    isAiResponding: false,
    selectedTeacher: null, // 'korean' 또는 'native'
    teacherPersona: null
};

// 선생님 페르소나 설정
const TEACHER_PERSONAS = {
    korean: {
        name: '친절한 한국어 선생님',
        emoji: '👩‍🏫',
        systemPrompt: `당신은 'Trend Eng'의 친절한 한국어 영어 선생님 "Sophie 선생님"입니다.

## 가장 중요한 규칙:
1. **무조건 한국어로만 대화하세요** - 절대 영어로 답변하지 마세요
2. 학생이 영어로 말해도 한국어로 설명해주세요
3. 영어 예문은 한국어 번역과 함께 제시하세요

## 선생님의 교육 스타일:
- 친절하고 격려하는 말투 사용
- 복잡한 문법도 쉽게 설명
- 일상생활 예시로 이해하기 쉽게
- 자주 칭찬과 격려 제공

## 답변 형식:
- 한국어로 먼저 설명
- 영어 예문 제시
- 한국어 번역 포함
- 격려의 말로 마무리`
    },
    native: {
        name: '원어민 강사',
        emoji: '🧑‍🏫',
        systemPrompt: `You are Teacher Alex, a friendly NATIVE ENGLISH SPEAKER and an expert English tutor. 

## Your Communication Rule:
1. **Always respond to the student ONLY in English** in your main reply.
2. **Analyze the student's latest English message** for any grammatical errors, unnatural phrasings, or better vocabulary choices.
3. At the very end of your response, provide two hidden sections:
   - Use [KOR_TRANS] for the Korean translation of your reply.
   - Use [CORRECTIONS] for a brief, friendly explanation strictly in KOREAN (한국어로만) about the student's mistakes.`
    }
};

// UI Elements
const chatModal = document.getElementById('chat-modal');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatCloseBtn = document.getElementById('chat-close-btn');
const chatStatusIndicator = document.getElementById('chat-status-indicator');
const chatStatusText = document.getElementById('chat-status-text');

function openChatModal() {
    chatModal.classList.remove('hidden');
    document.body.classList.add('chat-active');
    ChatState.isOpen = true;

    if (!window.history.state || window.history.state.modal !== 'chat') {
        window.history.pushState({ modal: 'chat' }, '');
    }

    if (!ChatState.selectedTeacher) {
        showTeacherSelection();
    } else {
        connectWebSocket();
    }
}

function showTeacherSelection() {
    const teacherSelection = document.getElementById('teacher-selection');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputArea = document.querySelector('.chat-input-area');

    teacherSelection.classList.remove('hidden');
    chatMessages.classList.add('hidden');
    chatInputArea.classList.add('hidden');

    const teacherCards = document.querySelectorAll('.teacher-card');
    teacherCards.forEach(card => {
        card.addEventListener('click', () => {
            const teacherType = card.getAttribute('data-teacher');
            selectTeacher(teacherType);
        });

        const selectBtn = card.querySelector('.teacher-select-btn');
        if (selectBtn) {
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const teacherType = card.getAttribute('data-teacher');
                selectTeacher(teacherType);
            });
        }
    });
}

function selectTeacher(teacherType) {
    ChatState.selectedTeacher = teacherType;
    ChatState.teacherPersona = TEACHER_PERSONAS[teacherType];

    const modalTitle = document.getElementById('chat-modal-title');
    if (modalTitle) modalTitle.textContent = ChatState.teacherPersona.name;

    const teacherSelection = document.getElementById('teacher-selection');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputArea = document.querySelector('.chat-input-area');

    teacherSelection.classList.add('hidden');
    chatMessages.classList.remove('hidden');
    chatInputArea.classList.remove('hidden');

    connectWebSocket();
}

function closeChatModal(isPopState = false) {
    chatModal.classList.add('hidden');
    document.body.classList.remove('chat-active');
    ChatState.isOpen = false;
    
    if (ChatState.socket) ChatState.socket.close();

    if (isPopState !== true && window.history.state && window.history.state.modal === 'chat') {
        window.history.back();
    }

    ChatState.selectedTeacher = null;
    ChatState.teacherPersona = null;

    const teacherSelection = document.getElementById('teacher-selection');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputArea = document.querySelector('.chat-input-area');

    if (teacherSelection) teacherSelection.classList.remove('hidden');
    if (chatMessages) {
        chatMessages.classList.add('hidden');
        chatMessages.innerHTML = '<div class="chat-welcome-message">안녕하세요! Trend Eng AI 튜터입니다.<br>궁금한 내용을 텍스트로 물어보세요!</div>';
    }
    if (chatInputArea) chatInputArea.classList.add('hidden');
}

window.addEventListener('popstate', (event) => {
    if (ChatState.isOpen) closeChatModal(true);
});

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    console.log('[Chat WS] Connecting to:', wsUrl);
    ChatState.socket = new WebSocket(wsUrl);

    ChatState.socket.onopen = () => {
        console.log('[Chat WS] Connected to server');
        ChatState.isConnected = true;
        updateStatus('AI 연결됨', 'active');

        if (ChatState.selectedTeacher && ChatState.teacherPersona) {
            ChatState.socket.send(JSON.stringify({
                type: 'persona',
                teacher: ChatState.selectedTeacher,
                systemPrompt: ChatState.teacherPersona.systemPrompt
            }));
        }

        const topic = sessionStorage.getItem('currentTopic');
        if (topic) {
            ChatState.socket.send(JSON.stringify({
                type: 'context',
                topic: topic
            }));
        }
    };

    ChatState.currentAiMessageTextDiv = null;
    ChatState.aiTextBuffer = '';

    ChatState.socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'text') {
                ChatState.aiTextBuffer += data.text;
                hideTypingIndicator();

                let cleanText = ChatState.aiTextBuffer;
                let translationText = '';
                let correctionsText = '';

                if (ChatState.selectedTeacher === 'native') {
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

                if (!ChatState.currentAiMessageTextDiv) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `chat-message chat-message-ai`;
                    messageDiv.innerHTML = `<div class="chat-message-content"><div class="chat-message-text"></div></div>`;
                    chatMessages.appendChild(messageDiv);
                    ChatState.currentAiMessageTextDiv = messageDiv.querySelector('.chat-message-text');

                    const welcome = document.querySelector('.chat-welcome-message');
                    if (welcome) welcome.remove();
                }

                ChatState.currentAiMessageTextDiv.textContent = cleanText;
                
                if (ChatState.currentAiMessageTextDiv) {
                    const parentMessage = ChatState.currentAiMessageTextDiv.closest('.chat-message');
                    if (translationText) parentMessage.setAttribute('data-translation', translationText);
                    if (correctionsText) parentMessage.setAttribute('data-corrections', correctionsText);
                }

                chatMessages.scrollTop = chatMessages.scrollHeight;

            } else if (data.type === 'turn_complete') {
                if (ChatState.selectedTeacher === 'native' && ChatState.currentAiMessageTextDiv) {
                    const aiParentMessage = ChatState.currentAiMessageTextDiv.closest('.chat-message');
                    const translation = aiParentMessage.getAttribute('data-translation');
                    const corrections = aiParentMessage.getAttribute('data-corrections');

                    if (translation) {
                        let aiActionsDiv = aiParentMessage.querySelector('.message-actions');
                        if (!aiActionsDiv) {
                            aiActionsDiv = document.createElement('div');
                            aiActionsDiv.className = 'message-actions';
                            aiParentMessage.querySelector('.chat-message-content').appendChild(aiActionsDiv);
                        }
                        addTranslationToggle(aiParentMessage, translation, aiActionsDiv);
                    }

                    if (corrections) {
                        const userMessages = document.querySelectorAll('.chat-message-user');
                        if (userMessages.length > 0) {
                            const lastUserMessage = userMessages[userMessages.length - 1];
                            let userActionsDiv = lastUserMessage.querySelector('.message-actions');
                            if (!userActionsDiv) {
                                userActionsDiv = document.createElement('div');
                                userActionsDiv.className = 'message-actions';
                                lastUserMessage.querySelector('.chat-message-content').appendChild(userActionsDiv);
                            }
                            addCorrectionsToggle(lastUserMessage, corrections, userActionsDiv);
                        }
                    }
                }
                ChatState.currentAiMessageTextDiv = null;
                ChatState.aiTextBuffer = '';            } else if (data.type === 'error') {
                alert('서버 오류: ' + data.message);
            }
        } catch (e) {
            console.error('[Chat WS] Message parse error:', e);
        }
    };

    ChatState.socket.onclose = () => {
        ChatState.isConnected = false;
        updateStatus('연결 끊김', 'inactive');
    };
}

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !ChatState.isConnected) return;

    ChatState.currentAiMessageTextDiv = null;
    ChatState.aiTextBuffer = '';

    addMessage('user', text);
    showTypingIndicator();

    ChatState.socket.send(JSON.stringify({ type: 'text', text: text }));
    chatInput.value = '';
}

function addMessage(type, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message chat-message-${type}`;
    messageDiv.innerHTML = `<div class="chat-message-content"><div class="chat-message-text">${text}</div></div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    const welcome = document.querySelector('.chat-welcome-message');
    if (welcome) welcome.remove();
}

function updateStatus(text, type) {
    chatStatusIndicator.classList.remove('hidden');
    chatStatusText.textContent = text;
}

function showTypingIndicator() {
    const existing = document.querySelector('.typing-indicator');
    if (existing) existing.remove();

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const typingDiv = document.querySelector('.typing-indicator');
    if (typingDiv) typingDiv.remove();
}

function addTranslationToggle(parentMessage, translation, actionsDiv) {
    const translateBtn = document.createElement('button');
    translateBtn.className = 'translate-btn';
    translateBtn.innerHTML = '<span>🌐</span> 번역';
    
    const translationDiv = document.createElement('div');
    translationDiv.className = 'translation-text hidden';
    translationDiv.textContent = translation;
    
    translateBtn.addEventListener('click', () => {
        const isHidden = translationDiv.classList.contains('hidden');
        translationDiv.classList.toggle('hidden');
        translateBtn.classList.toggle('active');
    });
    
    actionsDiv.appendChild(translateBtn);
    parentMessage.querySelector('.chat-message-content').appendChild(translationDiv);
}

function addCorrectionsToggle(parentMessage, corrections, actionsDiv) {
    const correctionsBtn = document.createElement('button');
    correctionsBtn.className = 'translate-btn';
    correctionsBtn.innerHTML = '<span>✨</span> 문장 교정';
    
    const correctionsDiv = document.createElement('div');
    correctionsDiv.className = 'corrections-text hidden';
    correctionsDiv.textContent = corrections;
    
    correctionsBtn.addEventListener('click', () => {
        correctionsDiv.classList.toggle('hidden');
        correctionsBtn.classList.toggle('active');
    });
    
    actionsDiv.appendChild(correctionsBtn);
    parentMessage.querySelector('.chat-message-content').appendChild(correctionsDiv);
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    const chatBtn = document.getElementById('ai-chat-btn');
    if (chatBtn) chatBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        openChatModal(); 
    });
    chatCloseBtn.addEventListener('click', closeChatModal);
    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') sendMessage(); 
    });
    
    // 마이크 버튼 숨김 처리 (기존 CSS 유지 위해 JS에서 처리)
    const micBtn = document.getElementById('chat-mic-btn');
    if (micBtn) micBtn.style.display = 'none';
});
