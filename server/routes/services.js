const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    assignServiceToMember,
    getMemberServices,
    removeServiceAssignment,
    getServiceStats
} = require('../controllers/serviceController');

const router = express.Router();

// Validation rules
const serviceValidation = [
    body('name').notEmpty().withMessage('Service name is required'),
    body('price').isDecimal().withMessage('Price must be a valid number'),
    body('description').optional().isString(),
    body('duration_minutes').optional().isInt({ min: 1 }).withMessage('Duration must be a positive number')
];

// Routes
router.get('/', authenticateToken, getAllServices);
router.get('/stats', authenticateToken, authorizeRoles('admin'), getServiceStats);
router.get('/:id', authenticateToken, getServiceById);
router.post('/', authenticateToken, authorizeRoles('admin'), serviceValidation, createService);
router.put('/:id', authenticateToken, authorizeRoles('admin'), serviceValidation, updateService);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteService);

// Service assignment routes
router.post('/assign', authenticateToken, authorizeRoles('admin', 'employee'), assignServiceToMember);
router.get('/member/:memberId', authenticateToken, getMemberServices);
router.delete('/member/:memberId/:serviceId', authenticateToken, authorizeRoles('admin'), removeServiceAssignment);

module.exports = router;
