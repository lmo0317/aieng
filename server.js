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

// REST APIs (Simplified for this task)
app.get('/api/settings', async (req, res) => {
    try {
        const settings = await getGlobalSettings();
        res.json({ provider: 'gemini', hasApiKey: !!settings.geminiApiKey, model: settings.geminiModel, chatModel: settings.chatModel });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings', async (req, res) => {
    const { geminiApiKey, geminiModel, chatModel } = req.body;
    db.run(`UPDATE global_settings SET geminiApiKey = ?, geminiModel = ?, chatModel = ? WHERE id = 1`, 
        [geminiApiKey, geminiModel, chatModel], () => res.json({ success: true }));
});

app.get('/api/history', (req, res) => {
    db.all("SELECT * FROM learning_history ORDER BY createdAt DESC", (err, rows) => res.json({ history: rows || [] }));
});

app.get('/api/trends', (req, res) => res.json({ trends: [] }));

// WebSocket Server
const server = app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    if (!db.isReady) await new Promise(r => db.resolveReady = r);
});

const wss = new WebSocket.Server({ server, path: '/ws/chat' });

wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    let geminiWs = null;
    let messageQueue = [];
    let isSetupDone = false;

    const startGeminiSession = async () => {
        const s = await getGlobalSettings();
        if (!s.geminiApiKey) {
            ws.send(JSON.stringify({ type: 'text', text: 'API Key가 설정되지 않았습니다.' }));
            return;
        }

        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${s.geminiApiKey}`;
        geminiWs = new WebSocket(url);

        geminiWs.on('open', () => {
            console.log('Gemini API Connection Opened');
            // 1. Setup 전송 (필수)
            geminiWs.send(JSON.stringify({
                setup: { 
                    model: `models/${s.chatModel}`,
                    generation_config: { response_modalities: ["audio", "text"] }
                }
            }));
        });

        geminiWs.on('message', (data) => {
            try {
                const response = JSON.parse(data);
                
                // Setup 완료 확인
                if (response.setupComplete) {
                    console.log('Gemini Setup Complete');
                    isSetupDone = true;
                    // 대기 중인 메시지 쏘기
                    while (messageQueue.length > 0) {
                        geminiWs.send(JSON.stringify(messageQueue.shift()));
                    }
                    return;
                }

                if (response.serverContent?.modelTurn) {
                    const parts = response.serverContent.modelTurn.parts;
                    parts.forEach(p => {
                        if (p.text) {
                            console.log('AI Text Response:', p.text);
                            ws.send(JSON.stringify({ type: 'text', text: p.text }));
                        }
                        if (p.inlineData) {
                            ws.send(JSON.stringify({ type: 'audio', audio: p.inlineData.data }));
                            ws.send(JSON.stringify({ type: 'status', status: 'talking' }));
                        }
                    });
                }
                
                if (response.serverContent?.turnComplete) {
                    ws.send(JSON.stringify({ type: 'status', status: 'idle' }));
                }
            } catch (e) { console.error('Error parsing Gemini response:', e); }
        });

        geminiWs.on('close', (code, reason) => {
            console.log(`Gemini Connection Closed. Code: ${code}, Reason: ${reason}`);
            geminiWs = null;
            isSetupDone = false;
        });

        geminiWs.on('error', (err) => {
            console.error('Gemini WS Error:', err.message);
        });
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
                if (geminiWs && geminiWs.readyState === WebSocket.OPEN && isSetupDone) {
                    geminiWs.send(JSON.stringify(payload));
                } else {
                    if (!geminiWs) startGeminiSession();
                    messageQueue.push(payload);
                }
            }
        } catch (e) { console.error('Client message handling error:', e); }
    });

    ws.on('close', () => { if (geminiWs) geminiWs.close(); });
});
