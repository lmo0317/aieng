const axios = require('axios');
const https = require('https');

const categories = [
    { name: 'TOP', label: '전체', url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'TEC', label: '테크', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'SPO', label: '스포츠', url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'ENT', label: '연애', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko' },
    { name: 'POL', label: '정치', url: 'https://news.google.com/rss/headlines/section/topic/POLITICS?hl=ko&gl=KR&ceid=KR:ko' }
];

async function getNews() {
    const httpsAgent = new https.Agent({
        rejectUnauthorized: true,
        keepAlive: true,
        timeout: 10000
    });

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    let allTrends = [];
    
    for (const cat of categories) {
        try {
            const response = await axios.get(cat.url, {
                timeout: 8000,
                headers: headers,
                httpsAgent: httpsAgent
            });
            
            const xml = response.data;
            const matches = xml.match(/<title>(.*?)<\/title>/g) || [];
            
            matches.slice(1, 6).forEach(m => {
                let title = m.replace(/<title>(.*?)<\/title>/, '$1').split(' - ')[0];
                title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                const cleanTitle = title.trim();
                if (cleanTitle.length > 10) {
                    allTrends.push({ category: cat.label, title: cleanTitle });
                }
            });
        } catch (err) {
            console.error(`RSS fetch failed for ${cat.label}:`, err.message);
        }
    }

    // Shuffle and pick 10
    const uniqueTrends = Array.from(new Set(allTrends.map(t => t.title)))
        .map(title => allTrends.find(t => t.title === title))
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);

    console.log(JSON.stringify(uniqueTrends, null, 2));
}

getNews();
