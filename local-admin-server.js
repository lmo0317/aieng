const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const app = express();
const PORT = 80; // 방화벽 허용된 80번 포트로 고정합니다.

let newsProcess = null;
const clients = new Set();

// 1. 관리 페이지 라우트를 최우선으로 배치 (index.html 충돌 방지)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// 관리자 전용 /admin 경로도 추가
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/admin/data', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'data.html'));
});

// 2. 나머지 정적 파일 (CSS, JS 등) 서빙
app.use(express.static(path.join(__dirname, 'public')));

// SSE 로그 스트리밍
app.get('/logs', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const client = { res };
    clients.add(client);
    console.log('New client connected to logs');

    req.on('close', () => {
        clients.delete(client);
        console.log('Client disconnected');
    });
});

const broadcast = (type, content, code = null) => {
    const data = JSON.stringify({ type, content, code });
    clients.forEach(c => c.res.write(`data: ${data}\n\n`));
};

// 뉴스 생성 실행 API
app.post('/run-news', (req, res) => {
    if (newsProcess) {
        return res.status(400).json({ success: false, error: '이미 프로세스가 실행 중입니다.' });
    }

    console.log('Starting news.sh as user lmo0317ea...');
    const scriptPath = path.join(__dirname, 'news.sh');
    
    // sudo -u lmo0317ea를 사용하여 원래 사용자 권한으로 실행
    newsProcess = spawn('sudo', ['-u', 'lmo0317ea', 'bash', scriptPath], {
        cwd: __dirname,
        env: { ...process.env, FORCE_COLOR: 'true', HOME: '/home/lmo0317ea' }
    });

    newsProcess.stdout.on('data', (data) => {
        const str = data.toString();
        process.stdout.write(str);
        broadcast('stdout', str);
    });

    newsProcess.stderr.on('data', (data) => {
        const str = data.toString();
        process.stderr.write(str);
        broadcast('stderr', str);
    });

    newsProcess.on('close', (code) => {
        console.log(`Process exited with code ${code}`);
        broadcast('exit', `작업 완료 (종료 코드: ${code})`, code);
        newsProcess = null;
    });

    res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`================================================`);
    console.log(`🚀 News Generator Admin Server is running!`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log(`🔗 Admin: http://localhost:${PORT}/admin`);
    console.log(`🏠 외부에서 접속 시 이 주소로 바로 접속하세요: http://34.71.241.242`);
    console.log(`================================================`);
});
