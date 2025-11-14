const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, '..'); // Move up to the 'server' directory
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'ironforge_gym.db'); // DB will be in the 'server' folder
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Database opened successfully.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    db.serialize(() => {
        // Execute the main schema
        db.exec(schema, (err) => {
            if (err) {
                console.error('Error creating database schema:', err);
            } else {
                console.log('Database schema created successfully');
            }
        });

        // Add new columns to existing members table if they don't exist
        const alterStatements = [
            'ALTER TABLE members ADD COLUMN aadhaar VARCHAR(12)',
            'ALTER TABLE members ADD COLUMN pan VARCHAR(10)',
            'ALTER TABLE members ADD COLUMN driving_license VARCHAR(50)',
            'ALTER TABLE members ADD COLUMN passport VARCHAR(15)',
            'ALTER TABLE members ADD COLUMN is_student BOOLEAN DEFAULT 0'
        ];

        alterStatements.forEach(stmt => {
            db.run(stmt, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error(`Error executing: ${stmt}`, err.message);
                } else if (!err) {
                    console.log(`Successfully executed: ${stmt}`);
                }
            });
        });

        // Manage admin user
        db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
            if (err) {
                console.error('Error checking for admin user:', err);
            } else if (!row) {
                // Admin user does not exist, create it
                const hashedPassword = bcrypt.hashSync('password123', 10);
                db.run(
                    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                    ['admin', 'admin@ironforge.com', hashedPassword, 'admin'],
                    (err) => {
                        if (err) {
                            console.error('Error creating admin user:', err);
                        } else {
                            console.log('Default admin user created: admin@ironforge.com / password123');
                        }
                    }
                );
            } else {
                console.log('Admin user already exists.');
            }
        });

        // Seed initial plans only if the table is empty
        db.get('SELECT COUNT(*) as count FROM plans', (err, row) => {
            if (err) {
                console.error('Error checking for existing plans:', err.message);
                return;
            }

            if (row.count === 0) {
                console.log('No plans found, seeding initial plans...');
                const stmt = db.prepare(`INSERT INTO plans (name, description, price, duration_months, services_included) VALUES (?, ?, ?, ?, ?)`);
                const plans = [
                    ['Monthly', 'Standard monthly membership', 1500, 1, 'Gym Access, Locker'],
                    ['Quarterly', '3-month membership plan', 4000, 3, 'Gym Access, Locker, Basic Fitness Assessment'],
                    ['Half-Yearly', '6-month membership plan', 7500, 6, 'Gym Access, Locker, Diet Consultation'],
                    ['Annual', '12-month membership plan', 12000, 12, 'All services included, Personal Trainer Session (1/month)']
                ];
                plans.forEach(plan => stmt.run(plan));
                stmt.finalize();
                console.log('Initial plans seeded successfully.');
            }
        });

        // Seed initial services only if the table is empty
        db.get('SELECT COUNT(*) as count FROM services', (err, row) => {
            if (err) {
                console.error('Error checking for existing services:', err.message);
                return;
            }

            if (row.count === 0) {
                console.log('No services found, seeding initial services...');
                const stmt = db.prepare(`INSERT INTO services (name, description, price, duration_minutes) VALUES (?, ?, ?, ?)`);
                const services = [
                    ['Personal Training', 'One-on-one session with a certified trainer.', 2000, 60],
                    ['Yoga Class', 'Group yoga session for all levels.', 500, 60],
                    ['Zumba Fitness', 'High-energy dance fitness class.', 500, 50],
                    ['Diet Consultation', 'Personalized diet plan from a nutritionist.', 1500, 45]
                ];
                services.forEach(service => stmt.run(service));
                stmt.finalize();
                console.log('Initial services seeded successfully.');
            }
        });
    });
}

module.exports = db;