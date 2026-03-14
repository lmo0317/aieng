const fs = require('fs');
const path = require('path');
const http = require('http');

/**
 * Pop Song 전용 저장 및 서버 동기화 스크립트
 */

// 프로젝트 루트 내의 output 및 tmp 폴더 경로 설정
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const outputDir = path.join(projectRoot, 'output');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function saveAndUpload(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
    const fileName = `song_guide_${timestamp}.json`;
    const filePath = path.join(outputDir, fileName);

    // 1. JSON 파일로 저장
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Saved successfully to output folder: ${filePath}`);

    // 2. 서버로 POST 전송 (각 노래별로 전송)
    data.content.forEach(item => {
        const sentences = item.sentences.map(s => {
            const rawVoca = s.voca || s.vocabulary || [];
            let vocaArray = [];
            if (typeof rawVoca === 'string') {
                vocaArray = rawVoca.split(/,\s*/).map(v => v.trim());
            } else if (Array.isArray(rawVoca)) {
                vocaArray = rawVoca;
            }

            return {
                en: s.en || s.english,
                ko: s.ko || s.korean,
                sentence_structure: s.sentence_structure || s.analysis,
                explanation: s.explanation,
                voca: vocaArray
            };
        });

        // 가사 전문이 따로 없으면 문장들을 합쳐서 보냄
        const lyrics = sentences.map(s => s.en).join('\n');

        const postData = JSON.stringify({
            title: item.news_title,
            lyrics: lyrics,
            difficulty: "level3",
            sentences: sentences,
            image: data.image || item.image || null
        });

        const options = {
            hostname: 'localhost',
            port: 80,
            path: '/api/songs/save',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log(`🚀 Syncing "${item.news_title}" with local server...`);
        const req = http.request(options, (res) => {
            let resBody = '';
            res.on('data', (chunk) => resBody += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✨ Server sync success for: ${item.news_title}`);
                } else {
                    console.error(`❌ Server sync failed for "${item.news_title}" (HTTP ${res.statusCode}): ${resBody}`);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`❌ Error connecting to server for "${item.news_title}": ${e.message}`);
        });

        req.write(postData);
        req.end();
    });
}

// Check if a file path is provided as an argument
let inputData = '';
if (process.argv[2]) {
    const filePath = path.resolve(process.argv[2]);
    if (fs.existsSync(filePath)) {
        inputData = fs.readFileSync(filePath, 'utf8');
        console.log(`📖 Reading from file: ${filePath}`);
    } else {
        console.error(`❌ Error: File not found: ${filePath}`);
        process.exit(1);
    }
} else {
    // Read from stdin as Buffer to handle UTF-8 correctly on Windows
    const inputBuffer = fs.readFileSync(0);
    inputData = inputBuffer.toString('utf8');
}

if (!inputData.trim()) {
    console.error('❌ Error: No input data received.');
    process.exit(1);
}

try {
    const json = JSON.parse(inputData);
    saveAndUpload(json);
} catch (e) {
    console.error('❌ Failed to parse input JSON. Check for unescaped double quotes or control characters.');
    console.error(`Original error: ${e.message}`);
    process.exit(1);
}
