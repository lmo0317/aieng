const db = require('./database');
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(rows);
    }
    process.exit(0);
});
