#!/usr/bin/env node

/**
 * Claude Code CLI 전용 뉴스 트렌드 수집기 (10개 수집 복구 버전)
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
const API_BASE = 'http://localhost:80';

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
            matches.slice(1, 10).forEach(m => {
                let title = m.replace(/<title>(.*?)<\/title>/, '$1').split(' - ')[0];
                title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                const cleanTitle = title.trim();
                if (cleanTitle.length > 10) {
                    allTrends.push({ category: CATEGORIES[index].label, title: cleanTitle });
                }
            });
        }
    });

    // 중복 제거 및 셔플 후 상위 10개 (기존 요구사항 복구)
    const uniqueTrends = Array.from(new Set(allTrends.map(t => t.title)))
        .map(title => allTrends.find(t => t.title === title))
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);

    console.log(`✅ ${uniqueTrends.length}개 뉴스 수집 완료`);
    return uniqueTrends;
}

/**
 * Gemini API 호출 (재시도 로직 포함)
 */
async function callGemini(prompt, input, retryCount = 0) {
    // gemini-2.0-flash 모델 사용 (안정성 확보)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await axios.post(url, {
            contents: [{
                parts: [{ text: `${prompt}\n\n${input}` }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096
            }
        });

        if (response.data.candidates && response.data.candidates[0]) {
            return response.data.candidates[0].content.parts[0].text;
        }
        throw new Error('No response from Gemini');
    } catch (error) {
        if (error.response && error.response.status === 429 && retryCount < 3) {
            const waitTime = Math.pow(2, retryCount + 1) * 10000; // 20초, 40초, 80초 대기
            console.log(`   ⚠️ Rate limit (429) 감지. ${waitTime/1000}초 후 재시도 (${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return callGemini(prompt, input, retryCount + 1);
        }
        throw error;
    }
}

/**
 * JSON 파싱 (마크다운 제거)
 */
function cleanAndParseJSON(content) {
    let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    cleaned = cleaned.trim();
    // 가끔 AI가 JSON 외의 텍스트를 붙이는 경우 대비
    const startBracket = cleaned.indexOf('[');
    const startBrace = cleaned.indexOf('{');
    const startIdx = (startBracket !== -1 && (startBrace === -1 || startBracket < startBrace)) ? startBracket : startBrace;
    const endBracket = cleaned.lastIndexOf(']');
    const endBrace = cleaned.lastIndexOf('}');
    const endIdx = (endBracket !== -1 && (endBrace === -1 || endBracket > endBrace)) ? endBracket : endBrace;
    
    if (startIdx !== -1 && endIdx !== -1) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
    
    return JSON.parse(cleaned);
}

/**
 * 뉴스 분석
 */
async function analyzeTrends(trends) {
    console.log('\n🤖 AI 뉴스 분석 시작 (안전 지연 시간 적용)...');

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
            console.log(`   (${i + 1}/${trends.length}) 분석 중: ${trend.title.substring(0, 40)}...`);
            const aiContent = await callGemini(analysisPrompt, `${trend.category}: ${trend.title}`);
            const analyzed = cleanAndParseJSON(aiContent);
            analyzedTrends.push({ ...trend, analyzed });
        } catch (err) {
            console.warn(`   ⚠️  분석 실패: ${trend.title}`);
            console.warn(`      Error: ${err.message}`);
            analyzedTrends.push({ ...trend, analyzed: { summary: '', keywords: [] } });
        }

        // 429 방지를 위해 8초 대기
        await new Promise(resolve => setTimeout(resolve, 8000));
    }

    return analyzedTrends;
}

/**
 * 학습 문장 생성
 */
async function generateSentences(trends) {
    console.log('\n✍️  학습 문장 생성 시작 (안전 지연 시간 적용)...');

    for (let i = 0; i < trends.length; i++) {
        const trend = trends[i];
        if (!trend.analyzed || !trend.analyzed.summary) continue;

        const prompt = `당신은 영어 교육 전문가입니다. 다음 주제를 바탕으로 한국어 화자를 위한 영어 학습 문장을 만드세요.

주제: ${trend.title}
난이도: level3 (중급)

중요: 반드시 아래 JSON 배열 형식으로만 응답하세요. 마크다운 코드 블록 없이 순수 JSON만 출력하세요.
[
  {"en": "English sentence 1", "ko": "한국어 번역 1", "voca": ["word1: 뜻1"]},
  ...
  {"en": "English sentence 10", "ko": "한국어 번역 10", "voca": ["word10: 뜻10"]}
]`;

        try {
            console.log(`   (${i + 1}/${trends.length}) 문장 10개 생성 중...`);
            const aiContent = await callGemini(prompt, '');
            const sentences = cleanAndParseJSON(aiContent);
            trend.sentences = sentences;
        } catch (err) {
            console.warn(`   ⚠️  문장 생성 실패: ${trend.title}`);
            trend.sentences = [];
        }

        // 429 방지를 위해 10초 대기
        await new Promise(resolve => setTimeout(resolve, 10000));
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
            console.log('\n📊 웹 대시보드: http://localhost:80/data.html');
        }
    } catch (error) {
        console.error('❌ 저장 실패:', error.message);
    }
}

/**
 * 메인
 */
async function main() {
    try {
        console.log('========================================');
        console.log('  Claude Code CLI 뉴스 트렌드 수집기 (10개)');
        console.log('========================================\n');

        if (!GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY 미설정');
            process.exit(1);
        }

        const trends = await fetchRSS();
        if (trends.length === 0) return;

        const analyzed = await analyzeTrends(trends);
        const withSentences = await generateSentences(analyzed);
        await saveToServer(withSentences);

        console.log('\n✨ 모든 작업이 완료되었습니다!\n');
    } catch (error) {
        console.error('\n❌ 치명적 오류:', error.message);
        process.exit(1);
    }
}

main();
