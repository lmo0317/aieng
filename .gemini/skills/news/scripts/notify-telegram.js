const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6939043499'; // 사용자님이 주신 ID

async function sendNotification() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('Telegram notification skipped: TELEGRAM_BOT_TOKEN not found in .env');
    return;
  }

  const message = process.argv[2];
  if (!message) {
    console.error('No message provided for Telegram notification');
    return;
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
