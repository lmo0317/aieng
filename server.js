const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const db = require('./database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const DEFAULT_PROMPT = `주제: {topic}
난이도: {difficulty} (level1: 왕초보, level2: 초보, level3: 중급, level4: 고급, level5: 원어민 수준)

위 주제와 선택된 난이도 수준에 정확히 맞는 영어 문장 10개를 생성해 주세요.
각 문장에 대해 다음 6가지 요구 조건을 충족하여 JSON 배열 형식으로 응답해 주세요:

1. "en": 입력한 주제 기반으로 선택한 레벨에 맞는 난이도의 영어 문장
2. "ko": 해당 영어 문장에 대한 자연스러운 한국어 해석
3. "parts_of_speech": 영어 문장의 핵심 단어별 품사 분리 (예: "I(대명사) / love(동사) / coding(명사)")
   - **중요**: 마침표, 쉼표 등 구두점이나 숫자(수사), 단순 관사(a, an, the) 등은 품사 분석에서 제외하고 핵심 성분(명사, 동사, 형용사, 부사, 전치사, 접속사 등)만 분석하세요.
4. "sentence_structure": 문장의 형식(1~5형식)과 주요 문장 성분(주어, 동사, 목적어, 보어, 수식어 등)을 분석해 주세요. (예: "3형식 / 주어: I, 동사: love, 목적어: coding")
5. "explanation": 이 영어 문장을 한국어로 어떻게 해석해야 하는지에 대한 자세한 설명 (문장 구조, 문법적 특징, 해석 팁 등)
6. "voca": 문장에 쓰인 핵심 단어와 숙어 표현 정리 (예: ["word: 뜻", "idiom: 뜻"])

**주의사항**:
- 모든 설명과 단어 뜻은 한글 또는 영어로만 작성하세요 (한자 및 일본어 절대 금지).
- 응답은 반드시 순수한 JSON 배열 형식이어야 합니다.

JSON 형식 예시:
[
  {
    "en": "I love coding in JavaScript because it is versatile.",
    "ko": "나는 자바스크립트로 코딩하는 것을 좋아합니다. 왜냐하면 그것은 다재다능하기 때문입니다.",
    "parts_of_speech": "I(대명사) / love(동사) / coding(동명사) / in(전치사) / JavaScript(고유명사) / because(접속사) / it(대명사) / is(be동사) / versatile(형용사)",
    "sentence_structure": "3형식 / 주어: I, 동사: love, 목적어: coding, 수식어: in JavaScript (종속절: because it is versatile)",
    "explanation": "이 문장은 접속사 because를 기준으로 두 개의 절로 나뉩니다. 첫 번째 절에서는 'I love coding'으로 주어+동사+목적어의 구조를 가지며, 'in JavaScript'가 수식어로 붙었습니다. 두 번째 절은 'it is versatile'로 주어+be동사+보어의 구조입니다. 앞에서부터 차례대로 해석하되, because 부분을 '왜냐하면 ~이기 때문이다'로 연결하면 자연스럽습니다.",
    "voca": ["coding: 코딩, 프로그래밍", "versatile: 다재다능한, 다용도의"]
  }
]`;

// Helper function to get global settings
async function getGlobalSettings() {
    return new Promise((resolve, reject) => {
        db.get("SELECT geminiApiKey, geminiModel, systemPrompt FROM global_settings WHERE id = 1", (err, row) => {
            if (err) reject(err);
            else resolve({
                geminiApiKey: row?.geminiApiKey || process.env.GEMINI_API_KEY,
                geminiModel: row?.geminiModel || 'gemini-2.5-flash',
                systemPrompt: row?.systemPrompt || DEFAULT_PROMPT
            });
        });
    });
}

// Global Settings API endpoints
app.get('/api/settings', (req, res) => {
    db.get("SELECT geminiApiKey, geminiModel, systemPrompt FROM global_settings WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
            provider: 'gemini',
            hasApiKey: !!row?.geminiApiKey,
            apiKeyPreview: row?.geminiApiKey || null,
            model: row?.geminiModel || 'gemini-2.5-flash',
            systemPrompt: row?.systemPrompt || DEFAULT_PROMPT
        });
    });
});

app.post('/api/settings', (req, res) => {
    const { geminiApiKey, geminiModel, systemPrompt } = req.body;

    const updates = [];
    const values = [];

    if (geminiApiKey !== undefined) {
        if (!geminiApiKey || typeof geminiApiKey !== 'string' || geminiApiKey.trim().length === 0) {
            return res.status(400).json({ error: '유효한 Gemini API Key를 입력해주세요.' });
        }
        updates.push('geminiApiKey = ?');
        values.push(geminiApiKey.trim());
    }

    if (geminiModel !== undefined) {
        const validGeminiModels = ['gemini-2.5-flash', 'gemini-3.1-flash-lite-preview'];
        if (!validGeminiModels.includes(geminiModel)) {
            return res.status(400).json({ error: `유효하지 않은 Gemini 모델입니다: ${geminiModel}` });
        }
        updates.push('geminiModel = ?');
        values.push(geminiModel);
    }

    if (systemPrompt !== undefined) {
        if (systemPrompt === 'RESET') {
            updates.push('systemPrompt = ?');
            values.push(null);
        } else {
            updates.push('systemPrompt = ?');
            values.push(systemPrompt);
        }
    }

    // Since we only use Gemini now, we can enforce the provider column if it exists.
    updates.push('provider = ?');
    values.push('gemini');

    if (updates.length === 0) {
        return res.status(400).json({ error: '업데이트할 항목이 없습니다.' });
    }

    values.push(1); // id = 1 for global settings

    const sql = `UPDATE global_settings SET ${updates.join(', ')} WHERE id = ?`;
    db.run(sql, values, function(updateErr) {
        if (updateErr) {
            console.error('DB UPDATE Error:', updateErr);
            return res.status(500).json({ error: updateErr.message });
        }
        console.log('Global settings updated successfully');
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

    // Get global settings
    const settings = await getGlobalSettings();
    const API_KEY = settings.geminiApiKey;
    const MODEL = settings.geminiModel;
    let PROMPT_TEMPLATE = settings.systemPrompt || DEFAULT_PROMPT;

    if (!API_KEY) {
        return res.status(400).json({
            error: 'API Key가 설정되지 않았습니다. 설정 페이지에서 API Key를 입력해주세요.'
        });
    }

    const finalPrompt = PROMPT_TEMPLATE.replace(/{topic}/g, topic).replace(/{difficulty}/g, difficulty);

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const headers = {
        "Content-Type": "application/json"
    };
    const requestBody = {
        contents: [{
            parts: [{ text: finalPrompt }]
        }],
        generationConfig: {
            temperature: 0.2, // 안정적인 출력을 위해 온도 낮춤
            maxOutputTokens: 8192
        }
    };

    try {
        const response = await axios.post(API_URL, requestBody, { headers });

        let content = response.data.candidates[0].content.parts[0].text;

        // 1단계: 마크다운 및 불필요한 공백 제거
        content = content.replace(/^```(json)?/im, '').replace(/```$/m, '').trim();

        // 2단계: 배열 형태 '[ ... ]' 추출
        const firstBracket = content.indexOf('[');
        if (firstBracket !== -1) {
            content = content.substring(firstBracket);
        }

        let sentences = [];
        try {
            // 3단계: 정상 파싱 시도
            const lastBracket = content.lastIndexOf(']');
            let parseTarget = content;
            if (lastBracket !== -1) {
                parseTarget = content.substring(0, lastBracket + 1);
            }
            sentences = JSON.parse(parseTarget);
        } catch (e) {
            console.warn('JSON Parse Error, attempting advanced auto-recovery...');
            
            let recovered = false;
            let tempContent = content;
            
            // 4단계: 뒤에서부터 '}' 를 찾아, 그 부분까지만 남기고 ']' 로 닫아서 완벽한 객체들만 살림
            while (tempContent.length > 50) {
                const lastBrace = tempContent.lastIndexOf('}');
                if (lastBrace === -1) break;
                
                tempContent = tempContent.substring(0, lastBrace + 1);
                
                try {
                    sentences = JSON.parse(tempContent + ']');
                    recovered = true;
                    console.log('JSON auto-recovered successfully by truncating incomplete objects!');
                    break;
                } catch (err) {
                    // 파싱 실패시 마지막 '}' 문자를 제거하고 다시 그 앞의 '}'를 찾도록 함
                    tempContent = tempContent.substring(0, tempContent.length - 1);
                }
            }

            if (!recovered || !Array.isArray(sentences) || sentences.length === 0) {
                throw new Error('문장 생성 중 AI가 응답을 중간에 중단했습니다. 다시 시도해주세요.');
            }
        }

        res.json({ sentences });

    } catch (error) {
        console.error('API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: 'Failed to generate sentences',
            details: error.response ? error.response.data : error.message
        });
    }
});

// Usage API
app.get('/api/usage', (req, res) => {
    res.json({
        error: 'Gemini는 현재 사용량 확인 기능을 제공하지 않습니다.',
        provider: 'gemini'
    });
});

// Trends API - 다양한 카테고리(경제, 연예, 스포츠, 기술) 뉴스 골고루 수집 및 정제
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
            categories.map(cat => axios.get(cat.url, { 
                timeout: 5000, 
                headers: { 'User-Agent': 'Mozilla/5.0' } 
            }))
        );

        let allTrends = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const categoryName = categories[index].name;
                const xml = result.value.data;
                const titleMatches = xml.match(/<title>(.*?)<\/title>/g) || [];
                
                const categoryTitles = titleMatches
                    .slice(1, 10) // 수집 범위를 10개로 확대
                    .map(m => {
                        let title = m.replace(/<title>(.*?)<\/title>/, '$1').split(' - ')[0];
                        title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                        return {
                            category: categoryName,
                            title: title.trim()
                        };
                    })
                    .filter(item => {
                        // "Google 뉴스" 및 기타 무의미한 제목 필터링 (로직 오류 수정)
                        const genericTerms = ['Google 뉴스', 'Google News', '속보', '오늘의 뉴스', '게시판', '종합', '동영상'];
                        const isGeneric = genericTerms.some(term => item.title.includes(term));
                        return item.title.length > 10 && !isGeneric;
                    });
                
                allTrends = [...allTrends, ...categoryTitles];
            }
        });

        // 제목 기준 중복 제거 및 무의미한 기사 추가 필터링
        const uniqueTitles = new Map();
        allTrends.forEach(item => {
            if (!uniqueTitles.has(item.title) && !item.title.startsWith('Google')) {
                uniqueTitles.set(item.title, item);
            }
        });
        
        let finalTrends = Array.from(uniqueTitles.values());

        // 무작위로 섞기
        finalTrends = finalTrends.sort(() => Math.random() - 0.5);

        // 부족한 경우 fallback으로 채우기 (최소 10개 보장)
        if (finalTrends.length < 10) {
            const extra = fallbacks.filter(f => !uniqueTitles.has(f.title));
            finalTrends = [...finalTrends, ...extra];
        }
        
        // 정확히 10개만 추출
        finalTrends = finalTrends.slice(0, 10);

        res.json({ trends: finalTrends });
    } catch (error) {
        console.error('Trends API Error (Using Fallback):', error.message);
        res.json({ trends: fallbacks });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
