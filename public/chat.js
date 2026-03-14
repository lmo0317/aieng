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
        systemPrompt: `You are Teacher Alex, a friendly NATIVE ENGLISH SPEAKER and an expert English tutor. 

## Your Communication Rule:
1. **Always respond to the student ONLY in English** in your main reply.
2. **Analyze the student's latest English message** for any grammatical errors, unnatural phrasings, or better vocabulary choices.
3. At the very end of your response, provide two hidden sections:
   - Use [KOR_TRANS] for the Korean translation of your reply.
   - Use [CORRECTIONS] for a brief, friendly explanation **strictly in KOREAN (한국어로만)** about the student's mistakes and how to improve them. (If there are no mistakes, say "완벽한 문장이에요! 정말 잘하셨어요. 👍" in Korean.)

Example:
Student: "I am go to school yesterday."
You: "Oh, did you? That's cool! What did you study there? [KOR_TRANS] 오, 그러셨어요? 멋지네요! 거기서 무엇을 공부했나요? [CORRECTIONS] 'I am go'는 틀린 표현이에요. 과거의 일을 말할 때는 'I went'라고 해야 합니다. 'I went to school yesterday'가 더 자연스러워요."

## CRITICAL RULE:
- **THE [CORRECTIONS] SECTION MUST BE 100% IN KOREAN.** NEVER USE ENGLISH FOR THE EXPLANATION.

Remember: Keep the main response 100% English, followed by [KOR_TRANS], and then [CORRECTIONS] in Korean only.`
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
                let rawText = ChatState.aiTextBuffer;
                let cleanText = rawText;
                let translationText = '';
                let examplesText = '';

                // 원어민 강사일 경우 번역 및 교정 데이터 분리
                if (ChatState.selectedTeacher === 'native') {
                    // [KOR_TRANS] 기준으로 분리
                    const transParts = rawText.split('[KOR_TRANS]');
                    cleanText = transParts[0];
                    
                    if (transParts.length > 1) {
                        // [CORRECTIONS] 기준으로 분리
                        const corrParts = transParts[1].split('[CORRECTIONS]');
                        translationText = corrParts[0].trim();
                        if (corrParts.length > 1) {
                            correctionsText = corrParts[1].trim();
                        }
                    }
                }

                // 선생님 유형에 따라 추가 텍스트 처리
                if (ChatState.selectedTeacher === 'korean') {
                    cleanText = cleanText.replace(/\*\*.*?\*\*/g, ''); // 별표 강조 제거
                    cleanText = cleanText.replace(/^(I've|I have|I am|I'm|I will|My focus|The current|My response).*$/gmi, '');
                    cleanText = cleanText.replace(/^(This feels like|I want to|It's a casual|I'll ask).*$/gmi, '');
                    cleanText = cleanText.replace(/##.*$/gm, ''); // 마크다운 제목 제거
                    cleanText = cleanText.replace(/\*\*/g, ''); // 별표 제거
                } else if (ChatState.selectedTeacher === 'native') {
                    cleanText = cleanText.replace(/\n{3,}/g, '\n\n'); // 줄바꿈 정리
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
                
                // 데이터 저장
                if (ChatState.currentAiMessageTextDiv) {
                    const parentMessage = ChatState.currentAiMessageTextDiv.closest('.chat-message');
                    if (translationText) parentMessage.setAttribute('data-translation', translationText);
                    if (correctionsText) parentMessage.setAttribute('data-corrections', correctionsText);
                }

                chatMessages.scrollTop = chatMessages.scrollHeight;

            } else if (data.type === 'turn_complete') {
                console.log('[Chat WS] Turn complete');
                
                // 원어민 선생님 답변 완료 시 버튼 표시
                if (ChatState.selectedTeacher === 'native' && ChatState.currentAiMessageTextDiv) {
                    const aiParentMessage = ChatState.currentAiMessageTextDiv.closest('.chat-message');
                    const translation = aiParentMessage.getAttribute('data-translation');
                    const corrections = aiParentMessage.getAttribute('data-corrections');
                    
                    // 1. AI 답변에 번역 버튼 추가
                    if (translation) {
                        const aiActionsDiv = document.createElement('div');
                        aiActionsDiv.className = 'message-actions';
                        aiParentMessage.querySelector('.chat-message-content').appendChild(aiActionsDiv);
                        addTranslationToggle(aiParentMessage, translation, aiActionsDiv);
                    }

                    // 2. 사용자 답변에 교정 버튼 추가 (가장 최근 사용자 메시지 찾기)
                    if (corrections) {
                        const userMessages = document.querySelectorAll('.chat-message-user');
                        if (userMessages.length > 0) {
                            const lastUserMessage = userMessages[userMessages.length - 1];
                            const userActionsDiv = document.createElement('div');
                            userActionsDiv.className = 'message-actions';
                            lastUserMessage.querySelector('.chat-message-content').appendChild(userActionsDiv);
                            addCorrectionsToggle(lastUserMessage, corrections, userActionsDiv);
                        }
                    }
                }

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

function addTranslationToggle(parentMessage, translation, actionsDiv) {
    const translateBtn = document.createElement('button');
    translateBtn.className = 'translate-btn';
    translateBtn.innerHTML = '<span>🌐</span> 번역';
    
    const translationDiv = document.createElement('div');
    translationDiv.className = 'translation-text hidden';
    translationDiv.textContent = translation;
    
    translateBtn.addEventListener('click', () => {
        const isHidden = translationDiv.classList.contains('hidden');
        if (isHidden) {
            translationDiv.classList.remove('hidden');
            translateBtn.classList.add('active');
        } else {
            translationDiv.classList.add('hidden');
            translateBtn.classList.remove('active');
        }
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
        const isHidden = correctionsDiv.classList.contains('hidden');
        if (isHidden) {
            correctionsDiv.classList.remove('hidden');
            correctionsBtn.classList.add('active');
        } else {
            correctionsDiv.classList.add('hidden');
            correctionsBtn.classList.remove('active');
        }
    });
    
    actionsDiv.appendChild(correctionsBtn);
    parentMessage.querySelector('.chat-message-content').appendChild(correctionsDiv);
}

function showTranslateButton(parentMessage, translation) {
    if (parentMessage.querySelector('.translate-btn')) return;

    const contentDiv = parentMessage.querySelector('.chat-message-content');
    
    const translateBtn = document.createElement('button');
    translateBtn.className = 'translate-btn';
    translateBtn.innerHTML = '<span>🌐</span> 번역 보기';
    
    const translationDiv = document.createElement('div');
    translationDiv.className = 'translation-text hidden';
    translationDiv.textContent = translation;
    
    translateBtn.addEventListener('click', () => {
        const isHidden = translationDiv.classList.contains('hidden');
        if (isHidden) {
            translationDiv.classList.remove('hidden');
            translateBtn.innerHTML = '<span>🌐</span> 번역 숨기기';
        } else {
            translationDiv.classList.add('hidden');
            translateBtn.innerHTML = '<span>🌐</span> 번역 보기';
        }
    });
    
    contentDiv.appendChild(translateBtn);
    contentDiv.appendChild(translationDiv);
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
