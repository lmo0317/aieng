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

**당신의 역할 및 대화 원칙**:
1. 사용자와 대화할 때는 내부적인 사고 과정(예: 'Thinking...', 'Step 1: ...', '분석 중...')이나 로그 형식의 문구를 절대 출력하지 마세요.
2. 실제 튜터와 대화하듯이 친절하고 자연스러운 문장으로 응답하세요.
3. 제공된 주제에 대해 먼저 한국어로 핵심 내용을 아주 짧게(1~2문장) 요약해 준 뒤, 곧바로 영어 학습을 도와주세요.

**문장 생성 규칙 (Generate API 호출 시)**:
위 주제와 난이도에 맞는 영어 문장 10개를 생성하여 반드시 아래의 순수한 JSON 배열 형식으로만 응답하세요. 설명이나 다른 텍스트를 붙이지 마세요.

1. "en": 영어 문장
2. "ko": 한국어 해석
3. "sentence_structure": 문장 구조 분석
4. "explanation": 학습 팁 및 문법 설명
5. "voca": 핵심 단어 및 숙어 ["단어: 뜻"]

JSON 형식 예시:
[
  {
    "en": "Example sentence",
    "ko": "예시 문장",
    "sentence_structure": "구조 분석",
    "explanation": "설명",
    "voca": ["word: 뜻"]
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

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${s.geminiModel}:generateContent?key=${s.geminiApiKey}`;
    
    try {
        const response = await axios.post(API_URL, {
            system_instruction: {
                parts: [{ text: s.systemPrompt }]
            },
            contents: [{ parts: [{ text: `주제: ${topic}\n난이도: ${difficulty}\n\n[CRITICAL: Output ONLY a valid JSON array of exactly 10 objects matching the required schema. Do NOT wrap the JSON in markdown code blocks. No other text.]` }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192
            }
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
        if (error.response) console.error(error.response.data);
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
                    const genericTerms = ['Google 뉴스', 'Google News', '속보', '오늘의 뉴스'];
                    if (cleanTitle.length > 10 && !genericTerms.some(term => cleanTitle.includes(term))) {
                        allTrends.push({ category: categories[index].name, title: cleanTitle });
                    }
                });
            }
        });
        res.json({ trends: allTrends.length > 0 ? allTrends : fallbacks });
    } catch (error) { res.json({ trends: fallbacks }); }
});

// Chat API endpoint using REST
app.post('/api/chat', async (req, res) => {
    try {
        const { message, topic } = req.body;
        const s = await getGlobalSettings();

        if (!s.geminiApiKey) {
            return res.status(400).json({ error: 'API Key가 설정되지 않았습니다.' });
        }

        const topicContext = topic
            ? `The user is currently studying this topic: '${topic}'. Talk about this topic naturally.`
            : 'The user is here to practice English conversation.';

        const systemPrompt = `You are 'Trend Eng', an AI English Tutor.
Topic: '${topic || "English conversation"}'.

CRITICAL INSTRUCTION:
In your response, you MUST NOT write your thought process (e.g. NEVER write "**Greeting**", "I'm registering...", etc.).
Your response MUST ONLY be the transcript of what you say, in this exact format:
[Your English Speech]
----
[Korean Translation]

Do not add any other text. Just the English, the dashes, and the Korean. Be brief and conversational.`;

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${s.geminiApiKey}`;

        const response = await axios.post(API_URL, {
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: [{
                parts: [{ text: message }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024
            }
        });

        if (response.data.candidates && response.data.candidates[0]) {
            const aiResponse = response.data.candidates[0].content.parts[0].text;
            res.json({ response: aiResponse });
        } else {
            res.status(500).json({ error: 'No response from AI' });
        }
    } catch (error) {
        console.error('Chat API Error:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
        res.status(500).json({ error: 'Failed to get response' });
    }
});

// Start Express Server
const server = app.listen(PORT, async () => {
    console.log(`Express Server running on port ${PORT}`);
    if (!db.isReady) await new Promise(resolve => db.resolveReady = resolve);
    const settings = await getGlobalSettings();
    app.locals.geminiApiKey = settings.geminiApiKey;
    app.locals.chatModel = 'gemini-2.5-flash';

    // WebSocket for real-time chat (no audio)
    const wss = new WebSocket.Server({ server, path: '/ws/chat' });
    wss.on('connection', (ws, req) => {
        console.log('[WS] Client connected');
        let currentTopic = null;

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                console.log('[WS] Received:', data.type);

                if (data.type === 'context') {
                    currentTopic = data.topic;
                    console.log('[WS] Topic set:', currentTopic);
                    ws.send(JSON.stringify({ type: 'status', status: 'ready' }));
                    return;
                }

                if (data.type === 'text') {
                    const s = await getGlobalSettings();
                    if (!s.geminiApiKey) {
                        ws.send(JSON.stringify({ type: 'error', message: 'API Key가 없습니다.' }));
                        return;
                    }

                    const topicContext = currentTopic
                        ? `The user is currently studying this topic: '${currentTopic}'. Talk about this topic naturally.`
                        : 'The user is here to practice English conversation.';

                    const systemPrompt = `You are 'Trend Eng', an AI English Tutor.
Topic: '${currentTopic || "English conversation"}'.

CRITICAL INSTRUCTION:
In your response, you MUST NOT write your thought process (e.g. NEVER write "**Greeting**", "I'm registering...", etc.).
Your response MUST ONLY be the transcript of what you say, in this exact format:
[Your English Speech]
----
[Korean Translation]

Do not add any other text. Just the English, the dashes, and the Korean. Be brief and conversational.`;

                    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${s.geminiApiKey}`;

                    try {
                        const response = await axios.post(API_URL, {
                            system_instruction: {
                                parts: [{ text: systemPrompt }]
                            },
                            contents: [{
                                parts: [{ text: data.text }]
                            }],
                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 1024
                            }
                        });

                        if (response.data.candidates && response.data.candidates[0]) {
                            const aiResponse = response.data.candidates[0].content.parts[0].text;
                            console.log('[WS] AI Response:', aiResponse.substring(0, 50) + '...');
                            ws.send(JSON.stringify({ type: 'text', text: aiResponse }));
                            // 응답 완료 신호 전송
                            ws.send(JSON.stringify({ type: 'turn_complete' }));
                        } else {
                            ws.send(JSON.stringify({ type: 'error', message: 'AI 응답 없음' }));
                        }
                    } catch (error) {
                        console.error('[WS] Chat Error:', error.message);
                        ws.send(JSON.stringify({ type: 'error', message: '채팅 실패: ' + error.message }));
                    }
                }
            } catch (e) {
                console.error('[WS] Message error:', e);
            }
        });

        ws.on('close', () => {
            console.log('[WS] Client disconnected');
        });

        ws.on('error', (error) => {
            console.error('[WS] Error:', error);
        });
    });
});
