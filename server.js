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
친절하고 격려하는 어조로 대화해 주세요.`;

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
        const s = await getGlobalSettings();
        res.json({ provider: 'gemini', hasApiKey: !!s.geminiApiKey, model: s.geminiModel, chatModel: s.chatModel });
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
            ws.send(JSON.stringify({ type: 'text', text: 'Error: API Key가 없습니다.' }));
            return;
        }

        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${s.geminiApiKey}`;
        geminiWs = new WebSocket(url);

        geminiWs.on('open', () => {
            console.log('Gemini Bidi Connection Opened');
            
            // "Cannot extract voices from a non-audio request" 해결을 위한 정밀 Setup
            const setupMsg = {
                setup: { 
                    model: `models/${s.chatModel}`,
                    generation_config: {
                        response_modalities: ["AUDIO", "TEXT"], // 대문자로 명시
                        speech_config: {
                            voice_config: {
                                prebuilt_voice_config: {
                                    voice_name: "Aoede" // AI 목소리 선택 (Aoede, Charon, Fenrir, Kore, Puck 등)
                                }
                            }
                        }
                    },
                    system_instruction: {
                        parts: [{ text: s.systemPrompt || DEFAULT_PROMPT }]
                    }
                }
            };
            geminiWs.send(JSON.stringify(setupMsg));
        });

        geminiWs.on('message', (data) => {
            try {
                const response = JSON.parse(data);
                
                if (response.setupComplete) {
                    console.log('Gemini Setup Verified with Audio');
                    isSetupDone = true;
                    while (messageQueue.length > 0) {
                        geminiWs.send(JSON.stringify(messageQueue.shift()));
                    }
                    return;
                }

                if (response.serverContent?.modelTurn) {
                    const parts = response.serverContent.modelTurn.parts;
                    parts.forEach(p => {
                        if (p.text) ws.send(JSON.stringify({ type: 'text', text: p.text }));
                        if (p.inlineData) ws.send(JSON.stringify({ type: 'audio', audio: p.inlineData.data }));
                    });
                }
                
                if (response.serverContent?.turnComplete) {
                    ws.send(JSON.stringify({ type: 'status', status: 'idle' }));
                }
            } catch (e) { console.error('Gemini Parse Error:', e); }
        });

        geminiWs.on('close', (code, reason) => {
            console.log(`Gemini Closed. Code: ${code}, Reason: ${reason}`);
            geminiWs = null;
            isSetupDone = false;
        });

        geminiWs.on('error', (err) => console.error('Gemini WS Error:', err.message));
    };

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            let payload = null;

            if (data.type === 'text') {
                payload = { 
                    clientContent: { 
                        turns: [{ role: 'user', parts: [{ text: data.text }] }], 
                        turnComplete: true 
                    } 
                };
            } else if (data.type === 'audio') {
                payload = { 
                    realtimeInput: { 
                        mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: data.data }] 
                    } 
                };
            } else if (data.type === 'video') {
                payload = { 
                    realtimeInput: { 
                        mediaChunks: [{ mimeType: 'image/jpeg', data: data.data }] 
                    } 
                };
            }

            if (payload) {
                if (geminiWs && geminiWs.readyState === WebSocket.OPEN && isSetupDone) {
                    geminiWs.send(JSON.stringify(payload));
                } else {
                    if (!geminiWs) startGeminiSession();
                    messageQueue.push(payload);
                }
            }
        } catch (e) { console.error('Local WS Error:', e); }
    });

    ws.on('close', () => { if (geminiWs) geminiWs.close(); });
});
