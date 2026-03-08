const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const db = require('./database');
const {
    handleChatRequest,
    handleClearSession,
    handleGetHistory
} = require('./chat-api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 80;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const DEFAULT_PROMPT = `당신은 트렌드 맞춤형 영어 학습 서비스 'Trend Eng'의 전문 AI 튜터입니다.
이 사용자는 방금 학습을 마쳤거나 학습 중이며, 실시간 대화를 통해 스피킹 실력을 높이고 싶어 합니다.
친절하고 격려하는 어조로 대화해 주세요.`;

// Helper function to get global settings
async function getGlobalSettings() {
    return new Promise((resolve, reject) => {
        db.get("SELECT geminiApiKey, geminiModel, chatModel, systemPrompt FROM global_settings WHERE id = 1", (err, row) => {
            if (err) reject(err);
            else resolve({
                geminiApiKey: row?.geminiApiKey || process.env.GEMINI_API_KEY,
                geminiModel: row?.geminiModel || 'gemini-2.5-flash',
                chatModel: row?.chatModel || 'gemini-2.5-flash-native-audio-latest',
                systemPrompt: row?.systemPrompt || DEFAULT_PROMPT
            });
        });
    });
}

// REST APIs
app.get('/api/settings', async (req, res) => {
    try {
        const settings = await getGlobalSettings();
        res.json({
            provider: 'gemini',
            hasApiKey: !!settings.geminiApiKey,
            apiKeyPreview: settings.geminiApiKey ? settings.geminiApiKey.substring(0, 10) + '...' : null,
            model: settings.geminiModel,
            chatModel: settings.chatModel,
            systemPrompt: settings.systemPrompt
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings', async (req, res) => {
    const { geminiApiKey, geminiModel, chatModel, systemPrompt } = req.body;
    const updates = []; const values = [];
    if (geminiApiKey) { updates.push('geminiApiKey = ?'); values.push(geminiApiKey); }
    if (geminiModel) { updates.push('geminiModel = ?'); values.push(geminiModel); }
    if (chatModel) { updates.push('chatModel = ?'); values.push(chatModel); }
    if (systemPrompt) { updates.push('systemPrompt = ?'); values.push(systemPrompt === 'RESET' ? null : systemPrompt); }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No data' });
    values.push(1);
    db.run(`UPDATE global_settings SET ${updates.join(', ')} WHERE id = ?`, values, async (err) => {
        if (err) return res.status(500).json({ error: err.message });
        const s = await getGlobalSettings();
        app.locals.geminiApiKey = s.geminiApiKey;
        app.locals.chatModel = s.chatModel;
        res.json({ success: true });
    });
});

app.post('/api/generate', async (req, res) => {
    const { topic, difficulty } = req.body;
    const s = await getGlobalSettings();
    if (!s.geminiApiKey) return res.status(400).json({ error: 'API Key required' });
    
    try {
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${s.geminiModel}:generateContent?key=${s.geminiApiKey}`, {
            contents: [{ parts: [{ text: `Topic: ${topic}, Difficulty: ${difficulty}. Output 10 sentences in JSON format.` }] }]
        });
        res.json({ sentences: [] }); // Simplified for speed
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/history', (req, res) => {
    db.all("SELECT * FROM learning_history ORDER BY createdAt DESC", (err, rows) => res.json({ history: rows || [] }));
});

app.get('/api/trends', (req, res) => res.json({ trends: [] }));

// WebSocket Server
const server = app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    if (!db.isReady) await new Promise(r => db.resolveReady = r);
    const s = await getGlobalSettings();
    app.locals.geminiApiKey = s.geminiApiKey;
    app.locals.chatModel = 'gemini-2.5-flash-native-audio-latest';
});

const wss = new WebSocket.Server({ server, path: '/ws/chat' });

wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    let geminiWs = null;
    let messageQueue = [];

    const startGeminiSession = () => {
        const apiKey = app.locals.geminiApiKey;
        if (!apiKey) {
            ws.send(JSON.stringify({ type: 'text', text: 'Error: API Key가 설정되지 않았습니다.' }));
            return;
        }

        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        geminiWs = new WebSocket(url);

        geminiWs.on('open', () => {
            console.log('Gemini API Connected');
            // Setup
            geminiWs.send(JSON.stringify({
                setup: { model: `models/${app.locals.chatModel}` }
            }));
            
            // 전송 대기 중인 메시지 처리
            while (messageQueue.length > 0) {
                geminiWs.send(JSON.stringify(messageQueue.shift()));
            }
        });

        geminiWs.on('message', (data) => {
            try {
                const response = JSON.parse(data);
                console.log('Gemini Response Received');
                
                if (response.serverContent?.modelTurn) {
                    const parts = response.serverContent.modelTurn.parts;
                    parts.forEach(p => {
                        if (part.text) ws.send(JSON.stringify({ type: 'text', text: p.text }));
                        if (part.inlineData) ws.send(JSON.stringify({ type: 'audio', audio: p.inlineData.data }));
                    });
                }
            } catch (e) { console.error('Gemini Msg Error:', e); }
        });

        geminiWs.on('error', (e) => console.error('Gemini WS Error:', e));
        geminiWs.on('close', () => { geminiWs = null; console.log('Gemini WS Closed'); });
    };

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            let payload = null;

            if (data.type === 'text') {
                payload = { clientContent: { turns: [{ role: 'user', parts: [{ text: data.text }] }], turnComplete: true } };
            } else if (data.type === 'audio') {
                payload = { realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm', data: data.data }] } };
            }

            if (payload) {
                if (geminiWs?.readyState === WebSocket.OPEN) geminiWs.send(JSON.stringify(payload));
                else {
                    if (!geminiWs) startGeminiSession();
                    messageQueue.push(payload);
                }
            }
        } catch (e) { console.error('Client WS Error:', e); }
    });

    ws.on('close', () => { if (geminiWs) geminiWs.close(); });
});
