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
주제: {topic}
난이도: {difficulty} (level1: 왕초보, level2: 초보, level3: 중급, level4: 고급, level5: 원어민 수준)

위 주제와 선택된 난이도 수준에 정확히 맞는 '맞춤형' 영어 문장 10개를 생성해 주세요. 
사용자의 관심사(주제)를 반영하여 실제 트렌드에서 쓰일 법한 생동감 넘치는 문장을 제공하는 것이 목표입니다.

각 문장에 대해 다음 6가지 요구 조건을 충족하여 JSON 배열 형식으로 응답해 주세요:

1. "en": 입력한 주제 기반으로 선택한 레벨에 맞는 난이도의 영어 문장
2. "ko": 해당 영어 문장에 대한 자연스러운 한국어 해석 (문맥에 맞는 맞춤형 번역)
3. "sentence_structure": 문장의 형식(1~5형식)과 주요 문장 성분(주어, 동사, 목적어, 보어, 수식어 등)을 분석해 주세요. (예: "3형식 / 주어: I, 동사: love, 목적어: coding")
4. "explanation": 이 영어 문장을 한국어로 어떻게 해석해야 하는지에 대한 자세한 설명 (Trend Eng만의 맞춤형 학습 팁, 문장 구조, 문법적 특징 등)
5. "voca": 문장에 쓰인 핵심 단어와 숙어 표현 정리 (예: ["word: 뜻", "idiom: 뜻"])

**주의사항**:
- 모든 설명과 단어 뜻은 한글 또는 영어로만 작성하세요 (한자 및 일본어 절대 금지).
- 응답은 반드시 순수한 JSON 배열 형식이어야 합니다.
- 사용자의 주제가 뉴스 기사 전문이나 긴 텍스트인 경우, 그 내용을 바탕으로 가장 핵심적이고 유용한 문장을 추출/생성하세요.

JSON 형식 예시:
[
  {
    "en": "I love coding in JavaScript because it is versatile.",
    "ko": "나는 자바스크립트로 코딩하는 것을 좋아합니다. 왜냐하면 그것은 다재다능하기 때문입니다.",
    "sentence_structure": "3형식 / 주어: I, 동사: love, 목적어: coding, 수식어: in JavaScript (종속절: because it is versatile)",
    "explanation": "이 문장은 접속사 because를 기준으로 두 개의 절로 나뉩니다. 첫 번째 절에서는 'I love coding'으로 주어+동사+목적어의 구조를 가지며, 'in JavaScript'가 수식어로 붙었습니다. 두 번째 절은 'it is versatile'로 주어+be동사+보어의 구조입니다. 앞에서부터 차례대로 해석하되, because 부분을 '왜냐하면 ~이기 때문이다'로 연결하면 자연스럽습니다.",
    "voca": ["coding: 코딩, 프로그래밍", "versatile: 다재다능한, 다용도의"]
  }
]`;

// Helper function to get global settings
async function getGlobalSettings() {
    return new Promise((resolve, reject) => {
        db.get("SELECT geminiApiKey, geminiModel, chatModel, systemPrompt FROM global_settings WHERE id = 1", (err, row) => {
            if (err) reject(err);
            else resolve({
                geminiApiKey: row?.geminiApiKey || process.env.GEMINI_API_KEY,
                geminiModel: row?.geminiModel || 'gemini-2.5-flash',
                chatModel: row?.chatModel || 'gemini-2.5-flash',
                systemPrompt: row?.systemPrompt || DEFAULT_PROMPT
            });
        });
    });
}

// Global Settings API endpoints
app.get('/api/settings', (req, res) => {
    db.get("SELECT geminiApiKey, geminiModel, chatModel, systemPrompt FROM global_settings WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
            provider: 'gemini',
            hasApiKey: !!row?.geminiApiKey,
            apiKeyPreview: row?.geminiApiKey ? row.geminiApiKey.substring(0, 10) + '...' : null,
            model: row?.geminiModel || 'gemini-2.5-flash',
            chatModel: row?.chatModel || 'gemini-2.5-flash',
            systemPrompt: row?.systemPrompt || DEFAULT_PROMPT
        });
    });
});

app.post('/api/settings', (req, res) => {
    const { geminiApiKey, geminiModel, chatModel, systemPrompt } = req.body;

    const updates = [];
    const values = [];

    if (geminiApiKey !== undefined) {
        if (!geminiApiKey || typeof geminiApiKey !== 'string' || geminiApiKey.trim().length === 0) {
            return res.status(400).json({ error: '유효한 Gemini API Key를 입력해주세요.' });
        }
        updates.push('geminiApiKey = ?');
        values.push(geminiApiKey.trim());
    }

    if (geminiModel !== undefined) {
        const validGeminiModels = ['gemini-2.5-flash', 'gemini-3.1-flash-lite-preview'];
        if (!validGeminiModels.includes(geminiModel)) {
            return res.status(400).json({ error: `유효하지 않은 Gemini 모델입니다: ${geminiModel}` });
        }
        updates.push('geminiModel = ?');
        values.push(geminiModel);
    }

    if (chatModel !== undefined) {
        updates.push('chatModel = ?');
        values.push(chatModel);
    }

    if (systemPrompt !== undefined) {
        if (systemPrompt === 'RESET') {
            updates.push('systemPrompt = ?');
            values.push(null);
        } else {
            updates.push('systemPrompt = ?');
            values.push(systemPrompt);
        }
    }

    updates.push('provider = ?');
    values.push('gemini');

    if (updates.length === 0) {
        return res.status(400).json({ error: '업데이트할 항목이 없습니다.' });
    }

    values.push(1); // id = 1 for global settings

    const sql = `UPDATE global_settings SET ${updates.join(', ')} WHERE id = ?`;
    db.run(sql, values, async function(updateErr) {
        if (updateErr) {
            console.error('DB UPDATE Error:', updateErr);
            return res.status(500).json({ error: updateErr.message });
        }
        
        const settings = await getGlobalSettings();
        app.locals.geminiApiKey = settings.geminiApiKey;
        app.locals.geminiModel = settings.geminiModel;
        app.locals.chatModel = settings.chatModel;
        
        res.json({ success: true, message: '설정이 저장되었습니다.' });
    });
});

app.delete('/api/settings', (req, res) => {
    db.run(`UPDATE global_settings SET geminiApiKey = NULL WHERE id = 1`, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'API Key가 삭제되었습니다.' });
    });
});

// Generate API
app.post('/api/generate', async (req, res) => {
    const { topic, difficulty } = req.body;
    const settings = await getGlobalSettings();
    const API_KEY = settings.geminiApiKey;
    const MODEL = settings.geminiModel;
    let PROMPT_TEMPLATE = settings.systemPrompt || DEFAULT_PROMPT;

    if (!API_KEY) {
        return res.status(400).json({ error: 'API Key가 설정되지 않았습니다.' });
    }

    const finalPrompt = PROMPT_TEMPLATE.replace(/{topic}/g, topic).replace(/{difficulty}/g, difficulty);
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    
    try {
        const response = await axios.post(API_URL, {
            contents: [{ parts: [{ text: finalPrompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
        }, { headers: { "Content-Type": "application/json" } });

        let content = response.data.candidates[0].content.parts[0].text;
        content = content.replace(/^```(json)?/im, '').replace(/```$/m, '').trim();
        const firstBracket = content.indexOf('[');
        if (firstBracket !== -1) content = content.substring(firstBracket);

        let sentences = JSON.parse(content);
        db.run("INSERT INTO learning_history (topic, difficulty, sentences) VALUES (?, ?, ?)", 
            [topic, difficulty, JSON.stringify(sentences)]);

        res.json({ sentences });
    } catch (error) {
        console.error('Generate Error:', error.message);
        res.status(500).json({ error: 'Failed to generate sentences' });
    }
});

// History API
app.get('/api/history', (req, res) => {
    db.all("SELECT id, topic, difficulty, createdAt FROM learning_history ORDER BY createdAt DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ history: rows });
    });
});

app.get('/api/history/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM learning_history WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json({
            id: row.id,
            topic: row.topic,
            difficulty: row.difficulty,
            sentences: JSON.parse(row.sentences),
            createdAt: row.createdAt
        });
    });
});

app.delete('/api/history/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM learning_history WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/trends', async (req, res) => {
    res.json({ trends: [] });
});

// Start Express Server
const server = app.listen(PORT, async () => {
    console.log(`Express Server running on port ${PORT}`);
    if (!db.isReady) {
        await new Promise(resolve => db.resolveReady = resolve);
    }
    const settings = await getGlobalSettings();
    app.locals.geminiApiKey = settings.geminiApiKey;
    app.locals.geminiModel = settings.geminiModel;
    app.locals.chatModel = 'gemini-2.5-flash-native-audio-latest';
});

// WebSocket Server for Gemini Multimodal Live
const wss = new WebSocket.Server({ server, path: '/ws/chat' });

wss.on('connection', (ws, req) => {
    console.log(`WS: New Connection from ${req.socket.remoteAddress}`);
    let geminiWs = null;
    let messageQueue = [];

    const connectToGemini = () => {
        const apiKey = app.locals.geminiApiKey;
        if (!apiKey) {
            ws.send(JSON.stringify({ type: 'text', text: 'Gemini API Key가 없습니다.' }));
            return;
        }

        const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        geminiWs = new WebSocket(geminiUrl);

        geminiWs.on('open', () => {
            console.log('WS: Gemini Connected');
            // 1. Setup 전송
            geminiWs.send(JSON.stringify({
                setup: { model: `models/${app.locals.chatModel}` }
            }));

            // 2. 큐에 쌓인 메시지 전송
            while (messageQueue.length > 0) {
                const msg = messageQueue.shift();
                geminiWs.send(JSON.stringify(msg));
            }
        });

        geminiWs.on('message', (response) => {
            const geminiData = JSON.parse(response);
            if (geminiData.serverContent?.modelTurn) {
                const parts = geminiData.serverContent.modelTurn.parts;
                parts.forEach(part => {
                    if (part.text) ws.send(JSON.stringify({ type: 'text', text: part.text }));
                    if (part.inlineData) ws.send(JSON.stringify({ type: 'audio', audio: part.inlineData.data }));
                });
            }
        });

        geminiWs.on('error', (err) => ws.send(JSON.stringify({ type: 'text', text: `Gemini 연결 에러: ${err.message}` })));
        geminiWs.on('close', () => { geminiWs = null; });
    };

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            let geminiMsg = null;

            if (data.type === 'text') {
                geminiMsg = {
                    clientContent: {
                        turns: [{ role: 'user', parts: [{ text: data.text }] }],
                        turnComplete: true
                    }
                };
            } else if (data.type === 'video' || data.type === 'audio') {
                geminiMsg = {
                    realtimeInput: {
                        mediaChunks: [{
                            mimeType: data.type === 'video' ? 'image/jpeg' : 'audio/pcm',
                            data: data.data
                        }]
                    }
                };
            }

            if (geminiMsg) {
                if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
                    geminiWs.send(JSON.stringify(geminiMsg));
                } else {
                    if (!geminiWs) connectToGemini();
                    messageQueue.push(geminiMsg);
                }
            }
        } catch (e) {
            console.error('WS Internal Error:', e);
        }
    });

    ws.on('close', () => {
        if (geminiWs) geminiWs.close();
    });
});
