# Fetch News Trends - Usage Examples

## Invoking the Skill

### Via Claude Code Command

Simply use the slash command:

```
/fetch-news-trends
```

Claude will automatically:
1. Fetch RSS feeds from Google News
2. Parse and extract 10 trending topics
3. Generate 10 English learning sentences for each trend (100 sentences total)
4. **Save to JSON file** (C:\Users\lmo03\Downloads\news_guide.json)
5. Report completion with progress indicators

**⚠️ Note**: This skill now saves to JSON only, not database.

### Via Direct Script Execution

```bash
cd D:/work/dev/web/aieng
node .claude/skills/fetch-news-trends/scripts/fetch-trends.js
```

## Expected Output

When the skill runs, you'll see progress like this:

```
🔍 Fetching trends from Google News...
📡 Fetching business news...
📡 Fetching technology news...
📡 Fetching entertainment news...
📡 Fetching sports news...
📡 Fetching science news...
📊 Found 10 trends
✨ Processing 10 unique trends
🤖 Analyzing: [Trend 1/10] AI Breakthrough in Drug Discovery...
✍️ Generating sentences: [1/10]...
💾 Saving to database...
✅ Saved: AI Breakthrough in Drug Discovery...
...
✅ Complete! 10 trends saved to database
```

## Sample Generated Content

Each trend includes 10 learning sentences. Here's an example of one sentence:

```json
{
  "en": "The latest news about AI has attracted global attention.",
  "ko": "AI에 관한 최신 뉴스가 전 세계적인 관심을 끌고 있습니다.",
  "sentence_structure": "Subject + Present Perfect + Object + Prepositional Phrase",
  "explanation": "This sentence uses present perfect tense (has attracted) to describe a recent action with present relevance. The structure emphasizes the ongoing impact of the news.",
  "voca": ["latest: 최신의", "global: 전 세계적인", "attention: 관심"]
}
```

## Database Query Examples

### View All Trends

```sql
SELECT id, title, category, createdAt FROM trends ORDER BY createdAt DESC;
```

### Get Trends by Category

```sql
SELECT title, category FROM trends WHERE category = 'technology';
```

### Extract Sentences from a Trend

```sql
SELECT title, sentences FROM trends WHERE id = 1;
```

The `sentences` field contains a JSON array of 10 learning sentences.

### Count Trends

```sql
SELECT COUNT(*) as total, category FROM trends GROUP BY category;
```

## Integration with Existing API

The skill saves to the same `trends` table used by your existing API. Your current endpoints will automatically have access to the new content:

- `GET /api/trends` - Returns all trends
- `GET /api/trends/:id` - Returns specific trend with learning sentences

## Scheduling Automated Updates

### Using cron (Linux/Mac)

Add to crontab (`crontab -e`):

```
# Run every day at 9 AM
0 9 * * * cd /d/work/dev/web/aieng && node .claude/skills/fetch-news-trends/scripts/fetch-trends.js
```

### Using Task Scheduler (Windows)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., Daily at 9:00 AM)
4. Action: Start a program
   - Program: `node`
   - Arguments: `D:\work\dev\web\aieng\.claude\skills\fetch-news-trends\scripts\fetch-trends.js`

### Using npm script

Add to `package.json`:

```json
{
  "scripts": {
    "fetch-trends": "node .claude/skills/fetch-news-trends/scripts/fetch-trends.js"
  }
}
```

Then run: `npm run fetch-trends`

## Troubleshooting

### Issue: "Cannot find module 'axios'"

**Solution:** Axios is already installed in your project. If you still get this error:

```bash
npm install axios
```

### Issue: Database connection failed

**Solution:** Ensure the database file exists at the correct path:

```bash
ls -la D:/work/dev/web/aieng/database.sqlite
```

### Issue: RSS feeds return empty

**Solution:** Check your internet connection and Google News availability. The skill includes error handling and will continue with other feeds if one fails.

### Issue: Duplicate trends

**Solution:** The skill automatically removes duplicates based on title. If you still see duplicates, you can manually clean up:

```sql
DELETE FROM trends WHERE id NOT IN (
  SELECT MIN(id) FROM trends GROUP BY title
);
```

## Performance Considerations

- **Runtime**: Approximately 30-60 seconds to fetch and process 10 trends
- **Database Size**: Each trend adds ~5-10 KB to the database
- **Network Usage**: ~500 KB per run (fetching 5 RSS feeds)
- **Recommended Frequency**: Once or twice per day to avoid rate limiting

## Customization

### Change Number of Trends per Category

Edit `scripts/fetch-trends.js`, line 67:

```javascript
return items.slice(0, 2).map(item => {  // Change 2 to desired number
```

### Add More Categories

Edit `scripts/fetch-trends.js`, line 14:

```javascript
const RSS_FEEDS = {
    business: 'https://news.google.com/rss/topics/CAAqJggKIiBDQklTRlFfnNZVVNBbWlAQ',
    technology: 'https://news.google.com/rss/topics/CAAqIggKIhxDQklTRFBNQVFnZHpNUEctQXJNVQ',
    // Add more categories here
    health: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRnFnfnNZVVNBaWlAQ'
};
```

### Modify Difficulty Level

Edit `scripts/fetch-trends.js`, line 147:

```javascript
'level3',  // Change to level1, level2, level4, or level5
```

## Next Steps

1. Test the skill with `/fetch-news-trends`
2. Verify data in the database
3. Check your API endpoints return the new trends
4. Set up automated scheduling
5. Monitor performance and adjust frequency as needed
