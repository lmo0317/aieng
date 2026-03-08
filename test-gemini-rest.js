const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function testRestAPI() {
    const models = [
        'gemini-2.0-flash-exp',
        'gemini-2.5-flash-preview',
        'gemini-2.5-flash-exp',
        'gemini-2.5-flash'
    ];

    for (const model of models) {
        console.log(`\n=== Testing REST API with model: ${model} ===`);
        
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    contents: [{
                        parts: [{ text: "Hello, say hi!" }]
                    }]
                }
            );

            if (response.data.candidates && response.data.candidates[0]) {
                console.log('✅ Success! Response:', response.data.candidates[0].content.parts[0].text);
            } else {
                console.log('❌ No candidates in response');
            }
        } catch (error) {
            if (error.response) {
                console.log('❌ Error:', error.response.status, error.response.data);
            } else {
                console.log('❌ Error:', error.message);
            }
        }
    }
}

testRestAPI();
