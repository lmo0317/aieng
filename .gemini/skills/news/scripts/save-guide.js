const fs = require('fs');
const path = require('path');
const http = require('http');

// ?ÑÎ°ú?ùÌä∏ Î£®Ìä∏ ?¥Ïùò output Î∞?tmp ?¥Îçî Í≤ΩÎ°ú ?§Ï†ï
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const outputDir = path.join(projectRoot, 'output');
const tmpDir = path.join(projectRoot, 'tmp');

// ?¥ÎçîÍ∞Ä ?ÜÏúºÎ©??ùÏÑ±
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

async function saveAndUpload(data) {
    try {
        // 1. ?†Ïßú Î∞??úÍ∞Ñ Í∏∞Î∞ò ?åÏùºÎ™??ùÏÑ± (YYYYMMDD_HHMMSS)
        const now = new Date();
        const timestamp = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        
        const fileName = `news_guide_${timestamp}.json`;
        const outputPath = path.join(outputDir, fileName);

        // Í∏∞Î≥∏ ?†Ìö®??Í≤Ä??
        if (!data.title || !Array.isArray(data.content)) {
            throw new Error('Invalid JSON structure: title or content missing.');
        }

        // 2. ?åÏùº ?Ä??
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`??Saved successfully to output folder: ${outputPath}`);
        
        // C:\Users\lmo03\Downloads\news_guide.json ?êÎèÑ Î≥µÏÇ¨Î≥??†Ï? (?†ÌÉù ?¨Ìï≠)
        const legacyPath = 'C:\\Users\\lmo03\\Downloads\\news_guide.json';
        try {
            const legacyDir = path.dirname(legacyPath);
            if (fs.existsSync(legacyDir)) {
                fs.writeFileSync(legacyPath, JSON.stringify(data, null, 2), 'utf8');
                console.log(`??Legacy copy saved to: ${legacyPath}`);
            }
        } catch (err) {
            console.log(`?†Ô∏è Legacy copy skipped: ${err.message}`);
        }

        // 3. Î°úÏª¨ ?úÎ≤Ñ(localhost)???êÎèô ?ÖÎç∞?¥Ìä∏ ?îÏ≤≠
        console.log(`?? ?úÎ≤Ñ???∞Ïù¥???ÖÎç∞?¥Ìä∏ ?îÏ≤≠ Ï§?(localhost:80)...`);
        console.log(`?ìù ?ÑÏÜ° ?∞Ïù¥???úÎ™© ?òÌîå: ${data.content[0].news_title}`);
        
        const trendsToSave = data.content.map(item => ({
            title: item.news_title,
            category: item.category,
            summary: "",
            keywords: item.keywords || [],
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
            port: 80, // Í∏∞Î≥∏ ?¨Ìä∏ 80 ?¨Ïö©
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
                        console.log(`???úÎ≤Ñ ?ÖÎç∞?¥Ìä∏ ?±Í≥µ! (${trendsToSave.length}Í∞???™©)`);
                    } else {
                        console.error('?†Ô∏è ?úÎ≤Ñ ?ÖÎç∞?¥Ìä∏ ?ëÎãµ ?§Î•ò:', result.error || '?????ÜÎäî ?§Î•ò');
                    }
                } catch (e) {
                    console.error('?†Ô∏è ?úÎ≤Ñ ?ëÎãµ ?åÏã± ?§Ìå® (?úÎ≤ÑÍ∞Ä ?§Ìñâ Ï§ëÏù∏ÏßÄ ?ïÏù∏?òÏÑ∏??');
                }
            });
        });

        req.on('error', (e) => {
            console.error(`???úÎ≤Ñ ?∞Í≤∞ ?§Ìå® (localhost:80): ${e.message}`);
            console.log('?í° ?úÎ≤Ñ(npm start)Í∞Ä ?§Ìñâ Ï§ëÏù∏ÏßÄ ?ïÏù∏??Ï£ºÏÑ∏??');
        });

        req.write(postData, 'utf8');
        req.end();

    } catch (e) {
        console.error(`??Error: ${e.message}`);
        process.exit(1);
    }
}

// Check if a file path is provided as an argument
let inputData = '';
if (process.argv[2]) {
    const filePath = path.resolve(process.argv[2]);
    if (fs.existsSync(filePath)) {
        inputData = fs.readFileSync(filePath, 'utf8');
        console.log(`?ìñ Reading from file: ${filePath}`);
    } else {
        console.error(`??Error: File not found: ${filePath}`);
        process.exit(1);
    }
} else {
    // Read from stdin as Buffer to handle UTF-8 correctly on Windows
    const inputBuffer = fs.readFileSync(0);
    inputData = inputBuffer.toString('utf8');
}

if (!inputData.trim()) {
    console.error('??Error: No input data received.');
    process.exit(1);
}

try {
    const json = JSON.parse(inputData);
    saveAndUpload(json);
} catch (e) {
    console.error('??Failed to parse input JSON. Check for unescaped double quotes or encoding issues.');
    console.error(`Original error: ${e.message}`);
    process.exit(1);
}



