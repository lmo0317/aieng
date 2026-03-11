const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const insertTestData = () => {
    db.serialize(() => {
        // 2026-03-10 데이터 하나를 템플릿으로 가져옴
        db.get("SELECT * FROM trends WHERE date = '2026-03-10' LIMIT 1", (err, template) => {
            if (err || !template) {
                console.error('Template trend not found for 2026-03-10');
                db.close();
                return;
            }

            const stmt = db.prepare("INSERT INTO trends (title, category, summary, keywords, sentences, difficulty, date) VALUES (?, ?, ?, ?, ?, ?, ?)");
            
            const categories = ['테크', '스포츠', '연애', '정치', '전체'];
            
            for (let day = 1; day <= 9; day++) {
                const date = `2026-03-0${day}`;
                
                // 각 날짜별로 카테고리당 1~2개씩 가짜 데이터 생성
                categories.forEach((cat, idx) => {
                    const title = `${date} ${cat} 뉴스 트렌드 ${idx + 1}`;
                    stmt.run(
                        title, 
                        cat, 
                        template.summary, 
                        template.keywords, 
                        template.sentences, 
                        template.difficulty, 
                        date
                    );
                });
            }
            
            stmt.finalize(() => {
                console.log('Successfully inserted test data for 2026-03-01 to 2026-03-09');
                db.close();
            });
        });
    });
};

insertTestData();
