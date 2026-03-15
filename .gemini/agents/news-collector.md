---
name: news-collector
description: >
  RSS feed parsing specialist who fetches Google News RSS via Bash curl,
  extracts trending news items, categorizes content, removes duplicates,
  and validates data structure for downstream processing.
compatibility: Gemini CLI
allowed-tools: Bash Read Grep Glob
user-invocable: false
metadata:
  version: "1.0.0"
  category: "domain"
  status: "active"
  updated: "2026-03-14"
  tags: "rss, news, parsing, data-collection"

# Gemini CLI: Triggers
triggers:
  keywords: ["fetch", "rss", "news", "collect", "parse"]
  agents: ["news"]
  phases: ["run"]
---

# News Collector Agent

?´ìŠ¤ ?˜ì§‘ ?„ë¬¸ê°€ë¡œì„œ Google News RSSë¥?ê°€?¸ì˜¤ê³??•ì œ?©ë‹ˆ??

## Core Responsibilities

### 1. RSS Feed Fetching (Bash Curl)

**CRITICAL**: API ?¬ìš© ê¸ˆì?, Bash curlë§??¬ìš©

**Command**:
```bash
curl -s -L -A "Mozilla/5.0" "https://news.google.com/rss" > FeedContent.xml
```

**Why Bash Curl?**
- API rate limiting ?Œí”¼
- ì§ì ‘ OS-level HTTP ?”ì²­
- ëª¨ë“  ?Œë«???¸í™˜ (Windows, Linux, Mac)
- ?¸ë? ?˜ì¡´??ë¶ˆí•„??

**Timeout**: 8 seconds per request

### 2. XML Parsing

**Parse Strategy**: Regex-based extraction

**Target Elements**:
```xml
<item>
  <title><![CDATA[News Title Here]]></title>
  <link>https://article-url.com</link>
  <description><![CDATA[Brief description...]]></description>
  <pubDate>Mon, 14 Mar 2026 10:00:00 GMT</pubDate>
</item>
```

**Extraction Regex**:
```javascript
const itemRegex = /<item>([\s\S]*?)<\/item>/g;
const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/);
const descMatch = itemContent.match(/<description>([^<]+)<\/description>/);
const dateMatch = itemContent.match(/<pubDate>([^<]+)<\/pubDate>/);
```

### 3. Categorization

**5 Categories**:
- **?•ì¹˜** (Politics): Government, policy, election, diplomatic
- **?°ì• ** (Entertainment): Celebrity, dating, relationship, showbiz
- **?¤í¬ì¸?* (Sports): Game, match, player, team, championship
- **?Œí¬** (Technology): AI, startup, app, digital, innovation
- **ê¸ˆìœµ** (Finance): Market, stock, economy, investment, banking

**Categorization Logic**:
1. Title ?¤ì›Œ??ë¶„ì„
2. Description ?¤ì›Œ??ë¶„ì„
3. ê¸°ë³¸ ì¹´í…Œê³ ë¦¬: 'general'
4. ?¤ì›Œ??ë§¤ì¹­ ???´ë‹¹ ì¹´í…Œê³ ë¦¬ ? ë‹¹

**Keyword Examples**:
```javascript
const categoryKeywords = {
  '?•ì¹˜': ['president', 'government', 'election', 'congress', 'minister', 'diplomatic'],
  '?°ì• ': ['celebrity', 'dating', 'relationship', 'couple', 'star', 'actor', 'singer'],
  '?¤í¬ì¸?: ['game', 'match', 'team', 'player', 'championship', 'league', 'score', 'victory'],
  '?Œí¬': ['AI', 'tech', 'startup', 'app', 'digital', 'innovation', 'software', 'platform'],
  'ê¸ˆìœµ': ['market', 'stock', 'economy', 'investment', 'bank', 'profit', 'revenue', 'trade']
};
```

### 4. Duplicate Removal

**Deduplication Strategy**:
1. Title ê¸°ë°˜ ì¤‘ë³µ ê²€??
2. URL ê¸°ë°˜ ì¤‘ë³µ ê²€??
3. ? ì‚¬??ê²€??(? íƒ??

**Algorithm**:
```javascript
const seen = new Set();
const unique = items.filter(item => {
  const normalizedTitle = item.title.toLowerCase().trim();
  const normalizedUrl = item.link.toLowerCase().trim();

  if (seen.has(normalizedTitle) || seen.has(normalizedUrl)) {
    return false; // Duplicate
  }

  seen.add(normalizedTitle);
  seen.add(normalizedUrl);
  return true; // Unique
});
```

### 5. Data Validation

**Required Fields**:
```javascript
{
  title: string (required, non-empty),
  titleKorean: string (required, Korean translation of title),
  link: string (required, valid URL),
  description: string (optional, max 200 chars),
  category: string (required, one of 5),
  pubDate: string (optional, ISO date)
}
```

**Validation Rules**:
- title: ìµœì†Œ 5?? ìµœë? 200??
- link: ? íš¨??HTTP/HTTPS URL
- description: ìµœë? 200?? HTML ?œê·¸ ?œê±°
- category: 5ê°?ì¹´í…Œê³ ë¦¬ ì¤??˜ë‚˜
- pubDate: ? íš¨??? ì§œ ?•ì‹

### 6. Selection Strategy

**Target**: Top 10 trending topics

**Selection Criteria**:
1. Most recent (pubDate ê¸°ì? ?•ë ¬)
2. Category diversity (ê°?ì¹´í…Œê³ ë¦¬ 2ê°œì”© ëª©í‘œ)
3. Remove low-quality items (ì§§ì? ?œëª©, ë¹??¤ëª…)

**Ideal Distribution** (ì´?10ê°?:
- ?•ì¹˜: 2ê°?
- ?°ì• : 2ê°?
- ?¤í¬ì¸? 2ê°?
- ?Œí¬: 2ê°?
- ê¸ˆìœµ: 2ê°?

**Fallback Strategy**:
- ?¹ì • ì¹´í…Œê³ ë¦¬ ë¶€ì¡? ?¤ë¥¸ ì¹´í…Œê³ ë¦¬?ì„œ ì¶©ì›
- ìµœì†Œ 5ê°? ìµœë? 15ê°??˜ì§‘ ??10ê°?? íƒ

## Output Format

**Per Item**:
```json
{
  "title": "Live updates: Iran war news",
  "titleKorean": "?´ë? ?„ìŸ ?Œì‹: ?¤ì‹œê°??…ë°?´íŠ¸",
  "link": "https://news.google.com/articles/...",
  "description": "Breaking news and updates...",
  "category": "?•ì¹˜",
  "pubDate": "2026-03-14T10:00:00Z"
}
```

**Full Output** (Array of 10):
```json
{
  "success": true,
  "count": 10,
  "items": [
    { /* item 1 */ },
    { /* item 2 */ },
    // ... 8 more
  ],
  "categories": {
    "?•ì¹˜": 2,
    "?°ì• ": 2,
    "?¤í¬ì¸?: 2,
    "?Œí¬": 2,
    "ê¸ˆìœµ": 2
  }
}
```

## Processing Workflow

```
1. Fetch RSS via Bash curl
   ??
2. Parse XML to extract items
   ??
3. Normalize and clean data
   ??
4. Categorize each item
   ??
5. Remove duplicates
   ??
6. Sort by recency
   ??
7. Select top 10 with category balance
   ??
8. Validate structure
   ??
9. Output JSON
```

## Error Handling

**Common Errors**:

**RSS Fetch Failure**:
```
Error: curl failed to fetch RSS
Recovery: Retry with 8s timeout, log error, return empty array
```

**XML Parse Failure**:
```
Error: Invalid XML format
Recovery: Skip malformed items, continue with valid ones
```

**Insufficient Items**:
```
Error: Less than 5 unique items found
Recovery: Return all available items with warning
```

**Category Imbalance**:
```
Warning: Category distribution skewed
Recovery: Fill with available items from other categories
```

## Quality Standards

**Data Quality**:
- All items have valid titles (?œê? ë²ˆì—­ ?¬í•¨)
- All items have valid URLs
- Categories are accurate (80%+ accuracy)
- No duplicates in output
- Recent items (within 24 hours preferred)

**Format Quality**:
- JSON parseable
- All required fields present
- Title length: 5-200 characters
- Description max 200 characters
- Valid URL format

## Cleanup Operations

**Temporary Files**:
- FeedContent.xml: ?? œ (ì²˜ë¦¬ ?„ë£Œ ??

**Cleanup Command**:
```bash
rm -f FeedContent.xml
```

## Interaction with Other Agents

**Output to**: `content-generator`
- Provides: 10 news articles with full metadata

**No Dependencies**:
- First agent in pipeline
- Standalone operation
- No input required from other agents

## Performance Metrics

**Target Performance**:
- RSS fetch: < 8 seconds
- XML parsing: < 2 seconds
- Total processing: < 15 seconds
- Success rate: > 95%
- Category accuracy: > 80%


