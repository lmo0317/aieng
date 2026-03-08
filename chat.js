/**
 * AI Real-time Video/Voice Chat System JavaScript
 * 
 * Uses WebSockets to connect to the backend, 
 * which proxies to the Gemini Multimodal Live API (bidi).
 */

const ChatState = {
    isOpen: false,
    isConnected: false,
    isRecording: false,
    isVideoEnabled: false,
    sessionId: null,
    socket: null,
    localStream: null,
    mediaRecorder: null,
    audioContext: null,
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

/**
 * 모달 열기
 */
function openChatModal() {
    chatModal.classList.remove('hidden');
    ChatState.isOpen = true;
    connectWebSocket();
}

/**
 * 모달 닫기
 */
function closeChatModal() {
    chatModal.classList.add('hidden');
    ChatState.isOpen = false;
    stopMedia();
    if (ChatState.socket) {
        ChatState.socket.close();
    }
}

/**
 * WebSocket 연결
 */
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/chat`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
        ChatState.socket = new WebSocket(wsUrl);
        
        ChatState.socket.onopen = () => {
            console.log('WebSocket Connection Established');
            ChatState.isConnected = true;
            updateStatus('연결됨', 'active');
        };
        
        ChatState.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleIncomingMessage(data);
            } catch (e) {
                console.error('Message Parse Error:', e, event.data);
            }
        };
        
        ChatState.socket.onclose = (event) => {
            console.log('WebSocket Closed:', event.code, event.reason);
            ChatState.isConnected = false;
            updateStatus('연결 끊김', 'inactive');
        };
        
        ChatState.socket.onerror = (error) => {
            console.error('WebSocket Socket Error:', error);
            addMessage('ai', '서버 연결 중 오류가 발생했습니다. 개발자 도구(F12) 콘솔을 확인해 주세요.');
        };
    } catch (e) {
        console.error('WebSocket Creation Error:', e);
    }
}

/**
 * 메시지 처리
 */
function handleIncomingMessage(data) {
    if (data.type === 'text') {
        addMessage('ai', data.text);
    } else if (data.type === 'audio') {
        // 실시간 오디오 재생 로직 (Web Audio API 활용)
        playAudioChunk(data.audio);
    } else if (data.type === 'status') {
        if (data.status === 'talking') {
            aiVoiceWaves.classList.add('active');
        } else {
            aiVoiceWaves.classList.remove('active');
        }
    }
}

/**
 * 비디오 토글
 */
async function toggleVideo() {
    if (!ChatState.isVideoEnabled) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            ChatState.localStream = stream;
            localVideo.srcObject = stream;
            videoChatContainer.classList.remove('hidden');
            ChatState.isVideoEnabled = true;
            videoToggleBtn.textContent = '📵';
            
            // 실시간 영상 프레임 전송 시작 (Canvas 캡처 방식)
            startVideoStreaming();
        } catch (err) {
            console.error('카메라 접근 실패:', err);
            alert('카메라에 접근할 수 없습니다.');
        }
    } else {
        stopMedia();
        videoChatContainer.classList.add('hidden');
        ChatState.isVideoEnabled = false;
        videoToggleBtn.textContent = '📹';
    }
}

/**
 * 영상 스트리밍 시작 (Gemini Live API용 프레임 추출)
 */
function startVideoStreaming() {
    if (!ChatState.localStream) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const sendFrame = () => {
        if (!ChatState.isVideoEnabled || !ChatState.socket || ChatState.socket.readyState !== WebSocket.OPEN) return;
        
        // 프레임 최적화 (Gemini는 1fps 정도면 충분함)
        canvas.width = 320;
        canvas.height = 240;
        ctx.drawImage(localVideo, 0, 0, canvas.width, canvas.height);
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.5);
        ChatState.socket.send(JSON.stringify({
            type: 'video',
            data: base64Image.split(',')[1]
        }));
        
        setTimeout(sendFrame, 1000); // 1초마다 전송
    };
    
    sendFrame();
}

/**
 * 미디어 중지
 */
function stopMedia() {
    if (ChatState.localStream) {
        ChatState.localStream.getTracks().forEach(track => track.stop());
        localVideo.srcObject = null;
    }
}

/**
 * 메시지 전송
 */
function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !ChatState.isConnected) return;
    
    addMessage('user', text);
    ChatState.socket.send(JSON.stringify({
        type: 'text',
        text: text
    }));
    
    chatInput.value = '';
}

/**
 * 메시지 화면 추가
 */
function addMessage(type, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message chat-message-${type}`;
    
    messageDiv.innerHTML = `
        <div class="chat-message-content">
            <div class="chat-message-text">${text}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 웰컴 메시지 제거 (첫 메시지 시)
    const welcome = document.querySelector('.chat-welcome-message');
    if (welcome) welcome.remove();
}

/**
 * 상태 업데이트
 */
function updateStatus(text, type) {
    chatStatusIndicator.classList.remove('hidden');
    chatStatusText.textContent = text;
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    const chatBtn = document.getElementById('ai-chat-btn');
    if (chatBtn) {
        chatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openChatModal();
        });
    }
    
    chatCloseBtn.addEventListener('click', closeChatModal);
    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    videoToggleBtn.addEventListener('click', toggleVideo);
});

// 오디오 재생 (AI의 음성 응답)
function playAudioChunk(base64Audio) {
    // 실시간 음성 재생 로직 구현 (추후 보완)
    // 현재는 텍스트 스크립트 위주로 구현
}
