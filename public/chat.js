/**
 * AI Real-time Video/Voice Chat System JavaScript
 */

const ChatState = {
    isOpen: false,
    isConnected: false,
    isRecording: false,
    isVideoEnabled: false,
    socket: null,
    localStream: null,
    audioContext: null,
    audioWorklet: null,
    source: null,
    processor: null,
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
- 격려의 말로 마무리

## 예시 대화:

**학생:** "Hello, how are you?"

**Sophie 선생님:** "안녕하세요! 아주 좋은 인사말을 하셨네요! 😊

'Hello, how are you?'는 영어권에서 가장 많이 쓰이는 인사말이에요.

**영어 표현:**
- Hello, how are you? (안녕하세요, 어떻게 지내세요?)
- Hi, how's it going? (안녕, 잘 지내?)
- Good to see you! (만나서 반가워!)

**팁:** 친구之间에는 "How's it going?"을 더 많이 사용해요.

정말 잘하고 있어요! 계속해서 대화해보세요! 💪"

## 대화 원칙:
1. 한국어로만 답변 (100%)
2. 영어 예문은 꼭 한국어 번역과 함께
3. 친절하고 격려하는 태도
4. 3-4문장으로 간결명료하게
5. 이모지를 적절히 사용해서 친근감 ✨

학생이 영어 실력을 향상할 수 있도록 도와주세요!`
    },
    native: {
        name: '원어민 강사',
        emoji: '🧑‍🏫',
        systemPrompt: `You are Teacher Alex, a friendly NATIVE ENGLISH SPEAKER. **CRITICAL: You must respond ONLY in English.** Never respond in Korean.

## Your Teaching Philosophy:
- You help Korean students practice CONVERSATIONAL English
- You speak like a real native speaker - casual, natural, friendly
- You want students to feel comfortable speaking English with you

## How You Respond:
1. **ALWAYS respond in English** - this is non-negotiable
2. Keep your responses conversational and natural
3. If students speak Korean, respond in English but acknowledge what they said
4. Teach practical expressions that native speakers actually use
5. Be encouraging and friendly

## Example Interactions:

**Student says:** "안녕하세요, 만나서 반가워요"
**You respond:** "Nice to meet you too! I'm Teacher Alex, and I'm here to help you practice English. Don't worry about making mistakes - that's how we learn! So, how are you doing today?"

**Student says:** "오늘 날씨가 좋네요"
**You respond:** "Yeah, it's a beautiful day! Perfect weather for learning English, right? 😊 By the way, here's a natural expression: 'The weather is gorgeous today!' - sounds more native, don't you think?"

**Student asks:** "How do I say '배고파요' in English?"
**You respond:** "Great question! Here are some natural ways native speakers say it:
- 'I'm starving!' (very common, slightly dramatic)
- 'I'm pretty hungry' (neutral)
- 'I could eat' (casual)

My advice: Start with 'I'm starving!' - it's fun and sounds super natural!"

## Your Personality:
- Friendly and approachable (like a cool American/British friend)
- Patient with learners
- Enthusiastic about teaching English
- Use emojis occasionally to seem more friendly 😊👍

Remember: Your goal is to help students practice REAL English that native speakers actually use. Keep it 100% English!`
    }
};

// UI Elements
const chatModal = document.getElementById('chat-modal');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatMicBtn = document.getElementById('chat-mic-btn');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatCloseBtn = document.getElementById('chat-close-btn');
const chatStatusIndicator = document.getElementById('chat-status-indicator');
const chatStatusText = document.getElementById('chat-status-text');
const videoToggleBtn = document.getElementById('video-toggle-btn');
const videoChatContainer = document.getElementById('video-chat-container');
const localVideo = document.getElementById('local-video');
const aiVoiceWaves = document.getElementById('ai-voice-waves');

function openChatModal() {
    chatModal.classList.remove('hidden');
    document.body.classList.add('chat-active');
    ChatState.isOpen = true;

    // 뒤로가기 버튼 제어를 위해 히스토리 상태 추가
    if (!window.history.state || window.history.state.modal !== 'chat') {
        window.history.pushState({ modal: 'chat' }, '');
    }

    // 선생님이 선택되지 않았으면 선택 화면 표시
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
    const videoChatContainer = document.getElementById('video-chat-container');

    // 선생님 선택 화면 표시
    teacherSelection.classList.remove('hidden');
    chatMessages.classList.add('hidden');
    chatInputArea.classList.add('hidden');
    videoChatContainer.classList.add('hidden');

    // 선생님 카드 클릭 이벤트
    const teacherCards = document.querySelectorAll('.teacher-card');
    teacherCards.forEach(card => {
        card.addEventListener('click', () => {
            const teacherType = card.getAttribute('data-teacher');
            selectTeacher(teacherType);
        });

        // 선택 버튼 클릭 이벤트
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

    // 헤더의 선생님 정보 업데이트
    const modalTitle = document.getElementById('chat-modal-title');
    const aiEmoji = document.querySelector('.ai-emoji');
    if (modalTitle) {
        modalTitle.textContent = ChatState.teacherPersona.name;
    }
    if (aiEmoji) {
        aiEmoji.textContent = ChatState.teacherPersona.emoji;
    }

    // 선생님 선택 화면 숨기고 채팅 화면 표시
    const teacherSelection = document.getElementById('teacher-selection');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputArea = document.querySelector('.chat-input-area');

    teacherSelection.classList.add('hidden');
    chatMessages.classList.remove('hidden');
    chatInputArea.classList.remove('hidden');

    // 웹소켓 연결 시작
    connectWebSocket();
}

function closeChatModal(isPopState = false) {
    chatModal.classList.add('hidden');
    document.body.classList.remove('chat-active');
    ChatState.isOpen = false;
    stopAllMedia();
    if (ChatState.socket) ChatState.socket.close();

    // 직접 X 버튼을 눌러 닫은 경우 히스토리 뒤로가기 실행 (popstate 중복 방지)
    if (isPopState !== true && window.history.state && window.history.state.modal === 'chat') {
        window.history.back();
    }

    // 선생님 선택 초기화 (다시 열면 다시 선택)
    ChatState.selectedTeacher = null;
    ChatState.teacherPersona = null;

    // UI 초기화
    const teacherSelection = document.getElementById('teacher-selection');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputArea = document.querySelector('.chat-input-area');
    const videoChatContainer = document.getElementById('video-chat-container');
    const modalTitle = document.getElementById('chat-modal-title');
    const aiEmoji = document.querySelector('.ai-emoji');

    if (teacherSelection) {
        teacherSelection.classList.remove('hidden');
    }
    if (chatMessages) {
        chatMessages.classList.add('hidden');
        // 채팅 메시지 초기화
        chatMessages.innerHTML = '<div class="chat-welcome-message">안녕하세요! Trend Eng AI 튜터입니다.<br>실시간 음성 및 화상 대화로 영어 실력을 키워보세요!<br>하단의 마이크나 상단의 비디오 버튼을 눌러 시작하세요.</div>';
    }
    if (chatInputArea) {
        chatInputArea.classList.add('hidden');
    }
    if (videoChatContainer) {
        videoChatContainer.classList.add('hidden');
    }
    if (modalTitle) {
        modalTitle.textContent = 'AI Real-time Tutor';
    }
    if (aiEmoji) {
        aiEmoji.textContent = '🤖';
    }
}

// 브라우저 뒤로가기 버튼 감지
window.addEventListener('popstate', (event) => {
    if (ChatState.isOpen) {
        closeChatModal(true);
    }
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

        // 선생님 페르소나 전송
        if (ChatState.selectedTeacher && ChatState.teacherPersona) {
            console.log('[Chat WS] Sending teacher persona:', ChatState.selectedTeacher);
            ChatState.socket.send(JSON.stringify({
                type: 'persona',
                teacher: ChatState.selectedTeacher,
                systemPrompt: ChatState.teacherPersona.systemPrompt
            }));
        }

        // 학습 페이지의 주제가 있다면 서버에 알림
        const topic = sessionStorage.getItem('currentTopic');
        if (topic) {
            console.log('[Chat WS] Sending topic context:', topic);
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
            console.log('[Chat WS] Received:', data.type, data.text ? data.text.substring(0, 50) + '...' : '');

            if (data.type === 'text') {
                // 텍스트 버퍼에 추가
                ChatState.aiTextBuffer += data.text;

                // "타이핑 중" 메시지 제거
                hideTypingIndicator();

                // 텍스트 정리 및 실시간 표시
                let cleanText = ChatState.aiTextBuffer;

                // 선생님 유형에 따라 다르게 텍스트 처리
                if (ChatState.selectedTeacher === 'korean') {
                    // 친절한 한국어 선생님: 주로 한국어 텍스트
                    cleanText = cleanText.replace(/\*\*.*?\*\*/g, ''); // 별표 강조 제거
                    cleanText = cleanText.replace(/^(I've|I have|I am|I'm|I will|My focus|The current|My response).*$/gmi, '');
                    cleanText = cleanText.replace(/^(This feels like|I want to|It's a casual|I'll ask).*$/gmi, '');
                    cleanText = cleanText.replace(/##.*$/gm, ''); // 마크다운 제목 제거
                    cleanText = cleanText.replace(/\*\*/g, ''); // 별표 제거
                } else if (ChatState.selectedTeacher === 'native') {
                    // 원어민 강사: 마크다운 형식 유지하되 정리만
                    // **bold**는 유지하되 줄바꿈만 정리
                    cleanText = cleanText.replace(/\n{3,}/g, '\n\n'); // 줄바꿈 정리만
                    // AI의 사고 과정 제거
                    cleanText = cleanText.replace(/^(I've|I have|I am|I'm|I will|My focus|The current|My response).*$/gmi, '');
                }

                cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();

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
                chatMessages.scrollTop = chatMessages.scrollHeight;

            } else if (data.type === 'turn_complete') {
                console.log('[Chat WS] Turn complete');
                ChatState.currentAiMessageTextDiv = null;
                ChatState.aiTextBuffer = '';
            } else if (data.type === 'error') {
                console.error('[Chat WS] Server error:', data.message);
                alert('서버 오류: ' + data.message);
            }
        } catch (e) {
            console.error('[Chat WS] Message parse error:', e, event.data);
        }
    };

    ChatState.socket.onclose = () => {
        console.log('[Chat WS] Connection closed');
        ChatState.isConnected = false;
        updateStatus('연결 끊김', 'inactive');
    };

    ChatState.socket.onerror = (error) => {
        console.error('[Chat WS] WebSocket error:', error);
    };
}

/**
 * 마이크 토글 및 음성 녹음 시작/중지
 */
async function toggleMic() {
    if (!ChatState.isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            ChatState.localStream = stream;
            
            // Web Audio API 설정
            ChatState.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            ChatState.source = ChatState.audioContext.createMediaStreamSource(stream);
            ChatState.processor = ChatState.audioContext.createScriptProcessor(4096, 1, 1);
            
            ChatState.source.connect(ChatState.processor);
            ChatState.processor.connect(ChatState.audioContext.destination);
            
            ChatState.processor.onaudioprocess = (e) => {
                if (ChatState.socket?.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // 16비트 PCM으로 변환하여 전송
                    const pcmData = floatTo16BitPCM(inputData);
                    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                    ChatState.socket.send(JSON.stringify({ type: 'audio', data: base64Audio }));
                }
            };
            
            ChatState.isRecording = true;
            chatMicBtn.classList.add('recording');
            updateStatus('듣고 있는 중...', 'active');
        } catch (err) {
            console.error('마이크 접근 실패:', err);
            alert('마이크를 사용할 수 없습니다.');
        }
    } else {
        stopMic();
    }
}

function stopMic() {
    if (ChatState.processor) {
        ChatState.processor.disconnect();
        ChatState.source.disconnect();
    }
    ChatState.isRecording = false;
    chatMicBtn.classList.remove('recording');
    updateStatus('AI 연결됨', 'active');
}

function stopAllMedia() {
    stopMic();
    if (ChatState.localStream) {
        ChatState.localStream.getTracks().forEach(track => track.stop());
    }
    if (ChatState.audioContext) ChatState.audioContext.close();
}

function floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
}

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !ChatState.isConnected) return;

    // 이전 AI 응답 중지 및 초기화
    ChatState.currentAiMessageTextDiv = null;
    ChatState.aiTextBuffer = '';

    addMessage('user', text);

    // "타이핑 중" 메시지 표시
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

// 응답 형식 정리 함수: 항상 "영어 --- 한글" 순서
function formatResponse(text) {
    // "---" 구분자 찾기
    const separatorIndex = text.indexOf('---');

    if (separatorIndex === -1) {
        // 구분자가 없으면 그대로 반환
        return text;
    }

    const before = text.substring(0, separatorIndex).trim();
    const after = text.substring(separatorIndex + 3).trim();

    // 앞부분이 한글인지 확인 (한글 문자가 포함되어 있는지)
    const hasKoreanBefore = /[\u3131-\u3163\uac00-\ud7a3]/.test(before);
    const hasKoreanAfter = /[\u3131-\u3163\uac00-\ud7a3]/.test(after);

    // 앞부분이 한글이고 뒷부분이 영어이면 순서 바꾸기
    if (hasKoreanBefore && !hasKoreanAfter) {
        return `${after}\n---\n${before}`;
    }

    // 그 외의 경우는 원래 순서 유지
    return `${before}\n---\n${after}`;
}

// "타이핑 중" 표시 함수
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

// 오디오 재생 큐
let playbackContext = null;
let nextStartTime = 0;

function initAudioContext() {
    if (!playbackContext) {
        playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }
    if (playbackContext.state === 'suspended') {
        playbackContext.resume();
    }
}

function playAudioChunk(base64Audio) {
    try {
        initAudioContext();

        const binaryString = atob(base64Audio);
        const len = binaryString.length;

        // 16비트 PCM은 2바이트(16비트) 단위여야 함. 홀수면 마지막 1바이트 버림
        const validLen = len % 2 === 0 ? len : len - 1;
        const bytes = new Uint8Array(validLen);
        for (let i = 0; i < validLen; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const int16Array = new Int16Array(bytes.buffer, 0, validLen / 2);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }

        // Gemini는 24kHz PCM을 반환함
        const audioBuffer = playbackContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = playbackContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(playbackContext.destination);

        // 현재 재생 중인 시간보다 큐의 예약 시간이 뒤쳐져 있으면 현재 시간으로 당김 (순차 재생 보장)
        const currentTime = playbackContext.currentTime;
        if (nextStartTime < currentTime) {
            nextStartTime = currentTime + 0.05;
        }

        source.start(nextStartTime);
        nextStartTime += audioBuffer.duration;
        console.log('[Audio] Playing chunk, duration:', audioBuffer.duration.toFixed(3), 's');
    } catch (e) {
        console.error('[Audio] Playback Error:', e);
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    const chatBtn = document.getElementById('ai-chat-btn');
    if (chatBtn) chatBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        initAudioContext(); // 사용자 클릭 시 오디오 권한 획득
        openChatModal(); 
    });
    chatCloseBtn.addEventListener('click', closeChatModal);
    chatMicBtn.addEventListener('click', () => {
        initAudioContext();
        toggleMic();
    });
    chatSendBtn.addEventListener('click', () => {
        initAudioContext();
        sendMessage();
    });
    chatInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') {
            initAudioContext();
            sendMessage(); 
        }
    });
});
