const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const SERVER_URL = process.env.SERVER_URL || 'http://aieng.cafe24app.com';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

const data = JSON.parse(fs.readFileSync('billy_joel_piano_man_analysis.json', 'utf8'));

// Format to server specification
const payload = {
  title: data.title,
  lyrics: data.lyrics,
  difficulty: data.difficulty,
  sentences: data.sentences.map(s => ({
    en: s.en,
    ko: s.ko,
    sentence_structure: s.sentence_structure,
    explanation: s.explanation,
    voca: s.voca.split(/,\s*/).map(v => v.trim()).filter(v => v) // "단어(품사): 뜻" 형식 배열화
  })),
  quiz: data.quiz
};

async function upload() {
  try {
    const res = await axios.post(`${SERVER_URL}/api/songs/save`, payload, {
      headers: { 'X-Admin-Key': ADMIN_API_KEY }
    });
    if (res.data.success) {
      console.log('✅ Server Save SUCCESS!');
    } else {
      console.error('❌ Server Save FAILED:', res.data.message || res.data.error);
    }
  } catch (err) {
    console.error('❌ Server Error:', err.message);
  }
}

upload();
