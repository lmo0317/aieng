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

// APIs
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

// Trends API 복구 - 실시간 뉴스 수집 및 정제
app.get('/api/trends', async (req, res) => {
    const fallbacks = [
        { category: 'TEC', title: '인공지능(AI) 기술이 바꾸는 우리의 미래 일상과 직업의 변화' },
        { category: 'BIZ', title: '2026년 세계 경제 전망: 금리 인하와 글로벌 시장의 새로운 투자 기회' },
        { category: 'SPT', title: '유럽 챔피언스리그 결승전: 전 세계 축구 팬들이 주목하는 관전 포인트' },
        { category: 'ENT', title: 'K-콘텐츠의 글로벌 흥행 소식과 새롭게 공개되는 넷플릭스 기대작' },
        { category: 'TEC', title: '스마트폰 이후의 혁신: 차세대 웨어러블 기기와 증강현실(AR) 기술 동향' },
        { category: 'BIZ', title: '애플과 테슬라의 신제품 발표가 시장에 미치는 영향과 소비자 반응' },
        { category: 'SPT', title: '손흥민 선수의 최근 경기 활약상과 팀 내 리더십에 대한 현지 언론 평가' },
        { category: 'ENT', title: '빌보드 차트를 점령한 K-POP 아티스트들의 성과와 향후 활동 계획' },
        { category: 'TOP', title: '친환경 여행과 지속 가능한 관광: 전 세계 여행자들이 선택한 새로운 방식' },
        { category: 'TEC', title: '사이버 보안의 중요성: 개인 정보를 안전하게 지키는 생활 속 디지털 습관' }
    ];

    const categories = [
        { name: 'TOP', url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'BIZ', url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'ENT', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'SPT', url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'TEC', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko' }
    ];

    try {
        const results = await Promise.allSettled(
            categories.map(cat => axios.get(cat.url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }))
        );

        let allTrends = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const categoryName = categories[index].name;
                const xml = result.value.data;
                const titleMatches = xml.match(/<title>(.*?)<\/title>/g) || [];
                const categoryTitles = titleMatches.slice(1, 10).map(m => {
                    let title = m.replace(/<title>(.*?)<\/title>/, '$1').split(' - ')[0];
                    title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                    return { category: categoryName, title: title.trim() };
                }).filter(item => item.title.length > 10 && !item.title.includes('Google News'));
                allTrends = [...allTrends, ...categoryTitles];
            }
        });

        const uniqueTitles = new Map();
        allTrends.forEach(item => { if (!uniqueTitles.has(item.title)) uniqueTitles.set(item.title, item); });
        let finalTrends = Array.from(uniqueTitles.values()).sort(() => Math.random() - 0.5);
        if (finalTrends.length < 10) {
            const extra = fallbacks.filter(f => !uniqueTitles.has(f.title));
            finalTrends = [...finalTrends, ...extra];
        }
        res.json({ trends: finalTrends.slice(0, 10) });
    } catch (error) { res.json({ trends: fallbacks }); }
});

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
            const setupMsg = {
                setup: { 
                    model: `models/gemini-2.5-flash-native-audio-latest`,
                    generation_config: { response_modalities: ["AUDIO"] }
                }
            };
            geminiWs.send(JSON.stringify(setupMsg));
        });

        geminiWs.on('message', (data) => {
            try {
                const response = JSON.parse(data);
                if (response.setupComplete) {
                    isSetupDone = true;
                    while (messageQueue.length > 0) geminiWs.send(JSON.stringify(messageQueue.shift()));
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
                geminiPayload = { client_content: { turns: [{ role: "user", parts: [{ text: data.text }] }], turn_complete: true } };
            } else if (data.type === 'audio' || data.type === 'video') {
                geminiPayload = { realtime_input: { media_chunks: [{ mime_type: data.type === 'audio' ? 'audio/pcm;rate=16000' : 'image/jpeg', data: data.data }] } };
            }
            if (geminiPayload) {
                if (geminiWs && geminiWs.readyState === WebSocket.OPEN && isSetupDone) geminiWs.send(JSON.stringify(geminiPayload));
                else {
                    if (!geminiWs) startGeminiSession();
                    messageQueue.push(geminiPayload);
                }
            }
        } catch (e) { console.error('Local WS Error:', e); }
    });

    ws.on('close', () => { if (geminiWs) geminiWs.close(); });
});
