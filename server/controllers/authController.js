const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/init');
const { body, validationResult } = require('express-validator');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// Promisify db methods to use with async/await
const dbGet = (query, params) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

const dbRun = (query, params) => {
    return new Promise(function(resolve, reject) {
        db.run(query, params, function(err) {
            if (err) reject(err);
            // 'this' refers to the statement object, which has lastID
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};


const JWT_SECRET = process.env.JWT_SECRET || 'ironforge_gym_secret_key_2024';

// POST /api/auth/2fa/setup
const setup2FA = async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({ length: 20 });
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id || req.user.userId]);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await dbRun('UPDATE users SET two_factor_secret = ? WHERE id = ?', [secret.base32, user.id]);

        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                return res.status(500).json({ message: 'Error generating QR code' });
            }
            res.json({ qrCodeUrl: data_url });
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Register new user
const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, role = 'member' } = req.body;

        const existingUser = await dbGet('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);

        if (existingUser) {
            return res.status(400).json({
                message: 'User with this email or username already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Use a transaction to ensure atomicity
        db.serialize(async () => {
            try {
                await dbRun('BEGIN TRANSACTION');

                // 1. Create user in the users table
                const userResult = await dbRun(
                    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                    [username, email, hashedPassword, role]
                );
                const userId = userResult.lastID;

                // 2. Create a corresponding profile in members or employees table
                if (role === 'member') {
                    await dbRun('INSERT INTO members (user_id, name, email, age, gender, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, username, email, 0, 'other', '0000000000', 'N/A']);
                } else if (role === 'employee') {
                    await dbRun('INSERT INTO employees (user_id, name, email, position, phone) VALUES (?, ?, ?, ?, ?)', [userId, username, email, 'front_desk', '0000000000']);
                }

                await dbRun('COMMIT');

                // 3. Generate JWT and send response
                const token = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '24h' });
                res.status(201).json({
                    message: 'User registered successfully',
                    token,
                    user: { id: userId, username, email, role }
                });

            } catch (transactionError) {
                await dbRun('ROLLBACK');
                console.error('Registration transaction error:', transactionError);
                res.status(500).json({ message: 'Failed to complete registration.' });
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
};

// POST /api/auth/2fa/verify
const verify2FA = async (req, res) => {
    const { token } = req.body;
    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id || req.user.userId]);
        if (!user || !user.two_factor_secret) {
            return res.status(400).json({ message: '2FA not set up' });
        }

        const verified = speakeasy.totp.verify({ 
            secret: user.two_factor_secret,
            encoding: 'base32',
            token,
        });

        if (verified) {
            await dbRun('UPDATE users SET two_factor_enabled = 1 WHERE id = ?', [user.id]);
            res.json({ message: '2FA enabled successfully' });
        } else {
            res.status(400).json({ message: 'Invalid 2FA token' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/auth/2fa/disable
const disable2FA = async (req, res) => {
    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id || req.user.userId]);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await dbRun('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?', [user.id]);
        res.json({ message: '2FA disabled successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        const isPasswordValid = user && (await bcrypt.compare(password, user.password));

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.two_factor_enabled) {
            // Issue a temporary token to proceed to the 2FA step
            const tempToken = jwt.sign({ id: user.id, twoFactorRequired: true }, JWT_SECRET, { expiresIn: '5m' });
            return res.json({ twoFactorRequired: true, tempToken });
        }

        const token = jwt.sign({ 
            userId: user.id, // Use userId to be consistent with register
            id: user.id, 
            role: user.role 
        }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
};

// POST /api/auth/login/2fa
const login2FA = async (req, res) => {
    const { tempToken, token: twoFactorToken } = req.body;
    try {
        const decodedTemp = jwt.verify(tempToken, JWT_SECRET);
        if (!decodedTemp.twoFactorRequired) {
            return res.status(400).json({ message: 'Invalid temporary token' });
        }
        
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [decodedTemp.id]);
        if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
            return res.status(400).json({ message: '2FA not enabled for this user' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: twoFactorToken,
        });

        if (verified) {
            const token = jwt.sign({ 
                userId: user.id, 
                id: user.id, 
                role: user.role 
            }, JWT_SECRET, { expiresIn: '1d' });
            res.json({ token, user });
        } else {
            res.status(400).json({ message: 'Invalid 2FA token' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Invalid or expired temporary token' });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const { userId } = req.user;
        const user = await dbGet('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { userId } = req.user;
        const { username, email } = req.body;

        await dbRun(
            'UPDATE users SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [username, email, userId]
        );
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
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

        const user = await dbGet('SELECT password FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await dbRun(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedNewPassword, userId]
        );

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const forgotPassword = async (req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};

const resetPassword = async (req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    setup2FA,
    verify2FA,
    disable2FA,
    login2FA
};