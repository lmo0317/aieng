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
    isAiResponding: false
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
    ChatState.isOpen = true;
    connectWebSocket();
}

function closeChatModal() {
    chatModal.classList.add('hidden');
    ChatState.isOpen = false;
    stopAllMedia();
    if (ChatState.socket) ChatState.socket.close();
}

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    console.log('[Chat WS] Connecting to:', wsUrl);
    ChatState.socket = new WebSocket(wsUrl);

    ChatState.socket.onopen = () => {
        console.log('[Chat WS] Connected to server');
        ChatState.isConnected = true;
        updateStatus('AI 연결됨', 'active');

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

                // 1. 별표로 둘러싸인 제목/강조 제거
                cleanText = cleanText.replace(/\*\*.*?\*\*/g, '');

                // 2. AI의 작업 로그 제거
                cleanText = cleanText.replace(/^(I've|I have|I am|I'm|I will|My focus|The current|My response).*$/gmi, '');
                cleanText = cleanText.replace(/^(This feels like|I want to|It's a casual|I'll ask).*$/gmi, '');

                cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();

                if (cleanText.length === 0) return;

                // 한글 응답만 표시 (형식 정리 제거)

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
