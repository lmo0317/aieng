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

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 80;

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

**문장 생성 규칙 (Generate API 호출 시)**:
위 주제와 난이도에 맞는 영어 문장 10개를 생성하여 반드시 아래의 순수한 JSON 배열 형식으로만 응답하세요. 
[중요] JSON 문자열 값 내에 실제 줄바꿈(Enter)을 포함하지 마세요. 줄바꿈이 필요한 경우 반드시 \\n으로 이스케이프 처리하세요.
설명이나 다른 텍스트를 붙이지 마세요.

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

    const response = await axios.post(API_URL, requestBody, { timeout: 60000 }); // 60초로 연장
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
        },
        timeout: 60000 // 60초로 연장
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
        },
        timeout: 60000 // 60초로 연장
    });

    return response.data.choices[0].message.content;
}

// Helper function to robustly clean and parse JSON from AI response
function cleanAndParseJSON(str) {
    if (!str || typeof str !== 'string') return str;

    // 1. Markdown code block 제거
    let cleaned = str.replace(/^```(json)?/im, '').replace(/```$/m, '').trim();

    // 2. [ ] 또는 { } 사이의 내용만 추출
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

    // 3. 구조적 결함 수정 로직 추가
    // 문자열 내부의 실제 줄바꿈 및 제어 문자 처리
    cleaned = cleaned.replace(/"([^"\\]*(\\.[^"\\]*)*)"/gs, (match) => {
        return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });

    // 4. 마지막 요소 뒤의 쉼표 제거 (Trailing commas)
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parsing Error after cleaning:", e.message);
        console.log("Original content length:", str.length);
        
        // 최종 수단: 모든 제어 문자 제거 및 비정상적인 따옴표 처리 시도
        try {
            const extremeClean = cleaned
                .replace(/[\x00-\x1F]/g, ' ') // 제어 문자 제거
                .replace(/\\"/g, '[[QUOT]]') // 일단 이스케이프된 따옴표 보호
                .replace(/"([^"]*)":/g, '[[KEY]]$1[[KEY]]:') // 키 보호
                // 여기에서 값 내부의 따옴표 문제를 처리해야 하지만 복잡하므로 기본 파싱 시도
                .replace(/\[\[KEY\]\]/g, '"')
                .replace(/\[\[QUOT\]\]/g, '\\"');
                
            return JSON.parse(extremeClean);
        } catch (e2) {
            // 구조가 완전히 깨진 경우 문자열 조작으로 복구 시도 (매우 제한적)
            throw new Error(`JSON 파싱 실패: ${e.message}`);
        }
    }
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
        const sentences = cleanAndParseJSON(content);
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

// Saved Trends API (News only)
app.get('/api/trends/saved', (req, res) => {
    // sentences가 NULL이 아니고, date가 존재하며, 빈 배열('[]')이 아닌 데이터 중 type이 'news'인 것만 조회
    db.all("SELECT * FROM trends WHERE sentences IS NOT NULL AND sentences != '[]' AND date IS NOT NULL AND type = 'news' ORDER BY date DESC, category ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ trends: rows || [] });
    });
});

// Fix Category API - 카테고리 일괄 수정
app.post('/api/trends/fix-category', (req, res) => {
    const { category } = req.body;

    if (!category) {
        return res.status(400).json({ error: 'category 파라미터가 필요합니다.' });
    }

    db.run("UPDATE trends SET category = ? WHERE type = 'news'", [category], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({
            success: true,
            updated: this.changes
        });

        console.log(`✅ [API] Updated ${this.changes} trends to category: ${category}`);
    });
});

// Clear Today's Data API - 오늘 날짜의 데이터 삭제
app.post('/api/trends/clear-today', (req, res) => {
    const { date } = req.body;

    if (!date) {
        return res.status(400).json({ error: 'date 파라미터가 필요합니다.' });
    }

    db.run("DELETE FROM trends WHERE date = ? AND type = 'news'", [date], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({
            success: true,
            deleted: this.changes
        });

        console.log(`✅ [API] Deleted ${this.changes} trends from date: ${date}`);
    });
});

// Import from JSON API - JSON 파일에서 데이터베이스로 Import
app.post('/api/trends/import-json', async (req, res) => {
    const fs = require('fs');
    const path = require('path');

    const jsonPath = 'C:\\Users\\lmo03\\Downloads\\news_guide.json';

    try {
        // JSON 파일 읽기
        if (!fs.existsSync(jsonPath)) {
            return res.status(404).json({ error: 'JSON 파일을 찾을 수 없습니다.' });
        }

        const content = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(content);

        if (!data.content || !Array.isArray(data.content)) {
            return res.status(400).json({ error: 'JSON 형식이 올바르지 않습니다.' });
        }

        // 1. 오늘 날짜의 기존 뉴스 데이터 삭제
        const today = new Date().toISOString().split('T')[0];
        db.run("DELETE FROM trends WHERE date = ? AND type = 'news'", [today], function(err) {
            if (err) {
                console.error('Error deleting old data:', err.message);
                return res.status(500).json({ error: '기존 데이터 삭제 실패: ' + err.message });
            }

            console.log(`✅ [API] Deleted ${this.changes} old trends from ${today}`);

            // 2. 새로운 데이터 삽입
            let imported = 0;

            data.content.forEach((article) => {
                // Transform sentences format (Shared logic with /import)
                const sentences = (article.sentences || []).map(sentence => {
                    let vocaArray = [];
                    if (sentence.vocabulary) {
                        const pairs = sentence.vocabulary.split(/,\s*/);
                        vocaArray = pairs.map(pair => {
                            const match = pair.match(/(.+?)\s*\((.+)\)/);
                            if (match) return `${match[1].trim()}: ${match[2].trim()}`;
                            return pair.trim();
                        });
                    }

                    return {
                        en: sentence.english || sentence.en || '',
                        ko: sentence.korean || sentence.ko || '',
                        sentence_structure: sentence.analysis || sentence.sentence_structure || '',
                        explanation: sentence.explanation || '',
                        voca: vocaArray
                    };
                });

                db.run(`INSERT INTO trends (title, category, summary, keywords, sentences, difficulty, date, type, createdAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        article.news_title,
                        article.category || '전체',
                        '', // summary
                        '[]', // keywords
                        JSON.stringify(sentences),
                        'level3',
                        today,
                        'news',
                        new Date().toISOString()
                    ],
                    function(err) {
                        if (err) {
                            console.error('Error inserting trend:', err.message);
                        } else {
                            imported++;
                            console.log(`✅ [API] Imported: ${article.news_title} (category: ${article.category || '전체'})`);
                        }
                    }
                );
            });

            res.json({
                success: true,
                imported: imported,
                deleted: this.changes
            });

            console.log(`✅ [API] Import complete: ${imported} new trends imported`);
        });

    } catch (error) {
        console.error('Error importing JSON:', error);
        res.status(500).json({ error: error.message });
    }
});

// Saved Songs API
app.get('/api/songs/saved', (req, res) => {
    db.all("SELECT * FROM trends WHERE type = 'song' ORDER BY createdAt DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ songs: rows || [] });
    });
});

// Pop Song Processing API
app.post('/api/songs/fetch', async (req, res) => {
    const { title, lyrics, difficulty } = req.body;
    const s = await getGlobalSettings();

    const provider = getModelProvider(s.geminiModel);
    let apiKey;
    if (provider === 'glm') apiKey = s.glmApiKey;
    else if (provider === 'groq') apiKey = s.groqApiKey;
    else apiKey = s.geminiApiKey;

    if (!apiKey) return res.status(400).json({ error: 'API Key가 설정되지 않았습니다.' });

    try {
        // 1. 가사 전처리 및 문장 분리
        const lines = lyrics.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0 && !l.startsWith('[') && !l.endsWith(']')); // [Chorus] 등 제외

        if (lines.length === 0) throw new Error('분석할 가사 내용이 없습니다.');

        broadcastTrendsProgress('analyzing', `팝송 가사 분석 준비 중... (0/${lines.length})`, 0, lines.length);

        // 2. 가사를 15문장씩 묶어서 순차 분석 (Lite 티어 RPM 제한 최적화)
        const allAnalyzedSentences = [];
        const chunkSize = 15;
        
        for (let i = 0; i < lines.length; i += chunkSize) {
            const chunk = lines.slice(i, i + chunkSize);
            const chunkText = chunk.join('\n');
            
            const songPrompt = `당신은 영어 학습 전문가입니다. 다음 팝송 가사 구절을 정밀 분석하여 학습 콘텐츠를 만들어주세요.
곡 제목: ${title}
난이도: ${difficulty}

**분석 규칙**:
1. 제공된 모든 문장을 순서대로 빠짐없이 분석하세요.
2. 각 문장에 대해 다음 정보를 포함하여 반드시 순수한 JSON 배열 형식으로만 응답하세요:
   - "en": 원문 영어 가사 문장
   - "ko": 한국어 해석
   - "sentence_structure": 문장 구조 분석
   - "explanation": 가사 속 주요 표현 및 문법 설명
   - "voca": 핵심 단어 및 숙어 목록 ["단어: 뜻", ...]

가사 구절:
${chunkText}

[CRITICAL: Output ONLY a valid JSON array of objects. No markdown.]`;

            let retryCount = 0;
            const maxRetries = 3;
            let chunkResult = null;

            while (retryCount <= maxRetries) {
                try {
                    let content;
                    if (provider === 'glm') {
                        content = await callGLMAPI(apiKey, s.geminiModel, s.systemPrompt, songPrompt);
                    } else if (provider === 'groq') {
                        content = await callGroqAPI(apiKey, s.geminiModel, s.systemPrompt, songPrompt);
                    } else {
                        content = await callGeminiAPI(apiKey, s.geminiModel, s.systemPrompt, songPrompt);
                    }
                    chunkResult = cleanAndParseJSON(content);
                    break;
                } catch (err) {
                    retryCount++;
                    if (retryCount > maxRetries) throw err;
                    
                    const isRateLimit = err.response && err.response.status === 429;
                    // Lite 티어 고려: 429 발생 시 30초 대기
                    const waitTime = isRateLimit ? 30000 : (retryCount * 5000); 
                    
                    console.log(`Song Analysis Retry ${retryCount}/${maxRetries}. Status: ${err.response?.status}. Waiting ${waitTime}ms...`);
                    broadcastTrendsProgress('analyzing', isRateLimit ? `API 요청 한도 초과로 30초 대기 중... (${retryCount}/${maxRetries})` : `응답 지연으로 재시도 중... (${retryCount}/${maxRetries})`, i, lines.length);
                    
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }

            if (Array.isArray(chunkResult)) {
                allAnalyzedSentences.push(...chunkResult);
            }

            const currentProgress = Math.min(i + chunkSize, lines.length);
            broadcastTrendsProgress('analyzing', `가사 분석 중... (${currentProgress}/${lines.length})`, currentProgress, lines.length);
            
            // Lite 티어는 5초 대기면 충분히 안정적입니다
            if (i + chunkSize < lines.length) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        const today = new Date().toISOString().split('T')[0];

        db.run("INSERT INTO trends (title, category, summary, keywords, sentences, difficulty, date, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [title, '팝송', '팝송 가사 전체 학습', '[]', JSON.stringify(allAnalyzedSentences), difficulty, today, 'song'],
            function(err) {
                if (err) throw err;
                broadcastTrendsProgress('complete', `완료! 총 ${lines.length}개의 가사 문장 분석 성공`, lines.length, lines.length);
                res.json({ success: true, id: this.lastID, count: allAnalyzedSentences.length });
            }
        );
    } catch (error) {
        console.error('Song Processing Error:', error.message);
        broadcastTrendsProgress('error', `오류: ${error.message}`, 0, 0);
        res.status(500).json({ error: '팝송 분석 중 오류가 발생했습니다.' });
    }
});

// Get trend by ID API (Preferred over title match)
app.get('/api/trends/by-id/:id', (req, res) => {
    const { id } = req.params;
    console.log('🔍 [API] Fetching trend by ID:', id);

    db.get("SELECT * FROM trends WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error('❌ [API] Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            console.warn('❌ [API] Trend not found for ID:', id);
            return res.status(404).json({ error: 'Trend not found' });
        }
        console.log('✅ [API] Found trend by ID:', row.title);
        res.json({ trend: row });
    });
});

// Get trend by title API (Legacy/Fallback)
app.get('/api/trends/by-title', (req, res) => {
    let { title } = req.query;
    
    // Windows 환경에서 인코딩 불일치 방지를 위해 UTF-8 Buffer로 재변환 고려
    // 하지만 express.json() 환경에서는 보통 정상. 로그를 통해 실제 들어온 값 확인
    console.log('🔍 [API] Fetching trend by title:', title, `(Length: ${title ? title.length : 0})`);

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    // DB 조회 시 제목 문자열을 유연하게 검색 (공백 등 미세 차이 무시)
    db.get("SELECT * FROM trends WHERE title LIKE ? ORDER BY id DESC LIMIT 1", [`%${title}%`], (err, row) => {
        if (err) {
            console.error('❌ [API] Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        if (!row) {
            console.warn('❌ [API] Trend not found for title:', title);
            // 만약 못 찾았다면, 공백이나 특수문자 문제일 수 있으므로 유사 검색 시도 (선택 사항)
            return res.status(404).json({ error: 'Trend not found' });
        }
        
        console.log('✅ [API] Found trend:', row.title, `(ID: ${row.id})`);
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
            timeout: 10000 // 10초로 단축
        });

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        const results = await Promise.allSettled(
            categories.map(cat => axios.get(cat.url, {
                timeout: 8000, // 개별 요청 8초
                headers: headers,
                httpsAgent: httpsAgent
            }))
        );
        
        let allTrends = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const xml = result.value.data;
                const matches = xml.match(/<title>(.*?)<\/title>/g) || [];
                // 첫 번째 <title>은 채널 제목이므로 제외 (slice(1))
                matches.slice(1, 8).forEach(m => {
                    let title = m.replace(/<title>(.*?)<\/title>/, '$1').split(' - ')[0];
                    title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                    const cleanTitle = title.trim();
                    if (cleanTitle.length > 10) {
                        allTrends.push({ category: categories[index].label, title: cleanTitle });
                    }
                });
            } else {
                console.warn(`RSS fetch failed for ${categories[index].label}:`, result.reason.message);
            }
        });

        if (allTrends.length === 0) {
            broadcastTrendsProgress('error', '뉴스를 수집하지 못했습니다. 다시 시도해 주세요.', 0, 0);
            return res.status(500).json({ error: '트렌드를 가져오지 못했습니다.' });
        }

        // 중복 제거 및 셔플 후 상위 10개 선택
        const uniqueTrends = Array.from(new Set(allTrends.map(t => t.title)))
            .map(title => allTrends.find(t => t.title === title))
            .sort(() => Math.random() - 0.5)
            .slice(0, 10);

        broadcastTrendsProgress('analyzing', `뉴스 요약 분석 중... (0/${uniqueTrends.length})`, 0, uniqueTrends.length);

        // 2. AI로 트렌드 분석 (1개씩 순차적으로 처리하여 503 에러 방지)
        let analyzedTrends = [];
        for (let i = 0; i < uniqueTrends.length; i++) {
            const trend = uniqueTrends[i];
            const analysisPrompt = `당신은 뉴스 트렌드 분석 전문가입니다. 다음 뉴스 트렌드를 분석하여 요약과 핵심 키워드를 추출하세요. 반드시 아래 JSON 형식으로만 응답하세요:
{
  "title": "${trend.title}",
  "summary": "요약 내용",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`;

            let retryCount = 0;
            const maxRetries = 3; // 재시도 횟수 증가
            let trendAnalyzed = null;

            while (retryCount <= maxRetries) {
                try {
                    let aiContent;
                    const promptInput = `${trend.category}: ${trend.title}`;
                    if (provider === 'glm') {
                        aiContent = await callGLMAPI(apiKey, s.geminiModel, analysisPrompt, promptInput, { temperature: 0.7 });
                    } else if (provider === 'groq') {
                        aiContent = await callGroqAPI(apiKey, s.geminiModel, analysisPrompt, promptInput, { temperature: 0.7 });
                    } else {
                        aiContent = await callGeminiAPI(apiKey, s.geminiModel, analysisPrompt, promptInput, { temperature: 0.7 });
                    }
                    trendAnalyzed = cleanAndParseJSON(aiContent);
                    break;
                } catch (err) {
                    retryCount++;
                    if (retryCount > maxRetries) throw err;
                    
                    const waitTime = retryCount * 4000; // 4초, 8초, 12초로 점진적 증가
                    console.log(`Analysis Retry ${retryCount}/${maxRetries} for trend ${i}. Waiting ${waitTime}ms...`);
                    broadcastTrendsProgress('analyzing', `서버 응답 지연으로 재시도 중... (${retryCount}/${maxRetries})`, i, uniqueTrends.length);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
            
            analyzedTrends.push(trendAnalyzed || { title: trend.title, summary: '', keywords: [] });
            broadcastTrendsProgress('analyzing', `뉴스 요약 분석 중... (${i + 1}/${uniqueTrends.length})`, i + 1, uniqueTrends.length);
            
            // 분석 요청 사이 1.5초 대기
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        broadcastTrendsProgress('generating', `학습 콘텐츠 생성 중... (0/${uniqueTrends.length})`, 0, uniqueTrends.length);

        // 3. 각 트렌드에 대해 영어 학습 문장 생성 (순차 처리)
        const trendsWithSentences = [];
        let successCount = 0;
        for (let i = 0; i < uniqueTrends.length; i++) {
            const trend = uniqueTrends[i];
            try {
                const userPrompt = `주제: ${trend.title}\n난이도: level3\n\n[CRITICAL: Output ONLY a valid JSON array of exactly 10 objects. No markdown code blocks.]`;
                
                let content;
                let retryCount = 0;
                const maxRetries = 3;
                
                while (retryCount <= maxRetries) {
                    try {
                        if (provider === 'glm') {
                            content = await callGLMAPI(apiKey, s.geminiModel, s.systemPrompt, userPrompt);
                        } else if (provider === 'groq') {
                            content = await callGroqAPI(apiKey, s.geminiModel, s.systemPrompt, userPrompt);
                        } else {
                            content = await callGeminiAPI(apiKey, s.geminiModel, s.systemPrompt, userPrompt);
                        }
                        break;
                    } catch (apiError) {
                        retryCount++;
                        if (retryCount > maxRetries) throw apiError;
                        
                        const waitTime = retryCount * 5000; // 5초, 10초, 15초 대기
                        console.log(`API Retry ${retryCount}/${maxRetries} for content ${i}. Waiting ${waitTime}ms...`);
                        broadcastTrendsProgress('generating', `응답 대기 중... (${retryCount}/${maxRetries})`, i, uniqueTrends.length);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }

                const sentences = cleanAndParseJSON(content);
                successCount++;
                broadcastTrendsProgress('generating', `학습 콘텐츠 생성 중... (${i + 1}/${uniqueTrends.length})`, i + 1, uniqueTrends.length);
                
                trendsWithSentences.push({ ...trend, analyzed: analyzedTrends[i] || {}, sentences });
                
                // 생성 요청 사이 2.5초 대기 (가장 부하가 큰 작업)
                await new Promise(resolve => setTimeout(resolve, 2500));
            } catch (e) {
                console.error(`Error for trend ${i}:`, e.message);
                trendsWithSentences.push({ ...trend, analyzed: analyzedTrends[i] || {}, sentences: [] });
                broadcastTrendsProgress('generating', `일부 생성 실패 (${i + 1}/${uniqueTrends.length})`, i + 1, uniqueTrends.length);
            }
        }

        // 4. 데이터베이스 저장
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식

        db.serialize(() => {
            // 당일 트렌드 정보 삭제 (덮어씌우기)
            db.run("DELETE FROM trends WHERE date = ?", [today]);
            
            const stmt = db.prepare("INSERT INTO trends (title, category, summary, keywords, sentences, difficulty, date) VALUES (?, ?, ?, ?, ?, ?, ?)");
            trendsWithSentences.forEach(t => {
                const keywords = t.analyzed?.keywords ? JSON.stringify(t.analyzed.keywords) : '[]';
                const sentences = t.sentences?.length > 0 ? JSON.stringify(t.sentences) : null;
                stmt.run(t.title, t.category, t.analyzed?.summary || '', keywords, sentences, 'level3', today);
            });
            stmt.finalize();
        });

        broadcastTrendsProgress('complete', `완료! 총 ${uniqueTrends.length}개 중 ${successCount}개 성공`, successCount, uniqueTrends.length);
        res.json({ trends: trendsWithSentences });

    } catch (error) {
        console.error('Trends fetch error:', error.message);
        broadcastTrendsProgress('error', `오류: ${error.message}`, 0, 0);
        res.status(500).json({ error: `실패: ${error.message}` });
    }
});

// Delete Trend or Song API
app.delete('/api/trends/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM trends WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Save Pre-Analyzed Trends API (for Claude Code CLI)
app.post('/api/trends/save', async (req, res) => {
    try {
        const { trends } = req.body;

        if (!Array.isArray(trends) || trends.length === 0) {
            return res.status(400).json({ error: '트렌드 배열이 필요합니다.' });
        }

        const today = new Date().toISOString().split('T')[0];

        db.serialize(() => {
            // 제목과 날짜가 겹치면 무시하거나 덮어쓰도록 처리 (중복 방지)
            const stmt = db.prepare("INSERT OR REPLACE INTO trends (title, category, summary, keywords, sentences, difficulty, date, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            trends.forEach(t => {
                const keywords = t.keywords ? JSON.stringify(t.keywords) : '[]';
                const sentences = typeof t.sentences === 'object' ? JSON.stringify(t.sentences) : t.sentences;
                const cleanTitle = String(t.title || '').trim();
                
                stmt.run(cleanTitle, t.category, t.summary || '', keywords, sentences, t.difficulty || 'level3', today, 'news');
            });
            stmt.finalize();

            res.json({ success: true, count: trends.length });
        });
    } catch (error) {
        console.error('Trends save error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Save Pre-Analyzed Song API (for Claude Code CLI)
app.post('/api/songs/save', async (req, res) => {
    try {
        const { title, lyrics, difficulty, sentences, image } = req.body;

        if (!title || !lyrics) {
            return res.status(400).json({ error: '제목과 가사가 필요합니다.' });
        }

        const today = new Date().toISOString().split('T')[0];
        const sentencesJson = sentences && sentences.length > 0 ? JSON.stringify(sentences) : null;

        db.run(
            "INSERT INTO trends (title, category, summary, keywords, sentences, difficulty, date, type, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [title, '팝송', '팝송 가사 전체 학습', '[]', sentencesJson, difficulty || 'level3', today, 'song', image || null],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, id: this.lastID });
            }
        );
    } catch (error) {
        console.error('Song save error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Import JSON News Guide API
app.post('/api/trends/import', async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title || !Array.isArray(content) || content.length === 0) {
            return res.status(400).json({ error: 'title과 content 배열이 필요합니다.' });
        }

        const today = new Date().toISOString().split('T')[0];
        let successCount = 0;
        const errors = [];

        db.serialize(() => {
            // 당일 뉴스 트렌드 삭제 (덮어씌우기)
            db.run("DELETE FROM trends WHERE date = ? AND (type IS NULL OR type = 'news')", [today], (err) => {
                if (err) {
                    console.error('Error deleting existing trends:', err.message);
                    errors.push({ message: '기존 데이터 삭제 실패', error: err.message });
                }
            });

            // Process each content item
            content.forEach((item, index) => {
                if (!item.news_title || !Array.isArray(item.sentences)) {
                    errors.push({ index, message: 'news_title 또는 sentences 배열 누락' });
                    return;
                }

                // Transform sentences format
                const transformedSentences = item.sentences.map(sentence => {
                    // Transform vocabulary string to array format
                    let vocaArray = [];
                    if (sentence.vocabulary) {
                        // Parse vocabulary string like "word1 (meaning1), word2 (meaning2)"
                        const pairs = sentence.vocabulary.split(/,\s*/);
                        vocaArray = pairs.map(pair => {
                            // Match "word (meaning)" pattern
                            const match = pair.match(/(.+?)\s*\((.+)\)/);
                            if (match) {
                                return `${match[1].trim()}: ${match[2].trim()}`;
                            }
                            // If no parentheses, return as is
                            return pair.trim();
                        });
                    }

                    return {
                        en: sentence.english || '',
                        ko: sentence.korean || '',
                        sentence_structure: sentence.analysis || '',
                        explanation: sentence.explanation || '',
                        voca: vocaArray
                    };
                });

                const stmt = db.prepare(
                    "INSERT INTO trends (title, category, summary, keywords, sentences, difficulty, date, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                );

                stmt.run(
                    item.news_title,
                    item.category || '전체',
                    `${title} - ${item.news_title}`,
                    '[]',
                    JSON.stringify(transformedSentences),
                    'level3',
                    today,
                    'news',
                    function(err) {
                        if (err) {
                            errors.push({ index: index + 1, title: item.news_title, error: err.message });
                        } else {
                            successCount++;
                            console.log(`✅ [API] Imported: ${item.news_title} (category: ${item.category || '전체'})`);
                        }

                        if (index === content.length - 1) {
                            stmt.finalize();
                            res.json({
                                success: true,
                                total: content.length,
                                imported: successCount,
                                errors: errors.length > 0 ? errors : null
                            });
                        }
                    }
                );
            });
        });
    } catch (error) {
        console.error('Import error:', error.message);
        res.status(500).json({ error: error.message });
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
        let teacherPersona = null; // 선생님 페르소나 저장

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                console.log('[WS] Received:', data.type);

                if (data.type === 'persona') {
                    // 선생님 페르소나 저장
                    teacherPersona = {
                        teacher: data.teacher,
                        systemPrompt: data.systemPrompt
                    };
                    console.log('[WS] Teacher persona set:', data.teacher);
                    ws.send(JSON.stringify({ type: 'status', status: 'ready' }));
                    return;
                }

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

                    // 선생님 페르소나가 있으면 해당 시스템 프롬프트 사용, 없으면 기본값
                    let systemPrompt;
                    if (teacherPersona && teacherPersona.systemPrompt) {
                        let contextInfo = '';

                        // 원어민 선생님일 경우 학습 컨텍스트를 영어로 변환
                        if (teacherPersona.teacher === 'native' && learningContext) {
                            contextInfo = `\n\n## Current Learning Topic:\n\n${currentTopic || 'General English Practice'}\n`;
                            contextInfo += `Focus on conversational English and practical expressions related to this topic.\n`;
                            contextInfo += `Help the student practice natural English expressions that native speakers use.\n`;
                        } else if (learningContext) {
                            contextInfo = learningContext;
                        }

                        systemPrompt = `${teacherPersona.systemPrompt}${contextInfo}

${currentTopic && teacherPersona.teacher === 'korean' ? `## 현재 학습 주제: ${currentTopic}` : ''}`;
                        console.log('[WS] Using teacher persona:', teacherPersona.teacher);
                    } else {
                        systemPrompt = `당신은 'Trend Eng'의 한국어 AI 튜터입니다. 사용자와 한국어로 대화하며 영어 학습을 도와주세요.${learningContext || ''}

## 대화 원칙:
1. **한국어로만 대화하세요** (영어로 답변하지 마세요)
2. 사용자의 질문에 친절하고 자연스럽게 답변하세요
3. 학습 문장이 있다면 그 내용을 바탕으로 설명해주세요
4. 사고 과정(Thinking..., 분석 중 등)을 절대 출력하지 마세요
5. 2~3문장으로 간결하고 명확하게 답변하세요

${currentTopic ? `현재 학습 주제: ${currentTopic}` : ''}`;
                    }

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
