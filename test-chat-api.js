const axios = require('axios');
require('dotenv').config();

async function testChatAPI() {
    console.log('Testing Chat API...\n');

    try {
        const response = await axios.post('http://localhost/api/chat', {
            message: 'Hello! How are you?',
            topic: 'English conversation'
        });

        console.log('✅ Chat API Success!');
        console.log('Response:', response.data.response);
    } catch (error) {
        console.error('❌ Chat API Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testChatAPI();
