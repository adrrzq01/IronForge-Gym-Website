const db = require('../database/init');
const { body, validationResult } = require('express-validator');

// Get all employees
const getAllEmployees = (req, res) => {
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

    db.all(query, params, (err, employees) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

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

        db.get(countQuery, countParams, (err, countResult) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({
                employees,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(countResult.total / limit),
                    total: countResult.total
                }
            });
        });
    });
};

// Get employee by ID
const getEmployeeById = (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM employees WHERE id = ?', [id], (err, employee) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json({ employee });
    });
};

// Create new employee
const createEmployee = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        name, email, phone, position, salary, shift_start, shift_end
    } = req.body;

    // Check if email already exists
    db.get('SELECT id FROM employees WHERE email = ?', [email], (err, existingEmployee) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (existingEmployee) {
            return res.status(400).json({ message: 'Employee with this email already exists' });
        }

        // Create employee
        db.run(
            `INSERT INTO employees (
                name, email, phone, position, salary, shift_start, shift_end
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, email, phone, position, salary, shift_start, shift_end],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: 'Error creating employee' });
                }

                res.status(201).json({
                    message: 'Employee created successfully',
                    employeeId: this.lastID
                });
            }
        );
    });
};

// Update employee
const updateEmployee = (req, res) => {
    const { id } = req.params;
    const {
        name, email, phone, position, salary, shift_start, shift_end
    } = req.body;

    db.run(
        `UPDATE employees SET 
            name = ?, email = ?, phone = ?, position = ?, 
            salary = ?, shift_start = ?, shift_end = ?,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, email, phone, position, salary, shift_start, shift_end, id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Employee not found' });
            }

            res.json({ message: 'Employee updated successfully' });
        }
    );
};

// Delete employee
const deleteEmployee = (req, res) => {
    const { id } = req.params;

    db.run(
        'UPDATE employees SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Employee not found' });
            }

            res.json({ message: 'Employee deleted successfully' });
        }
    );
};

// Assign trainer to member
const assignTrainer = (req, res) => {
    const { memberId, trainerId } = req.body;

    // Check if assignment already exists
    db.get(
        'SELECT id FROM member_trainers WHERE member_id = ? AND trainer_id = ? AND is_active = 1',
        [memberId, trainerId],
        (err, existingAssignment) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (existingAssignment) {
                return res.status(400).json({ message: 'Trainer already assigned to this member' });
            }

            // Create assignment
            db.run(
                'INSERT INTO member_trainers (member_id, trainer_id) VALUES (?, ?)',
                [memberId, trainerId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ message: 'Error assigning trainer' });
                    }

                    res.status(201).json({
                        message: 'Trainer assigned successfully',
                        assignmentId: this.lastID
                    });
                }
            );
        }
    );
};

// Get trainer's assigned members
const getTrainerMembers = (req, res) => {
    const { trainerId } = req.params;

    db.all(
        `SELECT m.*, mt.assigned_date
         FROM members m
         JOIN member_trainers mt ON m.id = mt.member_id
         WHERE mt.trainer_id = ? AND mt.is_active = 1 AND m.is_active = 1
         ORDER BY mt.assigned_date DESC`,
        [trainerId],
        (err, members) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ members });
        }
    );
};

// Remove trainer assignment
const removeTrainerAssignment = (req, res) => {
    const { memberId, trainerId } = req.params;

    db.run(
        'UPDATE member_trainers SET is_active = 0 WHERE member_id = ? AND trainer_id = ?',
        [memberId, trainerId],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Assignment not found' });
            }

            res.json({ message: 'Trainer assignment removed successfully' });
        }
    );
};

// Get employee performance stats
const getEmployeeStats = (req, res) => {
    const { employeeId } = req.params;

    db.all(
        `SELECT 
            COUNT(mt.id) as assigned_members,
            COUNT(CASE WHEN m.payment_status = 'paid' THEN 1 END) as active_members,
            COUNT(CASE WHEN m.payment_status = 'overdue' THEN 1 END) as overdue_members
         FROM member_trainers mt
         JOIN members m ON mt.member_id = m.id
         WHERE mt.trainer_id = ? AND mt.is_active = 1`,
        [employeeId],
        (err, stats) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ stats: stats[0] || { assigned_members: 0, active_members: 0, overdue_members: 0 } });
        }
    );
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
