const db = require('../database/init');
const { body, validationResult } = require('express-validator');

// Get all services
const getAllServices = (req, res) => {
    const { page = 1, limit = 10, status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM services WHERE 1=1';
    let params = [];

    if (status !== 'all') {
        query += ` AND is_active = ?`;
        params.push(status === 'active' ? 1 : 0);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, services) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM services WHERE 1=1';
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
                services,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(countResult.total / limit),
                    total: countResult.total
                }
            });
        });
    });
};

// Get service by ID
const getServiceById = (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM services WHERE id = ?', [id], (err, service) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json({ service });
    });
};

// Create new service
const createService = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, duration_minutes } = req.body;

    db.run(
        `INSERT INTO services (name, description, price, duration_minutes)
         VALUES (?, ?, ?, ?)`,
        [name, description, price, duration_minutes],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Error creating service' });
            }

            res.status(201).json({
                message: 'Service created successfully',
                serviceId: this.lastID
            });
        }
    );
};

// Update service
const updateService = (req, res) => {
    const { id } = req.params;
    const { name, description, price, duration_minutes, is_active } = req.body;

    db.run(
        `UPDATE services SET 
            name = ?, description = ?, price = ?, duration_minutes = ?, 
            is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, description, price, duration_minutes, is_active, id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Service not found' });
            }

            res.json({ message: 'Service updated successfully' });
        }
    );
};

// Delete service
const deleteService = (req, res) => {
    const { id } = req.params;

    // Check if service is being used by any members
    db.get(
        'SELECT COUNT(*) as count FROM member_services WHERE service_id = ? AND is_active = 1',
        [id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (result.count > 0) {
                return res.status(400).json({ 
                    message: 'Cannot delete service. It is currently assigned to active members.' 
                });
            }

            db.run(
                'UPDATE services SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id],
                function(err) {
                    if (err) {
                        return res.status(500).json({ message: 'Database error' });
                    }

                    if (this.changes === 0) {
                        return res.status(404).json({ message: 'Service not found' });
                    }

                    res.json({ message: 'Service deleted successfully' });
                }
            );
        }
    );
};

// Assign service to member
const assignServiceToMember = (req, res) => {
    const { memberId, serviceId, expiryDate } = req.body;

    // Check if assignment already exists
    db.get(
        'SELECT id FROM member_services WHERE member_id = ? AND service_id = ? AND is_active = 1',
        [memberId, serviceId],
        (err, existingAssignment) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (existingAssignment) {
                return res.status(400).json({ message: 'Service already assigned to this member' });
            }

            // Create assignment
            db.run(
                'INSERT INTO member_services (member_id, service_id, expiry_date) VALUES (?, ?, ?)',
                [memberId, serviceId, expiryDate],
                function(err) {
                    if (err) {
                        return res.status(500).json({ message: 'Error assigning service' });
                    }

                    res.status(201).json({
                        message: 'Service assigned successfully',
                        assignmentId: this.lastID
                    });
                }
            );
        }
    );
};

// Get member's services
const getMemberServices = (req, res) => {
    const { memberId } = req.params;

    db.all(
        `SELECT s.*, ms.assigned_date, ms.expiry_date, ms.is_active as assignment_active
         FROM services s
         JOIN member_services ms ON s.id = ms.service_id
         WHERE ms.member_id = ? AND ms.is_active = 1
         ORDER BY ms.assigned_date DESC`,
        [memberId],
        (err, services) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ services });
        }
    );
};

// Remove service assignment
const removeServiceAssignment = (req, res) => {
    const { memberId, serviceId } = req.params;

    db.run(
        'UPDATE member_services SET is_active = 0 WHERE member_id = ? AND service_id = ?',
        [memberId, serviceId],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Assignment not found' });
            }

            res.json({ message: 'Service assignment removed successfully' });
        }
    );
};

// Get service statistics
const getServiceStats = (req, res) => {
    db.all(
        `SELECT 
            s.id, s.name, s.price, s.duration_minutes,
            COUNT(ms.id) as assignment_count,
            COUNT(CASE WHEN ms.is_active = 1 THEN 1 END) as active_assignments,
            COUNT(CASE WHEN ms.expiry_date < DATE('now') AND ms.is_active = 1 THEN 1 END) as expired_assignments
         FROM services s
         LEFT JOIN member_services ms ON s.id = ms.service_id
         WHERE s.is_active = 1
         GROUP BY s.id, s.name, s.price, s.duration_minutes
         ORDER BY assignment_count DESC`,
        (err, stats) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ stats });
        }
    );
};

module.exports = {
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    assignServiceToMember,
    getMemberServices,
    removeServiceAssignment,
    getServiceStats
};
