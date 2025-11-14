const db = require('../database/init');

const createNotification = (req, res) => {
    const { userId, title, message, type = 'general' } = req.body;
    db.run(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [userId || null, title, message, type],
        function(err) {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.status(201).json({ id: this.lastID, message: 'Notification created' });
        }
    );
};

const listNotifications = (req, res) => {
    const { userId } = req.user || {};
    db.all(
        'SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50',
        [userId || null],
        (err, rows) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.json({ notifications: rows });
        }
    );
};

module.exports = { createNotification, listNotifications };
