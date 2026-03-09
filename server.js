const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const https = require('https');
const db = require('./database');
const {
    handleChatRequest,
    handleClearSession,
    handleGetHistory
} = require('./chat-api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 80;

// SSE 클라이언트 저장
const trendsClients = new Map();

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
        db.get("SELECT geminiApiKey, glmApiKey, groqApiKey, geminiModel, chatModel, systemPrompt FROM global_settings WHERE id = 1", (err, row) => {
            if (err) reject(err);
            else resolve({
                geminiApiKey: row?.geminiApiKey || process.env.GEMINI_API_KEY,
                glmApiKey: row?.glmApiKey || process.env.GLM_API_KEY,
                groqApiKey: row?.groqApiKey || process.env.GROQ_API_KEY,
                geminiModel: row?.geminiModel || 'gemini-2.5-flash',
                chatModel: row?.chatModel || 'gemini-2.5-flash-native-audio-latest',
                systemPrompt: row?.systemPrompt || DEFAULT_PROMPT
            });
        });
    });
}

// Helper function to detect model provider
function getModelProvider(model) {
    if (model.startsWith('glm-')) return 'glm';
    if (model.startsWith('llama-') || 
        model.startsWith('mixtral-') || 
        model.startsWith('gemma') ||
        model.startsWith('openai/') ||
        model.startsWith('moonshotai/') ||
        model.startsWith('qwen/')
    ) return 'groq';
    return 'gemini';
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

    const response = await axios.post(API_URL, requestBody);
    return response.data.candidates[0].content.parts[0].text;
}

// Helper function to call GLM API
async function callGLMAPI(apiKey, model, systemPrompt, userPrompt, config = {}) {
    const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const requestBody = {
        model: model,
        messages: messages,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxOutputTokens || 8192
    };

    const response = await axios.post(API_URL, requestBody, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.choices[0].message.content;
}

// Helper function to call Groq API
async function callGroqAPI(apiKey, model, systemPrompt, userPrompt, config = {}) {
    const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const requestBody = {
        model: model,
        messages: messages,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxOutputTokens || 8192
    };

    const response = await axios.post(API_URL, requestBody, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.choices[0].message.content;
}

// Global Settings API endpoints
app.get('/api/settings', async (req, res) => {
    try {
        const row = await getGlobalSettings();
        res.json({
            provider: 'gemini',
            hasApiKey: !!row.geminiApiKey,
            apiKeyPreview: row.geminiApiKey ? row.geminiApiKey.substring(0, 10) + '...' : null,
            hasGLMApiKey: !!row.glmApiKey,
            glmApiKeyPreview: row.glmApiKey ? row.glmApiKey.substring(0, 10) + '...' : null,
            hasGroqApiKey: !!row.groqApiKey,
            groqApiKeyPreview: row.groqApiKey ? row.groqApiKey.substring(0, 10) + '...' : null,
            model: row.geminiModel,
            chatModel: row.chatModel,
            systemPrompt: row.systemPrompt
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    const { geminiApiKey, glmApiKey, groqApiKey, geminiModel, chatModel, systemPrompt } = req.body;
    const updates = [];
    const values = [];

    if (geminiApiKey !== undefined) {
        updates.push('geminiApiKey = ?');
        values.push(geminiApiKey ? geminiApiKey.trim() : null);
    }
    if (glmApiKey !== undefined) {
        updates.push('glmApiKey = ?');
        values.push(glmApiKey ? glmApiKey.trim() : null);
    }
    if (groqApiKey !== undefined) {
        updates.push('groqApiKey = ?');
        values.push(groqApiKey ? groqApiKey.trim() : null);
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
        app.locals.glmApiKey = s.glmApiKey;
        app.locals.groqApiKey = s.groqApiKey;
        app.locals.geminiModel = s.geminiModel;
        app.locals.chatModel = s.chatModel;
        res.json({ success: true, message: '설정이 저장되었습니다.' });
    });
});

app.delete('/api/settings', (req, res) => {
    db.run(`UPDATE global_settings SET geminiApiKey = NULL WHERE id = 1`, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Gemini API Key가 삭제되었습니다.' });
    });
});

app.delete('/api/settings/glm', (req, res) => {
    db.run(`UPDATE global_settings SET glmApiKey = NULL WHERE id = 1`, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'GLM API Key가 삭제되었습니다.' });
    });
});

app.delete('/api/settings/groq', (req, res) => {
    db.run(`UPDATE global_settings SET groqApiKey = NULL WHERE id = 1`, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Groq API Key가 삭제되었습니다.' });
    });
});

// Generate API
app.post('/api/generate', async (req, res) => {
    const { topic, difficulty } = req.body;
    const s = await getGlobalSettings();

    const provider = getModelProvider(s.geminiModel);
    let apiKey;
    if (provider === 'glm') {
        apiKey = s.glmApiKey;
    } else if (provider === 'groq') {
        apiKey = s.groqApiKey;
    } else {
        apiKey = s.geminiApiKey;
    }

    if (!apiKey) {
        return res.status(400).json({
            error: provider === 'glm'
                ? 'GLM API Key가 설정되지 않았습니다.'
                : provider === 'groq'
                ? 'Groq API Key가 설정되지 않았습니다.'
                : 'Gemini API Key가 설정되지 않았습니다.'
        });
    }

    try {
        const userPrompt = `주제: ${topic}\n난이도: ${difficulty}\n\n[CRITICAL: Output ONLY a valid JSON array of exactly 10 objects matching the required schema. Do NOT wrap the JSON in markdown code blocks. No other text.]`;

        let content;
        if (provider === 'glm') {
            content = await callGLMAPI(apiKey, s.geminiModel, s.systemPrompt, userPrompt, {
                temperature: 0.7,
                maxOutputTokens: 8192
            });
        } else if (provider === 'groq') {
            content = await callGroqAPI(apiKey, s.geminiModel, s.systemPrompt, userPrompt, {
                temperature: 0.7,
                maxOutputTokens: 8192
            });
        } else {
            content = await callGeminiAPI(apiKey, s.geminiModel, s.systemPrompt, userPrompt, {
                temperature: 0.7,
                maxOutputTokens: 8192
            });
        }

        // Clean and parse JSON response
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

// Paragraph Analysis API
app.post('/api/analyze-paragraph', async (req, res) => {
    const { paragraph, difficulty } = req.body;
    const s = await getGlobalSettings();

    const provider = getModelProvider(s.geminiModel);
    let apiKey;
    if (provider === 'glm') {
        apiKey = s.glmApiKey;
    } else if (provider === 'groq') {
        apiKey = s.groqApiKey;
    } else {
        apiKey = s.geminiApiKey;
    }

    if (!apiKey) {
        return res.status(400).json({
            error: provider === 'glm'
                ? 'GLM API Key가 설정되지 않았습니다.'
                : provider === 'groq'
                ? 'Groq API Key가 설정되지 않았습니다.'
                : 'Gemini API Key가 설정되지 않았습니다.'
        });
    }

    try {
        // 일괄 분석을 위한 통합 프롬프트
        const batchPrompt = `다음 영어 문단을 문장 단위로 정밀 분석해주세요. 
난이도 설정: ${difficulty}

각 문장에 대해 다음 정보를 포함하여 반드시 순수한 JSON 배열 형식으로만 응답하세요 (설명이나 마크다운 코드 블록 제외):
1. "en": 원문 영어 문장
2. "ko": 한국어 해석
3. "sentence_structure": 문장 구조 분석 (주어, 동사, 목적어, 수식어 등)
4. "explanation": 해당 문장의 핵심 문법 포인트 및 학습 팁
5. "voca": 핵심 단어 및 숙어 목록 ["단어: 뜻", ...]

문단 내용:
${paragraph}

[CRITICAL: Output ONLY a valid JSON array of objects. Do NOT wrap the JSON in markdown code blocks. No other text.]`;

        let content;
        if (provider === 'glm') {
            content = await callGLMAPI(apiKey, s.geminiModel, s.systemPrompt, batchPrompt, {
                temperature: 0.5,
                maxOutputTokens: 8192
            });
        } else if (provider === 'groq') {
            content = await callGroqAPI(apiKey, s.geminiModel, s.systemPrompt, batchPrompt, {
                temperature: 0.5,
                maxOutputTokens: 8192
            });
        } else {
            content = await callGeminiAPI(apiKey, s.geminiModel, s.systemPrompt, batchPrompt, {
                temperature: 0.5,
                maxOutputTokens: 8192
            });
        }

        // JSON 응답 정제 및 파싱
        content = content.replace(/^```(json)?/im, '').replace(/```$/m, '').trim();
        const firstBracket = content.indexOf('[');
        const lastBracket = content.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            content = content.substring(firstBracket, lastBracket + 1);
        }

        const analyzedSentences = JSON.parse(content);

        // DB에 저장
        db.run("INSERT INTO learning_history (topic, difficulty, sentences) VALUES (?, ?, ?)",
            [`문단 분석: ${paragraph.substring(0, 50)}...`, difficulty, JSON.stringify(analyzedSentences)]);

        res.json({ sentences: analyzedSentences });
    } catch (error) {
        console.error('Batch Paragraph Analysis Error:', error.message);
        if (error.response) console.error('API Error Details:', error.response.data);
        res.status(500).json({ error: '문단 분석 중 오류가 발생했습니다. (Batch processing failed)' });
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
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);

    const clientId = Date.now() + Math.random();
    trendsClients.set(clientId, res);

    // 진행 상황 전송 헬퍼 함수
    const sendProgress = (status, message, current, total) => {
        if (trendsClients.has(clientId)) {
            res.write(`data: ${JSON.stringify({ status, message, current, total })}\n\n`);
        }
    };

    req.on('close', () => {
        trendsClients.delete(clientId);
    });
});

// Helper function to send progress to all connected clients
function broadcastTrendsProgress(status, message, current, total) {
    trendsClients.forEach((res) => {
        try {
            res.write(`data: ${JSON.stringify({ status, message, current, total })}\n\n`);
        } catch (err) {
            console.error('Error sending SSE:', err);
        }
    });
}

// Saved Trends API
app.get('/api/trends/saved', (req, res) => {
    // sentences가 NULL이 아니고 빈 배열('[]')이 아닌 데이터만 조회
    db.all("SELECT * FROM trends WHERE sentences IS NOT NULL AND sentences != '[]' ORDER BY createdAt DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ trends: rows || [] });
    });
});

// Get trend by title API
app.get('/api/trends/by-title', (req, res) => {
    const { title } = req.query;
    console.log('🔍 [API] Fetching trend by title:', title);

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    db.get("SELECT * FROM trends WHERE title = ? ORDER BY createdAt DESC LIMIT 1", [title], (err, row) => {
        if (err) {
            console.error('❌ [API] Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            console.log('❌ [API] Trend not found for title:', title);
            return res.status(404).json({ error: 'Trend not found' });
        }
        console.log('✅ [API] Found trend:', row.title, 'with sentences:', row.sentences ? 'Yes' : 'No');
        res.json({ trend: row });
    });
});

// Fetch and Analyze Trends API
app.post('/api/trends/fetch', async (req, res) => {
    const s = await getGlobalSettings();
    
    const provider = getModelProvider(s.geminiModel);
    let apiKey;
    if (provider === 'glm') {
        apiKey = s.glmApiKey;
    } else if (provider === 'groq') {
        apiKey = s.groqApiKey;
    } else {
        apiKey = s.geminiApiKey;
    }

    if (!apiKey) {
        return res.status(400).json({
            error: provider === 'glm'
                ? 'GLM API Key가 설정되지 않았습니다.'
                : provider === 'groq'
                ? 'Groq API Key가 설정되지 않았습니다.'
                : 'Gemini API Key가 설정되지 않았습니다.'
        });
    }

    const categories = [
        { name: 'TOP', label: '전체', url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'TEC', label: '테크', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'SPO', label: '스포츠', url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'ENT', label: '연애', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'POL', label: '정치', url: 'https://news.google.com/rss/headlines/section/topic/POLITICS?hl=ko&gl=KR&ceid=KR:ko' }
    ];

    try {
        // 1. RSS에서 트렌드 수집
        broadcastTrendsProgress('fetching', '뉴스 트렌드 수집 중...', 0, 0);

        const httpsAgent = new https.Agent({
            rejectUnauthorized: true,
            keepAlive: true,
            timeout: 30000
        });

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        const results = await Promise.allSettled(
            categories.map(cat => axios.get(cat.url, {
                timeout: 15000,
                headers: headers,
                httpsAgent: httpsAgent
            }))
        );
        let allTrends = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const xml = result.value.data;
                const matches = xml.match(/<title>(.*?)<\/title>/g) || [];
                matches.slice(1, 6).forEach(m => {
                    let title = m.replace(/<title>(.*?)<\/title>/, '$1').split(' - ')[0];
                    title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                    const cleanTitle = title.trim();
                    if (cleanTitle.length > 10) {
                        allTrends.push({ category: categories[index].label, title: cleanTitle });
                    }
                });
            }
        });

        if (allTrends.length === 0) {
            broadcastTrendsProgress('error', '트렌드를 가져오지 못했습니다.', 0, 0);
            return res.status(500).json({ error: '트렌드를 가져오지 못했습니다.' });
        }

        // 중복 제거 및 셔플 후 상위 10개 선택
        const uniqueTrends = Array.from(new Set(allTrends.map(t => t.title)))
            .map(title => allTrends.find(t => t.title === title))
            .sort(() => Math.random() - 0.5)
            .slice(0, 10);

        broadcastTrendsProgress('analyzing', `AI 분석 중... (0/${uniqueTrends.length})`, 0, uniqueTrends.length);

        // 2. AI로 트렌드 분석 (일괄 처리)
        const trendsForAI = uniqueTrends.map(t => `${t.category}: ${t.title}`).join('\n');

        const analysisPrompt = `당신은 뉴스 트렌드 분석 전문가입니다. 다음 10개의 뉴스 트렌드를 분석하여 각각에 대한 요약과 핵심 키워드를 추출하세요. 반드시 아래 JSON 배열 형식으로만 응답하세요:
[
  {
    "title": "뉴스 제목",
    "summary": "요약 내용",
    "keywords": ["키워드1", "키워드2", "키워드3"]
  }
]`;

        let aiContent;
        if (provider === 'glm') {
            aiContent = await callGLMAPI(apiKey, s.geminiModel, analysisPrompt, trendsForAI, { temperature: 0.7 });
        } else if (provider === 'groq') {
            aiContent = await callGroqAPI(apiKey, s.geminiModel, analysisPrompt, trendsForAI, { temperature: 0.7 });
        } else {
            aiContent = await callGeminiAPI(apiKey, s.geminiModel, analysisPrompt, trendsForAI, { temperature: 0.7 });
        }

        aiContent = aiContent.replace(/^```(json)?/im, '').replace(/```$/m, '').trim();
        const firstBracket = aiContent.indexOf('[');
        if (firstBracket !== -1) aiContent = aiContent.substring(firstBracket);
        const analyzedTrends = JSON.parse(aiContent);

        broadcastTrendsProgress('generating', `학습 콘텐츠 생성 중... (0/${uniqueTrends.length})`, 0, uniqueTrends.length);

        // 3. 각 트렌드에 대해 영어 학습 문장 생성
        const trendsWithSentences = await Promise.all(uniqueTrends.map(async (trend, index) => {
            try {
                const userPrompt = `주제: ${trend.title}\n난이도: level3\n\n[CRITICAL: Output ONLY a valid JSON array of exactly 10 objects. No markdown code blocks.]`;
                
                let content;
                if (provider === 'glm') {
                    content = await callGLMAPI(apiKey, s.geminiModel, s.systemPrompt, userPrompt);
                } else if (provider === 'groq') {
                    content = await callGroqAPI(apiKey, s.geminiModel, s.systemPrompt, userPrompt);
                } else {
                    content = await callGeminiAPI(apiKey, s.geminiModel, s.systemPrompt, userPrompt);
                }

                content = content.replace(/^```(json)?/im, '').replace(/```$/m, '').trim();
                const firstBrk = content.indexOf('[');
                if (firstBrk !== -1) content = content.substring(firstBrk);
                const sentences = JSON.parse(content);

                broadcastTrendsProgress('generating', `학습 콘텐츠 생성 중... (${index + 1}/${uniqueTrends.length})`, index + 1, uniqueTrends.length);

                return { ...trend, analyzed: analyzedTrends[index] || {}, sentences };
            } catch (e) {
                console.error(`Error for trend ${index}:`, e.message);
                return { ...trend, analyzed: analyzedTrends[index] || {}, sentences: [] };
            }
        }));

        // 4. 데이터베이스 저장
        db.serialize(() => {
            db.run("DELETE FROM trends");
            const stmt = db.prepare("INSERT INTO trends (title, category, summary, keywords, sentences, difficulty) VALUES (?, ?, ?, ?, ?, ?)");
            trendsWithSentences.forEach(t => {
                const keywords = t.analyzed?.keywords ? JSON.stringify(t.analyzed.keywords) : '[]';
                const sentences = t.sentences?.length > 0 ? JSON.stringify(t.sentences) : null;
                stmt.run(t.title, t.category, t.analyzed?.summary || '', keywords, sentences, 'level3');
            });
            stmt.finalize();
        });

        broadcastTrendsProgress('complete', '완료!', uniqueTrends.length, uniqueTrends.length);
        res.json({ trends: trendsWithSentences });

    } catch (error) {
        console.error('Trends fetch error:', error.message);
        broadcastTrendsProgress('error', `오류: ${error.message}`, 0, 0);
        res.status(500).json({ error: `실패: ${error.message}` });
    }
});

// Chat API endpoint using REST
app.post('/api/chat', async (req, res) => {
    try {
        const { message, topic } = req.body;
        const s = await getGlobalSettings();

        if (!s.geminiApiKey) {
            return res.status(400).json({ error: 'API Key가 설정되지 않았습니다.' });
        }

        // 주제에 해당하는 학습 데이터 조회
        let learningContext = '';
        if (topic) {
            const dbGet = () => new Promise((resolve, reject) => {
                db.get("SELECT * FROM trends WHERE title = ? LIMIT 1", [topic], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            try {
                const trend = await dbGet();
                if (trend && trend.sentences) {
                    const sentences = JSON.parse(trend.sentences);
                    if (sentences && sentences.length > 0) {
                        // 학습 데이터를 컨텍스트에 추가
                        learningContext = `\n\n## 현재 학습 중인 주제: ${trend.title}\n\n`;
                        learningContext += `카테고리: ${trend.category}\n`;
                        learningContext += `요약: ${trend.summary || ''}\n\n`;
                        learningContext += `## 학습 문장 (사용자가 이 문장들을 학습했습니다):\n\n`;

                        sentences.slice(0, 5).forEach((sent, idx) => {
                            learningContext += `${idx + 1}. ${sent.en}\n   ${sent.ko}\n`;
                            if (sent.voca) {
                                learningContext += `   단어: ${sent.voca.join(', ')}\n`;
                            }
                            learningContext += '\n';
                        });

                        learningContext += `\n위 학습 문장들에 대해 질문하면 자세히 설명해주세요.`;
                    }
                }
            } catch (err) {
                console.error('Error fetching learning data:', err);
            }
        }

        const systemPrompt = `당신은 'Trend Eng'의 한국어 AI 튜터입니다. 사용자와 한국어로 대화하며 영어 학습을 도와주세요.${learningContext || ''}

## 대화 원칙:
1. **한국어로만 대화하세요** (영어로 답변하지 마세요)
2. 사용자의 질문에 친절하고 자연스럽게 답변하세요
3. 학습 문장이 있다면 그 내용을 바탕으로 설명해주세요
4. 사고 과정(Thinking..., 분석 중 등)을 절대 출력하지 마세요
5. 2~3문장으로 간결하고 명확하게 답변하세요

${topic ? `현재 학습 주제: ${topic}` : ''}

## 답변 형식:
- 한국어로만 답변
- 필요시 학습 문장의 뜻이나 단어 설명
- 친근하고 격려하는 말투`;

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

                    // 주제에 해당하는 학습 데이터 조회
                    let learningContext = '';
                    if (currentTopic) {
                        const dbGet = () => new Promise((resolve, reject) => {
                            db.get("SELECT * FROM trends WHERE title = ? LIMIT 1", [currentTopic], (err, row) => {
                                if (err) reject(err);
                                else resolve(row);
                            });
                        });

                        try {
                            const trend = await dbGet();
                            if (trend && trend.sentences) {
                                const sentences = JSON.parse(trend.sentences);
                                if (sentences && sentences.length > 0) {
                                    // 학습 데이터를 컨텍스트에 추가
                                    learningContext = `\n\n## 현재 학습 중인 주제: ${trend.title}\n\n`;
                                    learningContext += `카테고리: ${trend.category}\n`;
                                    learningContext += `요약: ${trend.summary || ''}\n\n`;
                                    learningContext += `## 학습 문장:\n\n`;

                                    sentences.slice(0, 5).forEach((sent, idx) => {
                                        learningContext += `${idx + 1}. ${sent.en}\n   ${sent.ko}\n\n`;
                                    });

                                    learningContext += `\n위 학습 문장들에 대해 질문하면 자세히 설명해주세요.`;
                                }
                            }
                        } catch (err) {
                            console.error('Error fetching learning data:', err);
                        }
                    }

                    const systemPrompt = `당신은 'Trend Eng'의 한국어 AI 튜터입니다. 사용자와 한국어로 대화하며 영어 학습을 도와주세요.${learningContext || ''}

## 대화 원칙:
1. **한국어로만 대화하세요** (영어로 답변하지 마세요)
2. 사용자의 질문에 친절하고 자연스럽게 답변하세요
3. 학습 문장이 있다면 그 내용을 바탕으로 설명해주세요
4. 사고 과정(Thinking..., 분석 중 등)을 절대 출력하지 마세요
5. 2~3문장으로 간결하고 명확하게 답변하세요

${currentTopic ? `현재 학습 주제: ${currentTopic}` : ''}`;

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
