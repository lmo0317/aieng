const fs = require('fs');
const path = require('path');
const http = require('http');

// 프로젝트 루트 내의 output 및 tmp 폴더 경로 설정
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const outputDir = path.join(projectRoot, 'output');
const tmpDir = path.join(projectRoot, 'tmp');

// 폴더가 없으면 생성
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

async function saveAndUpload(data) {
    try {
        // 1. 날짜 및 시간 기반 파일명 생성 (YYYYMMDD_HHMMSS)
        const now = new Date();
        const timestamp = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        
        const fileName = `news_guide_${timestamp}.json`;
        const outputPath = path.join(outputDir, fileName);

        // 기본 유효성 검사
        if (!data.title || !Array.isArray(data.content)) {
            throw new Error('Invalid JSON structure: title or content missing.');
        }

        // 2. 파일 저장
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ Saved successfully to output folder: ${outputPath}`);
        
        // C:\Users\lmo03\Downloads\news_guide.json 에도 복사본 유지
        const legacyPath = 'C:\\Users\\lmo03\\Downloads\\news_guide.json';
        fs.writeFileSync(legacyPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ Legacy copy saved to: ${legacyPath}`);

        // 3. 로컬 서버(localhost)에 자동 업데이트 요청
        console.log(`🚀 서버에 데이터 업데이트 요청 중 (localhost:80)...`);
        console.log(`📝 전송 데이터 제목 샘플: ${data.content[0].news_title}`);
        
        const trendsToSave = data.content.map(item => ({
            title: item.news_title,
            category: item.category,
            summary: "",
            keywords: [],
            sentences: item.sentences.map(s => {
                // Determine vocabulary source (voca or vocabulary)
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
            }),
            difficulty: "level3",
            type: "news",
            date: new Date().toISOString().split('T')[0]
        }));

        const postData = JSON.stringify({ trends: trendsToSave });
        
        const options = {
            hostname: 'localhost',
            port: 80, // 기본 포트 80 사용
            path: '/api/trends/save',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(postData, 'utf8')
            }
        };

        const req = http.request(options, (res) => {
            let resData = '';
            res.on('data', (chunk) => resData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(resData);
                    if (result.success) {
                        console.log(`✨ 서버 업데이트 성공! (${trendsToSave.length}개 항목)`);
                    } else {
                        console.error('⚠️ 서버 업데이트 응답 오류:', result.error || '알 수 없는 오류');
                    }
                } catch (e) {
                    console.error('⚠️ 서버 응답 파싱 실패 (서버가 실행 중인지 확인하세요)');
                }
            });
        });

        req.on('error', (e) => {
            console.error(`❌ 서버 연결 실패 (localhost:80): ${e.message}`);
            console.log('💡 서버(npm start)가 실행 중인지 확인해 주세요.');
        });

        req.write(postData, 'utf8');
        req.end();

    } catch (e) {
        console.error(`❌ Error: ${e.message}`);
        process.exit(1);
    }
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
    console.error('❌ Failed to parse input JSON. Check for unescaped double quotes or encoding issues.');
    console.error(`Original error: ${e.message}`);
    process.exit(1);
}

