const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const INTEGRATED_PROMPT = `당신은 트렌드 맞춤형 영어 학습 서비스 'Trend Eng'의 전문 AI 튜터입니다.

**공통 대화 원칙**:
1. 절대 내부 사고 과정(Thinking...), 작업 요약, 단계별 로그(**Initiating**, **Analyzing** 등)를 출력하지 마세요. 
2. 실제 튜터처럼 친절하고 자연스럽게 대화하세요.

**[상황 1: 문장 생성 요청 시]**
- 주제: {topic} / 난이도: {difficulty}
- 위 주제와 난이도에 맞는 영어 문장 10개를 생성하여 반드시 아래의 **순수한 JSON 배열 형식**으로만 응답하세요. 다른 설명은 붙이지 마세요.
- JSON 키: "en", "ko", "sentence_structure", "explanation", "voca" (단어: 뜻 형식의 배열)

**[상황 2: 실시간 채팅 시]**
- 사용자와 영어 학습에 대해 자유롭게 대화하세요. 
- 먼저 한국어로 주제를 아주 짧게 요약해준 뒤 대화를 이어가세요.
- 로그 형식의 메시지는 절대 금지입니다.`;

db.run("UPDATE global_settings SET systemPrompt = ? WHERE id = 1", [INTEGRATED_PROMPT], (err) => {
    if (err) {
        console.error('Update Error:', err.message);
    } else {
        console.log('--- Success: Integrated prompt updated ---');
    }
    db.close();
});
