const express = require('express');
const router = express.Router();
const {
    getSchedules,
    createSchedule,
    bookSchedule,
    getMemberBookings,
    cancelBooking,
    getTrainers
} = require('../controllers/scheduleController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', authenticateToken, getSchedules);
router.post('/', authenticateToken, authorizeRoles('admin'), createSchedule);
router.get('/trainers', authenticateToken, authorizeRoles('admin'), getTrainers);
router.post('/book', authenticateToken, bookSchedule);
router.get('/my-bookings', authenticateToken, getMemberBookings);
router.delete('/bookings/:booking_id', authenticateToken, cancelBooking);

module.exports = router;