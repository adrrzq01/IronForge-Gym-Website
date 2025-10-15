const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authorizeRoles, checkMemberAccess } = require('../middleware/auth');
const {
    getAllMembers,
    getMemberById,
    createMember,
    updateMember,
    uploadPhoto,
    deleteMember,
    getMemberAttendance,
    upload
} = require('../controllers/memberController');

const router = express.Router();

// Validation rules
const memberValidation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('age').isInt({ min: 1, max: 120 }).withMessage('Age must be between 1 and 120'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('phone').isMobilePhone().withMessage('Please provide a valid phone number'),
    body('address').notEmpty().withMessage('Address is required'),
    body('plan_id').optional().isInt().withMessage('Plan ID must be a number')
];

// Routes
router.get('/', authenticateToken, authorizeRoles('admin', 'employee'), getAllMembers);
router.get('/:id', authenticateToken, checkMemberAccess, getMemberById);
router.post('/', authenticateToken, authorizeRoles('admin', 'employee'), memberValidation, createMember);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'employee'), memberValidation, updateMember);
router.post('/:id/photo', authenticateToken, authorizeRoles('admin', 'employee'), upload.single('photo'), uploadPhoto);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteMember);
router.get('/:id/attendance', authenticateToken, checkMemberAccess, getMemberAttendance);

module.exports = router;
