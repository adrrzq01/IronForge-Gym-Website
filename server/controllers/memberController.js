const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/init');
const { body, validationResult } = require('express-validator');

// Configure multer for photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/members');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'member-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Get all members
const getAllMembers = (req, res) => {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT m.*, p.name as plan_name, p.price as plan_price, p.duration_months
        FROM members m
        LEFT JOIN plans p ON m.plan_id = p.id
        WHERE 1=1
    `;
    let params = [];

    if (search) {
        query += ` AND (m.name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status !== 'all') {
        query += ` AND m.is_active = ?`;
        params.push(status === 'active' ? 1 : 0);
    }

    query += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, members) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM members WHERE 1=1';
        let countParams = [];

        if (search) {
            countQuery += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status !== 'all') {
            countQuery += ` AND is_active = ?`;
            countParams.push(status === 'active' ? 1 : 0);
        }

        db.get(countQuery, countParams, (err, countResult) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({
                members,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(countResult.total / limit),
                    total: countResult.total
                }
            });
        });
    });
};

// Get member by ID
const getMemberById = (req, res) => {
    const { id } = req.params;

    db.get(
        `SELECT m.*, p.name as plan_name, p.price as plan_price, p.duration_months
         FROM members m
         LEFT JOIN plans p ON m.plan_id = p.id
         WHERE m.id = ?`,
        [id],
        (err, member) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (!member) {
                return res.status(404).json({ message: 'Member not found' });
            }

            res.json({ member });
        }
    );
};

// Create new member
const createMember = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        name, age, gender, email, phone, address,
        emergency_contact_name, emergency_contact_phone,
        aadhaar, pan, driving_license, passport,
        is_student, plan_id, payment_due_date
    } = req.body;

    // Check if email already exists
    db.get('SELECT id FROM members WHERE email = ?', [email], (err, existingMember) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (existingMember) {
            return res.status(400).json({ message: 'Member with this email already exists' });
        }

        // Create member
        db.run(
            `INSERT INTO members (
                name, age, gender, email, phone, address,
                emergency_contact_name, emergency_contact_phone,
                aadhaar, pan, driving_license, passport, is_student,
                plan_id, payment_due_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, age, gender, email, phone, address,
             emergency_contact_name, emergency_contact_phone,
             aadhaar, pan, driving_license, passport, is_student ? 1 : 0,
             plan_id, payment_due_date],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: 'Error creating member' });
                }

                res.status(201).json({
                    message: 'Member created successfully',
                    memberId: this.lastID
                });
            }
        );
    });
};

// Update member
const updateMember = (req, res) => {
    const { id } = req.params;
    const {
        name, age, gender, email, phone, address,
        emergency_contact_name, emergency_contact_phone,
        plan_id, payment_status, payment_due_date
    } = req.body;

    db.run(
        `UPDATE members SET 
            name = ?, age = ?, gender = ?, email = ?, phone = ?, address = ?,
            emergency_contact_name = ?, emergency_contact_phone = ?,
            plan_id = ?, payment_status = ?, payment_due_date = ?,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, age, gender, email, phone, address,
         emergency_contact_name, emergency_contact_phone,
         plan_id, payment_status, payment_due_date, id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Member not found' });
            }

            res.json({ message: 'Member updated successfully' });
        }
    );
};

// Upload member photo
const uploadPhoto = (req, res) => {
    const { id } = req.params;

    if (!req.file) {
        return res.status(400).json({ message: 'No photo uploaded' });
    }

    const photoPath = `/uploads/members/${req.file.filename}`;

    db.run(
        'UPDATE members SET photo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [photoPath, id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Member not found' });
            }

            res.json({ 
                message: 'Photo uploaded successfully',
                photoPath 
            });
        }
    );
};

// Delete member
const deleteMember = (req, res) => {
    const { id } = req.params;

    db.run(
        'UPDATE members SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Member not found' });
            }

            res.json({ message: 'Member deleted successfully' });
        }
    );
};

// Get member attendance
const getMemberAttendance = (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
        `SELECT * FROM attendance 
         WHERE member_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [id, parseInt(limit), parseInt(offset)],
        (err, attendance) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            // Get total count
            db.get(
                'SELECT COUNT(*) as total FROM attendance WHERE member_id = ?',
                [id],
                (err, countResult) => {
                    if (err) {
                        return res.status(500).json({ message: 'Database error' });
                    }

                    res.json({
                        attendance,
                        pagination: {
                            current: parseInt(page),
                            pages: Math.ceil(countResult.total / limit),
                            total: countResult.total
                        }
                    });
                }
            );
        }
    );
};

module.exports = {
    getAllMembers,
    getMemberById,
    createMember,
    updateMember,
    uploadPhoto,
    deleteMember,
    getMemberAttendance,
    upload
};
