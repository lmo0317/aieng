const axios = require('axios');

async function getRSS(url, category) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 5000
        });
        const rssContent = response.data;
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        const now = new Date();
        while ((match = itemRegex.exec(rssContent)) !== null && items.length < 10) {
            const itemContent = match[1];
            const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
            const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
            const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
            
            if (titleMatch && linkMatch && dateMatch) {
                const pubDate = new Date(dateMatch[1]);
                const diffHours = (now - pubDate) / (1000 * 60 * 60);
                
                // ìµœê·¼ 48?œê°„ ?´ë‚´???´ìŠ¤ (ì£¼ì œ ?•ë³´ë¥??„í•´ ì¡°ê¸ˆ ?˜ë¦¼)
                if (diffHours <= 48) {
                    items.push({
                        category: category,
                        title: titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/ - .*$/, ''), // ?¸ë¡ ?¬ëª… ?œê±°
                        link: linkMatch[1],
                        pubDate: dateMatch[1]
                    });
                }
            }
        }
        return items;
    } catch (error) {
        return [];
    }
}

async function fetchAllRSS() {
    const sources = [
        { name: 'ENTERTAINMENT', url: 'https://news.google.com/rss/sections/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'SPORTS', url: 'https://news.google.com/rss/sections/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko' },
        { name: 'GENERAL', url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko' }
    ];

    const results = await Promise.all(sources.map(s => getRSS(s.url, s.name)));
    
    // ?°ì„ ?œìœ„: ?”í„°(50%) > ?¤í¬ì¸?30%) > ì¢…í•©(20%) ?œìœ¼ë¡??ê¸°
    // ?˜ì?ë§??ì´?„íŠ¸ê°€ ? íƒ?????ˆë„ë¡?ëª¨ë“  ëª©ë¡???¼ë²¨ë§í•´??ë³´ëƒ„
    const combined = [
        ...results[0], // ?”í„°
        ...results[1], // ?¤í¬ì¸?
        ...results[2]  // ì¢…í•©
    ];

    console.log(JSON.stringify(combined, null, 2));
}

fetchAllRSS();


