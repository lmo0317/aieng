/**
 * AI 음성 대화 API 엔드포인트 예제
 *
 * 이 파일은 /api/chat 엔드포인트 구현 예제입니다.
 * 기존 server.js에 통합하거나 참고용으로 사용하세요.
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/chat
 * AI 채팅 엔드포인트 (SSE 스트리밍)
 *
 * 요청 바디:
 * {
 *   message: string,        // 사용자 메시지
 *   history: Array<{         // 대화 히스토리
 *     role: 'user' | 'assistant',
 *     content: string
 *   }>
 * }
 *
 * 응답: Server-Sent Events (SSE) 스트리밍
 */
router.post('/api/chat', async (req, res) => {
    // SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx 버퍼링 방지

    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
        res.write(`data: ${JSON.stringify({ error: '메시지가 필요합니다.' })}\n\n`);
        res.end();
        return;
    }

    try {
        // AI 모델 호출 (예: Google Gemini, OpenAI 등)
        const aiResponse = await generateAIResponse(message, history);

        // 스트리밍 응답 전송
        // 실제 구현에서는 AI 모델의 스트리밍 기능을 사용하세요
        await streamResponse(res, aiResponse);

    } catch (error) {
        console.error('AI 응답 생성 오류:', error);
        res.write(`data: ${JSON.stringify({ error: '서버 오류가 발생했습니다.' })}\n\n`);
    } finally {
        res.end();
    }
});

/**
 * AI 응답 생성 함수
 * @param {string} userMessage - 사용자 메시지
 * @param {Array} history - 대화 히스토리
 * @returns {string} AI 응답
 */
async function generateAIResponse(userMessage, history) {
    // 여기에 실제 AI 모델 호출 로직 구현
    // 예: Google Generative AI SDK 사용

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // 대화 히스토리를 Gemini 형식으로 변환
    const chatHistory = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7,
        },
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
}

/**
 * 스트리밍 응답 전송 함수
 * @param {Response} res - Express 응답 객체
 * @param {string} text - 전송할 텍스트
 */
async function streamResponse(res, text) {
    // 텍스트를 조각내어 스트리밍
    const words = text.split(' ');
    let currentText = '';

    for (const word of words) {
        currentText += (currentText ? ' ' : '') + word;

        // SSE 형식으로 전송
        res.write(`data: ${JSON.stringify({
            content: word + ' ',
            done: false
        })}\n\n`);

        // 약간의 지연 추가 (실제 AI 스트리밍에서는 필요 없음)
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 완료 신호 전송
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
}

// 실제 AI 스트리밍 예제 (Gemini Pro)
/**
 * Gemini Pro 스트리밍 응답 예제
 */
async function streamGeminiResponse(res, userMessage, history) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const chatHistory = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({ history: chatHistory });

    const result = await chat.sendMessageStream(userMessage);

    for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        const words = chunkText.split(' ');

        for (const word of words) {
            res.write(`data: ${JSON.stringify({
                content: word + ' ',
                done: false
            })}\n\n`);
        }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
}

module.exports = router;

/**
 * server.js에 통합하는 방법:
 *
 * const express = require('express');
 * const app = express();
 * const chatRouter = require('./chat-api-example');
 *
 * app.use(express.json());
 * app.use('/api', chatRouter);
 *
 * app.listen(3000, () => {
 *     console.log('Server running on port 3000');
 * });
 */
