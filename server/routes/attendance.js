const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    checkIn,
    checkOut,
    getTodayAttendance,
    getAttendanceByDateRange,
    getMemberAttendanceSummary,
    getAttendanceStats,
    upload
} = require('../controllers/attendanceController');

const router = express.Router();

// Routes
router.post('/checkin', authenticateToken, upload.single('photo'), checkIn);
router.post('/checkout', authenticateToken, checkOut);
router.get('/today', authenticateToken, authorizeRoles('admin', 'employee'), getTodayAttendance);
router.get('/range', authenticateToken, authorizeRoles('admin', 'employee'), getAttendanceByDateRange);
router.get('/member/:memberId/summary', authenticateToken, getMemberAttendanceSummary);
router.get('/stats', authenticateToken, authorizeRoles('admin', 'employee'), getAttendanceStats);

module.exports = router;
