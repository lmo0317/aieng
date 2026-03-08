const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        db.serialize(() => {
            // Create Global Settings table (basic version for compatibility)
            db.run(`CREATE TABLE IF NOT EXISTS global_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                glmApiKey TEXT,
                glmModel TEXT DEFAULT 'glm-4.7-flash'
            )`, (err) => {
                if (err) {
                    console.error('Error creating global_settings table:', err.message);
                } else {
                    // Migration: Check and add new columns before any INSERT operations
                    db.all("PRAGMA table_info(global_settings)", (err, columns) => {
                        if (err) {
                            console.error('Error checking table columns:', err.message);
                            return;
                        }

                        const columnNames = columns.map(col => col.name);

                        // Add missing columns sequentially
                        const migrations = [];

                        if (!columnNames.includes('groqApiKey')) {
                            migrations.push("ALTER TABLE global_settings ADD COLUMN groqApiKey TEXT");
                        }
                        if (!columnNames.includes('groqModel')) {
                            migrations.push("ALTER TABLE global_settings ADD COLUMN groqModel TEXT DEFAULT 'llama-3.3-70b-versatile'");
                        }
                        if (!columnNames.includes('provider')) {
                            migrations.push("ALTER TABLE global_settings ADD COLUMN provider TEXT DEFAULT 'glm'");
                        }
                        if (!columnNames.includes('geminiApiKey')) {
                            migrations.push("ALTER TABLE global_settings ADD COLUMN geminiApiKey TEXT");
                        }
                        if (!columnNames.includes('geminiModel')) {
                            migrations.push("ALTER TABLE global_settings ADD COLUMN geminiModel TEXT DEFAULT 'gemini-2.5-flash'");
                        }
                        if (!columnNames.includes('chatModel')) {
                            migrations.push("ALTER TABLE global_settings ADD COLUMN chatModel TEXT DEFAULT 'gemini-2.5-flash-native-audio-latest'");
                        }
                        if (!columnNames.includes('systemPrompt')) {
                            migrations.push("ALTER TABLE global_settings ADD COLUMN systemPrompt TEXT");
                        }

                        // Execute migrations sequentially, then insert default row
                        if (migrations.length > 0) {
                            console.log(`Running ${migrations.length} database migrations...`);

                            let migrationIndex = 0;
                            const runNextMigration = () => {
                                if (migrationIndex < migrations.length) {
                                    db.run(migrations[migrationIndex], (err) => {
                                        if (err) {
                                            console.error(`Migration ${migrationIndex + 1} failed:`, err.message);
                                        } else {
                                            console.log(`Migration ${migrationIndex + 1}/${migrations.length} completed`);
                                        }
                                        migrationIndex++;
                                        runNextMigration();
                                    });
                                } else {
                                    // All migrations done, now insert default row
                                    insertDefaultRow();
                                }
                            };
                            runNextMigration();
                        } else {
                            // No migrations needed, insert default row directly
                            insertDefaultRow();
                        }
                    });
                }
            });

            // Function to insert default row
            function insertDefaultRow() {
                db.run(`INSERT OR IGNORE INTO global_settings (id, glmModel) VALUES (1, 'glm-4.7-flash')`, (err) => {
                    if (err) {
                        console.error('Error inserting default row:', err.message);
                    } else {
                        console.log('Default settings row ready.');
                    }
                    // Signal database is ready
                    db.isReady = true;
                    if (db.resolveReady) db.resolveReady();
                });
            }

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

            // Create Learning History table for Review feature
            db.run(`CREATE TABLE IF NOT EXISTS learning_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic TEXT,
                difficulty TEXT,
                sentences TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
        });
    }
});

module.exports = db;
