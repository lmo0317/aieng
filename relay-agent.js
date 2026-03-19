const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

// 설정 (Cafe24 서버 주소)
const SERVER_URL = 'http://aieng.cafe24app.com';

async function pushLog(type, content, code = null) {
    try {
        await axios.post(`${SERVER_URL}/api/admin/push-log`, { type, content, code });
    } catch (err) {
        console.error('Failed to push log:', err.message);
    }
}

async function checkCommand() {
    try {
        const res = await axios.get(`${SERVER_URL}/api/admin/check-command`);
        if (res.data.run) {
            console.log('🚀 Command received! Starting news generation...');
            runNewsScript();
        }
    } catch (err) {
        // console.error('Relay Agent Check Error:', err.message);
    }
}

function runNewsScript() {
    const scriptPath = path.join(__dirname, 'news.sh');
    const child = spawn('bash', [scriptPath], {
        cwd: __dirname,
        env: { ...process.env, FORCE_COLOR: 'true' }
    });

    child.stdout.on('data', (data) => {
        const content = data.toString();
        process.stdout.write(content);
        pushLog('stdout', content);
    });

    child.stderr.on('data', (data) => {
        const content = data.toString();
        process.stderr.write(content);
        pushLog('stderr', content);
    });

    child.on('close', (code) => {
        console.log(`Process finished with code ${code}`);
        pushLog('exit', `작업이 완료되었습니다. (종료 코드: ${code})`, code);
    });
}

// 2초마다 Cafe24 서버 확인 (릴레이 루프)
console.log('📡 Relay Agent is active. Watching http://aieng.cafe24app.com...');
setInterval(checkCommand, 2000);
