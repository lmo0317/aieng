require('dotenv').config();
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const DB_PATH = path.resolve(__dirname, '..', 'db', 'database.sqlite');
const CATEGORIES = [
    { name: 'TOP', label: '전체', url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'TEC', label: '테크', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'SPO', label: '스포츠', url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'ENT', label: '연애', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'POL', label: '정치', url: 'https://news.google.com/rss/headlines/section/topic/POLITICS?hl=ko&gl=KR&ceid=KR:ko' }
];

const DEFAULT_SYSTEM_PROMPT = `You are an expert English language educator creating learning materials from news trends.
Generate 10 English sentences with Korean translations, grammar analysis, and vocabulary for each news topic.

CRITICAL OUTPUT FORMAT:
- Output ONLY a valid JSON array
- No markdown code blocks
- No additional text
- Exactly 10 objects

Each object must have:
{
  "en": "English sentence here",
  "ko": "Korean translation here",
  "sentence_structure": "Grammar analysis explaining structure",
  "explanation": "Learning tips and context",
  "voca": ["word1: meaning1", "word2: meaning2"]
}`;

// Helper Functions
function getModelProvider(model) {
    if (model.startsWith('glm-')) return 'glm';
    if (model.startsWith('llama-') ||
        model.startsWith('mixtral-') ||
        model.startsWith('gemma') ||
        model.startsWith('openai/') ||
        model.startsWith('moonshipai/') ||
        model.startsWith('qwen/')
    ) return 'groq';
    return 'gemini';
}

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
        timeout: 60000
    });

    return response.data.choices[0].message.content;
}

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
        timeout: 60000
    });

    return response.data.choices[0].message.content;
}

function cleanAndParseJSON(content) {
    // Remove markdown code blocks if present
    let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    // Remove any leading/trailing non-JSON characters
    cleaned = cleaned.replace(/^[^\[\{]*/, '').replace(/[^\]\}]*$/, '');
    return JSON.parse(cleaned);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main Function
async function fetchTrends() {
    // Configuration
    const provider = 'gemini'; // Default to Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    const model = 'gemini-1.5-flash';

    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in .env file');
        process.exit(1);
    }

    console.log('🔍 Fetching trends from Google News...');

    // Stage 1: Fetch RSS Feeds
    const httpsAgent = new https.Agent({
        rejectUnauthorized: true,
        keepAlive: true,
        timeout: 10000
    });

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    const results = await Promise.allSettled(
        CATEGORIES.map(cat => axios.get(cat.url, {
            timeout: 8000,
            headers: headers,
            httpsAgent: httpsAgent
        }))
    );

    let allTrends = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            const xml = result.value.data;
            const matches = xml.match(/<title>(.*?)<\/title>/g) || [];
            matches.slice(1, 8).forEach(m => {
                let title = m.replace(/<title>(.*?)<\/title>/, '$1').split(' - ')[0];
                title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                const cleanTitle = title.trim();
                if (cleanTitle.length > 10) {
                    allTrends.push({ category: CATEGORIES[index].label, title: cleanTitle });
                }
            });
        } else {
            console.warn(`⚠️  RSS fetch failed for ${CATEGORIES[index].label}`);
        }
    });

    if (allTrends.length === 0) {
        console.error('❌ No trends fetched from RSS feeds');
        process.exit(1);
    }

    // Remove duplicates and select top 10
    const uniqueTrends = Array.from(new Set(allTrends.map(t => t.title)))
        .map(title => allTrends.find(t => t.title === title))
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);

    console.log(`📊 Found ${uniqueTrends.length} trends`);
    console.log('🤖 Analyzing trends...');

    // Stage 2: Analyze Trends
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
        const maxRetries = 3;
        let trendAnalyzed = null;

        while (retryCount <= maxRetries) {
            try {
                let aiContent;
                if (provider === 'glm') {
                    aiContent = await callGLMAPI(apiKey, model, analysisPrompt, `${trend.category}: ${trend.title}`, { temperature: 0.7 });
                } else if (provider === 'groq') {
                    aiContent = await callGroqAPI(apiKey, model, analysisPrompt, `${trend.category}: ${trend.title}`, { temperature: 0.7 });
                } else {
                    aiContent = await callGeminiAPI(apiKey, model, analysisPrompt, `${trend.category}: ${trend.title}`, { temperature: 0.7 });
                }
                trendAnalyzed = cleanAndParseJSON(aiContent);
                break;
            } catch (err) {
                retryCount++;
                if (retryCount > maxRetries) throw err;
                const waitTime = retryCount * 4000;
                console.log(`⏳ Retry ${retryCount}/${maxRetries} for trend ${i + 1}`);
                await sleep(waitTime);
            }
        }

        analyzedTrends.push(trendAnalyzed || { title: trend.title, summary: '', keywords: [] });
        console.log(`🤖 Analyzing trends... (${i + 1}/${uniqueTrends.length})`);
        await sleep(1500);
    }

    console.log('✍️  Generating content...');

    // Stage 3: Generate Learning Content
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
                        content = await callGLMAPI(apiKey, model, DEFAULT_SYSTEM_PROMPT, userPrompt);
                    } else if (provider === 'groq') {
                        content = await callGroqAPI(apiKey, model, DEFAULT_SYSTEM_PROMPT, userPrompt);
                    } else {
                        content = await callGeminiAPI(apiKey, model, DEFAULT_SYSTEM_PROMPT, userPrompt);
                    }
                    break;
                } catch (apiError) {
                    retryCount++;
                    if (retryCount > maxRetries) throw apiError;
                    const waitTime = retryCount * 5000;
                    console.log(`⏳ API Retry ${retryCount}/${maxRetries} for content ${i + 1}`);
                    await sleep(waitTime);
                }
            }

            const sentences = cleanAndParseJSON(content);
            successCount++;
            console.log(`✍️  Generating content... (${i + 1}/${uniqueTrends.length})`);

            trendsWithSentences.push({ ...trend, analyzed: analyzedTrends[i] || {}, sentences });
            await sleep(2500);
        } catch (e) {
            console.error(`❌ Error for trend ${i + 1}: ${e.message}`);
            trendsWithSentences.push({ ...trend, analyzed: analyzedTrends[i] || {}, sentences: [] });
        }
    }

    console.log('💾 Saving to database...');

    // Stage 4: Save to Database
    const db = new sqlite3.Database(DB_PATH);
    const today = new Date().toISOString().split('T')[0];

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("DELETE FROM trends WHERE date = ?", [today], (err) => {
                if (err) return reject(err);

                const stmt = db.prepare("INSERT INTO trends (title, category, summary, keywords, sentences, difficulty, date) VALUES (?, ?, ?, ?, ?, ?, ?)");
                trendsWithSentences.forEach(t => {
                    const keywords = t.analyzed?.keywords ? JSON.stringify(t.analyzed.keywords) : '[]';
                    const sentences = t.sentences?.length > 0 ? JSON.stringify(t.sentences) : null;
                    stmt.run(t.title, t.category, t.analyzed?.summary || '', keywords, sentences, 'level3', today);
                });
                stmt.finalize();

                db.close((err) => {
                    if (err) return reject(err);
                    console.log(`✅ Complete! ${successCount}/${uniqueTrends.length} trends saved`);
                    resolve(trendsWithSentences);
                });
            });
        });
    });
}

// Run if called directly
if (require.main === module) {
    fetchTrends()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('❌ Error:', err.message);
            process.exit(1);
        });
}

module.exports = { fetchTrends };
