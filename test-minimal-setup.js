const WebSocket = require('ws');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`);

ws.on('open', () => {
    console.log('Connected');
    
    // Minimal setup - no system instruction
    const setupMsg = {
        setup: {
            model: 'models/gemini-2.5-flash-native-audio-latest'
        }
    };
    
    console.log('Sending minimal setup...');
    ws.send(JSON.stringify(setupMsg));
});

ws.on('message', (data) => {
    const msg = data.toString();
    console.log('MSG:', msg);
    
    try {
        const resp = JSON.parse(msg);
        if (resp.setupComplete) {
            console.log('SUCCESS!');
        }
    } catch (e) {}
});

ws.on('close', (code, reason) => {
    console.log('CLOSED:', code, reason?.toString());
    process.exit(0);
});

ws.on('error', (err) => {
    console.log('ERROR:', err.message);
});

setTimeout(() => process.exit(1), 5000);
