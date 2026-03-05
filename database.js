const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.serialize(() => {
            // Create Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT,
                email TEXT,
                picture TEXT
            )`);

            // Create Progress table
            db.run(`CREATE TABLE IF NOT EXISTS progress (
                userId TEXT PRIMARY KEY,
                topic TEXT,
                difficulty TEXT,
                currentCount INTEGER DEFAULT 0,
                sentences TEXT,
                FOREIGN KEY(userId) REFERENCES users(id)
            )`);

            // Create Settings table
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                userId TEXT PRIMARY KEY,
                glmApiKey TEXT,
                FOREIGN KEY(userId) REFERENCES users(id)
            )`);
        });
    }
});

module.exports = db;
