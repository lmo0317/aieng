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

        while ((match = itemRegex.exec(rssContent)) !== null && items.length < 10) {
            const itemContent = match[1];
            const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
            const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
            if (titleMatch && linkMatch) {
                items.push({
                    title: titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, ''),
                    link: linkMatch[1]
                });
            }
        }
        console.log(JSON.stringify(items, null, 2));
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

fetchRSS();
