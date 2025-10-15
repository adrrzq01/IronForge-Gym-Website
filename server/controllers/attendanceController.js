const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/init');

// Configure multer for attendance photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/attendance');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'attendance-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Check in member
const checkIn = (req, res) => {
    const { memberId } = req.body;
    const photoPath = req.file ? `/uploads/attendance/${req.file.filename}` : null;

    // Check if member already checked in today
    const today = new Date().toISOString().split('T')[0];
    
    db.get(
        `SELECT * FROM attendance 
         WHERE member_id = ? AND DATE(check_in_time) = ? AND check_out_time IS NULL`,
        [memberId, today],
        (err, existingCheckIn) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (existingCheckIn) {
                return res.status(400).json({ message: 'Member already checked in today' });
            }

            // Create check-in record
            db.run(
                'INSERT INTO attendance (member_id, photo_path) VALUES (?, ?)',
                [memberId, photoPath],
                function(err) {
                    if (err) {
                        return res.status(500).json({ message: 'Error creating check-in record' });
                    }

                    res.status(201).json({
                        message: 'Check-in successful',
                        attendanceId: this.lastID,
                        checkInTime: new Date().toISOString()
                    });
                }
            );
        }
    );
};

// Check out member
const checkOut = (req, res) => {
    const { memberId } = req.body;

    // Find today's check-in record
    const today = new Date().toISOString().split('T')[0];
    
    db.get(
        `SELECT * FROM attendance 
         WHERE member_id = ? AND DATE(check_in_time) = ? AND check_out_time IS NULL`,
        [memberId, today],
        (err, attendance) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (!attendance) {
                return res.status(400).json({ message: 'No active check-in found for today' });
            }

            // Update check-out time
            db.run(
                'UPDATE attendance SET check_out_time = CURRENT_TIMESTAMP WHERE id = ?',
                [attendance.id],
                function(err) {
                    if (err) {
                        return res.status(500).json({ message: 'Database error' });
                    }

                    res.json({
                        message: 'Check-out successful',
                        checkOutTime: new Date().toISOString()
                    });
                }
            );
        }
    );
};

// Get today's attendance
const getTodayAttendance = (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    db.all(
        `SELECT a.*, m.name as member_name, m.photo_path as member_photo
         FROM attendance a
         JOIN members m ON a.member_id = m.id
         WHERE DATE(a.check_in_time) = ?
         ORDER BY a.check_in_time DESC`,
        [today],
        (err, attendance) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ attendance });
        }
    );
};

// Get attendance by date range
const getAttendanceByDateRange = (req, res) => {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
    }

    db.all(
        `SELECT a.*, m.name as member_name, m.photo_path as member_photo
         FROM attendance a
         JOIN members m ON a.member_id = m.id
         WHERE DATE(a.check_in_time) BETWEEN ? AND ?
         ORDER BY a.check_in_time DESC
         LIMIT ? OFFSET ?`,
        [startDate, endDate, parseInt(limit), parseInt(offset)],
        (err, attendance) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            // Get total count
            db.get(
                `SELECT COUNT(*) as total FROM attendance 
                 WHERE DATE(check_in_time) BETWEEN ? AND ?`,
                [startDate, endDate],
                (err, countResult) => {
                    if (err) {
                        return res.status(500).json({ message: 'Database error' });
                    }

                    res.json({
                        attendance,
                        pagination: {
                            current: parseInt(page),
                            pages: Math.ceil(countResult.total / limit),
                            total: countResult.total
                        }
                    });
                }
            );
        }
    );
};

// Get member's attendance summary
const getMemberAttendanceSummary = (req, res) => {
    const { memberId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
        SELECT 
            COUNT(*) as total_visits,
            COUNT(CASE WHEN check_out_time IS NOT NULL THEN 1 END) as completed_visits,
            COUNT(CASE WHEN check_out_time IS NULL AND DATE(check_in_time) = DATE('now') THEN 1 END) as current_checkin,
            AVG(CASE WHEN check_out_time IS NOT NULL THEN 
                (julianday(check_out_time) - julianday(check_in_time)) * 24 
            END) as avg_hours_per_visit
        FROM attendance 
        WHERE member_id = ?
    `;
    let params = [memberId];

    if (startDate && endDate) {
        query += ` AND DATE(check_in_time) BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }

    db.get(query, params, (err, summary) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        res.json({ summary });
    });
};

// Get attendance statistics
const getAttendanceStats = (req, res) => {
    const { period = 'week' } = req.query;
    
    let dateFilter = '';
    let params = [];

    switch (period) {
        case 'today':
            dateFilter = "DATE(check_in_time) = DATE('now')";
            break;
        case 'week':
            dateFilter = "DATE(check_in_time) >= DATE('now', '-7 days')";
            break;
        case 'month':
            dateFilter = "DATE(check_in_time) >= DATE('now', '-30 days')";
            break;
        case 'year':
            dateFilter = "DATE(check_in_time) >= DATE('now', '-365 days')";
            break;
    }

    db.all(
        `SELECT 
            DATE(check_in_time) as date,
            COUNT(*) as checkins,
            COUNT(CASE WHEN check_out_time IS NOT NULL THEN 1 END) as checkouts
         FROM attendance 
         WHERE ${dateFilter}
         GROUP BY DATE(check_in_time)
         ORDER BY date DESC`,
        params,
        (err, stats) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ stats });
        }
    );
};

module.exports = {
    checkIn,
    checkOut,
    getTodayAttendance,
    getAttendanceByDateRange,
    getMemberAttendanceSummary,
    getAttendanceStats,
    upload
};
