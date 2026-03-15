const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ?„ë¡œ?íŠ¸ ë£¨íŠ¸ ?´ì˜ db ?´ë” ê²½ë¡œ ?¤ì •
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const dbPath = path.join(projectRoot, 'db', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('??Error opening database:', err.message);
        process.exit(1);
    }
});

const today = new Date().toISOString().split('T')[0];

console.log(`?§¹ ?¤ëŠ˜??${today}) ?´ìŠ¤ ?°ì´?°ë? ?? œ ì¤?..`);

db.run("DELETE FROM trends WHERE date = ? AND type = 'news'", [today], function(err) {
    if (err) {
        console.error('??Error deleting data:', err.message);
    } else {
        console.log(`???±ê³µ: ?¤ëŠ˜???´ìŠ¤ ${this.changes}ê±´ì´ ?? œ?˜ì—ˆ?µë‹ˆ??`);
    }
    db.close();
});


