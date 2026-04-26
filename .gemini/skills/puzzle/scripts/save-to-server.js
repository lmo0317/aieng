const fs = require('fs');
const path = require('path');
const http = require('http');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

let SERVER_URL = process.env.SERVER_URL || 'https://minohlee.mooo.com';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

// 로컬 환경(localhost)인 경우 운영 서버로 강제 전환 (운영 반영을 위해)
if (SERVER_URL.includes('localhost') || SERVER_URL.includes('127.0.0.1')) {
  SERVER_URL = 'https://minohlee.mooo.com';
}

const filePath = process.argv[2];
if (!filePath) {
  console.error(JSON.stringify({ success: false, error: 'File path argument is required' }));
  process.exit(1);
}

try {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const puzzleData = JSON.parse(fileContent);

  // puzzleData should be the full object to be sent to /api/puzzles
  const postData = JSON.stringify(puzzleData);

  const url = new URL(SERVER_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: '/api/puzzles',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(postData, 'utf8'),
      'X-Admin-Key': ADMIN_API_KEY
    }
  };

  const protocol = url.protocol === 'https:' ? require('https') : http;
  const req = protocol.request(options, (res) => {
    let resData = '';
    res.on('data', (chunk) => resData += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(resData);
        if (result.success || result.id) {
          console.log(JSON.stringify({ success: true, id: result.id }));
        } else {
          console.error(JSON.stringify({ success: false, error: result.error || 'Unknown error' }));
        }
      } catch (e) {
        console.error(JSON.stringify({ success: false, error: 'Failed to parse response', raw: resData }));
      }
    });
  });

  req.on('error', (e) => {
    console.error(JSON.stringify({ success: false, error: e.message }));
  });

  req.write(postData, 'utf8');
  req.end();

} catch (err) {
  console.error(JSON.stringify({ success: false, error: err.message }));
}
