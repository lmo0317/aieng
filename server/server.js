const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
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

// 페이지 라우트 (URL 기반 네비게이션)
const pub = p => path.join(__dirname, '..', 'public', p);
app.get('/songs', (req, res) => res.sendFile(pub('songs.html')));
app.get('/topic', (req, res) => res.sendFile(pub('topic.html')));
app.get('/learn', (req, res) => res.sendFile(pub('learn.html')));
app.get('/chat',  (req, res) => res.sendFile(pub('chat.html')));
app.get('/puzzle',      (req, res) => res.sendFile(pub('puzzle.html')));
app.get('/puzzle/play', (req, res) => res.sendFile(pub('puzzle-play.html')));

// 퍼즐 데이터 삭제 API
const fs = require('fs');
const puzzleIndexPath = path.join(__dirname, '..', 'public', 'puzzle-data', 'index.json');

app.delete('/api/puzzle/:id', (req, res) => {
    try {
        const { id } = req.params;
        const raw = fs.readFileSync(puzzleIndexPath, 'utf8');
        const index = JSON.parse(raw);
        const target = index.puzzles.find(p => p.id === id);
        if (!target) return res.status(404).json({ success: false, error: 'Not found' });

        // JSON 파일 삭제 (sample.json은 보호)
        if (target.file && target.file !== 'sample.json') {
            const filePath = path.join(__dirname, '..', 'public', 'puzzle-data', target.file);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        index.puzzles = index.puzzles.filter(p => p.id !== id);
        fs.writeFileSync(puzzleIndexPath, JSON.stringify(index, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

const DEFAULT_PROMPT = `당신은 트렌드 맞춤형 영어 학습 서비스 'Trend Eng'의 1타 AI 영어 강사입니다.
주제: {topic}
난이도: {difficulty} (level1: 왕초보 / level2: 초보 / level3: 중급 / level4: 고급 / level5: 원어민)

---

## 역할 원칙
- 내부 사고 과정('Thinking...', 'Step 1:', 분석 중... 등) 절대 출력 금지
- 1타 강사처럼 친절하고 핵심을 짚는 설명
- 대화 모드: 주제를 한국어 1~2문장으로 요약 후 영어 학습 진행

---

## 콘텐츠 생성 모드 (API 호출 시)

주제·난이도에 맞는 영어 문장 10개 + 복습 퀴즈 10개를 생성하세요.
반드시 아래 JSON 스키마를 그대로 따른 **순수 JSON**만 출력하세요. 마크다운·설명 텍스트 일절 금지.
JSON 문자열 내 줄바꿈은 반드시 \\n으로 이스케이프 처리하세요.

---

### 문장(sentences) 생성 규칙

**레벨별 기준**
| 레벨 | 문법 | 어휘 | 문장 길이 |
|------|------|------|-----------|
| level1 | be동사·일반동사 현재형 | 기본 1,000단어 | 5~8단어 |
| level2 | 과거형·미래형(will/be going to) | 기본 2,000단어 | 8~12단어 |
| level3 | 현재완료·수동태·조동사·복문(because/when/if/although) | 비즈니스 3,000단어 | 15~20단어 |
| level4 | 가정법·분사구문·관계절·도치 | 학술·비즈니스 5,000단어 | 20~25단어 |
| level5 | 관용표현·콜로케이션·뉘앙스 차이·구어체 | 제한 없음 | 제한 없음 |

**공통 품질 기준**
- 실제 뉴스·비즈니스·트렌드 현장에서 쓰이는 생동감 있는 문장
- 10개 문장이 각각 서로 다른 문법 패턴을 사용할 것 (동일 구조 반복 금지)
- 진부한 교과서 문장 금지 (예: "I go to school." 수준 금지)

**각 필드 작성 기준**

▸ en: 위 기준을 충족하는 영어 문장

▸ ko: 직역이 아닌 문맥에 맞는 자연스러운 한국어 번역

▸ sentence_structure: 문장 형식(1~5형식) + 전체 성분을 태그·한글 명칭으로 분석
  형식: "N형식 / S(주어: ...) + V(동사: ...) + O(목적어: ...) + M(수식어: ...)"
  예시: "3형식 / S(주어: The government) + V(동사: has announced) + O(목적어: a new policy) + M(수식어: to tackle inflation)"

▸ explanation: 1타 강사 스타일, 최소 4문장, 아래 4가지를 모두 포함
  ① 이 문장이 실제 쓰이는 상황·맥락 (뉴스/비즈니스/일상 중 어디서?)
  ② 핵심 문법 포인트 (왜 이 시제·구조를 선택했는가?)
  ③ 한국어 번역 시 주의할 뉘앙스·함정
  ④ 같은 의미의 다른 표현 또는 응용 패턴 1개 제시

▸ voca: 문장당 핵심 단어·숙어 3~5개, 배열 형식
  형식: "단어(품사): 한국어 뜻 - 사용 맥락 또는 혼동 주의 포인트"
  예시: ["tackle(동사): 다루다, 해결하다 - 문제·이슈 앞에 쓰며 'deal with'보다 적극적 뉘앙스", "inflation(명사): 인플레이션, 물가 상승 - deflation(물가 하락)과 반대"]

---

### 퀴즈(quiz) 생성 규칙
- 총 10개: 객관식(multiple_choice) 5개 + 빈칸채우기(fill_in_blank) 5개
- sentences의 voca에서 출제 (학습한 단어 복습 목적)
- 객관식 오답 3개는 그럴듯한 혼동 유발 단어로 구성

---

### 출력 JSON 스키마 (이 구조를 반드시 준수)

{
  "sentences": [
    {
      "en": "영어 문장",
      "ko": "자연스러운 한국어 번역",
      "sentence_structure": "N형식 / S(주어: ...) + V(동사: ...) + ...",
      "explanation": "① 맥락 설명. ② 문법 포인트. ③ 번역 뉘앙스 주의. ④ 응용 패턴.",
      "voca": [
        "단어(품사): 뜻 - 맥락/주의 포인트",
        "단어(품사): 뜻 - 맥락/주의 포인트"
      ]
    }
  ],
  "quiz": [
    {
      "type": "multiple_choice",
      "word": "단어",
      "question": "'단어'의 올바른 뜻을 고르세요.",
      "options": ["정답", "오답1", "오답2", "오답3"],
      "answer": "정답"
    },
    {
      "type": "fill_in_blank",
      "word": "단어",
      "question": "다음 뜻에 해당하는 영어 단어를 적어주세요: '한국어 뜻'",
      "answer": "단어"
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
                geminiModel: (row && row.geminiModel) || 'gemini-2.0-flash',
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
        const status = error.response?.status;
        const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        console.error(`Generate Error [${status}]:`, detail);
        res.status(500).json({ error: `Generate Error [${status}]: ${detail}` });
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

// News Generation Relay System
let pendingCommand = false;
let relayLogs = [];

app.get('/api/admin/check-command', (req, res) => {
    res.json({ run: pendingCommand });
    if (pendingCommand) pendingCommand = false; // 신호를 확인하면 즉시 초기화
});

app.post('/api/admin/push-log', (req, res) => {
    const { type, content, code } = req.body;
    broadcastNewsLog(type, content, code); // SSE를 통해 웹 대시보드로 로그 전달
    res.json({ success: true });
});

app.post('/api/admin/trigger-news', (req, res) => {
    pendingCommand = true;
    relayLogs = []; // 로그 초기화
    res.json({ success: true, message: '명령이 전달되었습니다. 로컬 에이전트가 곧 시작합니다.' });
});

// News Generation Control and Monitoring
let newsGenerationProcess = null;
const newsStreamClients = new Set();

app.get('/api/admin/news-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const client = { res };
    newsStreamClients.add(client);

    req.on('close', () => {
        newsStreamClients.delete(client);
    });
});

const broadcastNewsLog = (type, content, code = null) => {
    const data = JSON.stringify({ type, content, code });
    newsStreamClients.forEach(client => {
        client.res.write(`data: ${data}\n\n`);
    });
};

app.post('/api/admin/run-news', (req, res) => {
    if (newsGenerationProcess) {
        return res.status(400).json({ success: false, error: '이미 뉴스 생성 프로세스가 실행 중입니다.' });
    }

    const scriptPath = path.join(__dirname, '..', 'news.sh');
    newsGenerationProcess = spawn('bash', [scriptPath], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, FORCE_COLOR: 'true' }
    });

    newsGenerationProcess.stdout.on('data', (data) => {
        broadcastNewsLog('stdout', data.toString());
    });

    newsGenerationProcess.stderr.on('data', (data) => {
        broadcastNewsLog('stderr', data.toString());
    });

    newsGenerationProcess.on('close', (code) => {
        broadcastNewsLog('exit', `프로세스가 종료되었습니다.`, code);
        newsGenerationProcess = null;
    });

    res.json({ success: true, message: '뉴스 생성 시작' });
});

// Admin API Key middleware
const requireAdminKey = (req, res, next) => {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return next(); // key not configured, allow (backward compat)
    const provided = req.headers['x-admin-key'] || req.query.adminKey;
    if (provided !== adminKey) {
        return res.status(401).json({ error: 'Unauthorized: invalid admin key' });
    }
    next();
};

// Admin key endpoint (for data management page)
app.get('/api/admin-key', (req, res) => {
    const adminKey = process.env.ADMIN_API_KEY || '';
    res.json({ key: adminKey });
});

// 카테고리 정규화: AI가 영어로 생성하는 모든 카테고리 값을 한글로 통일
const CATEGORY_MAP = {
    'ENTERTAINMENT': '연애', 'Entertainment': '연애', 'entertainment': '연애', 'ENT': '연애',
    'SPORTS': '스포츠', 'Sports': '스포츠', 'sports': '스포츠', 'SPO': '스포츠',
    'TECHNOLOGY': '테크', 'Technology': '테크', 'technology': '테크', 'TECH': '테크', 'Tech': '테크', 'tech': '테크', 'TEC': '테크',
    'POLITICS': '정치', 'Politics': '정치', 'politics': '정치',
    'FINANCE': '금융', 'Finance': '금융', 'finance': '금융', 'BUSINESS': '금융', 'Business': '금융', 'business': '금융',
    'GENERAL': '일반', 'General': '일반', 'general': '일반',
    'TOP': '전체',
};
function normalizeCategory(cat) {
    if (!cat) return '일반';
    const primary = String(cat).split('/')[0].trim(); // "Tech/Game" → "Tech"
    return CATEGORY_MAP[primary] || CATEGORY_MAP[cat] || cat;
}

// Save Pre-Analyzed Trends API (for CLI script)
app.post('/api/trends/save', requireAdminKey, async (req, res) => {
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
                const category = normalizeCategory(t.category);

                stmt.run(cleanTitle, category, t.summary || '', keywords, sentences, quiz, t.difficulty || 'level3', today, 'news');
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

app.post('/api/songs/save', requireAdminKey, (req, res) => {
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
app.post('/api/trends/clear-today', requireAdminKey, (req, res) => {
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
app.delete('/api/trends/:id', requireAdminKey, (req, res) => {
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
