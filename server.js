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

// Helper function to get global settings
async function getGlobalSettings() {
    return new Promise((resolve, reject) => {
        db.get("SELECT glmApiKey, glmModel FROM global_settings WHERE id = 1", (err, row) => {
            if (err) reject(err);
            else resolve({
                apiKey: row?.glmApiKey || process.env.GLM_API_KEY,
                model: row?.glmModel || 'glm-4.7-flash'
            });
        });
    });
}

// Global Settings API endpoints
app.get('/api/settings', (req, res) => {
    db.get("SELECT glmApiKey, glmModel FROM global_settings WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
            hasApiKey: !!row?.glmApiKey,
            apiKeyPreview: row?.glmApiKey || null, // 전체 키를 그대로 전송
            model: row?.glmModel || 'glm-4.7-flash'
        });
    });
});

app.post('/api/settings', (req, res) => {
    const { glmApiKey, glmModel } = req.body;

    const updates = [];
    const values = [];

    if (glmApiKey !== undefined) {
        if (!glmApiKey || typeof glmApiKey !== 'string' || glmApiKey.trim().length === 0) {
            return res.status(400).json({ error: '유효한 API Key를 입력해주세요.' });
        }
        updates.push('glmApiKey = ?');
        values.push(glmApiKey.trim());
    }

    if (glmModel !== undefined) {
        if (!['glm-4.7-flash', 'glm-4.7'].includes(glmModel)) {
            return res.status(400).json({ error: '유효하지 않은 모델입니다.' });
        }
        updates.push('glmModel = ?');
        values.push(glmModel);
    }

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
    db.run("UPDATE global_settings SET glmApiKey = NULL WHERE id = 1", (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'API Key가 삭제되었습니다.' });
    });
});

// Generate API
app.post('/api/generate', async (req, res) => {
    const { topic, difficulty } = req.body;

    // Get global settings
    const settings = await getGlobalSettings();
    const GLM_API_KEY = settings.apiKey;
    const GLM_MODEL = settings.model;
    const GLM_API_URL = "https://api.z.ai/api/anthropic/v1/messages";

    if (!GLM_API_KEY) {
        return res.status(400).json({
            error: 'API Key가 설정되지 않았습니다. 설정 페이지에서 API Key를 입력해주세요.'
        });
    }

    const prompt = `
    주제: ${topic}
    난이도: ${difficulty} (level1, level2, level3, level4, level5 중 하나)
    * level1: 초등학교 저학년 수준의 매우 쉬운 단어와 짧고 단순한 문장 (왕초보)
    * level2: 기본적이고 실용적인 일상 단어와 1~2개 절로 이루어진 문장 (초보)
    * level3: 중/고등학교 수준의 어휘, 수식어구 및 접속사가 포함된 꽤 긴 문장 (중급)
    * level4: 성인 영어 시험(TOEIC/IELTS) 수준의 고급 어휘와 복잡한 구조 (고급)
    * level5: 현지인이 자주 사용하는 관용구나 은유, 최상위 학술/전문 어휘가 포함된 복합 문장 (원어민 수준)

    위 주제와 선택된 난이도 수준에 정확히 맞는 영어 문장 10개를 생성해 주세요.
    각 문장에 대해 다음 정보를 포함하는 JSON 배열 형식으로 응답해 주세요:
    1. "en": 영어 문장
    2. "ko": 한글 해석
    3. "analysis": 문장 구조 분석 (주어, 동사, 목적어, 관계사 등을 분리해서 상세히 설명)
    4. "voca": 문장에서 쓰인 단어 중 '너무 쉬운 기초 단어를 제외하고, 사용자가 모를 법한 단어 또는 핵심 단어'들의 배열 (각 단어는 "단어: 뜻" 형태의 문자열)

    응답은 반드시 순수한 JSON 형식이어야 하며, 다른 텍스트는 포함하지 마세요.
    JSON 형식 예시:
    [
      {
        "en": "I love coding in JavaScript because it is versatile.",
        "ko": "나는 자바스크립트로 코딩하는 것을 좋아하는데, 왜냐하면 그것은 다재다능하기 때문이다.",
        "analysis": "I (주어) + love (동사) + coding in JavaScript (목적어) + because (접속사) + it (주어) + is (동사) + versatile (보어)",
        "voca": ["coding: 코딩", "versatile: 다재다능한, 다용도의"]
      }
    ]
    `;

    try {
        const response = await axios.post(
            GLM_API_URL,
            {
                model: GLM_MODEL,
                max_tokens: 4096,
                messages: [{ role: "user", content: prompt }]
            },
            {
                headers: {
                    "x-api-key": GLM_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                }
            }
        );

        let content = response.data.content[0].text;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            content = jsonMatch[0];
        }

        const sentences = JSON.parse(content);
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
app.get('/api/usage', async (req, res) => {
    try {
        const settings = await getGlobalSettings();
        const GLM_API_KEY = settings.apiKey;

        if (!GLM_API_KEY) {
            return res.json({ error: 'API Key가 설정되지 않았습니다.' });
        }

        const response = await axios.get(
            "https://api.z.ai/api/monitor/usage/quota/limit",
            {
                headers: {
                    "Authorization": `Bearer ${GLM_API_KEY}`
                }
            }
        );
        console.log('Usage API Response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Usage Fetch Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch usage info' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
