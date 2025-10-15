const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    getAllPlans,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan,
    getPlanStats
} = require('../controllers/planController');

const router = express.Router();

// Validation rules
const planValidation = [
    body('name').notEmpty().withMessage('Plan name is required'),
    body('duration_months').isInt({ min: 1 }).withMessage('Duration must be at least 1 month'),
    body('price').isDecimal().withMessage('Price must be a valid number'),
    body('description').optional().isString(),
    body('services_included').optional().isString()
];

// Routes
router.get('/', authenticateToken, getAllPlans);
router.get('/stats', authenticateToken, authorizeRoles('admin'), getPlanStats);
router.get('/:id', authenticateToken, getPlanById);
router.post('/', authenticateToken, authorizeRoles('admin'), planValidation, createPlan);
router.put('/:id', authenticateToken, authorizeRoles('admin'), planValidation, updatePlan);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deletePlan);

module.exports = router;
