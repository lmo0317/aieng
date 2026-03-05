const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_aieng',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // HTTPS환경이라면 true로 설정
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
        done(err, row);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret',
    callbackURL: "/auth/google/callback"
},
    (accessToken, refreshToken, profile, done) => {
        const { id, displayName, emails, photos } = profile;
        const email = emails && emails.length > 0 ? emails[0].value : '';
        const picture = photos && photos.length > 0 ? photos[0].value : '';

        db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
            if (err) return done(err);
            if (!row) {
                db.run("INSERT INTO users (id, name, email, picture) VALUES (?, ?, ?, ?)",
                    [id, displayName, email, picture], (insertErr) => {
                        if (insertErr) return done(insertErr);
                        return done(null, { id, name: displayName, email, picture });
                    });
            } else {
                return done(null, row);
            }
        });
    }
));

// Auth Routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/');
    });

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ loggedIn: true, user: req.user });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/api/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});


const GLM_API_URL = "https://api.z.ai/api/anthropic/v1/messages";

// Helper function to get API key for a user
async function getApiKeyForUser(userId) {
    return new Promise((resolve, reject) => {
        db.get("SELECT glmApiKey FROM settings WHERE userId = ?", [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.glmApiKey : process.env.GLM_API_KEY);
        });
    });
}

// Helper function to get model for a user
async function getModelForUser(userId) {
    return new Promise((resolve, reject) => {
        db.get("SELECT glmModel FROM settings WHERE userId = ?", [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.glmModel : 'claude-3-5-sonnet-20240620');
        });
    });
}

app.post('/api/generate', async (req, res) => {
    const { topic, difficulty } = req.body;

    // Get API key for user
    let GLM_API_KEY;
    let GLM_MODEL;
    if (req.isAuthenticated()) {
        GLM_API_KEY = await getApiKeyForUser(req.user.id);
        GLM_MODEL = await getModelForUser(req.user.id);
    } else {
        GLM_API_KEY = process.env.GLM_API_KEY;
        GLM_MODEL = 'claude-3-5-sonnet-20240620';
    }

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

        // Anthropic 응답 구조에서 텍스트 추출
        let content = response.data.content[0].text;

        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            content = jsonMatch[0];
        }

        const sentences = JSON.parse(content);

        if (req.isAuthenticated()) {
            const userId = req.user.id;
            const sentencesStr = JSON.stringify(sentences);
            db.get("SELECT * FROM progress WHERE userId = ?", [userId], (err, row) => {
                if (!row) {
                    db.run("INSERT INTO progress (userId, topic, difficulty, currentCount, sentences) VALUES (?, ?, ?, ?, ?)",
                        [userId, topic, difficulty, 0, sentencesStr]);
                } else {
                    db.run("UPDATE progress SET topic = ?, difficulty = ?, currentCount = ?, sentences = ? WHERE userId = ?",
                        [topic, difficulty, 0, sentencesStr, userId]);
                }
            });
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

app.get('/api/usage', async (req, res) => {
    try {
        // Get API key for user
        let GLM_API_KEY;
        if (req.isAuthenticated()) {
            GLM_API_KEY = await getApiKeyForUser(req.user.id);
        } else {
            GLM_API_KEY = process.env.GLM_API_KEY;
        }

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

// Settings API endpoints
app.get('/api/settings', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.get("SELECT glmApiKey, glmModel FROM settings WHERE userId = ?", [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
            hasApiKey: !!row?.glmApiKey,
            apiKeyPreview: row?.glmApiKey ? `${row.glmApiKey.substring(0, 8)}...${row.glmApiKey.substring(row.glmApiKey.length - 4)}` : null,
            model: row?.glmModel || 'claude-3-5-sonnet-20240620'
        });
    });
});

app.post('/api/settings', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { glmApiKey, glmModel } = req.body;

    db.get("SELECT * FROM settings WHERE userId = ?", [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

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
            if (!['claude-3-5-sonnet-20240620', 'glm-4.7-flash', 'glm-4.7'].includes(glmModel)) {
                return res.status(400).json({ error: '유효하지 않은 모델입니다.' });
            }
            updates.push('glmModel = ?');
            values.push(glmModel);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: '업데이트할 항목이 없습니다.' });
        }

        values.push(req.user.id);

        if (row) {
            // Update existing
            db.run(`UPDATE settings SET ${updates.join(', ')} WHERE userId = ?`, values, (updateErr) => {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ success: true, message: '설정이 업데이트되었습니다.' });
            });
        } else {
            // Insert new
            db.run("INSERT INTO settings (userId, glmApiKey, glmModel) VALUES (?, ?, ?)",
                [req.user.id, glmApiKey?.trim() || null, glmModel || 'claude-3-5-sonnet-20240620'], (insertErr) => {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                res.json({ success: true, message: '설정이 저장되었습니다.' });
            });
        }
    });
});

app.delete('/api/settings', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.run("DELETE FROM settings WHERE userId = ?", [req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'API Key가 삭제되었습니다.' });
    });
});

app.get('/api/progress', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    db.get("SELECT * FROM progress WHERE userId = ?", [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.sentences) {
            row.sentences = JSON.parse(row.sentences);
            res.json({ hasProgress: true, progress: row });
        } else {
            res.json({ hasProgress: false });
        }
    });
});

app.post('/api/progress', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { currentCount } = req.body;
    db.run("UPDATE progress SET currentCount = ? WHERE userId = ?", [currentCount, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
