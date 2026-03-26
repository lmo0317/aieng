const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../../db/database.sqlite');
const db = new sqlite3.Database(dbPath);

const inputWords = process.argv.slice(2).map(w => w.toUpperCase());

if (inputWords.length === 0) {
    console.error('No words provided to check.');
    process.exit(1);
}

db.all('SELECT data FROM puzzles', (err, rows) => {
    if (err) {
        console.error('Database error:', err.message);
        process.exit(1);
    }

    const usedWords = new Set();
    rows.forEach(row => {
        try {
            const data = JSON.parse(row.data);
            data.words.forEach(w => usedWords.add(w.answer.toUpperCase()));
        } catch (e) {}
    });

    const duplicates = inputWords.filter(w => usedWords.has(w));

    if (duplicates.length > 0) {
        console.log(JSON.stringify({
            hasDuplicates: true,
            duplicates: duplicates,
            message: `Duplicates found: ${duplicates.join(', ')}`
        }));
    } else {
        console.log(JSON.stringify({
            hasDuplicates: false,
            message: 'All words are unique.'
        }));
    }

    db.close();
});
