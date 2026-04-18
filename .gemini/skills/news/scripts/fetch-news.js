const axios = require('axios');

const CATEGORY_URLS = {
  '전체': ['https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko'],
  '정치': ['https://news.google.com/rss/headlines/section/topic/POLITICS?hl=ko&gl=KR&ceid=KR:ko'],
  '테크': ['https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko'],
  '엔터': [
    'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko',
    'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko'
  ],
  '연애': ['https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko'],
  '스포츠': ['https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko'],
  '경제': ['https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko'],
};

function parseItem(itemContent, category) {
  let title = (itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
  const lastDashIndex = title.lastIndexOf(' - ');
  if (lastDashIndex !== -1) title = title.substring(0, lastDashIndex).trim();
  const link = (itemContent.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/) || [])[1] || '';
  const pubDate = (itemContent.match(/<pubDate>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/pubDate>/) || [])[1] || '';
  return { title, link, pubDate, category };
}

async function fetchNews() {
  const category = process.argv[2] || '전체';
  const urls = CATEGORY_URLS[category] || CATEGORY_URLS['전체'];

  try {
    const items = [];
    for (const url of urls) {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });
      const xml = response.data;
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      const urlItems = [];
      while ((match = itemRegex.exec(xml)) !== null && urlItems.length < 10) {
        urlItems.push(parseItem(match[1], category));
      }
      items.push(...urlItems);
    }

    console.log(JSON.stringify({ success: true, items: items.slice(0, 15) }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
  }
}

fetchNews();
