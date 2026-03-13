const fs = require('fs');

const outputPath = 'C:\\Users\\lmo03\\Downloads\\news_guide.json';

function saveGuide(data) {
    try {
        // Basic validation
        if (!data.title || !Array.isArray(data.content)) {
            throw new Error('Invalid JSON structure: title or content missing.');
        }

        // Hanja check
        const hanjaRegex = /[\u4e00-\u9fff]/;
        data.content.forEach((article, aIdx) => {
            article.sentences.forEach((sent, sIdx) => {
                if (hanjaRegex.test(sent.explanation) || hanjaRegex.test(sent.korean)) {
                    console.warn(`⚠️ Warning: Hanja found in article ${aIdx + 1}, sentence ${sIdx + 1}`);
                }
            });
        });

        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ Saved successfully: ${outputPath}`);
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
    try {
        const json = JSON.parse(inputData);
        saveGuide(json);
    } catch (e) {
        console.error('❌ Failed to parse input JSON.');
        process.exit(1);
    }
});
