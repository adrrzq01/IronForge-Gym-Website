const db = require('../database/init');
const { body, validationResult } = require('express-validator');

// Get all plans
const getAllPlans = (req, res) => {
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

    db.all(query, params, (err, plans) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM plans WHERE 1=1';
        let countParams = [];

        if (status !== 'all') {
            countQuery += ` AND is_active = ?`;
            countParams.push(status === 'active' ? 1 : 0);
        }

        db.get(countQuery, countParams, (err, countResult) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({
                plans,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(countResult.total / limit),
                    total: countResult.total
                }
            });
        });
    });
};

// Get plan by ID
const getPlanById = (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM plans WHERE id = ?', [id], (err, plan) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        res.json({ plan });
    });
};

// Create new plan
const createPlan = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, duration_months, price, description, services_included } = req.body;

    db.run(
        `INSERT INTO plans (name, duration_months, price, description, services_included)
         VALUES (?, ?, ?, ?, ?)`,
        [name, duration_months, price, description, services_included],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Error creating plan' });
            }

            res.status(201).json({
                message: 'Plan created successfully',
                planId: this.lastID
            });
        }
    );
};

// Update plan
const updatePlan = (req, res) => {
    const { id } = req.params;
    const { name, duration_months, price, description, services_included, is_active } = req.body;

    db.run(
        `UPDATE plans SET 
            name = ?, duration_months = ?, price = ?, description = ?, 
            services_included = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, duration_months, price, description, services_included, is_active, id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Plan not found' });
            }

            res.json({ message: 'Plan updated successfully' });
        }
    );
};

// Delete plan
const deletePlan = (req, res) => {
    const { id } = req.params;

    // Check if plan is being used by any members
    db.get(
        'SELECT COUNT(*) as count FROM members WHERE plan_id = ? AND is_active = 1',
        [id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (result.count > 0) {
                return res.status(400).json({ 
                    message: 'Cannot delete plan. It is currently assigned to active members.' 
                });
            }

            db.run(
                'UPDATE plans SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id],
                function(err) {
                    if (err) {
                        return res.status(500).json({ message: 'Database error' });
                    }

                    if (this.changes === 0) {
                        return res.status(404).json({ message: 'Plan not found' });
                    }

                    res.json({ message: 'Plan deleted successfully' });
                }
            );
        }
    );
};

// Get plan statistics
const getPlanStats = (req, res) => {
    db.all(
        `SELECT 
            p.id, p.name, p.price, p.duration_months,
            COUNT(m.id) as member_count,
            COUNT(CASE WHEN m.payment_status = 'paid' THEN 1 END) as active_members,
            COUNT(CASE WHEN m.payment_status = 'pending' THEN 1 END) as pending_members,
            COUNT(CASE WHEN m.payment_status = 'overdue' THEN 1 END) as overdue_members
         FROM plans p
         LEFT JOIN members m ON p.id = m.plan_id AND m.is_active = 1
         WHERE p.is_active = 1
         GROUP BY p.id, p.name, p.price, p.duration_months
         ORDER BY member_count DESC`,
        (err, stats) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ stats });
        }
    );
};

module.exports = {
    getAllPlans,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan,
    getPlanStats
};
