const fs = require('fs');

// RSS ?�일?�서 ?�스 ?�이??추출
const rssContent = fs.readFileSync('C:\\Users\\lmo03\\.Gemini\\projects\\D--work-dev-web-aieng\\6bd743dd-6b73-4e3f-bae4-9013f36d9124\\tool-results\\b56pf3t5f.txt', 'utf8');

const items = [];
const itemRegex = /<item>([\s\S]*?)<\/item>/g;
let match;

while ((match = itemRegex.exec(rssContent)) !== null && items.length < 10) {
    const itemContent = match[1];

    // ?�목 추출 (CDATA 처리)
    const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const title = titleMatch ? titleMatch[1] :
                  (itemContent.match(/<title>([^<]+)<\/title>/) || [])[1] || '';

    // 링크 추출
    const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/);
    const link = linkMatch ? linkMatch[1] : '';

    // ?�명 추출 �?HTML ?�제
    const descMatch = itemContent.match(/<description>([^<]+)<\/description>/);
    let description = descMatch ? descMatch[1] : '';
    description = description
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/<[^>]*>/g, '')
        .substring(0, 200);

    // ?�짜 추출
    const dateMatch = itemContent.match(/<pubDate>([^<]+)<\/pubDate>/);
    const pubDate = dateMatch ? dateMatch[1] : '';

    if (title && link) {
        items.push({
            title,
            link,
            description,
            pubDate,
            category: 'general'
        });
    }
}

// 결과 출력
console.log(`?�� Found ${items.length} news items:\n`);

items.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.title}`);
    console.log(`   ${item.description}`);
    console.log(`   ${item.pubDate}`);
    console.log('');
});

// JSON?�로 ?�??
fs.writeFileSync('C:\\Users\\lmo03\\Downloads\\news_items.json', JSON.stringify(items, null, 2), 'utf8');
console.log(`??Saved to: C:\\Users\\lmo03\\Downloads\\news_items.json`);


