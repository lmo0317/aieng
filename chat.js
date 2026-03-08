/**
 * AI 음성 대화 시스템 JavaScript
 *
 * Web Speech API를 사용한 음성 인식 및 음성 합성 기능
 * 채팅 UI 인터랙션 및 백엔드 API 연동
 */

// =========================
// 전역 상태 관리
// =========================

const ChatState = {
    isModalOpen: false,
    isRecording: false,
    isSpeaking: false,
    isProcessing: false,
    messages: [],
    recognition: null,
    synthesis: window.speechSynthesis,
    currentUtterance: null
};

// =========================
// Web Speech API 초기화
// =========================

/**
 * 음성 인식 초기화 (SpeechRecognition)
 * 브라우저 호환성 체크 및 설정
 */
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn('이 브라우저는 음성 인식을 지원하지 않습니다.');
        showBrowserNotSupportedMessage();
        return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR'; // 한국어 설정
    recognition.continuous = false; // 한 번의 발화만 인식
    recognition.interimResults = false; // 중간 결과 표시 안 함
    recognition.maxAlternatives = 1; // 최대 1개의 대안

    // 음성 인식 이벤트 핸들러
    recognition.onstart = () => {
        ChatState.isRecording = true;
        updateRecordingStatus(true);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;

        console.log(`음성 인식 결과: ${transcript} (신뢰도: ${confidence})`);
        handleVoiceInput(transcript);
    };

    recognition.onerror = (event) => {
        console.error('음성 인식 오류:', event.error);
        handleRecognitionError(event.error);
    };

    recognition.onend = () => {
        ChatState.isRecording = false;
        updateRecordingStatus(false);
    };

    return recognition;
}

/**
 * 음성 합성 초기화 (SpeechSynthesis)
 * 한국어 보이스 찾기 및 설정
 */
function initSpeechSynthesis() {
    if (!ChatState.synthesis) {
        console.warn('이 브라우저는 음성 합성을 지원하지 않습니다.');
        return null;
    }

    // 보이스 로드 대기 (일부 브라우저에서 비동기 로딩)
    if (ChatState.synthesis.getVoices().length === 0) {
        ChatState.synthesis.onvoiceschanged = () => {
            console.log('보이스 목록 로드 완료:', ChatState.synthesis.getVoices().length);
        };
    }

    return ChatState.synthesis;
}

/**
 * 한국어 보이스 찾기
 * @returns {SpeechSynthesisVoice|null} 한국어 보이스 또는 null
 */
function getKoreanVoice() {
    const voices = ChatState.synthesis.getVoices();

    // 1순위: 한국어 보이스
    let koreanVoice = voices.find(voice => voice.lang.startsWith('ko'));

    // 2순위: 한국어 보이스가 없으면 기본 보이스 사용
    if (!koreanVoice) {
        koreanVoice = voices.find(voice => voice.default);
    }

    return koreanVoice || voices[0] || null;
}

// =========================
// 음성 인식 기능
// =========================

/**
 * 음성 인식 시작
 */
function startVoiceRecognition() {
    if (ChatState.isRecording) {
        stopVoiceRecognition();
        return;
    }

    if (!ChatState.recognition) {
        ChatState.recognition = initSpeechRecognition();
    }

    if (!ChatState.recognition) {
        showErrorMessage('음성 인식 기능을 사용할 수 없습니다.');
        return;
    }

    try {
        ChatState.recognition.start();
    } catch (error) {
        console.error('음성 인식 시작 오류:', error);
        showErrorMessage('음성 인식을 시작할 수 없습니다.');
    }
}

/**
 * 음성 인식 중지
 */
function stopVoiceRecognition() {
    if (ChatState.recognition && ChatState.isRecording) {
        ChatState.recognition.stop();
    }
}

/**
 * 음성 입력 처리
 * @param {string} text - 인식된 텍스트
 */
function handleVoiceInput(text) {
    // 입력 필드에 텍스트 표시
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = text;
    }

    // 자동 전송
    sendMessage(text);
}

/**
 * 음성 인식 오류 처리
 * @param {string} error - 오류 메시지
 */
function handleRecognitionError(error) {
    const errorMessages = {
        'no-speech': '음성이 감지되지 않았습니다. 다시 시도해주세요.',
        'audio-capture': '마이크에 접근할 수 없습니다.',
        'not-allowed': '마이크 사용 권한이 거부되었습니다.',
        'network': '네트워크 오류가 발생했습니다.',
        'aborted': '음성 인식이 중단되었습니다.'
    };

    const message = errorMessages[error] || '음성 인식 오류가 발생했습니다.';
    showErrorMessage(message);
}

// =========================
// 음성 합성 기능
// =========================

/**
 * 텍스트를 음성으로 변환하여 재생
 * @param {string} text - 읽을 텍스트
 */
function speakText(text) {
    if (!ChatState.synthesis) {
        console.warn('음성 합성을 사용할 수 없습니다.');
        return;
    }

    // 현재 재생 중인 음성 중지
    if (ChatState.isSpeaking) {
        stopSpeaking();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getKoreanVoice();

    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
    }

    utterance.rate = 1.0; // 속도 (0.1 ~ 10)
    utterance.pitch = 1.0; // 피치 (0 ~ 2)
    utterance.volume = 1.0; // 볼륨 (0 ~ 1)

    utterance.onstart = () => {
        ChatState.isSpeaking = true;
        updateSpeakingStatus(true);
    };

    utterance.onend = () => {
        ChatState.isSpeaking = false;
        ChatState.currentUtterance = null;
        updateSpeakingStatus(false);
    };

    utterance.onerror = (event) => {
        console.error('음성 합성 오류:', event.error);
        ChatState.isSpeaking = false;
        ChatState.currentUtterance = null;
        updateSpeakingStatus(false);
    };

    ChatState.currentUtterance = utterance;
    ChatState.synthesis.speak(utterance);
}

/**
 * 음성 재생 중지
 */
function stopSpeaking() {
    if (ChatState.synthesis && ChatState.isSpeaking) {
        ChatState.synthesis.cancel();
        ChatState.isSpeaking = false;
        ChatState.currentUtterance = null;
        updateSpeakingStatus(false);
    }
}

// =========================
// 채팅 메시지 기능
// =========================

/**
 * 사용자 메시지 전송
 * @param {string} text - 메시지 텍스트
 */
async function sendMessage(text) {
    if (!text || text.trim() === '') return;
    if (ChatState.isProcessing) {
        showErrorMessage('이전 메시지를 처리 중입니다.');
        return;
    }

    // 입력 필드 초기화
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = '';
    }

    // 사용자 메시지 추가
    addMessage('user', text);
    ChatState.isProcessing = true;

    // AI 응답 요청
    try {
        await fetchAIResponse(text);
    } catch (error) {
        console.error('AI 응답 오류:', error);
        addMessage('ai', '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        ChatState.isProcessing = false;
    }
}

/**
 * AI 응답 가져오기 (SSE 스트리밍)
 * @param {string} userMessage - 사용자 메시지
 */
async function fetchAIResponse(userMessage) {
    const messagesContainer = document.getElementById('chat-messages');

    // AI 응답 메시지 컨테이너 생성
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'chat-message chat-message-ai';
    aiMessageDiv.innerHTML = `
        <div class="chat-message-content">
            <div class="chat-message-text">
                <span class="typing-indicator">
                    <span></span><span></span><span></span>
                </span>
            </div>
        </div>
    `;
    messagesContainer.appendChild(aiMessageDiv);
    scrollToBottom();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                history: ChatState.messages.slice(-10) // 최근 10개 메시지 전송
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // SSE 스트리밍 처리
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';
        const messageTextDiv = aiMessageDiv.querySelector('.chat-message-text');

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    if (data === '[DONE]') {
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(data);

                        if (parsed.content) {
                            aiResponse += parsed.content;
                            messageTextDiv.textContent = aiResponse;
                            scrollToBottom();
                        }

                        if (parsed.done) {
                            // 스트리밍 완료
                            break;
                        }
                    } catch (e) {
                        console.error('JSON 파싱 오류:', e);
                    }
                }
            }
        }

        // AI 응답 저장
        ChatState.messages.push({ role: 'user', content: userMessage });
        ChatState.messages.push({ role: 'assistant', content: aiResponse });

        // 음성으로 재생
        if (aiResponse) {
            speakText(aiResponse);
        }

    } catch (error) {
        console.error('AI 응답 가져오기 오류:', error);
        aiMessageDiv.querySelector('.chat-message-text').textContent =
            '죄송합니다. 응답을 가져오는 중 오류가 발생했습니다.';
    }
}

/**
 * 메시지 추가
 * @param {string} type - 메시지 타입 ('user' 또는 'ai')
 * @param {string} text - 메시지 텍스트
 */
function addMessage(type, text) {
    const messagesContainer = document.getElementById('chat-messages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message chat-message-${type}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-message-content';

    const textDiv = document.createElement('div');
    textDiv.className = 'chat-message-text';
    textDiv.textContent = text;

    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(contentDiv);

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();

    // 메시지 저장
    ChatState.messages.push({
        role: type === 'user' ? 'user' : 'assistant',
        content: text
    });
}

/**
 * 메시지 영역을 최하단으로 스크롤
 */
function scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// =========================
// UI 인터랙션
// =========================

/**
 * 채팅 모달 열기
 */
function openChatModal() {
    const modal = document.getElementById('chat-modal');
    if (modal) {
        modal.classList.remove('hidden');
        ChatState.isModalOpen = true;

        // 입력 필드에 포커스
        const input = document.getElementById('chat-input');
        if (input) {
            setTimeout(() => input.focus(), 100);
        }

        // 모달 외부 클릭으로 닫기 방지 (overlay 제외)
        document.addEventListener('click', handleModalOutsideClick);
    }
}

/**
 * 채팅 모달 닫기
 */
function closeChatModal() {
    const modal = document.getElementById('chat-modal');
    if (modal) {
        modal.classList.add('hidden');
        ChatState.isModalOpen = false;

        // 음성 인식/합성 중지
        stopVoiceRecognition();
        stopSpeaking();

        document.removeEventListener('click', handleModalOutsideClick);
    }
}

/**
 * 모달 외부 클릭 핸들러
 * @param {MouseEvent} event - 클릭 이벤트
 */
function handleModalOutsideClick(event) {
    const modal = document.getElementById('chat-modal');
    const container = document.querySelector('.chat-modal-container');

    if (modal && !modal.classList.contains('hidden') &&
        container && !container.contains(event.target)) {
        closeChatModal();
    }
}

/**
 * 녹음 상태 UI 업데이트
 * @param {boolean} isRecording - 녹음 중 여부
 */
function updateRecordingStatus(isRecording) {
    const micBtn = document.getElementById('chat-mic-btn');
    const statusIndicator = document.getElementById('chat-status-indicator');
    const statusText = document.getElementById('chat-status-text');

    if (isRecording) {
        micBtn.classList.add('recording');
        statusIndicator.classList.remove('hidden');
        statusText.textContent = '듣고 있는 중...';
    } else {
        micBtn.classList.remove('recording');
        statusIndicator.classList.add('hidden');
    }
}

/**
 * 음성 재생 상태 UI 업데이트
 * @param {boolean} isSpeaking - 재생 중 여부
 */
function updateSpeakingStatus(isSpeaking) {
    const statusIndicator = document.getElementById('chat-status-indicator');
    const statusText = document.getElementById('chat-status-text');

    if (isSpeaking) {
        statusIndicator.classList.remove('hidden');
        statusText.textContent = '말하는 중...';
    } else if (!ChatState.isRecording) {
        statusIndicator.classList.add('hidden');
    }
}

/**
 * 에러 메시지 표시
 * @param {string} message - 에러 메시지
 */
function showErrorMessage(message) {
    const messagesContainer = document.getElementById('chat-messages');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'chat-error-message';
    errorDiv.textContent = message;

    messagesContainer.appendChild(errorDiv);
    scrollToBottom();

    // 3초 후 자동 제거
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

/**
 * 브라우저 지원 안 함 메시지 표시
 */
function showBrowserNotSupportedMessage() {
    const messagesContainer = document.getElementById('chat-messages');

    const warningDiv = document.createElement('div');
    warningDiv.className = 'chat-warning-message';
    warningDiv.innerHTML = `
        <strong>음성 인식 미지원</strong><br>
        이 브라우저는 음성 인식 기능을 지원하지 않습니다.<br>
        텍스트 입력을 이용해주세요.
    `;

    messagesContainer.appendChild(warningDiv);
    scrollToBottom();
}

// =========================
// 이벤트 리스너 등록
// =========================

/**
 * DOM 로드 완료 후 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
    // Web Speech API 초기화
    ChatState.recognition = initSpeechRecognition();
    initSpeechSynthesis();

    // 채팅 버튼 클릭 이벤트
    const chatBtn = document.getElementById('ai-chat-btn');
    if (chatBtn) {
        chatBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // 이벤트 전파 방지 (모달이 바로 닫히는 현상 해결)
            openChatModal();
        });
    }

    // 닫기 버튼 클릭 이벤트
    const closeBtn = document.getElementById('chat-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeChatModal);
    }

    // 마이크 버튼 클릭 이벤트
    const micBtn = document.getElementById('chat-mic-btn');
    if (micBtn) {
        micBtn.addEventListener('click', startVoiceRecognition);
    }

    // 전송 버튼 클릭 이벤트
    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            const input = document.getElementById('chat-input');
            if (input) {
                sendMessage(input.value);
            }
        });
    }

    // 입력 필드 엔터키 이벤트
    const input = document.getElementById('chat-input');
    if (input) {
        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage(input.value);
            }
        });
    }

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && ChatState.isModalOpen) {
            closeChatModal();
        }
    });

    // 모달 컨테이너 클릭 전파 중지
    const modalContainer = document.querySelector('.chat-modal-container');
    if (modalContainer) {
        modalContainer.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }
});

/**
 * 페이지 언로드 시 정리
 */
window.addEventListener('beforeunload', () => {
    stopVoiceRecognition();
    stopSpeaking();
});
