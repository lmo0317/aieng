const axios = require('axios');
require('dotenv').config();

async function testGenerate() {
    try {
        console.log('Testing /api/generate endpoint...');
        
        const response = await axios.post('http://localhost/api/generate', {
            topic: '안녕하세요? 만나서 반갑습니다.',
            difficulty: 'level3'
        });

        console.log('✅ Success!');
        console.log('Sentences count:', response.data.sentences?.length || 0);
        console.log('First sentence:', response.data.sentences?.[0]?.en || 'N/A');
    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        }
    }
}

testGenerate();
