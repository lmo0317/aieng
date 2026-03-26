const fs = require('fs');
const path = require('path');
const http = require('http');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const SERVER_URL = process.env.SERVER_URL || 'http://aieng.cafe24app.com';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

if (!ADMIN_API_KEY) {
  console.error('ADMIN_API_KEY not found in .env');
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('File path argument is required');
  process.exit(1);
}

async function saveSongs() {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const inputData = JSON.parse(fileContent);

    // If it's a single song or array of songs in 'content'
    const songs = Array.isArray(inputData.content) ? inputData.content : [inputData];

    for (const song of songs) {
      const transformedSong = {
        title: inputData.title || song.song_title,
        lyrics: song.lyrics || (song.sentences ? song.sentences.map(s => s.en).join(' ') : ""),
        difficulty: inputData.difficulty || "level3",
        sentences: song.sentences.map(s => {
          const rawVoca = s.vocabulary || s.voca || "";
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
        quiz: song.quiz || [],
        image: song.image || ""
      };

      await sendRequest(transformedSong);
    }

  } catch (err) {
    console.error(JSON.stringify({ success: false, error: err.message }));
  }
}

function sendRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const url = new URL(SERVER_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/api/songs/save',
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
            console.log(JSON.stringify({ success: true, title: data.title }));
            resolve(result);
          } else {
            console.error(JSON.stringify({ success: false, title: data.title, error: result.error }));
            resolve(result);
          }
        } catch (e) {
          console.error(JSON.stringify({ success: false, error: 'Failed to parse response', raw: resData }));
          resolve({ success: false });
        }
      });
    });

    req.on('error', (e) => {
      console.error(JSON.stringify({ success: false, error: e.message }));
      reject(e);
    });

    req.write(postData, 'utf8');
    req.end();
  });
}

saveSongs();
