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

// Get all plans
const getAllPlans = async (req, res) => {
    const { page = 1, limit = 10, status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM plans WHERE 1=1';
    let params = [];

    if (status !== 'all') {
        query += ` AND is_active = ?`;
        params.push(status === 'active' ? 1 : 0);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    try {
        const plans = await dbAll(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM plans WHERE 1=1';
        let countParams = [];
        if (status !== 'all') {
            countQuery += ` AND is_active = ?`;
            countParams.push(status === 'active' ? 1 : 0);
        }

        const countResult = await dbGet(countQuery, countParams);

        res.json({
            plans,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(countResult.total / limit),
                total: countResult.total
            }
        });
    } catch (error) {
        console.error("Error in getAllPlans:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get plan by ID
const getPlanById = async (req, res) => {
    const { id } = req.params;

    try {
        const plan = await dbGet('SELECT * FROM plans WHERE id = ?', [id]);
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }
        res.json({ plan });
    } catch (error) {
        console.error("Error in getPlanById:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Create new plan
const createPlan = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, duration_months, price, description, services_included } = req.body;

    try {
        const result = await dbRun(
            `INSERT INTO plans (name, duration_months, price, description, services_included)
             VALUES (?, ?, ?, ?, ?)`,
            [name, duration_months, price, description, services_included]
        );
        res.status(201).json({
            message: 'Plan created successfully',
            planId: result.lastID
        });
    } catch (error) {
        console.error("Error in createPlan:", error);
        res.status(500).json({ message: 'Error creating plan' });
    }
};

// Update plan
const updatePlan = async (req, res) => {
    const { id } = req.params;
    const { name, duration_months, price, description, services_included, is_active } = req.body;

    try {
        const result = await dbRun(
            `UPDATE plans SET 
                name = ?, duration_months = ?, price = ?, description = ?, 
                services_included = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, duration_months, price, description, services_included, is_active, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Plan not found' });
        }
        res.json({ message: 'Plan updated successfully' });
    } catch (error) {
        console.error("Error in updatePlan:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Delete plan
const deletePlan = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if plan is being used by any members
        const result = await dbGet('SELECT COUNT(*) as count FROM members WHERE plan_id = ? AND is_active = 1', [id]);

        if (result.count > 0) {
            return res.status(400).json({
                message: 'Cannot delete plan. It is currently assigned to active members.'
            });
        }

        const deleteResult = await dbRun('UPDATE plans SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

        if (deleteResult.changes === 0) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        res.json({ message: 'Plan soft-deleted successfully' });
    } catch (error) {
        console.error("Error in deletePlan:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get plan statistics
const getPlanStats = async (req, res) => {
    try {
        const stats = await dbAll(`SELECT 
            p.id, p.name, p.price, p.duration_months,
            COUNT(m.id) as member_count,
            COUNT(CASE WHEN m.payment_status = 'paid' THEN 1 END) as active_members,
            COUNT(CASE WHEN m.payment_status = 'pending' THEN 1 END) as pending_members,
            COUNT(CASE WHEN m.payment_status = 'overdue' THEN 1 END) as overdue_members
         FROM plans p
         LEFT JOIN members m ON p.id = m.plan_id AND m.is_active = 1
         WHERE p.is_active = 1
         GROUP BY p.id, p.name, p.price, p.duration_months
         ORDER BY member_count DESC`);

        res.json({ stats });
    } catch (error) {
        console.error("Error in getPlanStats:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    getAllPlans,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan,
    getPlanStats
};
