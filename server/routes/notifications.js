const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth'); // Correctly uses authorizeRoles
const { createNotification, listNotifications } = require('../controllers/notificationController');

const router = express.Router();

router.post('/', authenticateToken, authorizeRoles('admin'), createNotification); // No change needed, already correct
router.get('/', authenticateToken, listNotifications);

module.exports = router;
