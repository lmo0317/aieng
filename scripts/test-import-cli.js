#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');

const API_URL = 'http://localhost';
const API_PORT = process.env.PORT || 80;

// Test with the JSON file
const jsonFilePath = process.argv[2] || path.join('C:\\Users\\lmo03\\Downloads', 'news_english_guide_3.json');

console.log('📰 뉴스 JSON 가져오기 CLI 테스트');
console.log('='.repeat(50));
console.log(`파일: ${jsonFilePath}`);
console.log(`API: http://localhost:${API_PORT}/api/trends/import`);
console.log('='.repeat(50));

// Read JSON file
fs.readFile(jsonFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('❌ 파일 읽기 실패:', err.message);
        process.exit(1);
    }

    try {
        const jsonData = JSON.parse(data);
        console.log(`\n✅ JSON 파싱 성공`);
        console.log(`제목: ${jsonData.title}`);
        console.log(`기사 수: ${jsonData.content.length}개`);

        // Prepare API request
        const postData = JSON.stringify(jsonData);

        const options = {
            hostname: 'localhost',
            port: API_PORT,
            path: '/api/trends/import',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log(`\n📡 API 요청 전송 중...`);

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log(`\n📥 응답 수신 (상태 코드: ${res.statusCode})`);

                try {
                    const result = JSON.parse(responseData);

                    if (res.statusCode === 200 && result.success) {
                        console.log(`\n✅ 성공적으로 가져왔습니다!`);
                        console.log(`총: ${result.total}개`);
                        console.log(`가져온: ${result.imported}개`);

                        if (result.errors && result.errors.length > 0) {
                            console.log(`\n⚠️ 오류 (${result.errors.length}개):`);
                            result.errors.slice(0, 5).forEach(err => {
                                console.log(`  - ${err.title || '알 수 없음'}: ${err.error || err.message}`);
                            });
                            if (result.errors.length > 5) {
                                console.log(`  ...외 ${result.errors.length - 5}개`);
                            }
                        }
                    } else {
                        console.log(`\n❌ 가져오기 실패:`);
                        console.log(result.error || '알 수 없는 오류');
                    }
                } catch (parseError) {
                    console.log(`\n❌ 응답 파싱 실패:`);
                    console.log(responseData);
                }

                console.log('\n' + '='.repeat(50));
                process.exit(res.statusCode === 200 ? 0 : 1);
            });
        });

        req.on('error', (error) => {
            console.error(`\n❌ 요청 실패: ${error.message}`);
            console.log('\n서버가 실행 중인지 확인하세요 (npm start)');
            process.exit(1);
        });

        req.write(postData);
        req.end();

    } catch (parseError) {
        console.error('❌ JSON 파싱 실패:', parseError.message);
        process.exit(1);
    }
});
