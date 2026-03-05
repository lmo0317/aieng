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
        db.get("SELECT glmApiKey, glmModel, groqApiKey, groqModel, provider FROM global_settings WHERE id = 1", (err, row) => {
            if (err) reject(err);
            else resolve({
                glmApiKey: row?.glmApiKey || process.env.GLM_API_KEY,
                glmModel: row?.glmModel || 'glm-4.7-flash',
                groqApiKey: row?.groqApiKey || process.env.GROQ_API_KEY,
                groqModel: row?.groqModel || 'llama-3.3-70b-versatile',
                provider: row?.provider || 'glm'
            });
        });
    });
}

// Global Settings API endpoints
app.get('/api/settings', (req, res) => {
    db.get("SELECT glmApiKey, glmModel, groqApiKey, groqModel, provider FROM global_settings WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        const provider = row?.provider || 'glm';
        let hasApiKey, apiKeyPreview, model;

        if (provider === 'glm') {
            hasApiKey = !!row?.glmApiKey;
            apiKeyPreview = row?.glmApiKey;
            model = row?.glmModel;
        } else if (provider === 'groq') {
            hasApiKey = !!row?.groqApiKey;
            apiKeyPreview = row?.groqApiKey;
            model = row?.groqModel;
        }

        res.json({
            provider,
            hasApiKey,
            apiKeyPreview: apiKeyPreview || null,
            model,
            glmModel: row?.glmModel || 'glm-4.7-flash',
            groqModel: row?.groqModel || 'llama-3.3-70b-versatile'
        });
    });
});

app.post('/api/settings', (req, res) => {
    const { glmApiKey, glmModel, groqApiKey, groqModel, provider } = req.body;

    const updates = [];
    const values = [];

    if (glmApiKey !== undefined) {
        if (!glmApiKey || typeof glmApiKey !== 'string' || glmApiKey.trim().length === 0) {
            return res.status(400).json({ error: '유효한 GLM API Key를 입력해주세요.' });
        }
        updates.push('glmApiKey = ?');
        values.push(glmApiKey.trim());
    }

    if (glmModel !== undefined) {
        if (!['glm-4.7-flash', 'glm-4.7'].includes(glmModel)) {
            return res.status(400).json({ error: '유효하지 않은 GLM 모델입니다.' });
        }
        updates.push('glmModel = ?');
        values.push(glmModel);
    }

    if (groqApiKey !== undefined) {
        if (!groqApiKey || typeof groqApiKey !== 'string' || groqApiKey.trim().length === 0) {
            return res.status(400).json({ error: '유효한 Groq API Key를 입력해주세요.' });
        }
        updates.push('groqApiKey = ?');
        values.push(groqApiKey.trim());
    }

    if (groqModel !== undefined) {
        if (!['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'].includes(groqModel)) {
            return res.status(400).json({ error: '유효하지 않은 Groq 모델입니다.' });
        }
        updates.push('groqModel = ?');
        values.push(groqModel);
    }

    if (provider !== undefined) {
        if (!['glm', 'groq'].includes(provider)) {
            return res.status(400).json({ error: '유효하지 않은 공급자입니다.' });
        }
        updates.push('provider = ?');
        values.push(provider);
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
    db.get("SELECT provider FROM global_settings WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        const provider = row?.provider || 'glm';
        const column = provider === 'glm' ? 'glmApiKey' : 'groqApiKey';

        db.run(`UPDATE global_settings SET ${column} = NULL WHERE id = 1`, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'API Key가 삭제되었습니다.' });
        });
    });
});

// Generate API
app.post('/api/generate', async (req, res) => {
    const { topic, difficulty } = req.body;

    // Get global settings
    const settings = await getGlobalSettings();
    const provider = settings.provider;

    let API_KEY, MODEL, API_URL, headers, requestBody;

    if (provider === 'groq') {
        API_KEY = settings.groqApiKey;
        MODEL = settings.groqModel;
        API_URL = "https://api.groq.com/openai/v1/chat/completions";
        headers = {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json"
        };
        requestBody = {
            model: MODEL,
            messages: [{ role: "user", content: generatePrompt(topic, difficulty) }],
            temperature: 0.7,
            max_tokens: 4096
        };
    } else {
        // Default to GLM
        API_KEY = settings.glmApiKey;
        MODEL = settings.glmModel;
        API_URL = "https://api.z.ai/api/anthropic/v1/messages";
        headers = {
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        };
        requestBody = {
            model: MODEL,
            max_tokens: 4096,
            messages: [{ role: "user", content: generatePrompt(topic, difficulty) }]
        };
    }

    if (!API_KEY) {
        return res.status(400).json({
            error: 'API Key가 설정되지 않았습니다. 설정 페이지에서 API Key를 입력해주세요.'
        });
    }

    try {
        const response = await axios.post(API_URL, requestBody, { headers });

        let content;
        if (provider === 'groq') {
            content = response.data.choices[0].message.content;
        } else {
            content = response.data.content[0].text;
        }

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

function generatePrompt(topic, difficulty) {
    return `
    주제: ${topic}
    난이도: ${difficulty} (level1, level2, level3, level4, level5 중 하나)
    * level1: 초등학교 저학년 수준의 매우 쉬운 단어와 짧고 단순한 문장 (왕초보)
    * level2: 기본적이고 실용적인 일상 단어와 1~2개 절로 이루어진 문장 (초보)
    * level3: 중/고등학교 수준의 어휘, 수식어구 및 접속사가 포함된 꽤 긴 문장 (중급)
    * level4: 성인 영어 시험(TOEIC/IELTS) 수준의 고급 어휘와 복잡한 구조 (고급)
    * level5: 현지인이 자주 사용하는 관용구나 은유, 최상위 학술/전문 어휘가 포함된 복합 문장 (원어민 수준)

    위 주제와 선택된 난이도 수준에 정확히 맞는 영어 문장 10개를 생성해 주세요.

    **매우 중요: 한글 및 영어만 사용 정책 (위반 시 결과 발생)**
    - analysis와 voca의 모든 설명에는 절대로 한자(漢字)를 사용하지 마세요
    - 일본어(가타카나, 히라가나)도 금지합니다
    - 모든 용어와 설명은 한글 또는 영어로만 표현하세요
    - **voca에서 한자 사용 절대 금지**:
      * 금지: "skilled: 숙련된,技가 있는" (한자 포함 ❌)
      * 허용: "skilled: 숙련된, 기술이 있는" (한글만 ✅)
    - 구체적인 금지 단어 예시: 船員(선원), 航行(항해), 漢字(한자), 技(기술), 船(배), 等(등), 語(쪽)
    - 이 정책을 위반하면 결과가 잘못될 수 있습니다

    각 문장에 대해 다음 정보를 포함하는 JSON 배열 형식으로 응답해 주세요:
    1. "en": 영어 문장
    2. "ko": 한글 해석 (각 해석 항목은 한 줄씩 표시)
       - 중요: 고유명사는 원어 발음을 유지하거나 공식 번역명을 사용하세요. 예: "Straw Hat Pirates" → "밀짚모자 해적단", "One Piece" → "원피스"
       - 자연스럽고 유창성 있는 한국어 번역을 사용하세요. 직역보다는 의역을 선호하세요.
       - 일본어 문화 관련 용어는 공식 한국어 번역을 사용하세요
    3. "analysis": 문장 분석 (두 단계로 구성)
       첫 번째 줄: 단어별 품사 분석 (슬래시(/)로 구분)
       형식: "단어(역할) / 단어(역할) / 단어(역할)"
       역할 예시: 주어, 동사, 목적어, 수식어, 접속사, 관계대명사, 전치사, 부사, 관형사, 보어 등

       두 번째 줄부터: 문장 구조와 문법 핵심 포인트 분석 (불렛 포인트)
       다음 내용을 반드시 포함하고 정확하게 설명하세요:

       **절대 금지사항** (오류 시 결과 발생):
       - be동사 뒤에는 보어만 가능합니다. 목적어가 올 수 없습니다.
       - be동사 + 과거분사 = 수동태 (능동태가 아님)
       - 수동태: 주어가 능동을 받을 때. 예: "The treasure is hidden" (보물이 숨겨짐)
       - 능동태: 주어가 직접 행동할 때. 예: "Luffy hides the treasure" (루피가 보물을 숨김)

       **분석 항목**:
       1. 시제: 현재, 과거, 미래 중 명시
       2. 동사 종류: 일반 동사, be동사, 조동사
       3. 문장 타입: 평서문, 의문문, 명령문 등
       4. 수동태: 능동태 또는 수동태 (명확히 판별)
       5. 주어-동사 관계: 수 일치 여부 (3단일, 3인칭 등)
       6. 목적어/보어 구분: 동사 뒤에 오는 것이 무엇인지 정확히 설명

       **올바른 설명 예시**:
       "The treasure is hidden somewhere. / The(관형사) / treasure(주어) / is(be동사, 현재시제) / hidden(과거분사) / somewhere(부사)

       🎯 핵심 문법: 수동태 (be동사 + 과거분사)
       treasure는 스스로 숨는 것이 아니라 누군가에 의해 숨겨졌으므로 수동태입니다.
       구조: 주어 treasure + be동사 is + 과거분사 hidden (수동태 동사구)
       이 문장은 현재시제 수동태 평서문입니다."

       - **중요**: 문법 용어를 반드시 정확하게 사용하세요. 수동태/능동태를 혼동하지 마세요.

    4. "voca": 문장에서 쓰인 단어 중 '너무 쉬운 기초 단어를 제외하고, 사용자가 모를 법한 단어 또는 핵심 단어'들의 배열 (각 단어는 "단어: 뜻" 형태의 문자열)
       - **매우 중요**: 단어 뜻에 절대로 한자(漢字)를 사용하지 마세요!
       - "技", "船員", "航行" 같은 한자를 사용하지 말고 "기술", "선원", "항해"처럼 한글로만 표현하세요
       - 일본어(가타카나, 히라가나)도 금지합니다
       - 위반 시 결과가 발생할 수 있습니다
       - 단어 뜻은 반드시 한글 또는 영어로만 표현하세요

    응답은 반드시 순수한 JSON 형식이어야 하며, 다른 텍스트는 포함하지 마세요.
    각 항목에서 여러 줄로 표시해야 할 때는 \\n (역슬래시+n)을 사용하세요.
    JSON 형식 예시:
    [
      {
        "en": "I love coding in JavaScript because it is versatile.",
        "ko": "나는 자바스크립트로 코딩하는 것을 좋아합니다.\\n왜냐하면 그것은 다재다능하기 때문입니다.",
        "analysis": "I(주어) / love(동사, 현재시제) / coding(동명사, 목적어) / in(전치사) / JavaScript(명사) / because(접속사) / it(주어) / is(be동사, 현재시제) / versatile(형용사 보어)\\n🎯 핵심 문법: 접속사 because로 연결된 복합 문장\\n이 문장은 접속사 because로 연결된 두 개의 독립절입니다.\\n\\n[첫 번째 절]\\n주어: I / 동사: love(현재시제 일반동사) / 목적어: coding(동명사)\\n\\n[두 번째 절]\\n주어: it / 동사: is(be동사 현재형) / 보어: versatile(it의 상태를 설명)\\n\\n전체 문장은 현재시제 능동태 평서문입니다.",
        "voca": ["coding: 코딩, 프로그래밍", "versatile: 다재다능한, 다용도의"]
      },
      {
        "en": "Monkey D. Luffy has a unique ability to stretch his body.",
        "ko": "몽키 D. 루피는 자신의 몸을 늘릴 수 있는 특별한 능력을 가지고 있습니다.",
        "analysis": "Monkey D. Luffy(주어, 고유명사) / has(동사, 현재시제, 3단일단수) / a(관형사) / unique(형용사) / ability(목적어) / to stretch(부정사, ability 수식) / his(소유격 형용사) / body(목적어)\\n🎯 핵심 문법: 3인칭 단수 주어와 일반동사의 수 일치\\nMonkey D. Luffy가 3인칭 단수 주어이므로 동사 has가 3단일 형태로 쓰였습니다.\\n\\n[문장 구조]\\n주어: Monkey D. Luffy / 동사: has(가지고 있다) / 목적어: ability(능력)\\n\\nto stretch(늘리기 위해)는 부정사구로 ability를 수식합니다. stretch의 목적어는 his body(그의 몸)입니다.\\n\\n이 문장은 현재시제 능동태 평서문입니다.",
        "voca": ["unique: 독특한, 유일한", "ability: 능력", "stretch: 늘리다, 펴다", "body: 몸, 신체"]
      }
    ]
    `;
}

// Usage API
app.get('/api/usage', async (req, res) => {
    try {
        const settings = await getGlobalSettings();
        const provider = settings.provider;

        if (provider === 'groq') {
            // Groq doesn't have a public usage API
            return res.json({
                error: 'Groq는 사용량 확인 기능을 제공하지 않습니다.',
                provider: 'groq'
            });
        } else {
            const GLM_API_KEY = settings.glmApiKey;

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
        }
    } catch (error) {
        console.error('Usage Fetch Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch usage info' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
