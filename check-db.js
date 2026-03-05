const db = require('./database');

db.serialize(() => {
    // Check if glmModel column exists
    db.all("PRAGMA table_info(settings)", (err, rows) => {
        if (err) {
            console.error('Error:', err);
            process.exit(1);
        }

        console.log('Current settings table structure:');
        rows.forEach(row => {
            console.log(`- ${row.name} (${row.type})`);
        });

        const hasModelColumn = rows.some(row => row.name === 'glmModel');

        if (!hasModelColumn) {
            console.log('\nAdding glmModel column...');
            db.run("ALTER TABLE settings ADD COLUMN glmModel TEXT DEFAULT 'claude-3-5-sonnet-20240620'", (err) => {
                if (err) {
                    console.error('Error adding column:', err);
                } else {
                    console.log('✅ glmModel column added successfully!');
                }
                process.exit(0);
            });
        } else {
            console.log('\n✅ glmModel column already exists!');
            process.exit(0);
        }
    });
});
