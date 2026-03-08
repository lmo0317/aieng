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

const DEFAULT_PROMPT = `당신은 트렌드 맞춤형 영어 학습 서비스 'Trend Eng'의 전문 AI 튜터입니다. 친절하게 대화해 주세요.`;

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
            
            // [CRITICAL] "Cannot extract voices" 해결을 위한 AUDIO 모드 명시 Setup
            const setupMsg = {
                setup: { 
                    model: `models/gemini-2.5-flash-native-audio-latest`,
                    generation_config: {
                        response_modalities: ["AUDIO"]
                    }
                }
            };
            
            console.log('Sending Audio-First Setup:', JSON.stringify(setupMsg));
            geminiWs.send(JSON.stringify(setupMsg));
        });

        geminiWs.on('message', (data) => {
            try {
                const response = JSON.parse(data);
                
                if (response.setupComplete) {
                    console.log('Gemini Setup Success!');
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
            } catch (e) { console.error('Gemini Msg Error:', e); }
        });

        geminiWs.on('close', (code, reason) => {
            console.log(`Gemini Closed. Code: ${code}, Reason: ${reason}`);
            geminiWs = null;
            isSetupDone = false;
        });

        geminiWs.on('error', (err) => console.error('Gemini Error:', err.message));
    };

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            let geminiPayload = null;

            if (data.type === 'text') {
                geminiPayload = {
                    client_content: {
                        turns: [{ role: "user", parts: [{ text: data.text }] }],
                        turn_complete: true
                    }
                };
            } else if (data.type === 'audio' || data.type === 'video') {
                geminiPayload = {
                    realtime_input: {
                        media_chunks: [{
                            mime_type: data.type === 'audio' ? 'audio/pcm;rate=16000' : 'image/jpeg',
                            data: data.data
                        }]
                    }
                };
            }

            if (geminiPayload) {
                if (geminiWs && geminiWs.readyState === WebSocket.OPEN && isSetupDone) {
                    geminiWs.send(JSON.stringify(geminiPayload));
                } else {
                    if (!geminiWs) startGeminiSession();
                    messageQueue.push(geminiPayload);
                }
            }
        } catch (e) { console.error('Local WS Error:', e); }
    });

    ws.on('close', () => { if (geminiWs) geminiWs.close(); });
});
