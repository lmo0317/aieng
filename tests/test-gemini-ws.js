const WebSocket = require('ws');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('Testing Gemini API with key:', apiKey ? apiKey.substring(0, 10) + '...' : 'NO KEY');

// Test different model names
const models = [
    'models/gemini-2.0-flash-exp',
    'models/gemini-2.5-flash-preview',
    'models/gemini-2.5-flash-exp'
];

let testIndex = 0;

function testModel(modelName) {
    console.log(`\n=== Testing model: ${modelName} ===`);
    
    const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`);
    
    let connected = false;
    let setupComplete = false;
    
    const timeout = setTimeout(() => {
        if (!connected) {
            console.log('❌ Connection timeout');
            ws.close();
            nextTest();
        }
    }, 10000);

    ws.on('open', () => {
        console.log('✅ WebSocket connected');
        connected = true;
        
        const setupMsg = {
            setup: {
                model: modelName,
                generation_config: {
                    response_modalities: ["TEXT", "AUDIO"]
                },
                system_instruction: {
                    parts: [{ text: "You are a helpful assistant." }]
                }
            }
        };
        
        console.log('Sending setup message...');
        ws.send(JSON.stringify(setupMsg));
    });

    ws.on('message', (data) => {
        try {
            const resp = JSON.parse(data);
            console.log('📨 Received:', JSON.stringify(resp, null, 2));
            
            if (resp.setupComplete) {
                console.log('✅ Setup complete!');
                setupComplete = true;
                clearTimeout(timeout);
                ws.close();
                nextTest();
            } else if (resp.error) {
                console.log('❌ Error:', resp.error.message);
                clearTimeout(timeout);
                ws.close();
                nextTest();
            }
        } catch (e) {
            console.log('Raw message:', data.toString());
        }
    });

    ws.on('error', (error) => {
        console.log('❌ WebSocket error:', error.message);
        clearTimeout(timeout);
        nextTest();
    });

    ws.on('close', () => {
        if (!setupComplete && connected) {
            console.log('❌ Connection closed without setup completion');
        }
    });
}

function nextTest() {
    testIndex++;
    if (testIndex < models.length) {
        setTimeout(() => testModel(models[testIndex]), 1000);
    } else {
        console.log('\n=== All tests completed ===');
        process.exit(0);
    }
}

testModel(models[0]);
