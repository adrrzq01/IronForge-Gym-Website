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

// Get all employees
const getAllEmployees = async (req, res) => {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM employees WHERE 1=1';
    let params = [];

    if (search) {
        query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR position LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status !== 'all') {
        query += ` AND is_active = ?`;
        params.push(status === 'active' ? 1 : 0);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    try {
        const employees = await dbAll(query, params);
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM employees WHERE 1=1';
        let countParams = [];

        if (search) {
            countQuery += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR position LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status !== 'all') {
            countQuery += ` AND is_active = ?`;
            countParams.push(status === 'active' ? 1 : 0);
        }

        const countResult = await dbGet(countQuery, countParams);

        res.json({
            employees,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(countResult.total / limit),
                total: countResult.total
            }
        });
    } catch (error) {
        console.error("Error in getAllEmployees:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get employee by ID
const getEmployeeById = async (req, res) => {
    const { id } = req.params;

    try {
        const employee = await dbGet('SELECT * FROM employees WHERE id = ?', [id]);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.json({ employee });
    } catch (error) {
        console.error("Error in getEmployeeById:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Create new employee
const createEmployee = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, position, salary, shift_start, shift_end } = req.body;

    try {
        // Check if email already exists
        const existingEmployee = await dbGet('SELECT id FROM employees WHERE email = ?', [email]);
        if (existingEmployee) {
            return res.status(400).json({ message: 'Employee with this email already exists' });
        }

        // Create employee
        const result = await dbRun(`INSERT INTO employees (
                name, email, phone, position, salary, shift_start, shift_end
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, email, phone, position, salary, shift_start, shift_end],
        );

        res.status(201).json({
            message: 'Employee created successfully',
            employeeId: result.lastID
        });
    } catch (error) {
        console.error("Error in createEmployee:", error);
        res.status(500).json({ message: 'Error creating employee' });
    }
};

// Update employee
const updateEmployee = async (req, res) => {
    const { id } = req.params;
    const {
        name, email, phone, position, salary, shift_start, shift_end
    } = req.body;

    try {
        const result = await dbRun(`UPDATE employees SET 
            name = ?, email = ?, phone = ?, position = ?, 
            salary = ?, shift_start = ?, shift_end = ?,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
            [name, email, phone, position, salary, shift_start, shift_end, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json({ message: 'Employee updated successfully' });
    } catch (error) {
        console.error("Error in updateEmployee:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Delete employee
const deleteEmployee = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await dbRun('UPDATE employees SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.json({ message: 'Employee soft-deleted successfully' });
    } catch (error) {
        console.error("Error in deleteEmployee:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Assign trainer to member
const assignTrainer = async (req, res) => {
    const { memberId, trainerId } = req.body;

    try {
        // Check if assignment already exists
        const existingAssignment = await dbGet('SELECT id FROM member_trainers WHERE member_id = ? AND trainer_id = ? AND is_active = 1', [memberId, trainerId]);
        if (existingAssignment) {
            return res.status(400).json({ message: 'Trainer already assigned to this member' });
        }

        // Create assignment
        const result = await dbRun('INSERT INTO member_trainers (member_id, trainer_id) VALUES (?, ?)', [memberId, trainerId]);

        res.status(201).json({
            message: 'Trainer assigned successfully',
            assignmentId: result.lastID
        });
    } catch (error) {
        console.error("Error in assignTrainer:", error);
        res.status(500).json({ message: 'Error assigning trainer' });
    }
};

// Get trainer's assigned members
const getTrainerMembers = async (req, res) => {
    const { trainerId } = req.params;

    try {
        const members = await dbAll(`SELECT m.*, mt.assigned_date
         FROM members m
         JOIN member_trainers mt ON m.id = mt.member_id
         WHERE mt.trainer_id = ? AND mt.is_active = 1 AND m.is_active = 1
         ORDER BY mt.assigned_date DESC`,
            [trainerId]
        );
        res.json({ members });
    } catch (error) {
        console.error("Error in getTrainerMembers:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Remove trainer assignment
const removeTrainerAssignment = async (req, res) => {
    const { memberId, trainerId } = req.params;

    try {
        const result = await dbRun('UPDATE member_trainers SET is_active = 0 WHERE member_id = ? AND trainer_id = ?', [memberId, trainerId]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        res.json({ message: 'Trainer assignment removed successfully' });
    } catch (error) {
        console.error("Error in removeTrainerAssignment:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get employee performance stats
const getEmployeeStats = async (req, res) => {
    const { employeeId } = req.params;

    try {
        const stats = await dbAll(`SELECT 
            COUNT(mt.id) as assigned_members,
            COUNT(CASE WHEN m.payment_status = 'paid' THEN 1 END) as active_members,
            COUNT(CASE WHEN m.payment_status = 'overdue' THEN 1 END) as overdue_members
         FROM member_trainers mt
         JOIN members m ON mt.member_id = m.id
         WHERE mt.trainer_id = ? AND mt.is_active = 1`,
            [employeeId]
        );
        res.json({ stats: stats[0] || { assigned_members: 0, active_members: 0, overdue_members: 0 } });
    } catch (error) {
        console.error("Error in getEmployeeStats:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    assignTrainer,
    getTrainerMembers,
    removeTrainerAssignment,
    getEmployeeStats
};
