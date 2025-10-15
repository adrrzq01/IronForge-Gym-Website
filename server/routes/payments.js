const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    getAllPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment,
    getMemberPayments,
    getPaymentStats,
    getOverduePayments,
    processPayment
} = require('../controllers/paymentController');

const router = express.Router();

// Validation rules
const paymentValidation = [
    body('memberId').isInt().withMessage('Member ID must be a number'),
    body('amount').isDecimal().withMessage('Amount must be a valid number'),
    body('paymentType').isIn(['online', 'cash', 'upi', 'card']).withMessage('Invalid payment type'),
    body('paymentMethod').optional().isString(),
    body('description').optional().isString()
];

// Routes
router.get('/', authenticateToken, authorizeRoles('admin', 'employee'), getAllPayments);
router.get('/stats', authenticateToken, authorizeRoles('admin'), getPaymentStats);
router.get('/overdue', authenticateToken, authorizeRoles('admin', 'employee'), getOverduePayments);
router.get('/:id', authenticateToken, authorizeRoles('admin', 'employee'), getPaymentById);
router.post('/', authenticateToken, authorizeRoles('admin', 'employee'), paymentValidation, createPayment);
router.post('/process', authenticateToken, processPayment);
router.put('/:id', authenticateToken, authorizeRoles('admin'), paymentValidation, updatePayment);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deletePayment);
router.get('/member/:memberId', authenticateToken, getMemberPayments);

module.exports = router;
