const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const https = require('https');
const crypto = require('crypto');
const db = require('./database');

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 8001;

// SSE 클라이언트 저장
const trendsClients = new Map();

app.use(cors({
    origin: true,
    credentials: true,
}));

/* Temporarily disabled HTTPS redirect
app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto === 'http') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});
*/

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.set('trust proxy', 1); // reverse proxy 뒤에서 올바른 protocol 감지

// ─── SSL 인증 파일 ─────────────────────────────────────────────────────────────
app.get('/.well-known/pki-validation/:file', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', '.well-known', 'pki-validation', req.params.file));
});

// ─── 관리자 인증 ──────────────────────────────────────────────────────────────
function parseCookies(req) {
    const cookies = {};
    (req.headers.cookie || '').split(';').forEach(c => {
        const [k, ...v] = c.trim().split('=');
        if (k) cookies[k.trim()] = decodeURIComponent(v.join('=').trim());
    });
    return cookies;
}

function getAdminToken() {
    const pwd = process.env.ADMIN_PASSWORD || '';
    const secret = process.env.SESSION_SECRET || 'default-secret';
    return crypto.createHmac('sha256', secret).update(pwd).digest('hex');
}

const requireAdminAuth = (req, res, next) => {
    const cookies = parseCookies(req);
    if (cookies['admin_token'] === getAdminToken()) return next();
    res.redirect('/admin/login');
};

app.get('/admin/login', (req, res) => res.sendFile(pub('admin-login.html')));
app.post('/api/admin/login', express.urlencoded({ extended: false }), (req, res) => {
    const { password } = req.body;
    if (password && password === (process.env.ADMIN_PASSWORD || '')) {
        const token = getAdminToken();
        res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);
        return res.redirect('/admin');
    }
    res.redirect('/admin/login?error=1');
});
app.get('/admin/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
    res.redirect('/admin/login');
});

// ─── Toss Auth (Phase 3) ──────────────────────────────────────────────────
app.get('/api/user/session', (req, res) => {
    const cookies = parseCookies(req);
    const userId = cookies['user_id'];
    if (!userId) return res.json({ authenticated: false });
    
    db.get("SELECT id, name, picture FROM users WHERE id = ?", [userId], (err, row) => {
        if (err || !row) return res.json({ authenticated: false });
        res.json({ authenticated: true, user: row });
    });
});

app.post('/api/toss/auth', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    // [Mock] 토스 인증 서버와 통신하여 토큰 검증 로직 시뮬레이션
    // 실제로는 axios.post('https://api.toss.im/v1/bridge/auth/verify', ...) 등을 호출해야 함
    const mockUser = {
        id: `toss_${token.substring(0, 8)}`,
        name: `토스사용자_${token.substring(0, 4)}`,
        picture: 'https://static.toss.im/assets/homepage/safety/icn-security-check.png'
    };

    db.run("INSERT OR REPLACE INTO users (id, name, picture) VALUES (?, ?, ?)", 
        [mockUser.id, mockUser.name, mockUser.picture], 
        (err) => {
            if (err) return res.status(500).json({ error: 'DB Error' });
            
            res.setHeader('Set-Cookie', `user_id=${mockUser.id}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);
            res.json({ success: true, user: mockUser });
        }
    );
});

app.get('/settings.html', requireAdminAuth, (req, res) => res.sendFile(pub('settings.html')));
app.get('/data.html', requireAdminAuth, (req, res) => res.sendFile(pub('data.html')));
app.get('/automation.html', requireAdminAuth, (req, res) => res.sendFile(pub('automation.html')));
app.get('/admin', requireAdminAuth, (req, res) => res.sendFile(pub('admin.html')));
app.get('/admin/', requireAdminAuth, (req, res) => res.sendFile(pub('admin.html')));

app.use(express.static(path.join(__dirname, '..', 'public'), { dotfiles: 'allow' }));

// 페이지 라우트 (URL 기반 네비게이션)
const pub = p => path.join(__dirname, '..', 'public', p);
app.get('/songs', (req, res) => res.sendFile(pub('songs.html')));
app.get('/topic', (req, res) => res.sendFile(pub('topic.html')));
app.get('/learn', (req, res) => res.sendFile(pub('learn.html')));
app.get('/chat',  (req, res) => res.sendFile(pub('chat.html')));
app.get('/puzzle',      (req, res) => res.sendFile(pub('puzzle.html')));
app.get('/puzzle/play', (req, res) => res.sendFile(pub('puzzle-play.html')));
app.get('/punchline',   (req, res) => res.sendFile(pub('punchline.html')));
app.get('/tech',  (req, res) => res.sendFile(pub('tech.html')));
app.get('/enter', (req, res) => res.sendFile(pub('enter.html')));

// ─── Puzzle API (DB-based) ────────────────────────────────────────────────────
const fs = require('fs');
const puzzleDataDir = path.join(__dirname, '..', 'public', 'puzzle-data');

// GET /api/puzzles - 퍼즐 목록
app.get('/api/puzzles', (req, res) => {
    const limit = req.query.limit !== undefined ? parseInt(req.query.limit) : null;
    const offset = parseInt(req.query.offset) || 0;

    db.get("SELECT COUNT(*) as total FROM puzzles", (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = countRow ? countRow.total : 0;
        const query = limit !== null
            ? "SELECT id, title, category, difficulty, date, wordCount, source, createdAt FROM puzzles ORDER BY date DESC, createdAt DESC LIMIT ? OFFSET ?"
            : "SELECT id, title, category, difficulty, date, wordCount, source, createdAt FROM puzzles ORDER BY date DESC, createdAt DESC";
        const params = limit !== null ? [limit, offset] : [];
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ puzzles: rows || [], total, limit, offset });
        });
    });
});

// GET /api/puzzles/:id - 퍼즐 상세 (전체 데이터)
app.get('/api/puzzles/:id', (req, res) => {
    db.get("SELECT * FROM puzzles WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Not found' });
        try { row.data = JSON.parse(row.data); } catch (e) {}
        res.json({ puzzle: row });
    });
});

// POST /api/puzzles - 퍼즐 저장 (스킬에서 호출)
app.post('/api/puzzles', (req, res) => {
    const { id, title, category, difficulty, date, wordCount, source, data } = req.body;
    if (!id || !title || !data) return res.status(400).json({ error: 'id, title, data are required' });
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const today = date || new Date().toISOString().split('T')[0];
    db.run(
        "INSERT OR REPLACE INTO puzzles (id, title, category, difficulty, date, wordCount, source, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, title, category || 'general', difficulty || 'medium', today, wordCount || 0, source || '', dataStr],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id });
        }
    );
});

// DELETE /api/puzzles/:id - 퍼즐 삭제
app.delete('/api/puzzles/:id', (req, res) => {
    db.run("DELETE FROM puzzles WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true });
    });
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
- 총 10개: 모두 4지 선다 객관식(multiple_choice)으로 생성 (빈칸 채우기 절대 금지)
- sentences의 voca에서 출제 (학습한 단어 복습 목적)
- 질문은 반드시 한글로 작성하며, 선택지는 반드시 4개여야 합니다.
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
      "question": "'단어'의 올바른 뜻을 고르세요.",
      "options": ["정답", "오답1", "오답2", "오답3"],
      "answer": "정답"
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
    const limit = req.query.limit !== undefined ? parseInt(req.query.limit) : null;
    const offset = parseInt(req.query.offset) || 0;
    const category = req.query.category || null;

    // category 필터: LIKE로 서브카테고리(정치/국제 등) 포함, 엔터=연애+스포츠+엔터
    let catWhere = '';
    let catParams = [];
    if (category === '엔터') {
        catWhere = " AND (category = '엔터' OR category = '연애' OR category = '스포츠' OR category LIKE '연애/%' OR category LIKE '스포츠/%')";
    } else if (category) {
        catWhere = " AND (category = ? OR category LIKE ?)";
        catParams = [category, category + '/%'];
    }

    const baseWhere = `WHERE sentences IS NOT NULL AND type = 'news'${catWhere}`;
    db.get(`SELECT COUNT(*) as total FROM trends ${baseWhere}`, catParams, (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = countRow ? countRow.total : 0;
        const query = limit !== null
            ? `SELECT * FROM trends ${baseWhere} ORDER BY createdAt DESC LIMIT ? OFFSET ?`
            : `SELECT * FROM trends ${baseWhere} ORDER BY createdAt DESC`;
        const params = limit !== null ? [...catParams, limit, offset] : [...catParams];
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ trends: rows || [], total, limit, offset });
        });
    });
});

app.post('/api/trends/fetch', async (req, res) => {
    const s = await getGlobalSettings();
    if (!s.geminiApiKey) return res.status(400).json({ error: 'Gemini API Key가 필요합니다.' });

    const categories = [
        { name: 'POL', label: '정치', url: 'https://news.google.com/rss/headlines/section/topic/POLITICS?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'TEC', label: '테크', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'ENT', label: '연애', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'SPO', label: '스포츠', url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko' },
    ];

    try {
        broadcastTrendsProgress('fetching', '뉴스 수집 중...', 0, 0);
        let allTrends = [];
        
        for (const cat of categories) {
            try {
                const result = await axios.get(cat.url, { timeout: 8000 });
                const matches = result.data.match(/<title>(.*?)<\/title>/g) || [];
                matches.slice(1, 4).forEach(m => {
                    let title = m.replace(/<title>(.*?)<\/title>/, '$1').split(' - ')[0];
                    title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
                    allTrends.push({ category: cat.label, title: title.trim() });
                });
            } catch (err) { console.warn(`RSS failed for ${cat.label}`); }
        }

        const uniqueTrends = allTrends.slice(0, 12);
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

        let saved = 0, skipped = 0;
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                const stmt = db.prepare(
                    "INSERT INTO trends (title, category, summary, keywords, sentences, quiz, difficulty, date, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
                );
                let pending = trends.length;
                trends.forEach(t => {
                    const cleanTitle = String(t.title || '').trim();
                    const category = normalizeCategory(t.category);
                    // 같은 날 같은 제목 중복 방지
                    db.get("SELECT id FROM trends WHERE title = ? AND date = ?", [cleanTitle, today], (err, row) => {
                        if (row) {
                            skipped++;
                        } else {
                            const keywords  = t.keywords  ? JSON.stringify(t.keywords)  : '[]';
                            const sentences = typeof t.sentences === 'object' ? JSON.stringify(t.sentences) : t.sentences;
                            const quiz      = t.quiz ? (typeof t.quiz === 'object' ? JSON.stringify(t.quiz) : t.quiz) : '[]';
                            stmt.run(cleanTitle, category, t.summary || '', keywords, sentences, quiz, t.difficulty || 'level3', today, 'news');
                            saved++;
                        }
                        if (--pending === 0) { stmt.finalize(); resolve(); }
                    });
                });
            });
        });

        res.json({ success: true, message: `${saved} saved, ${skipped} skipped (duplicate).` });
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
    const limit = req.query.limit !== undefined ? parseInt(req.query.limit) : null;
    const offset = parseInt(req.query.offset) || 0;

    db.get("SELECT COUNT(*) as total FROM trends WHERE type = 'song'", (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = countRow ? countRow.total : 0;
        const query = limit !== null
            ? "SELECT * FROM trends WHERE type = 'song' ORDER BY createdAt DESC LIMIT ? OFFSET ?"
            : "SELECT * FROM trends WHERE type = 'song' ORDER BY createdAt DESC";
        const params = limit !== null ? [limit, offset] : [];
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ songs: rows || [], total, limit, offset });
        });
    });
});

// Punchline API - Movie/Animation/Drama/Song: 패턴 제목으로 구분
app.get('/api/punchline/saved', (req, res) => {
    const limit = req.query.limit !== undefined ? parseInt(req.query.limit) : null;
    const offset = parseInt(req.query.offset) || 0;
    const pattern = "type = 'song' AND (title LIKE 'Movie:%' OR title LIKE 'Animation:%' OR title LIKE 'Drama:%' OR title LIKE 'Song:%')";

    db.get(`SELECT COUNT(*) as total FROM trends WHERE ${pattern}`, (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = countRow ? countRow.total : 0;
        const query = limit !== null
            ? `SELECT * FROM trends WHERE ${pattern} ORDER BY createdAt DESC LIMIT ? OFFSET ?`
            : `SELECT * FROM trends WHERE ${pattern} ORDER BY createdAt DESC`;
        const params = limit !== null ? [limit, offset] : [];
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ items: rows || [], total, limit, offset });
        });
    });
});

app.post('/api/songs/save', requireAdminKey, (req, res) => {
    const { title, lyrics, difficulty, sentences, quiz, image } = req.body;
    if (!title || !sentences) {
        return res.status(400).json({ error: 'title과 sentences가 필요합니다.' });
    }

    const sentencesStr = typeof sentences === 'string' ? sentences : JSON.stringify(sentences);
    const quizStr = quiz ? (typeof quiz === 'string' ? quiz : JSON.stringify(quiz)) : '[]';
    const summary = lyrics.substring(0, 200);

    // 중복 체크 및 UPSERT 로직
    db.get("SELECT id FROM trends WHERE title = ? AND type = 'song'", [title], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            // 이미 존재하면 업데이트
            db.run(
                "UPDATE trends SET summary = ?, difficulty = ?, sentences = ?, quiz = ?, image = ? WHERE id = ?",
                [summary, difficulty || 'level3', sentencesStr, quizStr, image, row.id],
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, id: row.id, action: 'updated' });
                }
            );
        } else {
            // 존재하지 않으면 새로 삽입
            db.run(
                "INSERT INTO trends (title, summary, difficulty, sentences, quiz, image, type) VALUES (?, ?, ?, ?, ?, ?, 'song')",
                [title, summary, difficulty || 'level3', sentencesStr, quizStr, image],
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, id: this.lastID, action: 'inserted' });
                }
            );
        }
    });
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

// ─── Automation: Cron & Script Management ────────────────────────────────────
const { exec } = require('child_process');
const os = require('os');

const SSH_HOST = process.env.AUTO_SSH_HOST || '192.168.219.112';
const SSH_USER = process.env.AUTO_SSH_USER || 'lmo0317';
const SSH_KEY  = process.env.AUTO_SSH_KEY  || path.join(os.homedir(), '.ssh', 'id_ed25519');
const REMOTE_PROJECT = process.env.AUTO_PROJECT_PATH || '/home/lmo0317/work/aieng';

const SSH_ARGS = ['-o', 'StrictHostKeyChecking=no', '-o', 'BatchMode=yes', '-i', SSH_KEY, `${SSH_USER}@${SSH_HOST}`];

const ALLOWED_SCRIPTS = {
    'news-daily': { path: 'scripts/news-daily.sh', label: '뉴스 자동 생성 (정치/테크/엔터)' },
    'news':       { path: 'webtools/news.sh',       label: '뉴스 수동 생성' },
    'popsong':    { path: 'webtools/popsong.sh',    label: '팝송 데이터 생성' },
    'puzzle':     { path: 'webtools/puzzle.sh',     label: '퍼즐 데이터 생성' },
};

function sshExec(cmd) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ssh', [...SSH_ARGS, cmd]);
        let stdout = '', stderr = '';
        proc.stdout.on('data', d => stdout += d.toString());
        proc.stderr.on('data', d => stderr += d.toString());
        proc.on('close', code => {
            if (code !== 0) reject(new Error(stderr || `exit ${code}`));
            else resolve(stdout);
        });
        proc.on('error', e => reject(e));
    });
}

// 크론 목록 조회
app.get('/api/admin/cron', requireAdminKey, async (req, res) => {
    try {
        const stdout = await sshExec('crontab -l 2>/dev/null || true');
        const lines = stdout.split('\n');
        const jobs = lines
            .map((line, i) => ({ id: i, raw: line }))
            .filter(j => j.raw.trim() && !j.raw.trim().startsWith('#'));
        res.json({ success: true, raw: stdout, jobs });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 크론 저장 (전체 crontab 교체)
app.post('/api/admin/cron', requireAdminKey, (req, res) => {
    const { raw } = req.body;
    if (typeof raw !== 'string') return res.status(400).json({ error: 'raw required' });
    const content = raw.endsWith('\n') ? raw : raw + '\n';
    const proc = spawn('ssh', [...SSH_ARGS, 'crontab -']);
    let stderr = '';
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => {
        if (code !== 0) return res.status(500).json({ success: false, error: stderr || 'crontab 저장 실패' });
        res.json({ success: true });
    });
    proc.on('error', e => res.status(500).json({ success: false, error: e.message }));
    proc.stdin.write(content);
    proc.stdin.end();
});

// 스크립트 목록
app.get('/api/admin/scripts', requireAdminKey, (req, res) => {
    res.json({ success: true, scripts: Object.entries(ALLOWED_SCRIPTS).map(([id, s]) => ({ id, label: s.label, path: s.path })) });
});

// 스크립트 실행 (SSE 스트리밍 via SSH)
app.get('/api/admin/run/:scriptId', requireAdminKey, (req, res) => {
    const script = ALLOWED_SCRIPTS[req.params.scriptId];
    if (!script) return res.status(404).json({ error: '허용되지 않은 스크립트' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (type, data) => res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    send('start', `▶ ${script.label} 실행 시작\n`);

    const argsStr = req.query.args ? ' ' + req.query.args.replace(/[;&|`$]/g, '') : '';
    const remoteCmd = `cd ${REMOTE_PROJECT} && bash ${script.path}${argsStr}`;

    const sshArgs = [
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'BatchMode=yes',
        '-i', SSH_KEY,
        `${SSH_USER}@${SSH_HOST}`,
        remoteCmd
    ];

    const proc = spawn('ssh', sshArgs);

    proc.stdout.on('data', d => send('stdout', d.toString()));
    proc.stderr.on('data', d => send('stderr', d.toString()));
    proc.on('close', code => {
        send('done', `\n✅ 종료 (exit ${code})`);
        res.end();
    });
    proc.on('error', e => {
        send('error', e.message);
        res.end();
    });

    req.on('close', () => proc.kill());
});

// ─── Data Sync from Remote Server ────────────────────────────────────────────
const REMOTE_BASE = process.env.SYNC_URL || 'https://minohlee.mooo.com';

app.post('/api/sync', async (req, res) => {
    const results = { news: 0, songs: 0, puzzles: 0, skipped: 0, errors: [] };

    try {
        // 1. Sync news trends
        try {
            const newsRes = await axios.get(`${REMOTE_BASE}/api/trends/saved`, { timeout: 15000 });
            const trends = newsRes.data.trends || [];
            await new Promise((resolve) => db.run("DELETE FROM trends WHERE type = 'news'", resolve));
            for (const t of trends) {
                await new Promise((resolve) => {
                    db.run(
                        "INSERT INTO trends (title, category, summary, keywords, sentences, quiz, difficulty, date, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'news')",
                        [t.title, t.category, t.summary, t.keywords, t.sentences, t.quiz || '[]', t.difficulty || 'level3', t.date],
                        (err) => { if (!err) results.news++; resolve(); }
                    );
                });
            }
        } catch (e) { results.errors.push('뉴스 동기화 실패: ' + e.message); }

        // 2. Sync songs
        try {
            const songsRes = await axios.get(`${REMOTE_BASE}/api/songs/saved`, { timeout: 15000 });
            const songs = songsRes.data.songs || [];
            await new Promise((resolve) => db.run("DELETE FROM trends WHERE type = 'song'", resolve));
            for (const s of songs) {
                await new Promise((resolve) => {
                    db.run(
                        "INSERT INTO trends (title, summary, difficulty, sentences, quiz, image, type) VALUES (?, ?, ?, ?, ?, ?, 'song')",
                        [s.title, s.summary, s.difficulty || 'level3', s.sentences, s.quiz || '[]', s.image || null],
                        (err) => { if (!err) results.songs++; resolve(); }
                    );
                });
            }
        } catch (e) { results.errors.push('팝송 동기화 실패: ' + e.message); }

        // 3. Sync puzzle data
        try {
            const remotePuzzlesRes = await axios.get(`${REMOTE_BASE}/api/puzzles`, { timeout: 15000 });
            const remotePuzzles = remotePuzzlesRes.data.puzzles || [];
            await new Promise((resolve) => db.run("DELETE FROM puzzles", resolve));
            for (const puzzle of remotePuzzles) {
                try {
                    const detailRes = await axios.get(`${REMOTE_BASE}/api/puzzles/${encodeURIComponent(puzzle.id)}`, { timeout: 15000 });
                    const detail = detailRes.data.puzzle;
                    const dataStr = typeof detail.data === 'string' ? detail.data : JSON.stringify(detail.data);
                    await new Promise((resolve) => {
                        db.run(
                            "INSERT INTO puzzles (id, title, category, difficulty, date, wordCount, source, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                            [detail.id, detail.title, detail.category || 'general', detail.difficulty || 'medium',
                             detail.date || '', detail.wordCount || 0, detail.source || '', dataStr],
                            (err) => { if (!err) results.puzzles++; resolve(); }
                        );
                    });
                } catch (e) {
                    results.errors.push(`퍼즐 상세 실패: ${puzzle.id}`);
                }
            }
        } catch (e) { results.errors.push('퍼즐 동기화 실패: ' + e.message); }

        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Puzzle JSON → DB 마이그레이션 (최초 1회) ────────────────────────────────
async function migratePuzzleJsonToDB() {
    // 이미 마이그레이션 완료된 경우 재실행 방지
    const alreadyDone = await new Promise(r =>
        db.get("SELECT value FROM migration_flags WHERE key = 'puzzle_json_migrated'", (e, row) => r(!!row))
    );
    if (alreadyDone) {
        console.log('[Puzzle] Migration already done, skipping.');
        return;
    }

    const indexPath = path.join(puzzleDataDir, 'index.json');
    if (!fs.existsSync(indexPath)) {
        // JSON 파일 없어도 플래그 기록해서 다음 재시작에도 스킵
        db.run("INSERT OR IGNORE INTO migration_flags (key, value) VALUES ('puzzle_json_migrated', '1')");
        return;
    }
    try {
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        for (const p of (index.puzzles || [])) {
            const exists = await new Promise(r => db.get("SELECT id FROM puzzles WHERE id = ?", [p.id], (e, row) => r(!!row)));
            if (exists) continue;
            if (!p.file) continue;
            const filePath = path.join(puzzleDataDir, p.file);
            if (!fs.existsSync(filePath)) continue;
            try {
                const data = fs.readFileSync(filePath, 'utf8');
                db.run(
                    "INSERT OR IGNORE INTO puzzles (id, title, category, difficulty, date, wordCount, source, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [p.id, p.title, p.category || 'general', p.difficulty || 'medium',
                     p.date || '', p.wordCount || 0, p.source || '', data],
                    (err) => { if (!err) console.log(`[Puzzle] Migrated: ${p.id}`); }
                );
            } catch (e) { console.error(`[Puzzle] Migration failed for ${p.id}:`, e.message); }
        }
        // 완료 플래그 기록
        db.run("INSERT OR IGNORE INTO migration_flags (key, value) VALUES ('puzzle_json_migrated', '1')");
        console.log('[Puzzle] JSON → DB migration done.');
    } catch (e) { console.error('[Puzzle] Migration error:', e.message); }
}

// Start Express Server
const server = app.listen(PORT, async () => {
    console.log(`Express Server running on port ${PORT}`);
    console.log(`Service URL: https://minohlee.mooo.com`);
    // puzzle JSON → DB migration 비활성화 (puzzle-data 폴더 JSON 파일로 인한 재시작 시 데이터 복원 방지)
    
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
