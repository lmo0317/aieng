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

각 문장에 대해 다음 5가지 요구 조건을 충족하여 JSON 배열 형식으로 응답해 주세요:

1. "en": 입력한 주제 기반으로 선택한 레벨에 맞는 난이도의 영어 문장
2. "ko": 해당 영어 문장에 대한 자연스러운 한국어 해석 (문맥에 맞는 맞춤형 번역)
3. "sentence_structure": 문장의 형식(1~5형식)과 주요 문장 성분(주어, 동사, 목적어, 보어, 수식어 등)을 분석해 주세요.
4. "explanation": 이 영어 문장을 한국어로 어떻게 해석해야 하는지에 대한 자세한 설명 (Trend Eng만의 맞춤형 학습 팁, 문장 구조, 문법적 특징 등)
5. "voca": 문장에 쓰인 핵심 단어와 숙어 표현 정리 (예: ["word: 뜻", "idiom: 뜻"])

**주의사항**:
- 모든 설명과 단어 뜻은 한글 또는 영어로만 작성하세요.
- 응답은 반드시 순수한 JSON 배열 형식이어야 합니다.

JSON 형식 예시:
[
  {
    "en": "I love coding in JavaScript because it is versatile.",
    "ko": "나는 자바스크립트로 코딩하는 것을 좋아합니다. 왜냐하면 그것은 다재다능하기 때문입니다.",
    "sentence_structure": "3형식 / 주어: I, 동사: love, 목적어: coding, 수식어: in JavaScript (종속절: because it is versatile)",
    "explanation": "이 문장은 접속사 because를 기준으로 두 개의 절로 나뉩니다. 앞에서부터 차례대로 해석하되, because 부분을 '왜냐하면 ~이기 때문이다'로 연결하면 자연스럽습니다.",
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
                chatModel: row?.chatModel || 'gemini-2.5-flash-native-audio-latest',
                systemPrompt: row?.systemPrompt || DEFAULT_PROMPT
            });
        });
    });
}

// Global Settings API endpoints
app.get('/api/settings', async (req, res) => {
    try {
        const row = await getGlobalSettings();
        res.json({
            provider: 'gemini',
            hasApiKey: !!row.geminiApiKey,
            apiKeyPreview: row.geminiApiKey ? row.geminiApiKey.substring(0, 10) + '...' : null,
            model: row.geminiModel,
            chatModel: row.chatModel,
            systemPrompt: row.systemPrompt
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    const { geminiApiKey, geminiModel, chatModel, systemPrompt } = req.body;
    const updates = [];
    const values = [];

    if (geminiApiKey !== undefined) {
        updates.push('geminiApiKey = ?');
        values.push(geminiApiKey ? geminiApiKey.trim() : null);
    }
    if (geminiModel !== undefined) {
        updates.push('geminiModel = ?');
        values.push(geminiModel);
    }
    if (chatModel !== undefined) {
        updates.push('chatModel = ?');
        values.push(chatModel);
    }
    if (systemPrompt !== undefined) {
        updates.push('systemPrompt = ?');
        values.push(systemPrompt === 'RESET' ? null : systemPrompt);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No data' });
    values.push(1);

    db.run(`UPDATE global_settings SET ${updates.join(', ')} WHERE id = ?`, values, async function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const s = await getGlobalSettings();
        app.locals.geminiApiKey = s.geminiApiKey;
        app.locals.geminiModel = s.geminiModel;
        app.locals.chatModel = s.chatModel;
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
    const s = await getGlobalSettings();
    if (!s.geminiApiKey) return res.status(400).json({ error: 'API Key가 설정되지 않았습니다.' });

    const finalPrompt = s.systemPrompt.replace(/{topic}/g, topic).replace(/{difficulty}/g, difficulty);
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${s.geminiModel}:generateContent?key=${s.geminiApiKey}`;
    
    try {
        const response = await axios.post(API_URL, {
            contents: [{ parts: [{ text: finalPrompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
        });

        let content = response.data.candidates[0].content.parts[0].text;
        content = content.replace(/^```(json)?/im, '').replace(/```$/m, '').trim();
        const firstBracket = content.indexOf('[');
        if (firstBracket !== -1) content = content.substring(firstBracket);

        const sentences = JSON.parse(content);
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
        res.json({ history: rows || [] });
    });
});

app.get('/api/history/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM learning_history WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json({ id: row.id, topic: row.topic, difficulty: row.difficulty, sentences: JSON.parse(row.sentences), createdAt: row.createdAt });
    });
});

app.delete('/api/history/:id', (req, res) => {
    db.run("DELETE FROM learning_history WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Trends API
app.get('/api/trends', async (req, res) => {
    const fallbacks = [{ category: 'TEC', title: '인공지능(AI) 기술이 바꾸는 우리의 미래 일상' }, { category: 'BIZ', title: '2026년 세계 경제 전망' }];
    const categories = [
        { name: 'TOP', url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'BIZ', url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko' }
    ];
    try {
        const results = await Promise.allSettled(categories.map(cat => axios.get(cat.url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } })));
        let allTrends = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const xml = result.value.data;
                const matches = xml.match(/<title>(.*?)<\/title>/g) || [];
                matches.slice(1, 6).forEach(m => {
                    let title = m.replace(/<title>(.*?)<\/title>/, '$1').split(' - ')[0];
                    title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                    const cleanTitle = title.trim();
                    
                    // 의미 없는 제목 필터링
                    const genericTerms = ['Google 뉴스', 'Google News', '속보', '오늘의 뉴스'];
                    const isGeneric = genericTerms.some(term => cleanTitle.includes(term));
                    
                    if (cleanTitle.length > 10 && !isGeneric) {
                        allTrends.push({ category: categories[index].name, title: cleanTitle });
                    }
                });
            }
        });
        res.json({ trends: allTrends.length > 0 ? allTrends : fallbacks });
    } catch (error) { res.json({ trends: fallbacks }); }
});

// Start Express Server
const server = app.listen(PORT, async () => {
    console.log(`Express Server running on port ${PORT}`);
    if (!db.isReady) await new Promise(resolve => db.resolveReady = resolve);
    const settings = await getGlobalSettings();
    app.locals.geminiApiKey = settings.geminiApiKey;
    app.locals.chatModel = 'gemini-2.5-flash-native-audio-latest';
});

// WebSocket Server
const wss = new WebSocket.Server({ server, path: '/ws/chat' });
wss.on('connection', (ws, req) => {
    let geminiWs = null;
    let messageQueue = [];
    let isSetupDone = false;

    const startGeminiSession = async () => {
        const s = await getGlobalSettings();
        if (!s.geminiApiKey) { ws.send(JSON.stringify({ type: 'text', text: 'API Key가 없습니다.' })); return; }
        geminiWs = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${s.geminiApiKey}`);
        geminiWs.on('open', () => {
            geminiWs.send(JSON.stringify({ setup: { model: `models/gemini-2.5-flash-native-audio-latest`, generation_config: { response_modalities: ["AUDIO"] } } }));
        });
        geminiWs.on('message', (data) => {
            const resp = JSON.parse(data);
            if (resp.setupComplete) { isSetupDone = true; while (messageQueue.length > 0) geminiWs.send(JSON.stringify(messageQueue.shift())); return; }
            if (resp.serverContent?.modelTurn) {
                resp.serverContent.modelTurn.parts.forEach(p => {
                    if (p.text) ws.send(JSON.stringify({ type: 'text', text: p.text }));
                    if (p.inlineData) ws.send(JSON.stringify({ type: 'audio', audio: p.inlineData.data }));
                });
            }
        });
        geminiWs.on('close', () => { geminiWs = null; isSetupDone = false; });
    };

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        let payload = null;
        if (data.type === 'text') payload = { client_content: { turns: [{ role: "user", parts: [{ text: data.text }] }], turn_complete: true } };
        else if (data.type === 'audio') payload = { realtime_input: { media_chunks: [{ mime_type: 'audio/pcm;rate=16000', data: data.data }] } };
        
        if (payload) {
            if (geminiWs?.readyState === WebSocket.OPEN && isSetupDone) geminiWs.send(JSON.stringify(payload));
            else { if (!geminiWs) startGeminiSession(); messageQueue.push(payload); }
        }
    });
    ws.on('close', () => { if (geminiWs) geminiWs.close(); });
});
