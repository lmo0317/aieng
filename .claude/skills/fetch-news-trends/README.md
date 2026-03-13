# Fetch News Trends Skill

Automated news trend fetching and English learning content generation system.

## Overview

This skill fetches trending news topics from Google News RSS feeds and generates comprehensive English learning content including:
- 10 English sentences per trend
- Korean translations
- Grammar structure analysis
- Learning tips and explanations
- Vocabulary lists with definitions

## Installation

The skill is already installed at `.claude/skills/fetch-news-trends/`

## Usage

### Option 1: Using Claude Code Skill (Recommended)

Simply invoke the skill from Claude Code:

```
/fetch-news-trends
```

Claude will:
1. Fetch RSS feeds from Google News
2. Extract 10 trending topics
3. Generate learning content for each trend
4. **Save to JSON file** (C:\Users\lmo03\Downloads\news_guide.json)
5. Report completion status

**⚠️ Note**: This skill now saves to JSON only, not database.

### Option 2: Running the Script Directly

```bash
cd D:/work/dev/web/aieng
node .claude/skills/fetch-news-trends/scripts/fetch-trends.js
```

## JSON Output Format

Content is saved to `C:\Users\lmo03\Downloads\news_guide.json`:

```json
{
  "title": "뉴스 기반 영어 학습 가이드 (N개 기사 통합)",
  "content": [
    {
      "news_title": "기사 제목",
      "sentences": [
        {
          "english": "영어 문장",
          "korean": "한국어 번역",
          "analysis": "문장 구조 분석",
          "explanation": "상세 설명",
          "vocabulary": "단어 설명"
        }
      ]
    }
  ]
}
```

**⚠️ Note**: Database storage has been removed. Only JSON file output is supported.
    summary TEXT,
    keywords TEXT,
    sentences TEXT,  -- JSON array of learning sentences
    difficulty TEXT DEFAULT 'level3',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Output Format

Each trend includes 10 learning sentences with this structure:

```json
{
  "en": "The latest news about AI has attracted global attention.",
  "ko": "AI에 관한 최신 뉴스가 전 세계적인 관심을 끌고 있습니다.",
  "sentence_structure": "Subject + Present Perfect + Object + Prepositional Phrase",
  "explanation": "This sentence uses present perfect tense to describe recent events...",
  "voca": ["latest: 최신의", "global: 전 세계적인", "attention: 관심"]
}
```

## Progress Indicators

When running, you'll see:

```
🔍 Fetching trends from Google News...
📡 Fetching business news...
📡 Fetching technology news...
📊 Found 10 trends
✨ Processing 10 unique trends
🤖 Analyzing: [Trend 1/10] AI Advancements in Healthcare...
✍️ Generating sentences: [1/10]...
💾 Saving to database...
✅ Saved: AI Advancements in Healthcare...
✅ Complete! 10 trends saved to database
```

## Categories

The skill fetches news from 5 categories:
- Business
- Technology
- Entertainment
- Sports
- Science

## Difficulty Levels

Generated content targets Level 3 (Intermediate) by default, but includes variety:
- Level 1: Basic present simple, common vocabulary
- Level 2: Past tense, wider vocabulary
- Level 3: Present perfect, conditional sentences
- Level 4: Complex grammar, business terminology
- Level 5: Idioms, advanced business expressions

## Requirements

- Node.js installed
- `axios` package (already installed in your project)
- `sqlite3` package (already installed in your project)
- SQLite database at `D:/work/dev/web/aieng/database.sqlite`

## Error Handling

The skill handles common issues:
- RSS feed unavailable: Logs error, continues with other feeds
- XML parsing error: Skips malformed feeds
- Database connection error: Retries connection
- Duplicate trends: Automatically removes duplicates

## Files

```
fetch-news-trends/
├── SKILL.md           # Main skill definition
├── README.md          # This file
└── scripts/
    └── fetch-trends.js # Implementation script
```

## Integration with Existing System

This skill integrates seamlessly with your existing English learning platform:
- Saves to the same `trends` table used by your API
- Compatible with existing `/api/trends` endpoints
- Works with your chat system for learning practice

## Notes

- The skill uses Claude's native capabilities for content generation
- No external AI APIs are required
- All content is generated directly by Claude
- RSS feeds are cached for 15 minutes to avoid rate limiting

## Troubleshooting

**Problem**: Script fails with "Cannot find module 'axios'"
**Solution**: Run `npm install axios` in the project directory (should already be installed)

**Problem**: Database connection fails
**Solution**: Ensure `database.sqlite` exists at the correct path

**Problem**: RSS feeds return empty
**Solution**: Check internet connection and Google News availability

## Future Enhancements

Potential improvements:
- Add more news categories
- Customize difficulty level per request
- Add filtering by keywords
- Support for multiple languages
- Historical trend analysis
