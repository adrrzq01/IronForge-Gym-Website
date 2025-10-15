const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    getAdminDashboard,
    getEmployeeDashboard,
    getMemberDashboard,
    getDashboardCharts,
    getNotifications,
    markNotificationRead
} = require('../controllers/dashboardController');

const router = express.Router();

// Routes
router.get('/admin', authenticateToken, authorizeRoles('admin'), getAdminDashboard);
router.get('/employee', authenticateToken, authorizeRoles('employee'), getEmployeeDashboard);
router.get('/member', authenticateToken, authorizeRoles('member'), getMemberDashboard);
router.get('/charts', authenticateToken, authorizeRoles('admin'), getDashboardCharts);
router.get('/notifications', authenticateToken, getNotifications);
router.put('/notifications/:id/read', authenticateToken, markNotificationRead);

module.exports = router;
