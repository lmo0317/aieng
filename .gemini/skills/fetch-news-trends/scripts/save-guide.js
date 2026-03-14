const fs = require('fs');
const path = require('path');

// 프로젝트 루트 내의 output 및 tmp 폴더 경로 설정
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const outputDir = path.join(projectRoot, 'output');
const tmpDir = path.join(projectRoot, 'tmp');

// 폴더가 없으면 생성
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

function saveGuide(data) {
    try {
        // 날짜 및 시간 기반 파일명 생성 (YYYYMMDD_HHMMSS)
        const now = new Date();
        const timestamp = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        
        const fileName = `news_guide_${timestamp}.json`;
        const outputPath = path.join(outputDir, fileName);

        // Basic validation
        if (!data.title || !Array.isArray(data.content)) {
            throw new Error('Invalid JSON structure: title or content missing.');
        }

        // Hanja check
        const hanjaRegex = /[\u4e00-\u9fff]/;
        data.content.forEach((article, aIdx) => {
            article.sentences.forEach((sent, sIdx) => {
                if (hanjaRegex.test(sent.explanation) || hanjaRegex.test(sent.korean)) {
                    console.warn(`⚠️ Warning: Hanja found in article ${article.news_title}, sentence ${sIdx + 1}`);
                }
            });
        });

        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ Saved successfully to output folder: ${outputPath}`);
        
        // C:\Users\lmo03\Downloads\news_guide.json 에도 복사본 유지 (호환성용)
        const legacyPath = 'C:\\Users\\lmo03\\Downloads\\news_guide.json';
        fs.writeFileSync(legacyPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ Legacy copy saved to: ${legacyPath}`);

    } catch (e) {
        console.error(`❌ Error: ${e.message}`);
        process.exit(1);
    }
}

// Read from stdin
let inputData = '';
process.stdin.on('data', chunk => {
    inputData += chunk;
});

process.stdin.on('end', () => {
    if (!inputData.trim()) {
        console.error('❌ Error: No input data received.');
        process.exit(1);
    }
    try {
        const json = JSON.parse(inputData);
        saveGuide(json);
    } catch (e) {
        console.error('❌ Failed to parse input JSON.');
        process.exit(1);
    }
});
