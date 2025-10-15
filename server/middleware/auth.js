const jwt = require('jsonwebtoken');
const db = require('../database/init');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'ironforge_gym_secret_key_2024', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        next();
    };
};

const checkMemberAccess = (req, res, next) => {
    const { role, userId } = req.user;
    const memberId = req.params.id || req.body.memberId;

    // Admin can access all members
    if (role === 'admin') {
        return next();
    }

    // Employee can access all members
    if (role === 'employee') {
        return next();
    }

    // Member can only access their own data
    if (role === 'member') {
        db.get(
            'SELECT id FROM members WHERE user_id = ?',
            [userId],
            (err, member) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error' });
                }
                if (!member || member.id != memberId) {
                    return res.status(403).json({ message: 'Access denied' });
                }
                next();
            }
        );
    } else {
        next();
    }
};

module.exports = {
    authenticateToken,
    authorizeRoles,
    checkMemberAccess
};
