const axios = require('axios');
const fs = require('fs');

async function fetchNews() {
  const url = 'https://news.google.com/rss';
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    const xml = response.data;
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    const items = [];
    
    while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
      const itemContent = match[1];
      const title = (itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
      const link = (itemContent.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/) || [])[1] || '';
      const pubDate = (itemContent.match(/<pubDate>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/pubDate>/) || [])[1] || '';
      const description = (itemContent.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/) || [])[1] || '';
      
      items.push({
        title,
        link,
        pubDate,
        description: description.replace(/<[^>]*>?/gm, '').substring(0, 200)
      });
    }
    
    console.log(JSON.stringify({ success: true, items }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
  }
}

fetchNews();
