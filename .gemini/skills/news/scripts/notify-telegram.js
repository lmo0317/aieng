const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6939043499';

async function sendNotification() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('Telegram notification skipped: TELEGRAM_BOT_TOKEN not found in .env');
    return;
  }

  let message = process.argv.slice(2).join(' '); // 모든 인자를 합쳐서 하나의 메시지로 처리
  if (!message) {
    console.error('No message provided for Telegram notification');
    return;
  }

  // Windows에서 UTF-8 인코딩이 깨진 채로 전달되는 경우를 대비한 처리 (이미 UTF-8인 경우는 유지)
  try {
    // 이미 UTF-8 스트링이라면 특별한 처리가 필요 없지만, 
    // 전송 시 마크다운 파싱 에러 방지를 위해 이스케이프 처리를 강화할 수도 있습니다.
    message = message.trim();
  } catch (e) {
    console.error('Message decoding error:', e);
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });

    if (response.data.ok) {
      console.log('✓ Telegram notification sent successfully!');
    } else {
      console.error('✗ Failed to send Telegram message:', response.data.description);
    }
  } catch (error) {
    console.error('✗ Telegram API Error:', error.message);
  }
}

sendNotification();
