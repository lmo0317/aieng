const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '..', '.env') });
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const fs = require('fs');

// Configuration
const DB_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'db', 'database.sqlite');
const CATEGORIES = [
    { name: 'TOP', label: '전체', url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'TEC', label: '테크', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'SPO', label: '스포츠', url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'ENT', label: '연애', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'POL', label: '정치', url: 'https://news.google.com/rss/headlines/section/topic/POLITICS?hl=ko&gl=KR&ceid=KR:ko' }
];

const DEFAULT_SYSTEM_PROMPT = `당신은 대한민국 최고의 영어 '1타 강사'이자 뉴스 분석 전문가입니다.
사용자가 뉴스 트렌드를 통해 영어를 완벽하게 정복할 수 있도록 초고퀄리티 학습 콘텐츠를 생성하세요.

**학습 가이드 생성 원칙 (필수)**:
1. "sentences" (영어 문장 생성):
   - 해당 뉴스 주제를 가장 잘 나타내는 **서로 다른 영어 문장 10개**를 반드시 생성하세요.
2. "explanation" (AI 학습 가이드):
   - 각 문장마다 반드시 **한글로** 작성하며, **최소 3문장 이상의 매우 상세한 설명**을 제공하세요.
   - 단순히 뜻을 풀이하는 게 아니라, 왜 이 문장에서 해당 시제(예: 현재완료 vs 과거)를 썼는지, 특정 단어가 뉴스 문맥에서 어떤 미묘한 뉘앙스를 가지는지 소름 돋게 분석하세요.
   - 실전 비즈니스나 토익 등에서 어떻게 활용되는지 팁을 반드시 포함하세요.
3. "sentence_structure" (문장 구성 요소):
   - S, V, O 등 영문 태그와 함께 **반드시 한글 명칭(주어, 동사, 목적어, 수식어구 등)**을 병기하여 직관적으로 분석하세요.
   - 예: S(주어: The stock market) + V(동사: has reached) + O(목적어: a new high).
4. "ko" (한국어 번역):
   - 뉴스 보도 자료처럼 세련되고 자연스러운 문체로 번역하세요.

CRITICAL OUTPUT FORMAT:
- Output ONLY a valid JSON object containing exactly 10 "sentences" and 10 "quiz" questions.
- No markdown code blocks
- No additional text

Format:
{
  "sentences": [
    {
      "en": "English sentence",
      "ko": "세련된 한국어 번역",
      "sentence_structure": "S(주어: ...) + V(동사: ...) + O(목적어: ...)",
      "explanation": "1타 강사의 소름 돋는 초정밀 문법/뉘앙스 분석 (3문장 이상)",
      "voca": ["word : meaning"]
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
      "question": "다음 뜻에 해당하는 영어 단어를 완성하세요: '바나나' (힌트: b_n_n_)",
      "answer": "banana"
    }
  ]
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
    if (!content || typeof content !== 'string') return content;
    // Remove markdown code blocks if present
    let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Find the first [ or { and the last ] or }
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

    return JSON.parse(cleaned);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main Function
async function fetchTrends(limit = 3) {
    // Configuration
    const provider = 'gemini'; // Default to Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    const model = 'gemini-3.1-flash-lite-preview';

    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in .env file');
        process.exit(1);
    }

    console.log(`🔍 Fetching trends from Google News (Limit: ${limit})...`);

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
    const now = new Date();
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            const xml = result.value.data;
            const itemRegex = /<item>([\s\S]*?)<\/item>/g;
            let match;
            let count = 0;

            while ((match = itemRegex.exec(xml)) !== null && count < 20) {
                const itemContent = match[1];
                const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
                const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);

                if (titleMatch && dateMatch) {
                    const pubDate = new Date(dateMatch[1]);
                    const diffHours = (now - pubDate) / (1000 * 60 * 60);

                    if (diffHours <= 24) {
                        let title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').split(' - ')[0];
                        title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                        const cleanTitle = title.trim();
                        if (cleanTitle.length > 10) {
                            allTrends.push({ category: CATEGORIES[index].label, title: cleanTitle });
                            count++;
                        }
                    }
                }
            }
        } else {
            console.warn(`⚠️  RSS fetch failed for ${CATEGORIES[index].label}`);
        }
    });

    if (allTrends.length === 0) {
        console.error('❌ No trends fetched from RSS feeds');
        process.exit(1);
    }

    // Remove duplicates and select top N
    const uniqueTrends = Array.from(new Set(allTrends.map(t => t.title)))
        .map(title => allTrends.find(t => t.title === title))
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);

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
            const userPrompt = `주제: ${trend.title}\n난이도: level3\n\n[CRITICAL: Output ONLY a valid JSON object containing "sentences" and "quiz". No markdown code blocks.]`;

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

            const parsedData = cleanAndParseJSON(content);
            const sentences = parsedData.sentences || (Array.isArray(parsedData) ? parsedData : []);
            const quiz = parsedData.quiz || [];
            
            successCount++;
            console.log(`✍️  Generating content... (${i + 1}/${uniqueTrends.length})`);

            trendsWithSentences.push({ ...trend, analyzed: analyzedTrends[i] || {}, sentences, quiz });
            await sleep(2500);
        } catch (e) {
            console.error(`❌ Error for trend ${i + 1}: ${e.message}`);
            trendsWithSentences.push({ ...trend, analyzed: analyzedTrends[i] || {}, sentences: [], quiz: [] });
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

                const stmt = db.prepare("INSERT INTO trends (title, category, summary, keywords, sentences, quiz, difficulty, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                trendsWithSentences.forEach(t => {
                    const keywords = t.analyzed?.keywords ? JSON.stringify(t.analyzed.keywords) : '[]';
                    const sentences = t.sentences?.length > 0 ? JSON.stringify(t.sentences) : null;
                    const quiz = t.quiz?.length > 0 ? JSON.stringify(t.quiz) : null;
                    stmt.run(t.title, t.category, t.analyzed?.summary || '', keywords, sentences, quiz, 'level3', today);
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
    const args = process.argv.slice(2);
    const limit = args[0] ? parseInt(args[0], 10) : 3;
    
    fetchTrends(limit)
        .then(() => process.exit(0))
        .catch(err => {
            console.error('❌ Error:', err.message);
            process.exit(1);
        });
}

module.exports = { fetchTrends };
