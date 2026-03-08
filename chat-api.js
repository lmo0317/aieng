/**
 * Chat API Module
 * Gemini 2.5 Flash를 활용한 실시간 스트리밍 채팅 API
 *
 * 기능:
 * - Server-Sent Events (SSE) 기반 실시간 응답
 * - 세션 기반 대화 컨텍스트 관리
 * - 에러 핸들링 및 재시도 로직
 * - 보안 헤더 및 CORS 처리
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// 세션 저장소 (인메모리, 프로덕션에서는 Redis 사용 권장)
const chatSessions = new Map();

/**
 * 채팅 세션 관리 클래스
 * 대화 기록을 관리하고 컨텍스트를 유지합니다
 */
class ChatSessionManager {
    constructor() {
        this.sessions = new Map();
        this.maxHistoryLength = 20; // 최대 대화 기록 수
        this.sessionTimeout = 30 * 60 * 1000; // 30분 타임아웃
    }

    /**
     * 새로운 세션 생성 또는 기존 세션 반환
     * @param {string} sessionId - 세션 ID
     * @returns {object} 세션 객체
     */
    getOrCreateSession(sessionId) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                id: sessionId,
                messages: [],
                createdAt: Date.now(),
                lastAccessedAt: Date.now()
            });
        }

        const session = this.sessions.get(sessionId);
        session.lastAccessedAt = Date.now();

        return session;
    }

    /**
     * 세션에 메시지 추가
     * @param {string} sessionId - 세션 ID
     * @param {string} role - 사용자 또는 모델 역할
     * @param {string} content - 메시지 내용
     */
    addMessage(sessionId, role, content) {
        const session = this.getOrCreateSession(sessionId);
        session.messages.push({ role, content, timestamp: Date.now() });

        // 최대 기록 길이 제한 (오래된 메시지부터 삭제)
        if (session.messages.length > this.maxHistoryLength) {
            session.messages = session.messages.slice(-this.maxHistoryLength);
        }
    }

    /**
     * 세션의 대화 기록 반환
     * @param {string} sessionId - 세션 ID
     * @returns {Array} 대화 기록 배열
     */
    getHistory(sessionId) {
        const session = this.sessions.get(sessionId);
        return session ? session.messages : [];
    }

    /**
     * 세션 삭제
     * @param {string} sessionId - 세션 ID
     */
    deleteSession(sessionId) {
        this.sessions.delete(sessionId);
    }

    /**
     * 만료된 세션 정리 (주기적으로 실행 필요)
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastAccessedAt > this.sessionTimeout) {
                this.sessions.delete(sessionId);
            }
        }
    }

    /**
     * Gemini API 형식으로 대화 기록 변환
     * @param {string} sessionId - 세션 ID
     * @returns {Array} Gemini 형식의 대화 기록
     */
    getGeminiHistory(sessionId) {
        const history = this.getHistory(sessionId);
        return history
            .filter(msg => msg.role !== 'system') // 시스템 메시지는 제외
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));
    }
}

// 세션 매니저 인스턴스 생성
const sessionManager = new ChatSessionManager();

// 5분마다 만료된 세션 정리
setInterval(() => {
    sessionManager.cleanupExpiredSessions();
}, 5 * 60 * 1000);

/**
 * Gemini API 클라이언트 초기화
 * @param {string} apiKey - Gemini API 키
 * @returns {GoogleGenerativeAI} Gemini 클라이언트 인스턴스
 */
function initializeGeminiClient(apiKey) {
    if (!apiKey) {
        throw new Error('Gemini API Key가 없습니다.');
    }
    return new GoogleGenerativeAI(apiKey);
}

/**
 * 스트리밍 응답 생성 핸들러
 *
 * POST /api/chat
 *
 * Request Body:
 * - message: string (필수) - 사용자 메시지
 * - sessionId: string (선택) - 세션 ID, 미제공 시 자동 생성
 * - systemPrompt: string (선택) - 시스템 프롬프트
 * - temperature: number (선택) - 생성 온도 (0.0 ~ 1.0)
 * - maxTokens: number (선택) - 최대 토큰 수
 *
 * Response: SSE (Server-Sent Events) 스트림
 */
async function handleChatRequest(req, res) {
    // SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx 버퍼링 방지
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        // 요청 데이터 검증
        const { message, sessionId, systemPrompt, temperature = 0.7, maxTokens = 8192 } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            sendSSEError(res, 'INVALID_REQUEST', '유효한 메시지를 입력해주세요.');
            return;
        }

        // API 키 확인 (환경변수 또는 데이터베이스에서 가져옴)
        const apiKey = process.env.GEMINI_API_KEY || req.app.locals.geminiApiKey;
        if (!apiKey) {
            sendSSEError(res, 'NO_API_KEY', 'API Key가 설정되지 않았습니다. 설정에서 API Key를 입력해주세요.');
            return;
        }

        // 세션 ID 생성 또는 사용
        const currentSessionId = sessionId || generateSessionId();
        const session = sessionManager.getOrCreateSession(currentSessionId);

        // 사용자 메시지를 세션 기록에 추가
        sessionManager.addMessage(currentSessionId, 'user', message);

        // Gemini 클라이언트 초기화
        const genAI = initializeGeminiClient(apiKey);
        let modelName = req.app.locals.chatModel || 'gemini-2.5-flash';
        
        // 기술적 제약 해결: native-audio 모델은 텍스트 채팅(generateContent)을 지원하지 않으므로
        // 동일한 엔진의 텍스트 최적화 버전인 gemini-2.5-flash로 자동 전환하여 404 에러 방지
        if (modelName.includes('native-audio')) {
            console.log(`[System] Switching ${modelName} to gemini-2.5-flash for text compatibility.`);
            modelName = 'gemini-2.5-flash';
        }

        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: Math.max(1, maxTokens),
                candidateCount: 1
            }
        });

        // 대화 기록 가져오기
        const history = sessionManager.getGeminiHistory(currentSessionId);

        // 시스템 프롬프트가 있는 경우 대화 기록 앞에 추가
        if (systemPrompt && systemPrompt.trim()) {
            history.unshift({
                role: 'user',
                parts: [{ text: `System: ${systemPrompt}` }]
            });
        }

        // 채팅 시작
        const chat = model.startChat({
            history: history.length > 0 ? history : undefined,
            generationConfig: {
                temperature: Math.max(0, Math.min(1, temperature)),
                maxOutputTokens: Math.max(1, maxTokens)
            }
        });

        // 세션 ID 전송
        sendSSEEvent(res, 'session', { sessionId: currentSessionId });

        // 스트리밍 응답 시작 이벤트
        sendSSEEvent(res, 'start', { message: '응답 생성을 시작합니다...' });

        // 스트리밍 응답 수신
        const result = await chat.sendMessageStream(message);

        let fullResponse = '';

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                fullResponse += chunkText;

                // 청크 데이터 전송
                sendSSEEvent(res, 'chunk', {
                    text: chunkText,
                    done: false
                });
            }
        }

        // 전체 응답을 세션 기록에 추가
        sessionManager.addMessage(currentSessionId, 'model', fullResponse);

        // 완료 이벤트 전송
        sendSSEEvent(res, 'done', {
            text: fullResponse,
            message: '응답 생성이 완료되었습니다.'
        });

    } catch (error) {
        console.error('Chat API Error:', error);

        // 에러 타입에 따른 적절한 메시지 전송
        let errorCode = 'INTERNAL_ERROR';
        let errorMessage = '채팅 처리 중 오류가 발생했습니다.';

        if (error.message.includes('API_KEY')) {
            errorCode = 'INVALID_API_KEY';
            errorMessage = '유효하지 않은 API Key입니다.';
        } else if (error.message.includes('QUOTA')) {
            errorCode = 'QUOTA_EXCEEDED';
            errorMessage = 'API 할당량이 초과되었습니다.';
        } else if (error.message.includes('SAFETY')) {
            errorCode = 'SAFETY_FILTER';
            errorMessage = '안전 정책에 위배되는 콘텐츠입니다.';
        }

        sendSSEError(res, errorCode, errorMessage);
    } finally {
        res.end();
    }
}

/**
 * 세션 기록 초기화 핸들러
 *
 * DELETE /api/chat/:sessionId
 */
function handleClearSession(req, res) {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: '세션 ID가 필요합니다.'
            });
        }

        sessionManager.deleteSession(sessionId);

        res.json({
            success: true,
            message: '세션이 초기화되었습니다.'
        });
    } catch (error) {
        console.error('Clear Session Error:', error);
        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: '세션 초기화 중 오류가 발생했습니다.'
        });
    }
}

/**
 * 세션 기록 조회 핸들러
 *
 * GET /api/chat/:sessionId/history
 */
function handleGetHistory(req, res) {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: '세션 ID가 필요합니다.'
            });
        }

        const history = sessionManager.getHistory(sessionId);

        res.json({
            sessionId,
            history: history.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }))
        });
    } catch (error) {
        console.error('Get History Error:', error);
        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: '기록 조회 중 오류가 발생했습니다.'
        });
    }
}

/**
 * SSE 이벤트 전송 헬퍼 함수
 * @param {object} res - Express 응답 객체
 * @param {string} event - 이벤트 이름
 * @param {object} data - 전송할 데이터
 */
function sendSSEEvent(res, event, data) {
    try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
        console.error('SSE Send Error:', error);
    }
}

/**
 * SSE 에러 전송 헬퍼 함수
 * @param {object} res - Express 응답 객체
 * @param {string} code - 에러 코드
 * @param {string} message - 에러 메시지
 */
function sendSSEError(res, code, message) {
    try {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ code, message })}\n\n`);
    } catch (error) {
        console.error('SSE Error Send Error:', error);
    }
}

/**
 * 랜덤 세션 ID 생성
 * @returns {string} 세션 ID
 */
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
    handleChatRequest,
    handleClearSession,
    handleGetHistory,
    sessionManager
};
