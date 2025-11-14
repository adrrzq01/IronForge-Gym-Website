const db = require('../database/init');
const { body, validationResult } = require('express-validator');

// Get all services
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

const getAllServices = async (req, res) => {
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

    try {
        const services = await dbAll(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM services WHERE 1=1';
        let countParams = [];
        if (status !== 'all') {
            countQuery += ` AND is_active = ?`;
            countParams.push(status === 'active' ? 1 : 0);
        }

        const countResult = await dbGet(countQuery, countParams);

        res.json({
            services,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(countResult.total / limit),
                total: countResult.total
            }
        });
    } catch (error) {
        console.error('Error in getAllServices:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get service by ID
const getServiceById = async (req, res) => {
    const { id } = req.params;

    try {
        const service = await dbGet('SELECT * FROM services WHERE id = ?', [id]);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }
        res.json({ service });
    } catch (error) {
        console.error('Error in getServiceById:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Create new service
const createService = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, duration_minutes } = req.body;
    try {
        const result = await dbRun(
        `INSERT INTO services (name, description, price, duration_minutes)
         VALUES (?, ?, ?, ?)`, [name, description, price, duration_minutes]
        );
        res.status(201).json({
            message: 'Service created successfully',
            serviceId: result.lastID
        });
    } catch (error) {
        console.error('Error in createService:', error);
        res.status(500).json({ message: 'Error creating service' });
    }
};

// Update service
const updateService = async (req, res) => {
    const { id } = req.params;
    const { name, description, price, duration_minutes, is_active } = req.body;
    try {
        const result = await dbRun(
        `UPDATE services SET 
            name = ?, description = ?, price = ?, duration_minutes = ?, 
            is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`, [name, description, price, duration_minutes, is_active, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json({ message: 'Service updated successfully' });
    } catch (error) {
        console.error('Error in updateService:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Delete service
const deleteService = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if service is being used by any members
        const result = await dbGet('SELECT COUNT(*) as count FROM member_services WHERE service_id = ? AND is_active = 1', [id]);

        if (result.count > 0) {
            return res.status(400).json({
                message: 'Cannot delete service. It is currently assigned to active members.'
            });
        }

        const deleteResult = await dbRun('UPDATE services SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

        if (deleteResult.changes === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json({ message: 'Service soft-deleted successfully' });
    } catch (error) {
        console.error('Error in deleteService:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Assign service to member
const assignServiceToMember = async (req, res) => {
    const { memberId, serviceId, expiryDate } = req.body;

    try {
        // Check if assignment already exists
        const existingAssignment = await dbGet('SELECT id FROM member_services WHERE member_id = ? AND service_id = ? AND is_active = 1', [memberId, serviceId]);

        if (existingAssignment) {
            return res.status(400).json({ message: 'Service already assigned to this member' });
        }

        // Create assignment
        const result = await dbRun('INSERT INTO member_services (member_id, service_id, expiry_date) VALUES (?, ?, ?)', [memberId, serviceId, expiryDate]);

        res.status(201).json({
            message: 'Service assigned successfully',
            assignmentId: result.lastID
        });
    } catch (error) {
        console.error('Error in assignServiceToMember:', error);
        res.status(500).json({ message: 'Error assigning service' });
    }
};

// Get member's services
const getMemberServices = async (req, res) => {
    const { memberId } = req.params;

    try {
        const services = await dbAll(`SELECT s.*, ms.assigned_date, ms.expiry_date, ms.is_active as assignment_active
         FROM services s
         JOIN member_services ms ON s.id = ms.service_id
         WHERE ms.member_id = ? AND ms.is_active = 1
         ORDER BY ms.assigned_date DESC`, [memberId]);

        res.json({ services });
    } catch (error) {
        console.error('Error in getMemberServices:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Remove service assignment
const removeServiceAssignment = async (req, res) => {
    const { memberId, serviceId } = req.params;

    try {
        const result = await dbRun('UPDATE member_services SET is_active = 0 WHERE member_id = ? AND service_id = ?', [memberId, serviceId]);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        res.json({ message: 'Service assignment removed successfully' });
    } catch (error) {
        console.error('Error in removeServiceAssignment:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get service statistics
const getServiceStats = async (req, res) => {
    try {
        const stats = await dbAll(`SELECT 
            s.id, s.name, s.price, s.duration_minutes,
            COUNT(ms.id) as assignment_count,
            COUNT(CASE WHEN ms.is_active = 1 THEN 1 END) as active_assignments,
            COUNT(CASE WHEN ms.expiry_date < DATE('now') AND ms.is_active = 1 THEN 1 END) as expired_assignments
         FROM services s
         LEFT JOIN member_services ms ON s.id = ms.service_id
         WHERE s.is_active = 1
         GROUP BY s.id, s.name, s.price, s.duration_minutes
         ORDER BY assignment_count DESC`);

        res.json({ stats });
    } catch (error) {
        console.error('Error in getServiceStats:', error);
        res.status(500).json({ message: 'Database error' });
    }
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
