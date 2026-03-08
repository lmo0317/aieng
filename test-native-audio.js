const WebSocket = require('ws');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('Testing gemini-2.5-flash-native-audio-latest...');

const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`);

let setupComplete = false;

ws.on('open', () => {
    console.log('✅ WebSocket connected');
    
    const setupMsg = {
        setup: {
            model: 'models/gemini-2.5-flash-native-audio-latest',
            generation_config: {
                response_modalities: ["AUDIO", "TEXT"]
            },
            system_instruction: {
                parts: [{ text: "You are a helpful assistant. Be brief." }]
            }
        }
    };
    
    console.log('Sending setup message...');
    ws.send(JSON.stringify(setupMsg));
});

ws.on('message', (data) => {
    console.log('📨 Received message');
    
    try {
        const resp = JSON.parse(data.toString());
        
        if (resp.setupComplete) {
            console.log('✅ Setup complete!');
            setupComplete = true;
            
            // Send a test message
            const testMsg = {
                client_content: {
                    turns: [{
                        role: "user",
                        parts: [{ text: "Hello!" }]
                    }],
                    turn_complete: true
                }
            };
            
            console.log('Sending test message...');
            ws.send(JSON.stringify(testMsg));
        }
        
        if (resp.serverContent) {
            console.log('📦 Server content:', JSON.stringify(resp).substring(0, 200));
        }
        
        if (resp.error) {
            console.log('❌ Error:', resp.error);
        }
    } catch (e) {
        console.log('Raw:', data.toString().substring(0, 100));
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

setTimeout(() => {
    console.log('⏱️ Timeout - closing');
    ws.close();
}, 15000);
