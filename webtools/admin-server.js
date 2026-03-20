const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');

const app = express();
app.use(express.json()); // JSON 파싱 미들웨어 추가

// 윈도우에서 80번 포트는 이미 다른 서비스가 사용하는 경우가 많으므로 8080으로 변경합니다.
const PORT = process.env.PORT || 8080; 

let newsProcess = null;
const clients = new Set();

// 정적 파일 서빙 경로 수정: 이제 webtools 폴더에 있으므로 상위의 public을 참조합니다.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// 1. 관리 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html'));
});

app.get('/admin/data', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'admin', 'data.html'));
});

app.get('/admin/songs', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'admin', 'popsong.html'));
});

// 2. API Proxy (Port 8080 -> aieng.cafe24app.com)
// 카페24 서버가 HTTP만 지원하므로 http 모듈을 사용합니다.
app.use('/api', (req, res) => {
    const targetHost = 'aieng.cafe24app.com';
    // 카페24 서버의 API는 /api 접두어를 사용하므로 다시 복구합니다.
    const targetPath = `/api${req.url}`; 
    
    console.log(`[Proxy] ${req.method} ${req.url} -> http://${targetHost}${targetPath}`);

    const options = {
        hostname: targetHost,
        port: 80,
        path: targetPath,
        method: req.method,
        headers: {
            'Host': targetHost,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    };

    // 필수 헤더가 존재할 때만 전달
    if (req.headers['content-type']) options.headers['Content-Type'] = req.headers['content-type'];
    if (req.headers['content-length']) options.headers['Content-Length'] = req.headers['content-length'];
    if (req.headers['x-admin-key']) options.headers['x-admin-key'] = req.headers['x-admin-key'];

    const proxyReq = http.request(options, (proxyRes) => {
        console.log(`[Proxy Response] Status: ${proxyRes.statusCode}`);
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (err) => {
        console.error('[Proxy Error]:', err.code, err.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Proxy connection failed: ' + err.message });
        }
    });
});

// 3. 정적 파일 (CSS, JS 등) 서빙
app.use(express.static(PUBLIC_DIR));

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
    // SSE에서는 줄바꿈 문자가 메시지를 끝낼 수 있으므로 안전하게 JSON 문자열로 변환합니다.
    const data = JSON.stringify({ type, content, code });
    clients.forEach(c => {
        try {
            c.res.write(`data: ${data}\n\n`);
        } catch (err) {
            console.error('Broadcast failed:', err.message);
        }
    });
};

// 뉴스 생성 실행 API (OS 감지 및 강제 재시작 로직 추가)
app.post('/run-news', (req, res) => {
    const { count, topic } = req.body;
    const args = [];
    if (count) args.push(count);
    if (topic) args.push(topic);

    // 프로젝트 루트 경로 (webtools의 상위 폴더)
    const PROJECT_ROOT = path.join(__dirname, '..');

    if (newsProcess) {
        console.log('Existing process found. Terminating before restart...');
        try {
            if (os.platform() === 'win32') {
                spawn('taskkill', ['/pid', newsProcess.pid, '/f', '/t']);
            } else {
                newsProcess.kill('SIGINT');
            }
        } catch (e) {
            console.error('Failed to kill existing process:', e.message);
        }
        newsProcess = null;
    }

    const isWin = os.platform() === 'win32';
    // 루트 기준으로 스크립트의 절대 경로 설정
    const scriptPath = path.resolve(__dirname, isWin ? 'news.bat' : 'news.sh');

    console.log(`Starting news process...`);
    console.log(`- Root: ${PROJECT_ROOT}`);
    console.log(`- Script: ${scriptPath}`);
    console.log(`- Args: ${args.join(', ')}`);

    if (isWin) {
        // 윈도우: shell: true 대신 cmd.exe를 명시적으로 사용.
        newsProcess = spawn('cmd.exe', ['/c', scriptPath, ...args], {
            cwd: PROJECT_ROOT,
            windowsHide: true,
            env: {
                ...process.env,
                CI: 'true',
                TERM: 'dumb',
                FORCE_COLOR: '0',
                NO_COLOR: '1'
            }
        });
    } else {
        // 리눅스: 프로젝트 루트에서 실행. -E 옵션을 추가하여 환경 변수를 보존합니다.
        newsProcess = spawn('sudo', ['-E', '-u', 'lmo0317ea', 'bash', scriptPath, ...args], {
            cwd: PROJECT_ROOT,
            env: { ...process.env, FORCE_COLOR: 'true', HOME: '/home/lmo0317ea' }
        });
    }

    newsProcess.stdout.on('data', (data) => {
        const str = data.toString();
        process.stdout.write(str);
        broadcast('stdout', str);
    });

    newsProcess.stderr.on('data', (data) => {
        const str = data.toString();
        process.stderr.write(str);
        // node-pty ConPTY 헬퍼의 AttachConsole 오류는 내부 노이즈이므로 UI에 노출하지 않음
        if (!str.includes('AttachConsole failed') && !str.includes('conpty_console_list_agent')) {
            broadcast('stderr', str);
        }
    });

    newsProcess.on('close', (code) => {
        console.log(`Process exited with code ${code}`);
        broadcast('exit', `작업 완료 (종료 코드: ${code})`, code);
        newsProcess = null;
    });

    res.json({ success: true });
});

// 팝송 생성 실행 API
app.post('/run-popsong', (req, res) => {
    const { artist, song } = req.body;
    const args = [];
    if (artist) args.push(artist);
    if (song) args.push(song);

    const PROJECT_ROOT = path.join(__dirname, '..');

    if (newsProcess) {
        return res.status(400).json({ success: false, error: '이미 다른 작업이 진행 중입니다.' });
    }

    const isWin = os.platform() === 'win32';
    const scriptPath = path.resolve(__dirname, isWin ? 'popsong.bat' : 'popsong.sh');

    console.log(`Starting popsong process...`);
    console.log(`- Artist: ${artist}, Song: ${song}`);

    if (isWin) {
        newsProcess = spawn('cmd.exe', ['/c', scriptPath, ...args], {
            cwd: PROJECT_ROOT,
            windowsHide: true,
            env: { ...process.env, CI: 'true', TERM: 'dumb' }
        });
    } else {
        newsProcess = spawn('sudo', ['-E', '-u', 'lmo0317ea', 'bash', scriptPath, ...args], {
            cwd: PROJECT_ROOT,
            env: { ...process.env, FORCE_COLOR: 'true', HOME: '/home/lmo0317ea' }
        });
    }

    newsProcess.stdout.on('data', (data) => broadcast('stdout', data.toString()));
    newsProcess.stderr.on('data', (data) => broadcast('stderr', data.toString()));
    newsProcess.on('close', (code) => {
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
    console.log(`📂 Webtools Directory: ${__dirname}`);
    console.log(`================================================`);
});
