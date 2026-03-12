# Trend Eng - AI-Powered English Learning Platform

## Project Identity

**Purpose**: Trend-based English learning service that fetches real-time news trends and generates AI-powered learning content with voice chat capabilities.

**Core Value Proposition**: Learn English through current events and pop songs with AI tutor assistance.

**Target Users**: Korean-speaking English learners seeking contextual, real-world learning materials.

---

## Quick Reference (30 seconds)

### What is Trend Eng?

Trend Eng is a Node.js web application that:

1. **Fetches Trends**: Scrapes Google News RSS for current events across categories (Tech, Sports, Entertainment, Politics)
2. **AI Analysis**: Uses multiple AI providers (Gemini, Groq, GLM) to analyze trends and generate learning content
3. **Voice Chat**: Provides WebSocket-based real-time AI tutor with Web Speech API integration
4. **Content Storage**: Persists all content in SQLite database with automatic schema migrations

### Technology Stack

**Backend**: Express.js, WebSocket (ws), SQLite3, Passport.js (Google OAuth)

**AI APIs**: Google Gemini, Groq, GLM (Zhipu AI)

**Frontend**: Vanilla JavaScript, Web Speech API, SSE (Server-Sent Events)

**Database**: SQLite3 (database.sqlite)

### Key Commands

```bash
npm start                  # Start server (default port: 80)
npm run fetch-trends       # Fetch news trends via CLI
npm run fetch-trends:standalone  # Standalone trend fetcher
```

### Critical Architecture Points

**Multi-Provider AI Support**: getModelProvider() detects provider from model name prefix
- glm-* → Zhipu GLM
- llama-*, mixtral-*, gemma*, openai/*, moonshotai/*, qwen/* → Groq
- Others → Gemini

**System Prompt Management**: DEFAULT_PROMPT in server.js with placeholders {topic}, {difficulty}

**WebSocket Protocol**: JSON messages with type field ('context', 'chat', 'text', 'error')

**SSE Streaming**: /api/trends/events for real-time fetch progress updates

---

## Implementation Guide (5 minutes)

### Project Structure

**Core Server Files**:
- server.js: Main Express server, WebSocket server, API endpoints (1070 lines)
- database.js: SQLite schema management with automatic migrations
- chat-api.js: SSE-based chat API with session management (ChatSessionManager class)
- app.js: Frontend application logic (section navigation, learning state)
- chat.js: WebSocket chat interface with Web Speech API integration

**CLI Tools**:
- cli-fetch-trends.js: Command-line trend fetching utility
- fetch-trends-standalone.js: Standalone script for trend processing

**Configuration**:
- .env: API keys (GLM_API_KEY, GEMINI_API_KEY, GROQ_API_KEY), PORT, SESSION_SECRET
- database.sqlite: Auto-created SQLite database
- settings.html: Runtime configuration web UI

### Server Architecture

**Express Server Setup** (server.js):
- PORT: 80 (default), configurable via PORT env var
- CORS enabled for development
- Static file serving from root directory
- WebSocket server attached to Express HTTP server

**API Endpoints**:

Settings Management:
- GET /api/settings: Retrieve current settings with API key previews
- POST /api/settings: Update settings (API keys, models, system prompts)
- DELETE /api/settings: Clear Gemini API key
- DELETE /api/settings/glm: Clear GLM API key
- DELETE /api/settings/groq: Clear Groq API key

Content Generation:
- POST /api/generate: Generate 10 English sentences for topic/difficulty
- POST /api/trends/fetch: Fetch and analyze news trends with SSE progress
- POST /api/songs/fetch: Analyze pop song lyrics for learning content

Content Retrieval:
- GET /api/trends/saved: Retrieve saved news trends with learning content
- GET /api/songs/saved: Retrieve saved pop songs with learning content
- GET /api/trends/by-title?title=X: Get specific trend by title
- GET /api/history: Retrieve learning history
- GET /api/history/:id: Get specific history entry

Content Management:
- DELETE /api/trends/:id: Delete trend or song
- POST /api/trends/save: Save pre-analyzed trends (for CLI tools)
- POST /api/songs/save: Save pre-analyzed song (for CLI tools)

Chat Interface:
- POST /api/chat: REST-based chat endpoint
- WebSocket /ws/chat: Real-time bidirectional chat
- GET /api/trends/events: SSE stream for trend fetch progress

### Database Schema

**global_settings** (single row, id=1):
- geminiApiKey, glmApiKey, groqApiKey: TEXT (encrypted in production)
- geminiModel, chatModel: TEXT (model selection)
- systemPrompt: TEXT (custom AI tutor prompt)

**trends**:
- id: INTEGER PRIMARY KEY
- title, category, summary, keywords: TEXT
- sentences: TEXT (JSON array of learning sentences)
- difficulty: TEXT (level1-level5)
- date: TEXT (YYYY-MM-DD format)
- type: TEXT ('news' or 'song')
- createdAt: DATETIME

**learning_history**:
- id: INTEGER PRIMARY KEY
- topic, difficulty: TEXT
- sentences: TEXT (JSON array)
- createdAt: DATETIME

**users** (reserved for future OAuth):
- id: TEXT PRIMARY KEY
- name, email, picture: TEXT

**progress** (reserved for future features):
- userId: TEXT PRIMARY KEY
- topic, difficulty: TEXT
- currentCount: INTEGER
- sentences: TEXT

### AI Integration Patterns

**Provider Detection** (getModelProvider in server.js):
```javascript
function getModelProvider(model) {
    if (model.startsWith('glm-')) return 'glm';
    if (model.startsWith('llama-') ||
        model.startsWith('mixtral-') ||
        model.startsWith('gemma') ||
        model.startsWith('openai/') ||
        model.startsWith('moonshotai/') ||
        model.startsWith('qwen/')
    ) return 'groq';
    return 'gemini';
}
```

**API Calling Functions**:
- callGeminiAPI(): Direct REST API calls to generativelanguage.googleapis.com
- callGLMAPI(): OpenAI-compatible calls to open.bigmodel.cn
- callGroqAPI(): OpenAI-compatible calls to api.groq.com

**JSON Cleaning** (cleanAndParseJSON):
- Removes markdown code blocks
- Extracts JSON array/object boundaries
- Fixes trailing commas
- Escapes control characters in strings
- Handles malformed JSON responses

**System Prompt Template**:
DEFAULT_PROMPT in server.js supports placeholders:
- {topic}: Current learning topic
- {difficulty}: Level1-5 (왕초보 to 원어민)

### WebSocket Chat Protocol

**Connection**: ws://host/ws/chat

**Message Types**:
- context: Set learning topic context
- text: User chat message
- error: Error notification
- status: Connection status
- turn_complete: Response finished

**Server-Sent Events** (for trend fetching):
- event: fetching → "Collecting news trends..."
- event: analyzing → "Analyzing trends... (current/total)"
- event: generating → "Generating learning content... (current/total)"
- event: complete → "Completed! X/Y successful"
- event: error → Error message

### Frontend Architecture

**Section Navigation** (app.js):
- Trends Section: Display fetched news trends
- Songs Section: Display pop song learning content
- Topic Section: Custom topic input for sentence generation
- Learning Section: Interactive learning interface

**Learning Flow**:
1. User selects topic (trend/song/custom)
2. System loads 10 learning sentences
3. User progresses through sentences one by one
4. Each sentence shows: English text, Korean translation, structure, explanation, vocabulary
5. TTS (Text-to-Speech) button for pronunciation

**Chat Interface** (chat.js):
- WebSocket connection to /ws/chat
- Web Speech API integration:
  - SpeechRecognition for voice input
  - SpeechSynthesis for AI voice output
- Chat modal UI control

---

## Advanced Patterns (10+ minutes)

### Trend Fetching Workflow

**Phase 1: RSS Collection**:
1. Fetch 5 category RSS feeds from Google News
2. Parse XML to extract top 7 headlines per category
3. Deduplicate and shuffle, select top 10
4. Timeout: 8 seconds per request

**Phase 2: AI Analysis** (Sequential processing):
1. For each trend, call AI with analysis prompt
2. Extract: title, summary, keywords array
3. Retry logic: 3 attempts with progressive delay (4s, 8s, 12s)
4. 1.5 second delay between requests

**Phase 3: Learning Content Generation** (Sequential processing):
1. For each trend, call AI with system prompt + user prompt
2. Generate 10 learning sentences per trend
3. Retry logic: 3 attempts with progressive delay (5s, 10s, 15s)
4. 2.5 second delay between requests

**Phase 4: Database Storage**:
1. Delete existing trends for current date
2. Insert new trends with analyzed content
3. SSE progress updates throughout

### Error Handling Strategy

**API Rate Limiting**:
- Detect HTTP 429 status codes
- Implement exponential backoff
- Special handling for Groq Lite tier (30s wait)

**JSON Parsing Failures**:
- Multi-stage cleaning process
- Fallback parsing strategies
- Detailed error logging
- Graceful degradation (partial content saved)

**WebSocket Resilience**:
- Connection error logging
- Automatic reconnection (client-side)
- Error message propagation to UI

### Session Management (Chat API)

**ChatSessionManager Class**:
- In-memory session storage (Map)
- Max history length: 20 messages
- Session timeout: 30 minutes
- Auto-cleanup every 5 minutes

**Session Features**:
- Persistent conversation context
- Gemini-compatible history format
- System prompt injection
- Session ID generation

### Database Migration System

**Automatic Schema Evolution**:
1. On server start, check PRAGMA table_info
2. Compare existing columns vs required columns
3. Execute ALTER TABLE statements sequentially
4. Insert default row if missing
5. Signal database ready state

**Migration History**:
- Initial: glmApiKey, glmModel
- Migration 1: groqApiKey, groqModel, provider
- Migration 2: geminiApiKey, geminiModel, chatModel
- Migration 3: systemPrompt
- Migration 4: trends.sentences, trends.difficulty
- Migration 5: trends.date, trends.type

### Security Considerations

**API Key Management**:
- Stored in database (not hardcoded)
- .env fallback for development
- Preview-only in GET /api/settings (first 10 chars + ...)
- Clear endpoint for revocation

**CORS Configuration**:
- Enabled for development
- Configure origins for production

**Session Security**:
- express-session with SESSION_SECRET
- Passport.js Google OAuth (prepared but not fully implemented)

**Input Validation**:
- Message length validation in chat-api.js
- JSON parsing error handling
- SQL injection prevention (parameterized queries)

### Performance Optimization

**Rate Limit Handling**:
- Sequential API calls to avoid bursting
- Configurable delays between requests
- Retry logic with exponential backoff

**Streaming Responses**:
- SSE for trend fetch progress
- WebSocket for real-time chat
- Chunked JSON transmission

**Database Indexing**:
- Primary key on id columns
- Date-based queries for trends
- Foreign key constraints (users, progress)

---

## Development Workflow

### Environment Setup

1. **Clone and Install**:
```bash
git clone <repository>
cd trend-eng
npm install
```

2. **Configure Environment**:
```bash
cp .env.example .env
# Edit .env and set at least one API key:
# GLM_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here
# GROQ_API_KEY=your_key_here
```

3. **Start Server**:
```bash
npm start
# Server runs on http://localhost:80
```

### Testing Endpoints

**Test Chat API**:
- Open http://localhost:3000/test-chat-api.html
- Test SSE streaming and session management

**Test Settings**:
- Open http://localhost:3000/settings.html
- Configure API keys and model selection

**Test Database**:
- Open http://localhost:3000/data.html
- View trends, songs, and learning history

### Browser Requirements

**Supported Browsers**:
- Chrome/Edge (recommended): Full Web Speech API support
- Firefox: SpeechRecognition not supported (text-only chat)

**Microphone Access**:
- HTTPS required (except localhost)
- User permission required
- WebSocket connection required

**Mobile Support**:
- Responsive design implemented
- Touch-friendly interface
- Reduced functionality on iOS Safari (SpeechRecognition limited)

### Common Development Tasks

**Add New AI Provider**:
1. Add provider detection logic to getModelProvider()
2. Create callXXXAPI() function following existing pattern
3. Update database schema to include API key column
4. Add settings UI in settings.html

**Add New Learning Content Type**:
1. Add 'type' column to trends table (if not exists)
2. Create fetch endpoint in server.js
3. Add UI section in index.html
4. Implement frontend logic in app.js

**Customize System Prompt**:
1. Navigate to settings.html
2. Edit system prompt text area
3. Use placeholders: {topic}, {difficulty}
4. Click "Save Settings"
5. Set to "RESET" to restore DEFAULT_PROMPT

---

## Important Conventions

### File Naming

- CLI tools: cli-*.js (e.g., cli-fetch-trends.js)
- Standalone scripts: *-standalone.js (e.g., fetch-trends-standalone.js)
- Test files: test-*.js or test-*.html
- Main server: server.js
- Database: database.js

### Code Style

**Error Handling**:
- All async functions use try-catch
- WebSocket errors logged but don't crash server
- Database migrations run sequentially
- API errors return JSON with error codes

**Logging**:
- Server startup: console.log for key milestones
- WebSocket: [WS] prefix for connection events
- API: [API] prefix for request logging
- Errors: console.error with context

**Database Operations**:
- Parameterized queries (prevent SQL injection)
- serialize() for multiple operations
- Callback-based sqlite3 API
- Automatic migrations on startup

### API Response Format

**Success Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response**:
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message"
}
```

**SSE Event**:
```
event: eventName
data: {"key": "value"}

```

---

## Works Well With

### MoAI-ADK Skills

- moai-docs-generation: Generate API documentation from endpoints
- moai-workflow-jit-docs: Load latest AI API documentation on-demand
- moai-library-mermaid: Create architecture diagrams

### Recommended Agents

- expert-backend: Backend API development and optimization
- expert-frontend: Frontend UI improvements
- workflow-docs: Comprehensive documentation generation

### External Integrations

- Google News RSS: Real-time trend sources
- Web Speech API: Voice interaction
- SQLite: Embedded database
- Passport.js: Authentication framework (prepared)

---

## Project Configuration

### Environment Variables

**Required** (at least one):
- GLM_API_KEY: Zhipu AI API key
- GEMINI_API_KEY: Google Gemini API key
- GROQ_API_KEY: Groq API key

**Optional**:
- PORT: Server port (default: 80)
- SESSION_SECRET: Express session secret

### Model Selection

**Default Models**:
- Gemini: gemini-2.5-flash (generation), gemini-2.5-flash-native-audio-latest (chat)
- GLM: glm-4.7-flash
- Groq: llama-3.3-70b-versatile

**Configuration**:
- Set via settings.html UI
- Stored in database.global_settings
- Runtime changes without restart

### Database Location

**Default**: ./database.sqlite (auto-created)
**Development**: Can be deleted to reset
**Production**: Backup before migrations

---

## Troubleshooting

### Common Issues

**Server won't start**:
- Check port 80 availability (sudo or change PORT)
- Verify .env file exists
- Check API key validity

**Trend fetching fails**:
- Check API key is set for selected provider
- Verify internet connectivity
- Check Google News RSS accessibility
- Review server logs for specific errors

**Chat not working**:
- Verify WebSocket connection (browser console)
- Check API key for chat model
- Ensure Gemini 2.5 Flash availability
- Test with test-chat-api.html

**Voice features not working**:
- Use Chrome/Edge (Firefox SpeechRecognition unsupported)
- Check microphone permissions
- Ensure HTTPS (except localhost)
- Verify WebSocket connection

### Debug Mode

**Enable detailed logging**:
```javascript
// In server.js, add:
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
```

**Test API endpoints**:
```bash
# Test settings endpoint
curl http://localhost/api/settings

# Test trends endpoint
curl http://localhost/api/trends/saved
```

---

## Success Criteria

**Functional Requirements**:
- Fetch and analyze 10 news trends successfully
- Generate 10 learning sentences per trend
- Support voice chat with WebSocket
- Persist all content in SQLite

**Quality Standards**:
- API error rate < 5%
- Response time < 60 seconds for trend fetch
- Chat latency < 3 seconds
- Database migrations run without errors

**User Experience**:
- Intuitive section navigation
- Clear progress indicators
- Responsive design (mobile-friendly)
- Accessible learning content

---

## Future Enhancements

**Planned Features**:
- User authentication (Google OAuth via Passport)
- Personalized learning paths
- Spaced repetition system
- Achievement badges
- Progress analytics dashboard

**Technical Improvements**:
- Redis for session storage (replace in-memory)
- PostgreSQL for production database
- Docker containerization
- CI/CD pipeline
- Unit and integration tests

**Content Expansion**:
- YouTube video learning
- Podcast transcription learning
- News article reading comprehension
- Writing practice with AI feedback

---

## Resource Links

**AI Provider Documentation**:
- Google Gemini: https://ai.google.dev/gemini-api/docs
- Groq: https://console.groq.com/docs
- Zhipu GLM: https://open.bigmodel.cn/dev/api

**Technology Documentation**:
- Express.js: https://expressjs.com/
- WebSocket (ws): https://github.com/websockets/ws
- SQLite3: https://github.com/TryGhost/node-sqlite3
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

**Project Context**:
- See database.js for schema and migrations
- See server.js for API endpoint implementations
- See chat-api.js for session management patterns
- See settings.html for configuration UI

---

Version: 1.0.0
Last Updated: 2026-03-12
Maintained by: Trend Eng Development Team
