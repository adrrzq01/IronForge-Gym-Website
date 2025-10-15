const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'ironforge_gym.db');
const db = new sqlite3.Database(dbPath);

// Read and execute schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema, (err) => {
    if (err) {
        console.error('Error creating database schema:', err);
    } else {
        console.log('Database schema created successfully');
        
        // Add new columns to existing members table if they don't exist
        db.run('ALTER TABLE members ADD COLUMN aadhaar VARCHAR(12)', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Added aadhaar column');
            }
        });
        
        db.run('ALTER TABLE members ADD COLUMN pan VARCHAR(10)', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Added pan column');
            }
        });
        
        db.run('ALTER TABLE members ADD COLUMN driving_license VARCHAR(50)', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Added driving_license column');
            }
        });
        
        db.run('ALTER TABLE members ADD COLUMN passport VARCHAR(15)', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Added passport column');
            }
        });
        
        db.run('ALTER TABLE members ADD COLUMN is_student BOOLEAN DEFAULT 0', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Added is_student column');
            }
        });
        
        // Hash the default admin password
        const hashedPassword = bcrypt.hashSync('password123', 10);
        
        // Update admin password with hashed version
        db.run(
            'UPDATE users SET password = ? WHERE username = ?',
            [hashedPassword, 'admin'],
            (err) => {
                if (err) {
                    console.error('Error updating admin password:', err);
                } else {
                    console.log('Default admin user created: admin@ironforge.com / password123');
                }
            }
        );
    }
});

module.exports = db;