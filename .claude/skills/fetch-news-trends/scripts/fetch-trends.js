/**
 * Fetch News Trends and Generate English Learning Content
 *
 * This script fetches trending news from Google News RSS feeds,
 * generates English learning sentences using Claude's capabilities,
 * and saves everything to the SQLite database.
 */

const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = 'D:/work/dev/web/aieng/database.sqlite';

// Google News RSS URLs for different categories
const RSS_FEEDS = {
    business: 'https://news.google.com/rss/topics/CAAqJggKIiBDQklTRlFfnNZVVNBbWlAQ',
    technology: 'https://news.google.com/rss/topics/CAAqIggKIhxDQklTRFBNQVFnZHpNUEctQXJNVQ',
    entertainment: 'https://news.google.com/rss/topics/CAAqJggKIiBDQklTRlFnfnNZVVNBbWlAQ',
    sports: 'https://news.google.com/rss/topics/CAAqJggKIiBDQklTRlFnfnNZVVNBaWlAQ',
    science: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRnFnfnNZVVNBaWlAQ'
};

/**
 * Fetch RSS feed from a URL
 */
async function fetchRSS(url) {
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching RSS from ${url}:`, error.message);
        return null;
    }
}

/**
 * Parse RSS XML and extract items using regex (no external dependencies)
 */
function parseRSS(xmlContent, category) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlContent)) !== null && items.length < 2) {
        const itemContent = match[1];

        // Extract title
        const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
        // Extract link
        const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
        // Extract description
        const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/);
        // Extract pubDate
        const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);

        if (titleMatch) {
            items.push({
                title: titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
                link: linkMatch ? linkMatch[1].trim() : '',
                description: descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim() : '',
                pubDate: dateMatch ? dateMatch[1] : new Date().toISOString(),
                category: category
            });
        }
    }

    return items;
}

/**
 * Extract keywords from text
 */
function extractKeywords(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const words = text.match(/\b[a-z]{4,}\b/g) || [];
    const uniqueWords = [...new Set(words)];

    // Return top 5 most common words
    return uniqueWords.slice(0, 5);
}

/**
 * Generate learning sentences for a trend
 * NOTE: This is a placeholder. In the actual skill, Claude will generate these.
 */
async function generateLearningSentences(trend) {
    // This will be replaced by Claude's actual generation
    return [
        {
            en: `The latest news about ${trend.title.toLowerCase()} has attracted global attention.`,
            ko: `${trend.title}에 관한 최신 뉴스가 전 세계적인 관심을 끌고 있습니다.`,
            sentence_structure: "Subject + Present Perfect + Object + Prepositional Phrase",
            explanation: "This sentence uses present perfect tense (has attracted) to describe a recent action with present relevance. The structure emphasizes the ongoing impact of the news.",
            voca: ["latest: 최신의", "global: 전 세계적인", "attention: 관심"]
        },
        {
            en: "Many experts are analyzing the impact of this development on the industry.",
            ko: "많은 전문가들이 이 발전이 산업에 미칠 영향을 분석하고 있습니다.",
            sentence_structure: "Subject + Present Continuous + Object + Prepositional Phrase",
            explanation: "Present continuous tense (are analyzing) indicates an ongoing action. The sentence demonstrates formal business English commonly used in professional contexts.",
            voca: ["experts: 전문가들", "analyzing: 분석하는", "impact: 영향", "development: 발전"]
        },
        {
            en: "This trend could significantly change how we approach the situation.",
            ko: "이 트렌드는 우리가 상황에 접근하는 방식을 크게 변화시킬 수 있습니다.",
            sentence_structure: "Subject + Modal Verb + Adverb + Verb + Object Clause",
            explanation: "Modal verb 'could' expresses possibility. 'Significantly' is an adverb modifying 'change'. The sentence demonstrates speculative language common in business forecasting.",
            voca: ["trend: 트렌드/경향", "significantly: 상당히", "approach: 접근하다"]
        },
        {
            en: "Companies are already investing resources to adapt to these changes.",
            ko: "기업들은 이미 이러한 변화에 적응하기 위해 자원을 투자하고 있습니다.",
            sentence_structure: "Subject + Present Continuous + Adverb + Object + Infinitive Phrase",
            explanation: "Present continuous with 'already' emphasizes the ongoing nature of the action. The infinitive phrase 'to adapt' explains the purpose of the investment.",
            voca: ["investing: 투자하는", "resources: 자원", "adapt: 적응하다"]
        },
        {
            en: "What makes this development particularly interesting is its potential for growth.",
            ko: "이 발전을 특히 흥미롭게 만드는 것은 성장 가능성입니다.",
            sentence_structure: "Wh-C Clause + Verb + Adjective + Noun + Possessive + Noun",
            explanation: "Cleft sentence structure using 'What...is...' adds emphasis. This is a sophisticated structure commonly found in business writing to highlight key points.",
            voca: ["particularly: 특히", "potential: 잠재력", "growth: 성장"]
        },
        {
            en: "Stakeholders will need to carefully consider the implications of this news.",
            ko: "이해관계자들은 이 뉴스의 시사점을 신중하게 고려해야 할 것입니다.",
            sentence_structure: "Subject + Modal Verb + Adverb + Verb + Object Phrase",
            explanation: "Future with 'will' expresses necessity. 'Carefully' is an adverb modifying 'consider'. The sentence demonstrates formal, cautious language typical in corporate communications.",
            voca: ["stakeholders: 이해관계자들", "consider: 고려하다", "implications: 시사점/함의"]
        },
        {
            en: "The announcement has sparked discussions across various platforms.",
            ko: "이 발표는 다양한 플랫폼에서 토론을 촉발했습니다.",
            sentence_structure: "Subject + Present Perfect + Object + Prepositional Phrase",
            explanation: "'Sparked discussions' is an idiomatic expression meaning to initiate conversations. The sentence uses present perfect to show recent past action with present relevance.",
            voca: ["announcement: 발표", "sparked: 촉발한/불붙게 한", "discussions: 토론"]
        },
        {
            en: "While opinions vary, the consensus seems to be leaning toward optimism.",
            ko: "의견은 다르지만, 합의는 낙관적으로 기울고 있는 것 같습니다.",
            sentence_structure: "Concession Clause + Main Clause + Infinitive Phrase",
            explanation: "Concession clause starting with 'While' presents contrasting ideas. 'Consensus' is a key business vocabulary word meaning general agreement.",
            voca: ["opinions: 의견들", "consensus: 합의/일치된 의견", "optimism: 낙관론"]
        },
        {
            en: "We should monitor how this situation evolves over the coming months.",
            ko: "우리는 다음 몇 달 동안 이 상황이 어떻게 진화하는지 모니터링해야 합니다.",
            sentence_structure: "Subject + Modal Verb + Verb + Embedded Question + Time Phrase",
            explanation: "Embedded question 'how this situation evolves' functions as the object. 'Over the coming months' is a time expression indicating future duration.",
            voca: ["monitor: 모니터링하다/감시하다", "evolves: 진화하다/발전하다", "situation: 상황"]
        },
        {
            en: "This case serves as an excellent example for future reference.",
            ko: "이 사례는 향후 참고를 위한 훌륭한 예시가 됩니다.",
            sentence_structure: "Subject + Verb + Prepositional Phrase + Prepositional Phrase",
            explanation: "'Serves as' is a formal way to say 'is' or 'functions as'. 'For future reference' is a common business phrase indicating something to remember or use later.",
            voca: ["case: 사례", "serves as: ~의 역할을 하다", "excellent: 훌륭한", "reference: 참고"]
        }
    ];
}

/**
 * Save trend to database
 */
function saveTrend(db, trend, sentences) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO trends (title, category, summary, keywords, sentences, difficulty, createdAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const keywords = extractKeywords(trend.title, trend.description);

        db.run(sql, [
            trend.title,
            trend.category,
            trend.description,
            JSON.stringify(keywords),
            JSON.stringify(sentences),
            'level3',
            new Date().toISOString()
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

/**
 * Main execution function
 */
async function main() {
    console.log('🔍 Fetching trends from Google News...');

    const db = new sqlite3.Database(DB_PATH);
    const allTrends = [];

    // Fetch from all categories
    for (const [category, url] of Object.entries(RSS_FEEDS)) {
        console.log(`📡 Fetching ${category} news...`);
        const rssContent = await fetchRSS(url);

        if (rssContent) {
            const trends = parseRSS(rssContent, category);
            allTrends.push(...trends);
        }
    }

    console.log(`📊 Found ${allTrends.length} trends`);

    // Remove duplicates based on title
    const uniqueTrends = [];
    const seenTitles = new Set();

    for (const trend of allTrends) {
        if (!seenTitles.has(trend.title)) {
            seenTitles.add(trend.title);
            uniqueTrends.push(trend);
        }
    }

    console.log(`✨ Processing ${uniqueTrends.length} unique trends`);

    // Process each trend
    let processedCount = 0;
    for (let i = 0; i < uniqueTrends.length; i++) {
        const trend = uniqueTrends[i];
        console.log(`🤖 Analyzing: [Trend ${i + 1}/${uniqueTrends.length}] ${trend.title.substring(0, 60)}...`);

        // Generate learning sentences
        console.log(`✍️ Generating sentences: [${i + 1}/${uniqueTrends.length}]`);
        const sentences = await generateLearningSentences(trend);

        // Save to database
        console.log(`💾 Saving to database...`);
        try {
            await saveTrend(db, trend, sentences);
            processedCount++;
            console.log(`✅ Saved: ${trend.title.substring(0, 50)}...`);
        } catch (error) {
            console.error(`❌ Error saving trend:`, error.message);
        }
    }

    db.close();
    console.log(`\n✅ Complete! ${processedCount} trends saved to database`);
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main, fetchRSS, parseRSS, generateLearningSentences, saveTrend };
