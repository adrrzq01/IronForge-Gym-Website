const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/init');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'ironforge_gym_secret_key_2024';

// Register new user
const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, role = 'member' } = req.body;

        // Check if user already exists
        db.get(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username],
            async (err, existingUser) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error' });
                }

                if (existingUser) {
                    return res.status(400).json({ 
                        message: 'User with this email or username already exists' 
                    });
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                // Create user
                db.run(
                    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                    [username, email, hashedPassword, role],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ message: 'Error creating user' });
                        }

                        // Generate JWT token
                        const token = jwt.sign(
                            { userId: this.lastID, email, role },
                            JWT_SECRET,
                            { expiresIn: '24h' }
                        );

                        res.status(201).json({
                            message: 'User registered successfully',
                            token,
                            user: {
                                id: this.lastID,
                                username,
                                email,
                                role
                            }
                        });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user
        db.get(
            'SELECT * FROM users WHERE email = ? AND is_active = 1',
            [email],
            async (err, user) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error' });
                }

                if (!user) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                // Check password
                const isValidPassword = await bcrypt.compare(password, user.password);
                if (!isValidPassword) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                // Generate JWT token
                const token = jwt.sign(
                    { userId: user.id, email: user.email, role: user.role },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.json({
                    message: 'Login successful',
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get current user profile
const getProfile = (req, res) => {
    const { userId } = req.user;

    db.get(
        'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
        [userId],
        (err, user) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({ user });
        }
    );
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { userId } = req.user;
        const { username, email } = req.body;

        db.run(
            'UPDATE users SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [username, email, userId],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: 'Database error' });
                }

                res.json({ message: 'Profile updated successfully' });
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId } = req.user;
        const { currentPassword, newPassword } = req.body;

        // Get current user
        db.get(
            'SELECT password FROM users WHERE id = ?',
            [userId],
            async (err, user) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error' });
                }

                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Verify current password
                const isValidPassword = await bcrypt.compare(currentPassword, user.password);
                if (!isValidPassword) {
                    return res.status(400).json({ message: 'Current password is incorrect' });
                }

                // Hash new password
                const hashedNewPassword = await bcrypt.hash(newPassword, 10);

                // Update password
                db.run(
                    'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [hashedNewPassword, userId],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ message: 'Database error' });
                        }

                        res.json({ message: 'Password changed successfully' });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword
};
