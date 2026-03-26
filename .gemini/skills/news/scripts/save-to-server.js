const fs = require('fs');
const path = require('path');
const http = require('http');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

let SERVER_URL = process.env.SERVER_URL || 'http://aieng.cafe24app.com';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

// 로컬 환경(localhost)인 경우 운영 서버로 강제 전환 (운영 반영을 위해)
if (SERVER_URL.includes('localhost') || SERVER_URL.includes('127.0.0.1')) {
  SERVER_URL = 'http://aieng.cafe24app.com';
}

if (!ADMIN_API_KEY) {
  console.error('ADMIN_API_KEY not found in .env');
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('File path argument is required');
  process.exit(1);
}

try {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const inputData = JSON.parse(fileContent);

  // Transform data to server API format
  const trends = inputData.content.map(item => {
    // news_title 한글 검증 (HARD RULE)
    const hasKorean = /[가-힣]/.test(item.news_title);
    if (!hasKorean) {
      throw new Error(`CRITICAL: 'news_title' (${item.news_title}) must be in Korean.`);
    }

    return {
      title: item.news_title,
      category: item.category,
      summary: "",
      keywords: [],
      sentences: item.sentences.map(s => {
        // Map fields correctly as per tech-implementer
        const rawVoca = s.voca || s.vocabulary || "";
        let vocaArray = [];
        if (typeof rawVoca === 'string') {
          vocaArray = rawVoca.split(/,\s*/).map(v => v.trim()).filter(v => v);
        } else if (Array.isArray(rawVoca)) {
          vocaArray = rawVoca;
        }
        
        return {
          en: s.english || s.en,
          ko: s.korean || s.ko,
          sentence_structure: s.analysis || s.sentence_structure,
          explanation: s.explanation,
          voca: vocaArray
        };
      }),
      difficulty: "level3",
      type: "news",
      quiz: item.quiz || [],
      date: new Date().toISOString().split('T')[0]
    };
  });

  const postData = JSON.stringify({ trends });

  const url = new URL(SERVER_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: '/api/trends/save',
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
        if (result.success) {
          console.log(JSON.stringify({ success: true, count: trends.length }));
        } else {
          console.error(JSON.stringify({ success: false, error: result.error }));
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
