const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        db.serialize(() => {
            // Create Global Settings table
            db.run(`CREATE TABLE IF NOT EXISTS global_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                glmApiKey TEXT,
                glmModel TEXT DEFAULT 'glm-4.7-flash'
            )`, (err) => {
                if (err) {
                    console.error('Error creating global_settings table:', err.message);
                } else {
                    // Insert default row if not exists
                    db.run(`INSERT OR IGNORE INTO global_settings (id, glmModel) VALUES (1, 'glm-4.7-flash')`);
                }
            });

            // Create Users table (keep for existing data)
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT,
                email TEXT,
                picture TEXT
            )`);

            // Create Progress table (keep for existing data)
            db.run(`CREATE TABLE IF NOT EXISTS progress (
                userId TEXT PRIMARY KEY,
                topic TEXT,
                difficulty TEXT,
                currentCount INTEGER DEFAULT 0,
                sentences TEXT,
                FOREIGN KEY(userId) REFERENCES users(id)
            )`);
        });
    }
});

module.exports = db;
