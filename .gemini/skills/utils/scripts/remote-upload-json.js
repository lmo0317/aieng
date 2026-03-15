const fs = require('fs');
const axios = require('axios');

// 설정 (사용자 환경에 맞게 수정 필요)
const REMOTE_SERVER_URL = 'http://your-remote-server-url.com/api/trends/save'; // 리모트 서버 주소
const JSON_PATH = 'C:\\Users\\lmo03\\Downloads\\news_guide.json';

async function uploadToRemote() {
    try {
        // 1. JSON 파일 읽기
        if (!fs.existsSync(JSON_PATH)) {
            console.error(`❌ 파일을 찾을 수 없습니다: ${JSON_PATH}`);
            return;
        }
        const rawData = fs.readFileSync(JSON_PATH, 'utf8');
        const data = JSON.parse(rawData);

        console.log(`📤 리모트 서버로 전송 중: ${REMOTE_SERVER_URL}`);

        // 2. 서버 스키마에 맞게 데이터 변환
        // 서버의 /api/trends/save 엔드포인트는 보통 배열을 기대합니다.
        const trendsToSave = data.content.map(item => ({
            title: item.news_title,
            category: item.category,
            summary: "",
            keywords: [],
            sentences: item.sentences, // 배열 그대로 전달
            difficulty: "level3",
            type: "news",
            date: new Date().toISOString().split('T')[0]
        }));

        // 3. POST 요청 전송
        const response = await axios.post(REMOTE_SERVER_URL, {
            trends: trendsToSave
        }, {
            headers: {
                'Content-Type': 'application/json'
                // 필요시 인증 헤더 추가: 'Authorization': 'Bearer YOUR_TOKEN'
            }
        });

        if (response.data.success) {
            console.log(`✅ 성공! ${trendsToSave.length}개의 뉴스가 리모트 서버에 저장되었습니다.`);
        } else {
            console.error('❌ 서버 응답 오류:', response.data.message);
        }

    } catch (error) {
        if (error.response) {
            console.error(`❌ 업로드 실패 (HTTP ${error.response.status}):`, error.response.data);
        } else {
            console.error('❌ 네트워크 오류:', error.message);
        }
    }
}

uploadToRemote();
