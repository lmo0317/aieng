#!/usr/bin/env node

/**
 * Trend Eng CLI Tool
 * 웹과 동일한 뉴스 트렌드 수집 기능을 CLI에서 제공합니다.
 *
 * Usage:
 *   node cli-fetch-trends.js              # 뉴스 트렌드 수집
 *   node cli-fetch-trends.js --song <title> <lyrics> <difficulty>  # 팝송 저장
 */

const axios = require('axios');
const http = require('http');

const API_BASE = 'http://localhost:3000';

/**
 * SSE 이벤트 리스너
 */
async function listenToSEvents(onMessage) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/trends/events',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let buffer = '';

            res.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                lines.forEach((line) => {
                    if (line.trim().startsWith('data:')) {
                        const data = line.trim().substring(5).trim();
                        if (data) {
                            try {
                                const parsed = JSON.parse(data);
                                onMessage(parsed);
                            } catch (e) {
                                // JSON 파싱 실패 시 무시
                            }
                        }
                    }
                });
            });

            res.on('end', () => {
                resolve();
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * 뉴스 트렌드 수집
 */
async function fetchTrends() {
    console.log('🔍 실시간 뉴스 트렌드 수집 시작...\n');

    let completed = false;
    let lastMessage = '';

    // SSE 이벤트 리스너 시작
    const eventPromise = listenToSEvents((data) => {
        const { status, message, current, total } = data;

        if (status === 'complete') {
            console.log(`\n✅ ${message}`);
            completed = true;
        } else if (status === 'error') {
            console.log(`\n❌ ${message}`);
            completed = true;
        } else if (message && message !== lastMessage) {
            // 진행 상황 표시
            if (status === 'fetching') {
                console.log(`📡 ${message}`);
            } else if (status === 'analyzing') {
                const progress = total > 0 ? Math.round((current / total) * 100) : 0;
                console.log(`🤖 ${message} [${progress}%]`);
            } else if (status === 'generating') {
                const progress = total > 0 ? Math.round((current / total) * 100) : 0;
                console.log(`✍️  ${message} [${progress}%]`);
            }
            lastMessage = message;
        }
    });

    // API 호출
    try {
        const response = await axios.post(`${API_BASE}/api/trends/fetch`, {
            headers: { 'Content-Type': 'application/json' }
        });

        // SSE 완료 대기 (최대 5분)
        const timeout = setTimeout(() => {
            console.log('\n⏱️  타임아웃: 진행 상황 확인을 종료합니다.');
            completed = true;
        }, 300000); // 5분

        await eventPromise;
        clearTimeout(timeout);

        if (response.data.success) {
            console.log('\n✨ 트렌드가 성공적으로 DB에 저장되었습니다!');
            console.log('📊 웹 대시보드에서 확인하세요: http://localhost:3000/data.html');
        }
    } catch (error) {
        if (error.response) {
            console.error(`\n❌ API 오류: ${error.response.data.error || error.message}`);
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\n❌ 서버 연결 실패: 서버가 실행 중인지 확인하세요.');
            console.error('   서버 시작: npm start 또는 node server.js');
        } else {
            console.error(`\n❌ 오류: ${error.message}`);
        }
        process.exit(1);
    }
}

/**
 * 팝송 저장
 */
async function saveSong(title, lyrics, difficulty = 'level3') {
    console.log('🎶 팝송 저장 및 AI 분석 시작...\n');
    console.log(`📝 곡 제목: ${title}`);
    console.log(`📚 난이도: ${difficulty}\n`);

    let completed = false;

    // SSE 이벤트 리스너
    const eventPromise = listenToSEvents((data) => {
        const { status, message } = data;

        if (status === 'complete') {
            console.log(`\n✅ ${message}`);
            completed = true;
        } else if (status === 'error') {
            console.log(`\n❌ ${message}`);
            completed = true;
        } else if (status === 'analyzing' && message) {
            console.log(`🤖 ${message}`);
        }
    });

    try {
        const response = await axios.post(`${API_BASE}/api/songs/fetch`, {
            title,
            lyrics,
            difficulty
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const timeout = setTimeout(() => {
            console.log('\n⏱️  타임아웃: 진행 상황 확인을 종료합니다.');
            completed = true;
        }, 180000); // 3분

        await eventPromise;
        clearTimeout(timeout);

        if (response.data.success) {
            console.log('\n✨ 팝송이 성공적으로 DB에 저장되었습니다!');
            console.log('📊 웹 대시보드에서 확인하세요: http://localhost:3000/data.html');
        }
    } catch (error) {
        if (error.response) {
            console.error(`\n❌ API 오류: ${error.response.data.error || error.message}`);
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\n❌ 서버 연결 실패: 서버가 실행 중인지 확인하세요.');
        } else {
            console.error(`\n❌ 오류: ${error.message}`);
        }
        process.exit(1);
    }
}

/**
 * 메인
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // 뉴스 트렌드 수집
        await fetchTrends();
    } else if (args[0] === '--song' || args[0] === '-s') {
        // 팝송 저장
        if (args.length < 3) {
            console.error('사용법: node cli-fetch-trends.js --song <제목> <가사> [난이도]');
            console.error('예시: node cli-fetch-trends.js --song "Bruno Mars - Die With A Smile" "가사내용" level3');
            process.exit(1);
        }
        const title = args[1];
        const lyrics = args[2];
        const difficulty = args[3] || 'level3';
        await saveSong(title, lyrics, difficulty);
    } else if (args[0] === '--help' || args[0] === '-h') {
        console.log(`
Trend Eng CLI Tool
=================

사용법:
  node cli-fetch-trends.js                    뉴스 트렌드 수집
  node cli-fetch-trends.js --song <title> <lyrics> [difficulty]  팝송 저장

예시:
  node cli-fetch-trends.js
  node cli-fetch-trends.js --song "Bruno Mars - Die With A Smile" "가사내용" level3

난이도 옵션:
  level1, level2, level3, level4, level5
        `);
    } else {
        console.error(`알 수 없는 옵션: ${args[0]}`);
        console.error('사용법: node cli-fetch-trends.js [--song <title> <lyrics> [difficulty]]');
        console.error('도움말: node cli-fetch-trends.js --help');
        process.exit(1);
    }
}

// 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { fetchTrends, saveSong };
