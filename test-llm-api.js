#!/usr/bin/env node

/**
 * LLM API 연결 테스트
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// .env 로드
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

console.log('🔑 API 키 확인:');
console.log(`GEMINI_API_KEY: ${GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);
console.log('');

async function testGeminiAPI() {
    console.log('🧪 Gemini API 테스트 시작...');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    const testPrompt = `다음을 JSON 형식으로만 응답하세요:
{
  "test": "success",
  "message": "테스트 성공"
}`;

    try {
        console.log('📡 API 요청 중...');
        const response = await axios.post(url, {
            contents: [{
                parts: [{ text: testPrompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 100
            }
        });

        console.log('✅ API 응답 수신');
        console.log('Status:', response.status);

        if (response.data.candidates && response.data.candidates[0]) {
            const content = response.data.candidates[0].content.parts[0].text;
            console.log('📝 응답 내용:');
            console.log(content);

            try {
                const parsed = JSON.parse(content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
                console.log('\n✅ JSON 파싱 성공:');
                console.log(JSON.stringify(parsed, null, 2));
                return true;
            } catch (parseErr) {
                console.log('\n⚠️  JSON 파싱 실패:');
                console.log('내용이 JSON 형식이 아닙니다.');
                return false;
            }
        } else {
            console.log('\n❌ 응답에 candidates가 없습니다.');
            console.log('전체 응답:', JSON.stringify(response.data, null, 2));
            return false;
        }
    } catch (error) {
        console.log('\n❌ API 호출 실패:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
        return false;
    }
}

testGeminiAPI().then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
        console.log('✅ 테스트 성공! LLM API가 정상 작동합니다.');
    } else {
        console.log('❌ 테스트 실패! LLM API에 문제가 있습니다.');
        console.log('');
        console.log('해결 방법:');
        console.log('1. .env 파일에서 GEMINI_API_KEY 확인');
        console.log('2. API 키가 유효한지 확인');
        console.log('3. 네트워크 연결 확인');
    }
    process.exit(success ? 0 : 1);
});
