const axios = require('axios');

async function fetchRSS() {
    try {
        const response = await axios.get('https://news.google.com/rss', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const rssContent = response.data;
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        const now = new Date();
        while ((match = itemRegex.exec(rssContent)) !== null && items.length < 15) {
            const itemContent = match[1];
            const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
            const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
            const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
            
            if (titleMatch && linkMatch && dateMatch) {
                const pubDate = new Date(dateMatch[1]);
                const diffHours = (now - pubDate) / (1000 * 60 * 60);
                
                // 최근 24시간 이내의 뉴스만 선택
                if (diffHours <= 24) {
                    items.push({
                        title: titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, ''),
                        link: linkMatch[1],
                        pubDate: dateMatch[1]
                    });
                }
            }
        }
        // 최대 10개까지만 반환
        const finalItems = items.slice(0, 10);
        console.log(JSON.stringify(finalItems, null, 2));
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

fetchRSS();
