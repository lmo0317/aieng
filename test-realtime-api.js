const WebSocket = require('ws');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('Testing Gemini Realtime API...');
console.log('API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'NO KEY');

// Test the actual native audio model
const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`);

ws.on('open', () => {
    console.log('✅ WebSocket connected');
    
    // Try different setup formats
    const setupMsg1 = {
        setup: {
            model: 'models/gemini-2.5-flash',
            generation_config: {
                response_modalities: ["AUDIO", "TEXT"]
            }
        }
    };
    
    console.log('Sending setup message with gemini-2.5-flash...');
    ws.send(JSON.stringify(setupMsg1));
});

ws.on('message', (data) => {
    console.log('📨 Received message:', data.toString());
    
    try {
        const resp = JSON.parse(data.toString());
        console.log('Parsed:', JSON.stringify(resp, null, 2));
    } catch (e) {
        console.log('(Not JSON)');
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
});

ws.on('close', (code, reason) => {
    console.log('❌ Connection closed');
    console.log('Code:', code);
    console.log('Reason:', reason?.toString() || 'none');
    process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.log('⏱️ Timeout - closing connection');
    ws.close();
}, 10000);
