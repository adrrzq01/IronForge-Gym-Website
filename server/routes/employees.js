const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    assignTrainer,
    getTrainerMembers,
    removeTrainerAssignment,
    getEmployeeStats
} = require('../controllers/employeeController');

const router = express.Router();

// Validation rules
const employeeValidation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('phone').isMobilePhone().withMessage('Please provide a valid phone number'),
    body('position').notEmpty().withMessage('Position is required'),
    body('salary').optional().isDecimal().withMessage('Salary must be a valid number')
];

// Routes
router.get('/', authenticateToken, authorizeRoles('admin'), getAllEmployees);
router.get('/:id', authenticateToken, authorizeRoles('admin'), getEmployeeById);
router.post('/', authenticateToken, authorizeRoles('admin'), employeeValidation, createEmployee);
router.put('/:id', authenticateToken, authorizeRoles('admin'), employeeValidation, updateEmployee);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteEmployee);

// Trainer assignment routes
router.post('/assign-trainer', authenticateToken, authorizeRoles('admin'), assignTrainer);
router.get('/:trainerId/members', authenticateToken, authorizeRoles('admin', 'employee'), getTrainerMembers);
router.delete('/:trainerId/members/:memberId', authenticateToken, authorizeRoles('admin'), removeTrainerAssignment);
router.get('/:employeeId/stats', authenticateToken, authorizeRoles('admin'), getEmployeeStats);

module.exports = router;
