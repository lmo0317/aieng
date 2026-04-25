const axios = require('axios');
const fs = require('fs');

async function saveToServer() {
    try {
        const rawData = fs.readFileSync('temp_news_data.json', 'utf8');
        const newsData = JSON.parse(rawData);
        
        // 운영 서버 주소
        const SERVER_URL = 'https://minohlee.mooo.com/api/trends/save';
        
        console.log('Sending data to server...');
        
        // 서버 요청
        for (const item of newsData.content) {
            const response = await axios.post(SERVER_URL, item);
            console.log(`✅ Server Save SUCCESS! Title: ${item.news_title}`);
        }
    } catch (error) {
        console.error('Error saving to server:', error.message);
        process.exit(1);
    } finally {
        // 임시 파일 삭제
        if (fs.existsSync('temp_news_data.json')) {
            fs.unlinkSync('temp_news_data.json');
            console.log('Temp file deleted.');
        }
    }
}

saveToServer();
