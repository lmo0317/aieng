const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 설정
const JSON_PATH = 'C:\\Users\\lmo03\\Downloads\\news_guide.json';
const DB_PATH = path.resolve(__dirname, '..', 'db', 'database.sqlite');

async function importToDb() {
    try {
        // 1. JSON 파일 읽기
        if (!fs.existsSync(JSON_PATH)) {
            console.error(`❌ 파일을 찾을 수 없습니다: ${JSON_PATH}`);
            return;
        }
        const rawData = fs.readFileSync(JSON_PATH, 'utf8');
        const data = JSON.parse(rawData);

        // 2. DB 연결
        const db = new sqlite3.Database(DB_PATH);
        const today = new Date().toISOString().split('T')[0];

        console.log('💾 데이터베이스에 저장 중...');

        db.serialize(() => {
            const stmt = db.prepare(`
                INSERT INTO trends (title, category, summary, keywords, sentences, difficulty, date, type) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            data.content.forEach((item) => {
                // 기존 스키마에 맞게 매핑
                const title = item.news_title;
                const category = item.category;
                const summary = ""; // 요약은 생략하거나 첫 문장 활용 가능
                const keywords = JSON.stringify([]);
                const sentences = JSON.stringify(item.sentences);
                const difficulty = "level3";
                const type = "news";

                stmt.run(title, category, summary, keywords, sentences, difficulty, today, type);
            });

            stmt.finalize();
            
            db.close((err) => {
                if (err) {
                    console.error('❌ DB 닫기 오류:', err.message);
                } else {
                    console.log(`✅ 성공! ${data.content.length}개의 뉴스가 DB에 저장되었습니다.`);
                    console.log(`📍 위치: ${DB_PATH}`);
                }
            });
        });

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

importToDb();
