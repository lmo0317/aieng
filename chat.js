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
    processor: null
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
    
    ChatState.socket = new WebSocket(wsUrl);
    
    ChatState.socket.onopen = () => {
        ChatState.isConnected = true;
        updateStatus('AI 연결됨', 'active');

        // 학습 페이지의 주제가 있다면 서버에 알림
        const topic = sessionStorage.getItem('currentTopic');
        if (topic) {
            ChatState.socket.send(JSON.stringify({ 
                type: 'context', 
                topic: topic 
            }));
            console.log('Sent topic context:', topic);
        }
    };
    
    ChatState.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'text') {
            addMessage('ai', data.text);
        } else if (data.type === 'audio') {
            playAudioChunk(data.audio);
        } else if (data.type === 'status') {
            if (data.status === 'talking') aiVoiceWaves.classList.add('active');
            else aiVoiceWaves.classList.remove('active');
        }
    };
    
    ChatState.socket.onclose = () => {
        ChatState.isConnected = false;
        updateStatus('연결 끊김', 'inactive');
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
    
    addMessage('user', text);
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

// 오디오 재생 큐
let audioQueue = [];
let isPlaying = false;

function playAudioChunk(base64Audio) {
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    
    // 브라우저 기본 오디오 재생 (간이 버전)
    const blob = new Blob([bytes.buffer], { type: 'audio/pcm' });
    // 실제 구현 시에는 AudioContext의 decodeAudioData나 오디오 큐잉 필요
    // 여기서는 텍스트 응답 확인을 우선함
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    const chatBtn = document.getElementById('ai-chat-btn');
    if (chatBtn) chatBtn.addEventListener('click', (e) => { e.stopPropagation(); openChatModal(); });
    chatCloseBtn.addEventListener('click', closeChatModal);
    chatMicBtn.addEventListener('click', toggleMic);
    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
});
