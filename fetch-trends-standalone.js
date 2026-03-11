#!/usr/bin/env node

/**
 * Claude Code CLI 전용 뉴스 트렌드 수집기
 *
 * 이 스크립트는 Claude Code CLI가 직접 실행하며:
 * 1. Google News RSS에서 뉴스 수집
 * 2. LLM API(Gemini/Groq)로 직접 분석
 * 3. 서버의 /api/trends/save로 결과만 전송하여 DB 저장
 *
 * Usage: node fetch-trends-standalone.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 설정 로드
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    const env = {};
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const [key, ...values] = line.split('=');
            if (key && values.length > 0) {
                env[key.trim()] = values.join('=').trim();
            }
        });
    }
    return env;
}

const env = loadEnv();
const GEMINI_API_KEY = env.GEMINI_API_KEY;
const GLM_API_KEY = env.GLM_API_KEY;
const API_BASE = 'http://localhost:3000';

// Google News RSS 카테고리
const CATEGORIES = [
    { name: 'TOP', label: '전체', url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'TEC', label: '테크', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'SPO', label: '스포츠', url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'ENT', label: '연애', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'POL', label: '정치', url: 'https://news.google.com/rss/headlines/section/topic/POLITICS?hl=ko&gl=KR&ceid=KR:ko' }
];

/**
 * RSS에서 뉴스 수집
 */
async function fetchRSS() {
    console.log('📡 Google News RSS 수집 중...');

    const httpsAgent = new (require('https').Agent)({
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
            headers,
            httpsAgent
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
        }
    });

    // 중복 제거 및 셔플 후 상위 10개
    const uniqueTrends = Array.from(new Set(allTrends.map(t => t.title)))
        .map(title => allTrends.find(t => t.title === title))
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);

    console.log(`✅ ${uniqueTrends.length}개 뉴스 수집 완료`);
    return uniqueTrends;
}

/**
 * Gemini API 호출
 */
async function callGemini(prompt, input) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    const response = await axios.post(url, {
        contents: [{
            parts: [{ text: `${prompt}\n\n${input}` }]
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
        }
    });

    if (response.data.candidates && response.data.candidates[0]) {
        return response.data.candidates[0].content.parts[0].text;
    }
    throw new Error('No response from Gemini');
}

/**
 * JSON 파싱 (마크다운 제거)
 */
function cleanAndParseJSON(content) {
    // 마크다운 코드 블록 제거
    let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    // 앞뒤 공백 제거
    cleaned = cleaned.trim();
    return JSON.parse(cleaned);
}

/**
 * 뉴스 분석
 */
async function analyzeTrends(trends) {
    console.log('\n🤖 AI 뉴스 분석 시작...');

    const analyzedTrends = [];

    for (let i = 0; i < trends.length; i++) {
        const trend = trends[i];
        const analysisPrompt = `당신은 뉴스 트렌드 분석 전문가입니다. 다음 뉴스 트렌드를 분석하여 요약과 핵심 키워드를 추출하세요. 반드시 아래 JSON 형식으로만 응답하세요:
{
  "title": "${trend.title}",
  "summary": "요약 내용",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`;

        try {
            const aiContent = await callGemini(analysisPrompt, `${trend.category}: ${trend.title}`);
            const analyzed = cleanAndParseJSON(aiContent);
            analyzedTrends.push({ ...trend, analyzed });
            console.log(`   (${i + 1}/${trends.length}) ${trend.title.substring(0, 30)}...`);
        } catch (err) {
            console.warn(`   ⚠️  분석 실패: ${trend.title}`);
            console.warn(`      Error: ${err.message}`);
            analyzedTrends.push({ ...trend, analyzed: { summary: '', keywords: [] } });
        }

        // 속도 제한 (1.5초)
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return analyzedTrends;
}

/**
 * 학습 문장 생성
 */
async function generateSentences(trends) {
    console.log('\n✍️  학습 문장 생성 시작...');

    for (let i = 0; i < trends.length; i++) {
        const trend = trends[i];

        const prompt = `당신은 영어 교육 전문가입니다. 다음 주제를 바탕으로 한국어 화자를 위한 영어 학습 문장을 만드세요.

주제: ${trend.title}
난이도: level3 (중급)

CRITICAL: 다음 JSON 배열 형식으로만 응답하세요. 마크다운 코드 블록을 사용하지 마세요:
[
  {"en": "English sentence 1", "ko": "한국어 번역 1", "voca": ["vocab1", "vocab2"]},
  {"en": "English sentence 2", "ko": "한국어 번역 2", "voca": ["vocab3", "vocab4"]},
  ...
  {"en": "English sentence 10", "ko": "한국어 번역 10", "voca": ["vocab9", "vocab10"]}
]`;

        try {
            const aiContent = await callGemini(prompt, '');
            const sentences = cleanAndParseJSON(aiContent);

            if (Array.isArray(sentences) && sentences.length === 10) {
                trend.sentences = sentences;
                console.log(`   (${i + 1}/${trends.length}) ${sentences.length}개 문장 생성 완료`);
            } else {
                throw new Error('Invalid sentences format');
            }
        } catch (err) {
            console.warn(`   ⚠️  문장 생성 실패: ${trend.title}`);
            trend.sentences = [];
        }

        // 속도 제한 (2초)
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return trends;
}

/**
 * 서버에 저장
 */
async function saveToServer(trends) {
    console.log('\n💾 서버 DB에 저장 중...');

    try {
        const response = await axios.post(`${API_BASE}/api/trends/save`, {
            trends: trends.map(t => ({
                title: t.title,
                category: t.category,
                summary: t.analyzed?.summary || '',
                keywords: t.analyzed?.keywords || [],
                sentences: t.sentences || [],
                difficulty: 'level3'
            }))
        });

        if (response.data.success) {
            console.log(`✅ ${response.data.count}개 트렌드 저장 완료!`);
            console.log('\n📊 웹 대시보드에서 확인하세요: http://localhost:3000/data.html');
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ 서버 연결 실패: 서버가 실행 중인지 확인하세요 (npm start)');
        } else {
            console.error('❌ 저장 실패:', error.message);
        }
        throw error;
    }
}

/**
 * 메인
 */
async function main() {
    try {
        console.log('========================================');
        console.log('  Claude Code CLI 뉴스 트렌드 수집기');
        console.log('========================================\n');

        // API 키 확인
        if (!GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.');
            process.exit(1);
        }

        // 1. RSS 수집
        const trends = await fetchRSS();

        // 2. AI 분석
        const analyzedTrends = await analyzeTrends(trends);

        // 3. 학습 문장 생성
        const trendsWithSentences = await generateSentences(analyzedTrends);

        // 4. 서버에 저장
        await saveToServer(trendsWithSentences);

        console.log('\n✨ 모든 작업 완료!\n');
    } catch (error) {
        console.error('\n❌ 오류 발생:', error.message);
        process.exit(1);
    }
}

// 실행
if (require.main === module) {
    main();
}

module.exports = { fetchRSS, analyzeTrends, generateSentences, saveToServer };
