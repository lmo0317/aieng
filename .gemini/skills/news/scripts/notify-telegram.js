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

  let message = process.argv[2];
  if (!message) {
    console.error('No message provided for Telegram notification');
    return;
  }

  // Ensure UTF-8 if possible or handle buffer if needed
  // Note: Node.js process.argv is usually already UTF-16 in Windows, 
  // but let's make sure we're sending a clean string.
  message = message.toString().trim();

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
