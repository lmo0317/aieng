/**
 * Fetch News Trends and Generate English Learning Content
 *
 * This script fetches trending news from Google News RSS feeds,
 * generates English learning sentences using Gemini's capabilities,
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
 * NOTE: This is a placeholder. In the actual skill, Gemini will generate these.
 */
async function generateLearningSentences(trend) {
    // This will be replaced by Gemini's actual generation
    return [
        {
            en: `The latest news about ${trend.title.toLowerCase()} has attracted global attention.`,
            ko: `${trend.title}??Í¥Ä??ÏµúÏã† ?¥Ïä§Í∞Ä ???∏Í≥Ñ?ÅÏù∏ Í¥Ä?¨ÏùÑ ?åÍ≥† ?àÏäµ?àÎã§.`,
            sentence_structure: "Subject + Present Perfect + Object + Prepositional Phrase",
            explanation: "This sentence uses present perfect tense (has attracted) to describe a recent action with present relevance. The structure emphasizes the ongoing impact of the news.",
            voca: ["latest: ÏµúÏã†??, "global: ???∏Í≥Ñ?ÅÏù∏", "attention: Í¥Ä??]
        },
        {
            en: "Many experts are analyzing the impact of this development on the industry.",
            ko: "ÎßéÏ? ?ÑÎ¨∏Í∞Ä?§Ïù¥ ??Î∞úÏ†Ñ???∞ÏóÖ??ÎØ∏Ïπ† ?ÅÌñ•??Î∂ÑÏÑù?òÍ≥† ?àÏäµ?àÎã§.",
            sentence_structure: "Subject + Present Continuous + Object + Prepositional Phrase",
            explanation: "Present continuous tense (are analyzing) indicates an ongoing action. The sentence demonstrates formal business English commonly used in professional contexts.",
            voca: ["experts: ?ÑÎ¨∏Í∞Ä??, "analyzing: Î∂ÑÏÑù?òÎäî", "impact: ?ÅÌñ•", "development: Î∞úÏ†Ñ"]
        },
        {
            en: "This trend could significantly change how we approach the situation.",
            ko: "???∏Î†å?úÎäî ?∞Î¶¨Í∞Ä ?ÅÌô©???ëÍ∑º?òÎäî Î∞©Ïãù???¨Í≤å Î≥Ä?îÏãú?????àÏäµ?àÎã§.",
            sentence_structure: "Subject + Modal Verb + Adverb + Verb + Object Clause",
            explanation: "Modal verb 'could' expresses possibility. 'Significantly' is an adverb modifying 'change'. The sentence demonstrates speculative language common in business forecasting.",
            voca: ["trend: ?∏Î†å??Í≤ΩÌñ•", "significantly: ?ÅÎãπ??, "approach: ?ëÍ∑º?òÎã§"]
        },
        {
            en: "Companies are already investing resources to adapt to these changes.",
            ko: "Í∏∞ÏóÖ?§Ï? ?¥Î? ?¥Îü¨??Î≥Ä?îÏóê ?ÅÏùë?òÍ∏∞ ?ÑÌï¥ ?êÏõê???¨Ïûê?òÍ≥† ?àÏäµ?àÎã§.",
            sentence_structure: "Subject + Present Continuous + Adverb + Object + Infinitive Phrase",
            explanation: "Present continuous with 'already' emphasizes the ongoing nature of the action. The infinitive phrase 'to adapt' explains the purpose of the investment.",
            voca: ["investing: ?¨Ïûê?òÎäî", "resources: ?êÏõê", "adapt: ?ÅÏùë?òÎã§"]
        },
        {
            en: "What makes this development particularly interesting is its potential for growth.",
            ko: "??Î∞úÏ†Ñ???πÌûà ?•Î?Î°?≤å ÎßåÎìú??Í≤ÉÏ? ?±Ïû• Í∞Ä?•ÏÑ±?ÖÎãà??",
            sentence_structure: "Wh-C Clause + Verb + Adjective + Noun + Possessive + Noun",
            explanation: "Cleft sentence structure using 'What...is...' adds emphasis. This is a sophisticated structure commonly found in business writing to highlight key points.",
            voca: ["particularly: ?πÌûà", "potential: ?†Ïû¨??, "growth: ?±Ïû•"]
        },
        {
            en: "Stakeholders will need to carefully consider the implications of this news.",
            ko: "?¥Ìï¥Í¥ÄÍ≥ÑÏûê?§Ï? ???¥Ïä§???úÏÇ¨?êÏùÑ ?†Ï§ë?òÍ≤å Í≥†Î†§?¥Ïïº ??Í≤ÉÏûÖ?àÎã§.",
            sentence_structure: "Subject + Modal Verb + Adverb + Verb + Object Phrase",
            explanation: "Future with 'will' expresses necessity. 'Carefully' is an adverb modifying 'consider'. The sentence demonstrates formal, cautious language typical in corporate communications.",
            voca: ["stakeholders: ?¥Ìï¥Í¥ÄÍ≥ÑÏûê??, "consider: Í≥†Î†§?òÎã§", "implications: ?úÏÇ¨???®Ïùò"]
        },
        {
            en: "The announcement has sparked discussions across various platforms.",
            ko: "??Î∞úÌëú???§Ïñë???åÎû´?ºÏóê???†Î°†??Ï¥âÎ∞ú?àÏäµ?àÎã§.",
            sentence_structure: "Subject + Present Perfect + Object + Prepositional Phrase",
            explanation: "'Sparked discussions' is an idiomatic expression meaning to initiate conversations. The sentence uses present perfect to show recent past action with present relevance.",
            voca: ["announcement: Î∞úÌëú", "sparked: Ï¥âÎ∞ú??Î∂àÎ∂ôÍ≤???, "discussions: ?†Î°†"]
        },
        {
            en: "While opinions vary, the consensus seems to be leaning toward optimism.",
            ko: "?òÍ≤¨?Ä ?§Î•¥ÏßÄÎß? ?©Ïùò???ôÍ??ÅÏúºÎ°?Í∏∞Ïö∏Í≥??àÎäî Í≤?Í∞ôÏäµ?àÎã§.",
            sentence_structure: "Concession Clause + Main Clause + Infinitive Phrase",
            explanation: "Concession clause starting with 'While' presents contrasting ideas. 'Consensus' is a key business vocabulary word meaning general agreement.",
            voca: ["opinions: ?òÍ≤¨??, "consensus: ?©Ïùò/?ºÏπò???òÍ≤¨", "optimism: ?ôÍ?Î°?]
        },
        {
            en: "We should monitor how this situation evolves over the coming months.",
            ko: "?∞Î¶¨???§Ïùå Î™????ôÏïà ???ÅÌô©???¥ÎñªÍ≤?ÏßÑÌôî?òÎäîÏßÄ Î™®Îãà?∞ÎßÅ?¥Ïïº ?©Îãà??",
            sentence_structure: "Subject + Modal Verb + Verb + Embedded Question + Time Phrase",
            explanation: "Embedded question 'how this situation evolves' functions as the object. 'Over the coming months' is a time expression indicating future duration.",
            voca: ["monitor: Î™®Îãà?∞ÎßÅ?òÎã§/Í∞êÏãú?òÎã§", "evolves: ÏßÑÌôî?òÎã§/Î∞úÏ†Ñ?òÎã§", "situation: ?ÅÌô©"]
        },
        {
            en: "This case serves as an excellent example for future reference.",
            ko: "???¨Î????•ÌõÑ Ï∞∏Í≥†Î•??ÑÌïú ?åÎ????àÏãúÍ∞Ä ?©Îãà??",
            sentence_structure: "Subject + Verb + Prepositional Phrase + Prepositional Phrase",
            explanation: "'Serves as' is a formal way to say 'is' or 'functions as'. 'For future reference' is a common business phrase indicating something to remember or use later.",
            voca: ["case: ?¨Î?", "serves as: ~????ï†???òÎã§", "excellent: ?åÎ???, "reference: Ï∞∏Í≥†"]
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
    console.log('?îç Fetching trends from Google News...');

    const db = new sqlite3.Database(DB_PATH);
    const allTrends = [];

    // Fetch from all categories
    for (const [category, url] of Object.entries(RSS_FEEDS)) {
        console.log(`?ì° Fetching ${category} news...`);
        const rssContent = await fetchRSS(url);

        if (rssContent) {
            const trends = parseRSS(rssContent, category);
            allTrends.push(...trends);
        }
    }

    console.log(`?ìä Found ${allTrends.length} trends`);

    // Remove duplicates based on title
    const uniqueTrends = [];
    const seenTitles = new Set();

    for (const trend of allTrends) {
        if (!seenTitles.has(trend.title)) {
            seenTitles.add(trend.title);
            uniqueTrends.push(trend);
        }
    }

    console.log(`??Processing ${uniqueTrends.length} unique trends`);

    // Process each trend
    let processedCount = 0;
    for (let i = 0; i < uniqueTrends.length; i++) {
        const trend = uniqueTrends[i];
        console.log(`?§ñ Analyzing: [Trend ${i + 1}/${uniqueTrends.length}] ${trend.title.substring(0, 60)}...`);

        // Generate learning sentences
        console.log(`?çÔ∏è Generating sentences: [${i + 1}/${uniqueTrends.length}]`);
        const sentences = await generateLearningSentences(trend);

        // Save to database
        console.log(`?íæ Saving to database...`);
        try {
            await saveTrend(db, trend, sentences);
            processedCount++;
            console.log(`??Saved: ${trend.title.substring(0, 50)}...`);
        } catch (error) {
            console.error(`??Error saving trend:`, error.message);
        }
    }

    db.close();
    console.log(`\n??Complete! ${processedCount} trends saved to database`);
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main, fetchRSS, parseRSS, generateLearningSentences, saveTrend };


