const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/init');
const { body, validationResult } = require('express-validator');

// Promisify db methods to use with async/await
const dbGet = (query, params) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

const dbAll = (query, params) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const dbRun = (query, params) => {
    return new Promise(function(resolve, reject) {
        db.run(query, params, function(err) {
            if (err) reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

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
const getAllMembers = async (req, res) => {
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

    try {
        const members = await dbAll(query, params);
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

        const countResult = await dbGet(countQuery, countParams);

        res.json({
            members,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(countResult.total / limit),
                total: countResult.total
            }
        });
    } catch (error) {
        console.error("Error in getAllMembers:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get member by ID
const getMemberById = async (req, res) => {
    const { id } = req.params;

    try {
        const member = await dbGet(`SELECT m.*, p.name as plan_name, p.price as plan_price, p.duration_months
         FROM members m
         LEFT JOIN plans p ON m.plan_id = p.id
         WHERE m.id = ?`,
            [id]
        );
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }
        res.json({ member });
    } catch (error) {
        console.error("Error in getMemberById:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Create new member
const createMember = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, age, gender, email, phone, address, emergency_contact_name, emergency_contact_phone, aadhaar, pan, driving_license, passport, is_student, plan_id, payment_due_date } = req.body;

    try {
        // Check if email already exists
        const existingMember = await dbGet('SELECT id FROM members WHERE email = ?', [email]);
        if (existingMember) {
            return res.status(400).json({ message: 'Member with this email already exists' });
        }

        // Create member
        const result = await dbRun(`INSERT INTO members (
                name, age, gender, email, phone, address,
                emergency_contact_name, emergency_contact_phone,
                aadhaar, pan, driving_license, passport, is_student,
                plan_id, payment_due_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, age, gender, email, phone, address,
             emergency_contact_name, emergency_contact_phone,
             aadhaar, pan, driving_license, passport, is_student ? 1 : 0,
             plan_id, payment_due_date]
        );

        res.status(201).json({
            message: 'Member created successfully',
            memberId: result.lastID
        });
    } catch (error) {
        console.error("Error in createMember:", error);
        res.status(500).json({ message: 'Error creating member' });
    }
};

// Update member
const updateMember = async (req, res) => {
    const { id } = req.params;
    const { name, age, gender, email, phone, address, emergency_contact_name, emergency_contact_phone, plan_id, payment_status, payment_due_date } = req.body;

    try {
        const result = await dbRun(`UPDATE members SET 
            name = ?, age = ?, gender = ?, email = ?, phone = ?, address = ?,
            emergency_contact_name = ?, emergency_contact_phone = ?,
            plan_id = ?, payment_status = ?, payment_due_date = ?,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
            [name, age, gender, email, phone, address,
             emergency_contact_name, emergency_contact_phone,
             plan_id, payment_status, payment_due_date, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }

        res.json({ message: 'Member updated successfully' });
    } catch (error) {
        console.error("Error in updateMember:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Upload member photo
const uploadPhoto = async (req, res) => {
    const { id } = req.params;

    if (!req.file) {
        return res.status(400).json({ message: 'No photo uploaded' });
    }

    const photoPath = `/uploads/members/${req.file.filename}`;

    try {
        const result = await dbRun('UPDATE members SET photo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [photoPath, id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }
        res.json({ message: 'Photo uploaded successfully', photoPath });
    } catch (error) {
        console.error("Error in uploadPhoto:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Delete member
const deleteMember = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await dbRun('UPDATE members SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }
        res.json({ message: 'Member soft-deleted successfully' });
    } catch (error) {
        console.error("Error in deleteMember:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get member attendance
const getMemberAttendance = async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    try {
        const attendance = await dbAll(`SELECT * FROM attendance 
         WHERE member_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
            [id, parseInt(limit), parseInt(offset)]
        );

        const countResult = await dbGet('SELECT COUNT(*) as total FROM attendance WHERE member_id = ?', [id]);

        res.json({
            attendance,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(countResult.total / limit),
                total: countResult.total
            }
        });
    } catch (error) {
        console.error("Error in getMemberAttendance:", error);
        res.status(500).json({ message: 'Database error' });
    }
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
