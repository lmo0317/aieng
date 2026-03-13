---
name: fetch-news-trends
description: >
  🔥 1타 강자 스타일 영어 학습 콘텐츠 생성기! Google News 트렌딩을 Bash curl로 직접 가져와서(API 절대 안 씀!), 발음, 문법, 비즈니스 뉘앙스, 실전 예시, 문화적 배경까지 완벽하게 정리해드립니다. 각 문장마다 💡발음 팁, 🔥핵심 표현, 🎯실전 상황, 🌍문화적 배경, 😎1타 강자 코멘트까지! 뉴스로 영어 정복하는 시스템이에요 ㅎㅎ

  📁 결과는 JSON 파일로 저장됩니다 (C:\Users\lmo03\Downloads\news_guide.json)
  ⚠️ DB는 저장하지 않고 JSON 파일로만 생성합니다!

allowed-tools: Bash Read Write Edit

metadata:
  version: "4.2.0"
  category: "workflow"
  status: "active"
  updated: "2026-03-14"
  modularized: "false"
  tags: "news, english-learning, trends, education, content-generation, curl, rss, 1타-강사, 비즈니스-영어, json-only"
  author: "MoAI-ADK"
  context7-libraries: ""
  related-skills: ""
  aliases: "news-trends, trending-news, english-from-news"

# Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 100
  level2_tokens: 5000

# Triggers
triggers:
  keywords: ["fetch news", "get trends", "update trends", "google news", "trending topics", "news learning", "english from news", "영어 공부", "뉴스 영어", "비즈니스 영어", "트렌드 학습"]
  agents: []
  phases: ["run"]
  languages: ["javascript"]
---

# Fetch News Trends 🔥

🎓 **1타 강자 스타일 영어 학습 시스템**

뉴스 트렌드를 Bash curl로 직접 가져와서(API X, 속도 제한 X!), Claude가 1타 강자 스타일로 영어 학습 콘텐츠를 생성합니다. 각 문장마다 발음, 문법, 비즈니스 뉘앙스, 실전 예시, 문화적 배경, 재미있는 코멘트까지 완벽 정리! 😎

## Quick Reference 🚀

🎯 **Core Workflow (1타 강자 방식)**:
1. 🔍 Bash curl로 Google News RSS 직접 가져오기 (API X)
2. 📰 5-10개 트렌딩 토픽 추출
3. 🎓 Claude가 각 토픽당 10개씩 1타 강자 스타일 학습 문장 생성
4. 💾 **JSON 파일로 저장** (C:\Users\lmo03\Downloads\news_guide.json)
5. 🎉 완료 보고

**🎯 주제별 분포 가이드라인 (총 10개)**:
- **정치**: 2개
- **연애**: 2개
- **스포츠**: 2개
- **테크**: 2개
- **금융**: 2개

📁 **출력 파일**: `C:\Users\lmo03\Downloads\news_guide.json`
⚠️ **DB는 저장하지 않고 JSON 파일로만 생성합니다!**

🔥 **JSON 출력 파일 형식**:

**출력 경로**: `C:\Users\lmo03\Downloads\news_guide.json`

**JSON 구조:**
```json
{
  "title": "뉴스 기반 영어 학습 가이드 (N개 기사 통합)",
  "content": [
    {
      "news_title": "한동훈 \"날 발탁한건 윤석열 대통령 아닌 대한민국\"",
      "category": "정치",
      "sentences": [
        {
          "english": "It was not former President Yoon Suk-yeol but the Republic of Korea that recruited me.",
          "korean": "나를 발탁한 것은 윤석열 전 대통령이 아니라 대한민국이었습니다.",
          "analysis": "S(It: 가주어) + V(was: be동사, 과거시제) + SC(not former President Yoon Suk-yeol but the Republic of Korea: 주격보어, not A but B 구조로 강조) + Relative Clause(that recruited me: 관계대명사절, 수식)",
          "explanation": "자신의 공적 정체성을 강조하며, 특정 개인과의 사적 인연보다 국가적 소명을 우선시함을 나타냅니다.",
          "vocabulary": "recruit (발탁하다), former (이전의), Republic of Korea (대한민국)"
        }
      ]
    }
  ]
}
```

**⚠️ 필수 필드:**
- `title`: 전체 가이드 제목
- `content`: 기사 배열
  - `news_title`: **기사 제목 (반드시 한글로 작성 - RSS 영어 제목을 번역)**
  - `category`: 카테고리 (정치, 연애, 스포츠, 테크, 금융 중 하나)
  - `sentences`: 학습 문장 배열 (10개)
    - `english`: 영어 문장
    - `korean`: 한국어 번역
    - `analysis`: 문장 구조 분석
    - `explanation`: 상세 설명 (1타 강자 스타일)
    - `vocabulary`: 단어 설명 (문자열)

## Implementation Guide

### Step 1: Fetch News from Google News RSS (Using Bash Curl - NO API Tools)

**CRITICAL**: Use Bash curl directly, NOT WebFetch or WebSearch APIs to avoid rate limiting issues.

Fetch RSS feed using Bash:
```bash
curl -s -L -A "Mozilla/5.0" "https://news.google.com/rss" > /path/to/save/FeedContent.xml
```

Parse XML using Node.js script:
```javascript
const fs = require('fs');

// Read the RSS file
const rssContent = fs.readFileSync('/path/to/FeedContent.xml', 'utf8');

// Parse XML using regex
const items = [];
const itemRegex = /<item>([\s\S]*?)<\/item>/g;
let match;

while ((match = itemRegex.exec(rssContent)) !== null && items.length < 10) {
    const itemContent = match[1];

    // Extract title (handle CDATA)
    const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const title = titleMatch ? titleMatch[1] :
                  (itemContent.match(/<title>([^<]+)<\/title>/) || [])[1] || '';

    // Extract link
    const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/);
    const link = linkMatch ? linkMatch[1] : '';

    // Extract description and clean HTML
    const descMatch = itemContent.match(/<description>([^<]+)<\/description>/);
    let description = descMatch ? descMatch[1] : '';
    description = description
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/<[^>]*>/g, '')
        .substring(0, 200);

    // Extract pubDate
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
```

**Why Bash Curl?**
- Avoids API rate limits (WebFetch/WebSearch have limits)
- Direct OS-level HTTP request
- Works on all platforms (Windows, Linux, Mac)
- No external dependencies or API keys needed

### Step 2: Process and Select Top Trends

After parsing RSS XML:
1. Collect all news items from the feed
2. Select top 5-10 most recent/relevant trending topics
3. Remove duplicates
4. Create trend objects with structure:

```javascript
{
  title: "RSS에서 추출한 영어 제목 (임시)",
  titleKorean: "한글 번역 제목 (JSON에 실제로 저장될 필드)",
  link: "Article URL",
  description: "Brief summary",
  category: "business|world|technology|entertainment|sports",
  pubDate: "Publication timestamp"
}
```

**⚠️ 중요**: `titleKorean` 필드에 한글 제목을 번역해서 저장하고, JSON 파일의 `news_title` 필드에는 이 `titleKorean` 값을 사용하세요.

### Step 3: Generate Learning Content (Using Claude's Native Capabilities)

**CRITICAL**: Generate content directly using Claude's language capabilities, NOT through API calls.

**⚠️ news_title 필드 작성 규칙 (HARD)**:
- RSS 피드에서 추출한 영어 제목을 **반드시 한글로 번역**해서 `news_title` 필드에 저장하세요
- 영어 제목을 그대로 사용하면 안 됩니다!
- 예시: "Live updates: Iran war news" → "이란 전쟁 소식: 실시간 업데이트"

**난이도 설정**: **level3 (중급)** - 모든 학습 문장은 level3 난이도로 생성

**🎯 analysis 필드 작성 가이드 (문장 구성 요소 분석)**:

문장의 구성 요소를 체계적으로 분석하고 각 요소의 역할을 설명합니다:

**구성 요소 태그**:
- **S**: Subject (주어) - 문장의 주체, 행위자
- **V**: Verb (동사) - 행위나 상태를 나타내는 본동사
- **O**: Object (목적어) - 동사의 행위를 받는 대상
- **SC**: Subject Complement (주격보어) - 주어를 설명하거나 보완
- **OC**: Object Complement (목적격보어) - 목적어를 설명
- **IO**: Indirect Object (간접목적어) - 행위의 수혜자

**형식**: S(주어) + V(동사) + O(목적어) + 수식어

**예시**:
- "Oil prices have surged following recent attacks."
  → S(Oil prices: 주어) + V(have surged: 현재완료 동사, 본동사) + Prep Phrase(following recent attacks: 전치사구, 시간/원인 수식어)

- "The company is implementing new strategies to boost revenue."
  → S(The company: 명사구, 주어) + V(is implementing: 현재진행 동사구) + O(new strategies: 명사구, 목적어) + Infinitive Phrase(to boost revenue: 부정사구, 목적)

- "The victory maintains South Korea's unbeaten streak in the qualifiers."
  → S(The victory: 주어) + V(maintains: 본동사, 현재시제) + O(South Korea's unbeaten streak: 소유격 명사구, 목적어) + Prep Phrase(in the qualifiers: 전치사구, 장소)

---

**🎯 explanation 필드 작성 가이드 (1타 강사 스타일)**:

**⚠️ JSON Escape 처리 주의사항**:
- ✅ **Single Quote(`'`)만 사용**: `'confirmed'`, `'important'`
- ❌ **Double Quote(`"`) 절대 사용 금지**: JSON 파싱 에러 발생!
- ❌ **한자(한자, 中자 등) 절대 사용 금지**: 영어 공부에 방해됨!
- ❌ **Emoji 절대 사용 금지**: 영어 문장 설명에 집중
- ✅ **Newline은 `\n`으로 표현**

**올바른 예시**:
```
'Confirmed'는 '확인하다'라는 뜻입니다. 현재완료 시제(have confirmed)를 사용합니다. 현재완료는 '과거에 시작된 행동이 현재까지 영향을 미치고 있음'을 나타냅니다. 단순히 '확인했다'라고 하면 과거 사실만 전달하지만, '방금 확인했고 그 확인 결과가 현재 유효하다'는 뉘앙스를 주려면 현재완료를 써야 합니다. 공식 발표나 뉴스 보도에서 가장 자주 쓰이는 패턴입니다.
```

**잘못된 예시** (double quote 사용):
```
"Confirmed"는 "확인하다"라는 뜻입니다!  // ❌ JSON 에러!
```

각 explanation은 다음 요소로 구성됩니다:

**1. 문법적 핵심 (왜 이 시제/구조를 썼는지)**:
- 현재완료: "현재완료 시제(have surged)를 사용합니다. 현재완료는 '과거에 시작된 행동이 현재까지 영향을 미치고 있음'을 나타냅니다. 단순히 '유가가 올랐다'라고 하면 과거 사실만 전달하지만, '올랐고 그 여파가 지금도 계속'이라는 뉘앙스를 주려면 현재완료를 써야 합니다. 뉴스에서 최근 사건을 보고할 때 가장 자주 쓰이는 시제입니다."
- 수동태: "행위자보다 결과에 초점을 맞춥니다. 'The incident was reported'는 누가 보고했는지보다 사건이 보고되었다는 사실 자체에 초점을 맞춥니다. 뉴스 보도에서는 결과가 더 중요할 때 수동태를 자주 사용합니다."
- 조동사: "can은 능력(할 수 있다), could는 가능성(할 수도 있다)이나 완곡한 제안을 나타냅니다. would는 가정, should는 권고나 당위를 표현합니다."

**2. 단어 선택 이유 (왜 이 단어가 적절한지)**:
- 단어 뉘앙스 비교: "surge vs increase vs rose: surge는 '급격히 솟구치다'로 홍수처럼 밀려오는 이미지가 있습니다. increase는 '단순히 늘어나다'로 평범한 증가를, rose는 '올랐다'로 단순한 과거 사실을 나타냅니다. 뉴스에서 강도를 높이려면 surge를 써야 합니다."
- 동의어 설명: "implement는 실행하다라는 뜻으로, carry out이나 do와 비슷하지만 더 프로페셔널하고 공식적인 느낌을 줍니다. 비즈니스 미팅이나 공식 문서에서 자주 사용됩니다."
- 전치사 선택: "following vs after: following은 '~에 따른, ~후의'라는 뜻으로 after보다 인과관계가 더 강합니다. 공격이 있었고 → 그 결과로 유가가 올랐다는 자연스러운 인과관계를 following 하나로 표현할 수 있습니다."

**설명 내용**: 영어 문장 해석에 집중, 문법과 단어 뉘앙스 상세 설명
**설명 길이**: 150-300자 (상세하게)
**구조**: 문법 → 단어 (구체적 예시와 뉘앙스 포함)

For each trend, Claude should directly create 10 learning sentences with:

Each sentence must include (level3 중급 기준):
```json
{
  "en": "Oil prices have surged following recent attacks on shipping vessels in the Middle East.",
  "ko": "중동 지역의 선박 공격 이후 유가가 급등했습니다.",
  "sentence_structure": "[S(주어) + V(동사구) + Prep Phrase(전치사구)] / Oil prices(명사구, 주어) + have surged(현재완료 동사구, 본동사) + following recent attacks on shipping vessels(전치사구, 시간/원인 수식어) + in the Middle East(전치사구, 장소 수식어)",
  "explanation": "현재완료 시제(have surged)를 사용합니다. 현재완료는 '과거에 시작된 행동이 현재까지 영향을 미치고 있음'을 나타냅니다. 단순히 '유가가 올랐다'라고 하면 과거 사실만 전달하지만, '올랐고 그 여파가 지금도 계속'이라는 뉘앙스를 주려면 현재완료를 써야 합니다. 뉴스에서 최근 사건을 보고할 때 가장 자주 쓰이는 패턴입니다. have surged는 rose나 increased보다 급격한 상승을 강조합니다. surge는 '급격히 솟구치다'로 홍수처럼 밀려오는 이미지가 있습니다. following은 after보다 인과관계가 더 강한 전치사로, 공격이 있었고 → 그 결과로 유가가 올랐다는 인과관계를 명확히 표현합니다.",
  "voca": [
    "surge: 급등하다, 급증하다",
    "following: ~에 따른, ~후의",
    "vessel: 선박, 배"
  ]
}
```

**Content Generation Guidelines:**

각 문장은 다음을 포함해야 합니다:
1. **영어 문장**: 실제 뉴스에서 사용되는 자연스러운 표현
2. **한국어 번역**: 자연스러운 번역
3. **문장 구조**: 문법적 구조 분석 (품사 태깅)
4. **상세 설명**: 문법 포인트와 단어 선택 이유 (간결하게)
5. **어휘**: 단어와 뜻

**Difficulty Levels (상세):**

**Level 1 (초급):**
- 시제: 현재 시제 (Present Simple)
- 어휘: 일상생활에서 가장 자주 쓰이는 1000단어
- 문장 길이: 8-12단어
- 예시: "Oil prices go up." "The company makes money."

**Level 2 (중급):**
- 시제: 과거 시제 (Past Simple), 현재 진행
- 어휘: 비즈니스 기초 2000단어
- 문장 길이: 12-18단어
- 예시: "Oil prices went up yesterday." "The company is growing fast."

**Level 3 (중상급):**
- 시제: 현재완료 (Present Perfect), 미래 시제
- 어휘: 비즈니스 중급 3000단어
- 문장 길이: 15-20단어
- 복문 접속사: because, when, if
- 예시: "Oil prices have surged due to geopolitical tensions."

**Level 4 (상급):**
- 시제: 현재완료 진행, 과거완료
- 어휘: 비즈니스 고급 5000단어
- 문장 길이: 20-25단어
- 복잡한 문장 구조: 수동태, 관계대명사
- 예시: "Having implemented the new strategy, the company has seen significant improvements in market share."

**Level 5 (최상급):**
- 시제: 복합 시제, 가정법
- 어휘: 전문 용어, 이디엄
- 문장 길이: 25-35단어
- 비즈니스 뉘앙스: 암시, 간접 표현
- 예시: "Had the company anticipated the market downturn, they could have mitigated the impact on their bottom line."

**1타 강자 스타일 가이드라인:**

✅ 재미있는 표현 사용:
- "이거 진짜 중요해요! 외워두면 무조건 써먹습니다 😎"
- "원어민들도 이 표현 좋아라 하는데, 우리도 같이 배워봐요!"
- "비즈니스 영어의 필수템, 이거 하나면 80%는 커버됩니다 👍"

✅ 이모지 적극 활용:
- 💡 팁, 🔥 핵심, ⚠️ 주의, 🎯 포인트
- 😱 놀랄 때, 😎 자신 있을 때, 🤔 고민할 때

✅ 실전 예시 중시:
- "실제로 이렇게 써보세요: [실제 예시]"
- "미국 회사에서 이렇게 써요: [실제 사례]"

✅ 기억技巧 공유:
- " mnemonic: surge = 서지(急增) 라고 외우세요!"
- "어원: commercial = commerce(상업) + ial(~의)"
- "연상법: vessel = 배(vessel)가 항구(port)에 들어온다"

### Step 4: Save to JSON File

**⚠️ JSON 파일 저장 경로**: `C:\Users\lmo03\Downloads\news_guide.json`

**JSON 구조**:
```javascript
const newsGuide = {
  title: "뉴스 기반 영어 학습 가이드 (N개 기사 통합)",
  content: []
};

// 각 트렌드별로 처리
trends.forEach(trend => {
  const article = {
    news_title: trend.title,  // 한글 제목
    category: trend.category,  // 카테고리 (정치, 연애, 스포츠, 테크, 금융)
    sentences: []  // 10개 학습 문장
  };

  // 학습 문장 변환
  trend.sentences.forEach(sentence => {
    article.sentences.push({
      english: sentence.en,
      korean: sentence.ko,
      analysis: sentence.sentence_structure,
      explanation: sentence.explanation,
      vocabulary: sentence.voca.join(", ")
    });
  });

  newsGuide.content.push(article);
});

// JSON 파일로 저장
const fs = require('fs');
const outputPath = 'C:\\Users\\lmo03\\Downloads\\news_guide.json';

// JSON.stringify가 자동으로 escape 처리합니다
const jsonString = JSON.stringify(newsGuide, null, 2);
fs.writeFileSync(outputPath, jsonString, 'utf8');

// 저장 후 JSON 파싱 테스트 (escape 검증)
try {
  const testParse = JSON.parse(jsonString);
  console.log('✅ JSON escape 검증 완료!');
} catch (e) {
  console.error('❌ JSON escape 에러:', e.message);
}

console.log(`✅ JSON 파일 저장 완료: ${outputPath}`);
```

**학습 문장 포맷**:
```json
{
  "english": "Oil prices have surged dramatically following recent attacks on commercial shipping vessels in the Middle East.",
  "korean": "중동 지역의 상선 공격 이후 유가가 급등했습니다.",
  "analysis": "[Subject + Present Perfect] / [Oil prices: 주어] / [have surged: 급격히 오르다] / [following: ~에 따른] / [attacks: 공격들]",
  "explanation": "이 문장은 현재완료 시제(have surged)를 사용해서 최근 사건의 현재 영향을 강조합니다. 'Surged'는 급격히 오르다는 뜻으로, 주가나 가격이 급등할 때 쓰는 표현입니다. 💡",
  "vocabulary": "surge: 급등하다, commercial: 상업의, vessel: 선박"
}
```

### Step 5: JSON Escape & Validation

**⚠️ JSON Escape 처리 규칙**:

JSON에서 **반드시 escape 해야 하는 문자**:
- Double Quote(`"`) → `\"` 로 변환
- Backslash(`\`) → `\\` 로 변환
- Newline(`\n`) → `\n` (escape된 줄바꿈)
- Tab(`\t`) → `\t` (escape된 탭)

**JSON.stringify()가 자동으로 처리**하므로 수동 escape 불필요!

**explanation 필드 작성 시 주의사항**:
- ✅ Single Quote(`'`)는 그대로 사용: `'confirmed'`
- ❌ Double Quote(`"`)는 절대 사용 금지 (JSON.stringify가 자동 escape)
- ✅ Emoji는 그대로 사용: 🔥💡⚠️🎯😎
- ✅ Newline은 `\n`으로 표현

**올바른 예시**:
```json
{
  "explanation": "현재완료 시제(have confirmed)를 사용합니다. 현재완료는 '과거에 시작된 행동이 현재까지 영향을 미치고 있음'을 나타냅니다. 단순히 '확인했다'라고 하면 과거 사실만 전달하지만, '방금 확인했고 그 확인 결과가 현재 유효하다'는 뉘앙스를 주려면 현재완료를 써야 합니다. 공식 발표나 뉴스 보도에서 가장 자주 쓰이는 패턴입니다."
}
```

**잘못된 예시** (double quote 사용):
```json
{
  "explanation": "🔥 \"Confirmed\"는 \"확인하다\"라는 뜻입니다!"  // ❌ 에러 발생!
}
```

**JSON 검증 체크리스트**:

```javascript
// JSON 파일 읽기 & 파싱 테스트
const fs = require('fs');
const jsonPath = 'C:\\Users\\lmo03\\Downloads\\news_guide.json';

try {
  // 1. JSON 파싱 테스트 (escape 검증)
  const content = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(content);  // 여기서 에러가 나면 escape 문제!

  console.log('✅ JSON 파싱 성공! (escape 처리 완료)');

  // 2. 기본 구조 확인
  console.log('\n📊 구조 확인:');
  console.log('   - title 존재:', !!data.title);
  console.log('   - content 배열 존재:', Array.isArray(data.content));
  console.log('   - 기사 수:', data.content.length);

  // 3. 각 기사 구조 확인
  data.content.forEach((article, idx) => {
    console.log(`\n📰 기사 ${idx + 1}: ${article.news_title}`);
    console.log('   - category:', article.category || '❌ 누락');
    console.log('   - sentences 배열:', Array.isArray(article.sentences));
    console.log('   - 문장 수:', article.sentences.length);

    // 4. 각 문장 필드 확인
    article.sentences.forEach((sent, sIdx) => {
      const requiredFields = ['english', 'korean', 'analysis', 'explanation', 'vocabulary'];
      const missingFields = requiredFields.filter(f => !sent[f]);

      if (missingFields.length > 0) {
        console.log(`   ⚠️  문장 ${sIdx + 1} 누락 필드:`, missingFields);
      } else {
        if (sIdx === 0) {
          console.log(`   ✅ 첫 문장 구조 완전 (나머지 ${article.sentences.length - 1}개 생략)`);
        }
      }
    });
  });

  // 5. 한자 검증 (HARD RULE)
  console.log('\n🔍 한자 검증 시작...');
  let hasHanja = false;

  data.content.forEach((article, aIdx) => {
    article.sentences.forEach((sent, sIdx) => {
      // explanation 필드에서 한자 검사
      const expl = sent.explanation;
      const hanjaRegex = /[\u4e00-\u9fff]/;
      if (hanjaRegex.test(expl)) {
        console.log(`   ❌ 기사 ${aIdx + 1} 문장 ${sIdx + 1}: 한자 발견!`);
        console.log(`      ${expl.substring(0, 100)}...`);
        hasHanja = true;
      }
    });
  });

  if (hasHanja) {
    console.log('\n❌ 한자가 발견되었습니다! 한글로 변환하세요.');
    console.log('예: 正式 → 정식적인, 正確 → 정확한');
  } else {
    console.log('   ✅ 한자 없음 (한글과 영어만 사용됨)');
  }

  console.log('\n✅ JSON 검증 완료! 모든 필드가 정상입니다.');

} catch (e) {
  console.error('\n❌ JSON 에러 발생!');
  console.error('에러 메시지:', e.message);

  if (e.message.includes('JSON')) {
    console.error('\n가능한 원인:');
    console.error('1. Double quote(\")가 escape 되지 않음');
    console.error('2. Trailing comma(끝에 쉼표)가 있음');
    console.error('3. Bracket({}[])가 안 닫힘');
    console.error('\n해결책: JSON.stringify()를 사용하여 자동 escape 처리하세요!');
  }
}
```

**필수 필드 확인**:
- `title`: 전체 가이드 제목
- `content`: 기사 배열
  - `news_title`: 기사 제목 (한글)
  - `sentences`: 학습 문장 배열 (10개)
    - `english`: 영어 문장
    - `korean`: 한국어 번역
    - `analysis`: 문장 구조 분석
    - `explanation`: 상세 설명 (1타 강자 스타일)
    - `vocabulary`: 단어 설명 (문자열)

### Step 6: Execution Flow (No API Calls)

**Execution Pattern:**
```
🤖 MoAI ★ 진행 상황 ────────────────────────
📊 JSON 생성 방식으로 실행
⏳ Bash curl을 사용하여 RSS 피드 직접 요청 중...
────────────────────────────────────────────

[1] Fetch RSS: curl -s -L "https://news.google.com/rss" > FeedContent.xml
[2] Parse XML: Extract 10 trending news items
[3] Generate Content: Claude creates 10 learning sentences per trend
[4] Save to JSON: C:\Users\lmo03\Downloads\news_guide.json
[5] Verify: JSON structure validation
[5.5] Hanja Check: 검증하여 한자가 없는지 최종 확인 (한자 절대 사용 금지!)
[6] Cleanup: Remove temporary files

✅ 작업 완료
📊 뉴스 트렌드 학습 데이터 JSON 파일 생성 완료
📁 저장 위치: C:\Users\lmo03\Downloads\news_guide.json
```

**Key Points:**
- NO WebFetch, WebSearch, or external API calls
- Use Bash curl for RSS retrieval
- Use Claude's native capabilities for content generation
- Save to JSON file (NO database storage)
- Clean up temporary files after completion

**완료 후 결과**:
```
✅ JSON 파일 생성 완료!
📁 경로: C:\Users\lmo03\Downloads\news_guide.json
📊 기사 수: 10개
📝 총 문장 수: 100개
```

## Advanced Implementation

### Error Handling

Handle common failures:
- RSS feed unavailable: Retry with delay, log error
- XML parsing error: Skip to next feed
- Database connection error: Retry connection, alert user
- Content generation timeout: Continue with next trend

### Performance Optimization

- Batch database inserts (insert all 5-10 trends in single transaction)
- Claude generates content directly (no API latency)
- Use Bash curl for fast RSS retrieval
- Clean up temporary files after completion

### Content Quality Assurance

Validate generated content:
- Check JSON structure integrity
- Verify Korean translations are natural
- Ensure vocabulary relevance to trend
- Confirm grammar explanations are accurate
- Test difficulty level consistency
- **[HARD] 한자(Chinese characters) 검증**: 절대 사용 금지! 한글과 영어만 사용

### Database Maintenance

Implement cleanup routine:
```sql
-- Remove trends older than 7 days
DELETE FROM trends WHERE createdAt < datetime('now', '-7 days');

-- Check for duplicates
SELECT title, COUNT(*) as count FROM trends GROUP BY title HAVING count > 1;
```

### Category-Specific Content Strategies (1타 강자 스타일)

**💼 Business (비즈니스) - "CEO가 되는 법"**

🎯 핵심 포커스:
- 재무 용어 (financial terms): revenue, profit, margin, EBITDA 💰
- 시장 용어 (market terms): bull market, volatility, surge 📈
- 협상 표현 (negotiation): leverage, compromise, win-win 🤝

📝 문장 스타일:
- "Our Q3 revenue exceeded projections by 15%, driven by strong market demand."
- "Having implemented the new strategy, we've seen significant ROI."

💡 1타 강자 팁:
"비즈니스 영어의 핵심은 숫자와 결과를 명확히 보여주는 거예요! 🎯
'exceeded', 'driven by', 'significant' 같은 단어를 쓰면
프로페셔널한 느낌이 팍팍 묻어납니다 😎"

🔥 필수 단어 Top 10:
1. leverage (활용하다) - "We leveraged AI technology"
2. streamline (간소화하다) - "Streamline operations"
3. scalable (확장 가능한) - "Scalable solution"
4. optimize (최적화하다) - "Optimize performance"
5. mitigate (완화하다) - "Mitigate risks"
6. bolster (강화하다) - "Bolster security"
7. curtail (축소하다) - "Curtail expenses"
8. expedite (신속히 처리하다) - "Expedite process"
9. scrutinize (면밀히 조사하다) - "Scrutinize data"
10. synergize (시너지 내다) - "Synergize teams"

---

**💻 Technology (테크놀로지) - "실리콘밸리 스타일"**

🎯 핵심 포커스:
- 혁신 용어 (innovation): disrupt, revolutionize, paradigm shift 🚀
- 개발 용어 (development): deploy, scale, iterate 🛠️
- 미형 예측 (future predictions): will, is poised to, is set to 🔮

📝 문장 스타일:
- "AI is poised to revolutionize how we work and live."
- "Having deployed the new architecture, scalability improved by 300%."

💡 1타 강자 팁:
"테크 영어는 '미래형'과 '혁신' 냄새가 물씬 나야 해요! 🔥
'revolutionize', 'paradigm shift', 'game-changer' 같은
드라마틱한 표현을 쓰면 실리콘밸리 감성이 살아납니다 ㅋㅋ"

🔥 필수 단어 Top 10:
1. disrupt (파괴하다/혁신하다) - "Disrupt the industry"
2. scalable (확장 가능한) - "Highly scalable"
3. deploy (배포하다) - "Deploy to production"
4. iterate (반복 개선하다) - "Iterate quickly"
5. paradigm shift (패러다임 전환) - "Major paradigm shift"
6. cutting-edge (최첨단) - "Cutting-edge tech"
7. game-changer (게임 체인저) - "Real game-changer"
8. leverage (활용하다) - "Lverage AI"
9. bottleneck (병목) - "Remove bottlenecks"
10. optimize (최적화하다) - "Optimize performance"

---

**🎬 Entertainment (엔터테인먼트) - "할리우드 스타일"**

🎯 핵심 포커스:
- 캐주얼 표현 (casual): vibe, hype, buzz 🎉
- 슬랭 (slang): binge-worthy, cliffhanger, spin-off 🍿
- 서술 표현 (descriptive): gripping, riveting, spellbound ✨

📝 문장 스타일:
- "The show's cliffhanger ending left fans totally obsessed!"
- "That movie was absolutely fire - the visuals were insane!"

💡 1타 강자 팁:
"엔터 영어는 '감성'이 핵심이에요! 😍
'obsessed', 'insane', 'fire' 같은
감탄사를 남발하면 진짜 현지인처럼 들립니다 ㅋㅋㅋ"

🔥 필수 단어 Top 10:
1. binge-watch (몰아서 보다) - "Binge the whole season"
2. cliffhanger (클리프행어) - "Crazy cliffhanger"
3. spin-off (스핀오프) - "Successful spin-off"
4. cameo (카메오) - "Surprise cameo"
5. blockbuster (블록버스터) - "Summer blockbuster"
6. franchise (프랜차이즈) - "Huge franchise"
7. reboot (리부트) - "Movie reboot"
8. prequel (프리퀄) - "Backstory prequel"
9. sequel (시퀄) - "Highly anticipated sequel"
10. hype (하이프/기대감) - "Crazy hype"

---

**⚽ Sports (스포츠) - "해설처럼 말하기"**

🎯 핵심 포커스:
- 동작 동사 (action verbs): dominate, crush, annihilate 💪
- 경쟁 표현 (competition): rivalry, underdog, comeback 🏆
- 현재 진행 (live commentary): is taking, is making, is scoring 🎙️

📝 문장 스타일:
- "He's absolutely crushing it out there today!"
- "What an incredible comeback! The underdog just stunned everyone!"

💡 1타 강자 팁:
"스포츠 영어는 '에너지'가 생명이에요! 🔥
'crushing it', 'stunned', 'incredible' 같은
감정 표현을 쓰면 마치 경기장에 있는 느낌! 📢"

🔥 필수 단어 Top 10:
1. dominate (지배하다) - "Totally dominated"
2. crush (완승하다) - "Crushed the opponent"
3. upset (이변) - "Huge upset"
4. underdog (약자) - "Classic underdog story"
5. rivalry (라이벌) - "Fierce rivalry"
6. comeback (컴백) - "Epic comeback"
7. MVP (MVP) - "Deserved MVP"
8. clutch (클러치/결정적) - "Clutch performance"
9. blowout (대승) - "Total blowout"
10. nail-biter (손에 땀을 쥐게 하는) - "Real nail-biter"

---

**🔬 Science (과학) - "노벨상 수상자 스타일"**

🎯 핵심 포커스:
- 학술 용어 (academic): hypothesis, methodology, paradigm 📚
- 실험 표현 (experiment): empirical, peer-reviewed, validation 🧪
- 수동태 (passive voice): was observed, were measured, is suggested 📊

📝 문장 스타일:
- "The hypothesis was validated through empirical research."
- "Having analyzed the data, significant correlations were observed."

💡 1타 강자 팁:
"과학 영어는 '정확성'과 '겸손함'이 핵심이에요! 🎓
'suggests', 'may indicate', 'appears to' 같은
조심스러운 표현을 써야 프로 페르소나! 😊"

🔥 필수 단어 Top 10:
1. hypothesis (가설) - "Test the hypothesis"
2. methodology (방법론) - "Robust methodology"
3. empirical (실증적) - "Empirical evidence"
4. correlation (상관관계) - "Strong correlation"
5. causation (인과관계) - "Prove causation"
6. peer-reviewed (동료 심사) - "Peer-reviewed study"
7. paradigm (패러다임) - "New paradigm"
8. breakthrough (돌파구) - "Major breakthrough"
9. innovation (혁신) - "Revolutionary innovation"
10. replicate (재현하다) - "Replicate results"

## Resources

### RSS Feed Reference

**Working Google News RSS URL:**
- Main feed: `https://news.google.com/rss` (Top Stories - all categories)

**Fetch command:**
```bash
curl -s -L -A "Mozilla/5.0" "https://news.google.com/rss" > FeedContent.xml
```

**Note:** Topic-specific RSS URLs (CAAqJggKIi...) currently return 400 errors. Use the main RSS feed for reliable access to trending news.

### XML Parsing Example

```javascript
const parseRSS = (xmlContent) => {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlContent)) !== null) {
        const itemContent = match[1];
        const title = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
        const link = itemContent.match(/<link>(.*?)<\/link>/);
        const description = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);

        if (title && link) {
            items.push({
                title: title[1],
                link: link[1],
                description: description ? description[1] : '',
                category: 'general'
            });
        }
    }

    return items;
};
```

### Database Script Template

**Complete workflow script:**

```javascript
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Step 1: Fetch RSS using Bash curl
// Run: curl -s -L -A "Mozilla/5.0" "https://news.google.com/rss" > FeedContent.xml

// Step 2: Parse RSS
const rssContent = fs.readFileSync('FeedContent.xml', 'utf8');
const items = [];
const itemRegex = /<item>([\s\S]*?)<\/item>/g;
let match;

while ((match = itemRegex.exec(rssContent)) !== null && items.length < 10) {
    const itemContent = match[1];
    const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const title = titleMatch ? titleMatch[1] : '';
    const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/);

    if (title && linkMatch) {
        items.push({
            title,
            link: linkMatch[1],
            category: 'general'
        });
    }
}

// Step 3: Claude generates learning content (done interactively)
// Then save to database...

const db = new sqlite3.Database('D:/work/dev/web/aieng/database.sqlite');

// Step 4: Save to database
const trendsData = [
    {
        title: "Trend title here",
        category: "business",
        summary: "Brief summary",
        keywords: ["keyword1", "keyword2"],
        sentences: [
            // Claude generates 10 sentences here
        ]
    }
];

// Insert all trends
trendsData.forEach((trend) => {
    db.run(`INSERT INTO trends (title, category, summary, keywords, sentences, difficulty, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [trend.title, trend.category, trend.summary,
         JSON.stringify(trend.keywords), JSON.stringify(trend.sentences),
         'level3', new Date().toISOString()]
    );
});

db.close();
```

## Changelog

### v4.2.0 (2026-03-14)
- **🔤 news_title 필드 한글 강제 규칙 추가**
  - RSS 피드에서 추출한 영어 제목을 반드시 한글로 번역해서 저장
  - Step 2에 titleKorean 필드 예시 추가
  - Step 3에 한글 제목 작성 HARD 규칙 추가
  - JSON 구조 예시 news_title 필드에 한글 강제 표기 추가

### v4.1.0 (2026-03-13)
- **🔍 analysis 필드 문장 구성 요소 분석 방식 개선**
  - 품사 태깅 방식에서 문장 구성 요소 분석 방식으로 변경
  - S(주어), V(동사), O(목적어), SC(주격보어), OC(목적격보어), IO(간접목적어) 태그 체계화
  - 각 요소의 역할과 기능을 명확히 설명하는 형식으로 개선
  - JSON 예시 analysis 필드 업데이트
  - 예시 3개 추가 (Oil prices, The company, The victory)

### v4.0.0 (2026-03-13)
- **🔄 JSON 전용 모드로 전환**
  - DB 저장 기능 제거
  - JSON 파일로만 저장 (C:\Users\lmo03\Downloads\news_guide.json)
  - news_english_guide_3.json 호환 형식
- **📁 JSON 출력 형식 변경**
  - title: 전체 가이드 제목
  - content: 기사 배열
    - news_title: 기사 제목
    - sentences: 학습 문장 배열 (10개)
      - english, korean, analysis, explanation, vocabulary
- **⚙️ Step 4-6 재작성**
  - Step 4: Save to JSON File
  - Step 5: Verify JSON Structure
  - Step 6: Execution Flow (No API Calls)

### v3.3.0 (2026-03-13)
- **🎨 카테고리 한글 변경 및 색상 지정**
  - 모든 카테고리 한글로 변경 (world→세계, politics→정치 등)
  - color 필드 추가 및 카테고리별 색상 지정
  - 정치(#EF4444), 연애(#EC4899), 스포츠(#EAB308), 테크(#8B5CF6), 금융(#F59E0B)
- **📊 주제별 분포 가이드라인 추가**
  - 정치 2개, 연애 2개, 스포츠 2개, 테크 2개, 금융 2개
  - 총 10개 트렌드 균등 분포
- **🔧 데이터베이스 스키마 업데이트**
  - color 필드 추가
  - 한글 카테고리 매핑 테이블 추가

### v3.2.0 (2026-03-13)
- **🗑️ 오늘 데이터 자동 삭제 기능**
  - 실행 시 오늘 날짜의 기존 뉴스 데이터 자동 삭제
  - 새로운 데이터로 덮어쓰기 (중복 방지)
  - 항상 최신 트렌드만 유지
- **⚠️ 사용자 경고 개선**
  - 스킬 description에 자동 삭제 기능 명시
  - 데이터 중복 방지를 위한 안내 추가

### v3.1.0 (2026-03-13)
- **🔧 데이터베이스 호환성 강화**
  - title 필드: 한글 제목 강제 (영어 X)
  - summary 필드: 한글 요약 강제 (영어 X)
  - keywords 필드: 한글 키워드 배열 형식 강제
  - sentences.voca 필드: 문자열 배열 형식 강제 `["단어: 뜻"]`
  - date 필드: `YYYY-MM-DD` 형식 필수 추가
  - type 필드: `"news"` 값 필수 추가
- **📝 학습 문장 포맷 변경**
  - 11개 필드 → 5개 필드로 간소화
  - vocabulary 객체 배열 → voca 문자열 배열로 변환
  - 발음, 연습 팁, 실전 상황, 관련 표현, 문화적 배경 필드는 설명에 통합
- **✅ 데이터 검증 절차 추가**
  - Step 5: 데이터베이스 호환성 확인 절차 추가
  - 한글 제목, date 필드, type 필드 자동 검증

### v3.0.0 (2026-03-12)
- **🎉 1타 강자 스타일 도입**
  - 11개 필드 학습 문장 생성
  - 발음, 연습 팁, 실전 상황, 관련 표현, 문화적 배경 추가
  - 이모지와 재미있는 코멘트 활용
  - 난이도 레벨 상세화 (level1-5)
  - 카테고리별 전략 가이드 추가

## Works Well With

- moai-foundation-claude: Core Claude Code integration
- moai-workflow-project: Project management and automation
- English language learning applications
- Content management systems
- Educational platforms
