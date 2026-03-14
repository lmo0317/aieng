const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 프로젝트 루트 내의 db 폴더 경로 설정
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const dbPath = path.join(projectRoot, 'db', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
});

const today = new Date().toISOString().split('T')[0];

console.log(`🧹 오늘자(${today}) 뉴스 데이터를 삭제 중...`);

db.run("DELETE FROM trends WHERE date = ? AND type = 'news'", [today], function(err) {
    if (err) {
        console.error('❌ Error deleting data:', err.message);
    } else {
        console.log(`✨ 성공: 오늘자 뉴스 ${this.changes}건이 삭제되었습니다.`);
    }
    db.close();
});
