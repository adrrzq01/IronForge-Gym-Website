const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
// Lazily require controller functions so server can start even if optional
// dependencies for CSV generation (like json2csv) are not installed.
const router = express.Router();

router.get('/payments', authenticateToken, authorizeRoles('admin'), (req, res, next) => {
	try {
		const { exportPayments } = require('../controllers/reportController');
		return exportPayments(req, res, next);
	} catch (e) {
		console.error('Failed to load report controller:', e.message);
		return res.status(500).json({ message: 'Reports unavailable' });
	}
});

router.get('/members', authenticateToken, authorizeRoles('admin'), (req, res, next) => {
	try {
		const { exportMembers } = require('../controllers/reportController');
		return exportMembers(req, res, next);
	} catch (e) {
		console.error('Failed to load report controller:', e.message);
		return res.status(500).json({ message: 'Reports unavailable' });
	}
});

module.exports = router;
