const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const https = require('https');
const db = require('./database');

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 8001;

// SSE 클라이언트 저장
const trendsClients = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const DEFAULT_PROMPT = `당신은 트렌드 맞춤형 영어 학습 서비스 'Trend Eng'의 전문 AI 튜터입니다.
주제: {topic}
난이도: {difficulty} (level1: 왕초보, level2: 초보, level3: 중급, level4: 고급, level5: 원어민 수준)

**당신의 역할 및 대화 원칙**:
1. 사용자와 대화할 때는 내부적인 사고 과정(예: 'Thinking...', 'Step 1: ...', '분석 중...')이나 로그 형식의 문구를 절대 출력하지 마세요.
2. 실제 튜터와 대화하듯이 친절하고 자연스러운 문장으로 응답하세요.
3. 제공된 주제에 대해 먼저 한국어로 핵심 내용을 아주 짧게(1~2문장) 요약해 준 뒤, 곧바로 영어 학습을 도와주세요.

**콘텐츠 생성 규칙 (Generate API 호출 시)**:
위 주제와 난이도에 맞는 영어 문장 10개와 복습용 퀴즈 10개를 생성하여, 반드시 아래의 순수한 JSON 객체 형식으로만 응답하세요. 
[중요] JSON 문자열 값 내에 실제 줄바꿈(Enter)을 포함하지 마세요. 줄바꿈이 필요한 경우 반드시 \\n으로 이스케이프 처리하세요.
설명이나 다른 텍스트를 붙이지 마세요.

- "sentence_structure" 작성 시 언어학적 태그와 함께 반드시 한글 명칭(주어, 동사, 목적어, 수식어구 등)을 포함하여 직관적으로 분석하세요. (예: S(주어: 단어) + V(동사: 단어) + O(목적어: 단어))
- "explanation" (학습 팁 및 문법 설명) 작성 시, 명확하고 직관적인 1타 강사 스타일로 아주 상세하게 설명하세요.

{
  "sentences": [
    {
      "en": "English sentence",
      "ko": "한국어 해석",
      "sentence_structure": "S(주어: Apple) + V(동사: is) + SC(주격보어: delicious) 형식의 명확한 문장 구조 분석",
      "explanation": "1타 강사 스타일의 깊이 있는 문법 및 뉘앙스 설명",
      "voca": ["word: 뜻"]
    }
  ],
  "quiz": [
    {
      "type": "multiple_choice",
      "word": "apple",
      "question": "'apple'의 올바른 뜻을 고르세요.",
      "options": ["사과", "바나나", "포도", "오렌지"],
      "answer": "사과"
    },
    {
      "type": "fill_in_blank",
      "word": "banana",
      "question": "다음 뜻에 해당하는 영어 단어를 적어주세요: '바나나'",
      "answer": "banana"
    }
  ]
}`;

// Helper function to get global settings
async function getGlobalSettings() {
    return new Promise((resolve, reject) => {
        db.get("SELECT geminiApiKey, geminiModel, systemPrompt FROM global_settings WHERE id = 1", (err, row) => {
            if (err) reject(err);
            else resolve({
                geminiApiKey: (row && row.geminiApiKey) || process.env.GEMINI_API_KEY,
                geminiModel: (row && row.geminiModel) || 'gemini-3.1-flash-lite-preview',
                systemPrompt: (row && row.systemPrompt) || DEFAULT_PROMPT
            });
        });
    });
}

// Helper function to call Gemini API
async function callGeminiAPI(apiKey, model, systemPrompt, userPrompt, config = {}) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
            temperature: config.temperature || 0.7,
            maxOutputTokens: config.maxOutputTokens || 8192
        }
    };

    if (systemPrompt) {
        requestBody.system_instruction = {
            parts: [{ text: systemPrompt }]
        };
    }

    const response = await axios.post(API_URL, requestBody, { timeout: 60000 });
    return response.data.candidates[0].content.parts[0].text;
}

// Helper function to robustly clean and parse JSON from AI response
function cleanAndParseJSON(str) {
    if (!str || typeof str !== 'string') return str;
    let cleaned = str.replace(/^```(json)?/im, '').replace(/```$/m, '').trim();
    const firstBracket = cleaned.indexOf('[');
    const firstBrace = cleaned.indexOf('{');
    let start = -1;
    let endChar = '';

    if (firstBracket !== -1 && (firstBrace === -1 || (firstBracket < firstBrace && firstBracket !== -1))) {
        start = firstBracket;
        endChar = ']';
    } else if (firstBrace !== -1) {
        start = firstBrace;
        endChar = '}';
    }

    if (start !== -1) {
        const lastEnd = cleaned.lastIndexOf(endChar);
        if (lastEnd !== -1 && lastEnd > start) {
            cleaned = cleaned.substring(start, lastEnd + 1);
        }
    }

    cleaned = cleaned.replace(/"([^"\\]*(\\.[^"\\]*)*)"/gs, (match) => {
        return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parsing Error:", e.message);
        throw new Error(`JSON 파싱 실패: ${e.message}`);
    }
}

// API Endpoints
app.get('/api/settings', async (req, res) => {
    try {
        const row = await getGlobalSettings();
        res.json({
            hasApiKey: !!row.geminiApiKey,
            apiKeyPreview: row.geminiApiKey ? row.geminiApiKey.substring(0, 10) + '...' : null,
            model: row.geminiModel,
            systemPrompt: row.systemPrompt
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    const { geminiApiKey, geminiModel, systemPrompt } = req.body;
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
    if (systemPrompt !== undefined) {
        updates.push('systemPrompt = ?');
        values.push(systemPrompt === 'RESET' ? null : systemPrompt);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No data' });
    values.push(1);

    db.run(`UPDATE global_settings SET ${updates.join(', ')} WHERE id = ?`, values, async function(err) {
        if (err) return res.status(500).json({ error: err.message });
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

    if (!s.geminiApiKey) {
        return res.status(400).json({ error: 'Gemini API Key가 설정되지 않았습니다.' });
    }

    try {
        const userPrompt = `주제: ${topic}\n난이도: ${difficulty}\n\n[CRITICAL: Output ONLY a valid JSON object containing "sentences" and "quiz". No markdown.]`;
        const content = await callGeminiAPI(s.geminiApiKey, s.geminiModel, s.systemPrompt, userPrompt);
        const parsedData = cleanAndParseJSON(content);
        
        let sentences = parsedData.sentences || parsedData;
        let quiz = parsedData.quiz || [];
        
        db.run("INSERT INTO learning_history (topic, difficulty, sentences, quiz) VALUES (?, ?, ?, ?)",
            [topic, difficulty, JSON.stringify(sentences), JSON.stringify(quiz)]);

        res.json({ sentences, quiz });
    } catch (error) {
        console.error('Generate Error:', error.message);
        res.status(500).json({ error: 'Failed to generate sentences and quiz' });
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

// SSE endpoint for trends progress
app.get('/api/trends/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    });
    const clientId = Date.now();
    trendsClients.set(clientId, res);
    req.on('close', () => trendsClients.delete(clientId));
});

function broadcastTrendsProgress(status, message, current, total) {
    trendsClients.forEach((res) => {
        try {
            res.write(`data: ${JSON.stringify({ status, message, current, total })}\n\n`);
        } catch (err) {}
    });
}

// Trends API
app.get('/api/trends/saved', (req, res) => {
    db.all("SELECT * FROM trends WHERE sentences IS NOT NULL AND type = 'news' ORDER BY date DESC, category ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ trends: rows || [] });
    });
});

app.post('/api/trends/fetch', async (req, res) => {
    const s = await getGlobalSettings();
    if (!s.geminiApiKey) return res.status(400).json({ error: 'Gemini API Key가 필요합니다.' });

    const categories = [
        { name: 'TOP', label: '전체', url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'TEC', label: '테크', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'SPO', label: '스포츠', url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'ENT', label: '연애', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko' }
    ];

    try {
        broadcastTrendsProgress('fetching', '뉴스 수집 중...', 0, 0);
        let allTrends = [];
        
        for (const cat of categories) {
            try {
                const result = await axios.get(cat.url, { timeout: 8000 });
                const matches = result.data.match(/<title>(.*?)<\/title>/g) || [];
                matches.slice(1, 6).forEach(m => {
                    let title = m.replace(/<title>(.*?)<\/title>/, '$1').split(' - ')[0];
                    title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
                    allTrends.push({ category: cat.label, title: title.trim() });
                });
            } catch (err) { console.warn(`RSS failed for ${cat.label}`); }
        }

        const uniqueTrends = allTrends.slice(0, 10);
        let processed = [];

        for (let i = 0; i < uniqueTrends.length; i++) {
            const trend = uniqueTrends[i];
            broadcastTrendsProgress('analyzing', `뉴스 분석 중... (${i + 1}/${uniqueTrends.length})`, i + 1, uniqueTrends.length);
            
            const prompt = `뉴스 제목 "${trend.title}"을 분석하여 요약(1문장)과 키워드(3개)를 JSON으로 추출하세요. { "summary": "", "keywords": [] }`;
            const analysis = await callGeminiAPI(s.geminiApiKey, s.geminiModel, null, prompt);
            const analyzed = cleanAndParseJSON(analysis);

            const userPrompt = `주제: ${trend.title}\n난이도: level3\n\n[Output ONLY a valid JSON object containing "sentences" and "quiz"]`;
            const content = await callGeminiAPI(s.geminiApiKey, s.geminiModel, s.systemPrompt, userPrompt);
            const parsedData = cleanAndParseJSON(content);
            
            let sentences = parsedData.sentences || parsedData;
            let quiz = parsedData.quiz || [];

            processed.push({ ...trend, summary: analyzed.summary, keywords: analyzed.keywords, sentences, quiz });
            await new Promise(r => setTimeout(r, 2000));
        }

        const today = new Date().toISOString().split('T')[0];
        db.serialize(() => {
            db.run("DELETE FROM trends WHERE date = ? AND type = 'news'", [today]);
            const stmt = db.prepare("INSERT INTO trends (title, category, summary, keywords, sentences, quiz, difficulty, date, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'news')");
            processed.forEach(t => stmt.run(t.title, t.category, t.summary, JSON.stringify(t.keywords), JSON.stringify(t.sentences), JSON.stringify(t.quiz), 'level3', today));
            stmt.finalize();
        });

        broadcastTrendsProgress('complete', '분석 완료!', uniqueTrends.length, uniqueTrends.length);
        res.json({ success: true });
    } catch (error) {
        broadcastTrendsProgress('error', error.message, 0, 0);
        res.status(500).json({ error: error.message });
    }
});

// Save Pre-Analyzed Trends API (for CLI script)
app.post('/api/trends/save', async (req, res) => {
    try {
        const { trends } = req.body;
        if (!Array.isArray(trends) || trends.length === 0) {
            return res.status(400).json({ error: '트렌드 배열이 필요합니다.' });
        }

        const today = new Date().toISOString().split('T')[0];

        db.serialize(() => {
            const stmt = db.prepare("INSERT INTO trends (title, category, summary, keywords, sentences, quiz, difficulty, date, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            trends.forEach(t => {
                const keywords = t.keywords ? JSON.stringify(t.keywords) : '[]';
                const sentences = typeof t.sentences === 'object' ? JSON.stringify(t.sentences) : t.sentences;
                const quiz = t.quiz ? (typeof t.quiz === 'object' ? JSON.stringify(t.quiz) : t.quiz) : '[]';
                const cleanTitle = String(t.title || '').trim();

                stmt.run(cleanTitle, t.category, t.summary || '', keywords, sentences, quiz, t.difficulty || 'level3', today, 'news');
            });
            stmt.finalize();
        });

        res.json({ success: true, message: `${trends.length} trends saved successfully.` });
    } catch (error) {
        console.error('Trends save error:', error.message);
        res.status(500).json({ error: `실패: ${error.message}` });
    }
});

app.get('/api/trends/by-id/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM trends WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json({ trend: row });
    });
});

app.get('/api/trends/by-title', (req, res) => {
    const { title } = req.query;
    db.get("SELECT * FROM trends WHERE title = ?", [title], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json({ trend: row });
    });
});

// Saved Songs API
app.get('/api/songs/saved', (req, res) => {
    db.all("SELECT * FROM trends WHERE type = 'song' ORDER BY createdAt DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ songs: rows || [] });
    });
});

app.post('/api/songs/save', (req, res) => {
    const { title, lyrics, difficulty, sentences, quiz, image } = req.body;
    if (!title || !sentences) {
        return res.status(400).json({ error: 'title과 sentences가 필요합니다.' });
    }

    const sentencesStr = typeof sentences === 'string' ? sentences : JSON.stringify(sentences);
    const quizStr = quiz ? (typeof quiz === 'string' ? quiz : JSON.stringify(quiz)) : '[]';

    db.run(
        "INSERT INTO trends (title, summary, difficulty, sentences, quiz, image, type) VALUES (?, ?, ?, ?, ?, ?, 'song')",
        [title, lyrics.substring(0, 200), difficulty || 'level3', sentencesStr, quizStr, image],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Clear Today's Data API
app.post('/api/trends/clear-today', (req, res) => {
    const { date } = req.body;
    if (!date) {
        return res.status(400).json({ error: 'date 파라미터가 필요합니다.' });
    }

    if (date === '날짜 미지정') {
        db.run("DELETE FROM trends WHERE (date IS NULL OR date = '') AND type = 'news'", function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, deleted: this.changes });
        });
    } else {
        db.run("DELETE FROM trends WHERE date = ? AND type = 'news'", [date], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, deleted: this.changes });
        });
    }
});

// Delete Trend or Song
app.delete('/api/trends/:id', (req, res) => {
    db.run("DELETE FROM trends WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Start Express Server
const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Express Server running on http://0.0.0.0:${PORT} (Dynamic Gemini Mode)`);
    console.log(`Service URL: http://aieng.cafe24app.com`);
    
    // WebSocket for AI Tutor Chat
    const wss = new WebSocket.Server({ server, path: '/ws/chat' });
    wss.on('connection', (ws) => {
        let currentTopic = null;
        let teacherPersona = null;

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'persona') {
                    teacherPersona = data;
                    return ws.send(JSON.stringify({ type: 'status', status: 'ready' }));
                }
                if (data.type === 'context') {
                    currentTopic = data.topic;
                    return ws.send(JSON.stringify({ type: 'status', status: 'ready' }));
                }

                if (data.type === 'text') {
                    const s = await getGlobalSettings();
                    if (!s.geminiApiKey) return ws.send(JSON.stringify({ type: 'error', message: 'API Key 없음' }));

                    let systemPrompt = teacherPersona?.systemPrompt || s.systemPrompt;
                    if (currentTopic) systemPrompt += `\n\n현재 대화 주제: ${currentTopic}`;

                    try {
                        const aiResponse = await callGeminiAPI(s.geminiApiKey, s.geminiModel, systemPrompt, data.text, { maxOutputTokens: 1024 });
                        ws.send(JSON.stringify({ type: 'text', text: aiResponse }));
                        ws.send(JSON.stringify({ type: 'turn_complete' }));
                    } catch (err) {
                        ws.send(JSON.stringify({ type: 'error', message: '채팅 실패' }));
                    }
                }
            } catch (e) { console.error('[WS] Error:', e); }
        });
    });
});
