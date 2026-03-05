const db = require('./database');

db.serialize(() => {
    // Check users table
    db.all("SELECT id, name, email FROM users", (err, rows) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('Users in database:');
            if (rows.length === 0) {
                console.log('  No users found. You need to log in first!');
            } else {
                rows.forEach(user => {
                    console.log(`  - ${user.name} (${user.email}) - ID: ${user.id}`);
                });
            }
        }
        process.exit(0);
    });
});
