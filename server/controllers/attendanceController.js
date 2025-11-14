const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/init');

// Promisify db methods to use with async/await
const dbGet = (query, params) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

const dbAll = (query, params) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const dbRun = (query, params) => {
    return new Promise(function(resolve, reject) {
        db.run(query, params, function(err) {
            if (err) reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

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
const checkIn = async (req, res) => {
    const { memberId } = req.body;
    const photoPath = req.file ? `/uploads/attendance/${req.file.filename}` : null;

    try {
        // Check if member already checked in today and not checked out
        const today = new Date().toISOString().split('T')[0];
        const existingCheckIn = await dbGet(`SELECT * FROM attendance 
         WHERE member_id = ? AND DATE(check_in_time) = ? AND check_out_time IS NULL`,
            [memberId, today]
        );

        if (existingCheckIn) {
            return res.status(400).json({ message: 'Member already checked in today' });
        }

        // Create check-in record
        const result = await dbRun('INSERT INTO attendance (member_id, photo_path) VALUES (?, ?)', [memberId, photoPath]);

        res.status(201).json({
            message: 'Check-in successful',
            attendanceId: result.lastID,
            checkInTime: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error in checkIn:", error);
        res.status(500).json({ message: 'Error creating check-in record' });
    }
};

// Check out member
const checkOut = async (req, res) => {
    const { memberId } = req.body;

    try {
        // Find today's active check-in record
        const today = new Date().toISOString().split('T')[0];
        const attendance = await dbGet(`SELECT * FROM attendance 
         WHERE member_id = ? AND DATE(check_in_time) = ? AND check_out_time IS NULL`,
            [memberId, today]
        );

        if (!attendance) {
            return res.status(400).json({ message: 'No active check-in found for today' });
        }

        // Update check-out time
        await dbRun('UPDATE attendance SET check_out_time = CURRENT_TIMESTAMP WHERE id = ?', [attendance.id]);

        res.json({
            message: 'Check-out successful',
            checkOutTime: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error in checkOut:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get today's attendance
const getTodayAttendance = async (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    try {
        const attendance = await dbAll(`SELECT a.*, m.name as member_name, m.photo_path as member_photo
         FROM attendance a
         JOIN members m ON a.member_id = m.id
         WHERE DATE(a.check_in_time) = ?
         ORDER BY a.check_in_time DESC`,
            [today]
        );
        res.json({ attendance });
    } catch (error) {
        console.error("Error in getTodayAttendance:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get attendance by date range
const getAttendanceByDateRange = async (req, res) => {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
    }

    try {
        const attendance = await dbAll(`SELECT a.*, m.name as member_name, m.photo_path as member_photo
         FROM attendance a
         JOIN members m ON a.member_id = m.id
         WHERE DATE(a.check_in_time) BETWEEN ? AND ?
         ORDER BY a.check_in_time DESC
         LIMIT ? OFFSET ?`,
            [startDate, endDate, parseInt(limit), parseInt(offset)]
        );

        const countResult = await dbGet(`SELECT COUNT(*) as total FROM attendance 
                 WHERE DATE(check_in_time) BETWEEN ? AND ?`,
            [startDate, endDate]
        );

        res.json({
            attendance,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(countResult.total / limit),
                total: countResult.total
            }
        });
    } catch (error) {
        console.error("Error in getAttendanceByDateRange:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get member's attendance summary
const getMemberAttendanceSummary = async (req, res) => {
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

    try {
        const summary = await dbGet(query, params);
        res.json({ summary });
    } catch (error) {
        console.error("Error in getMemberAttendanceSummary:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get attendance statistics
const getAttendanceStats = async (req, res) => {
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

    try {
        const stats = await dbAll(`SELECT 
            DATE(check_in_time) as date,
            COUNT(*) as checkins,
            COUNT(CASE WHEN check_out_time IS NOT NULL THEN 1 END) as checkouts
         FROM attendance 
         WHERE ${dateFilter}
         GROUP BY DATE(check_in_time)
         ORDER BY date DESC`,
            params
        );
        res.json({ stats });
    } catch (error) {
        console.error("Error in getAttendanceStats:", error);
        res.status(500).json({ message: 'Database error' });
    }
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
