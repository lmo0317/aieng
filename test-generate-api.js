const axios = require('axios');
require('dotenv').config();

async function testGenerateAPI() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = 'gemini-2.5-flash';
    
    console.log('Testing generate API...');
    console.log('Model:', model);
    console.log('API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'NO KEY');

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
        const response = await axios.post(API_URL, {
            system_instruction: {
                parts: [{ text: "You are a helpful assistant." }]
            },
            contents: [{
                parts: [{ 
                    text: "Generate a simple JSON array with 2 English sentences for beginners. Format: [{\"en\": \"sentence\", \"ko\": \"translation\"}]. Output ONLY valid JSON, no markdown." 
                }]
            }],
            generationConfig: { 
                temperature: 0.7,
                maxOutputTokens: 1024
            }
        });

        console.log('✅ Success!');
        console.log('Response:', response.data.candidates[0].content.parts[0].text);
    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testGenerateAPI();
