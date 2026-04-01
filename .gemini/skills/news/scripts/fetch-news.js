const axios = require('axios');

const CATEGORY_URLS = {
  '전체': 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko',
  '테크': 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko',
  '스포츠': 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko',
  '연애': 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko',
  '경제': 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko',
  '정치': 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko'
};

async function fetchNews() {
  const category = process.argv[2] || '전체';
  const url = CATEGORY_URLS[category] || CATEGORY_URLS['전체'];
  
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });
    
    const xml = response.data;
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    const items = [];
    
    while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
      const itemContent = match[1];
      let title = (itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
      
      // 구글 뉴스 타이틀은 보통 "제목 - 출처" 또는 "제목 - 출처 - 언어" 형식입니다.
      // 단순히 split(' - ')[0]을 하면 제목 내부에 ' - '가 있을 경우 잘리는 문제가 발생합니다.
      // 가장 마지막 ' - ' 이후가 출처일 가능성이 높으므로 뒤에서부터 자릅니다.
      const lastDashIndex = title.lastIndexOf(' - ');
      if (lastDashIndex !== -1) {
        title = title.substring(0, lastDashIndex).trim();
      }
      
      const link = (itemContent.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/) || [])[1] || '';
      const pubDate = (itemContent.match(/<pubDate>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/pubDate>/) || [])[1] || '';
      
      items.push({ title, link, pubDate, category });
    }
    
    console.log(JSON.stringify({ success: true, items }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
  }
}

fetchNews();
