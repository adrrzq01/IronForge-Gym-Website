const db = require('../database/init');
const { body, validationResult } = require('express-validator');
const moment = require('moment');

// Get all payments
const getAllPayments = (req, res) => {
    const { page = 1, limit = 10, memberId, status = 'all', startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT p.*, m.name as member_name, m.email as member_email
        FROM payments p
        JOIN members m ON p.member_id = m.id
        WHERE 1=1
    `;
    let params = [];

    if (memberId) {
        query += ` AND p.member_id = ?`;
        params.push(memberId);
    }

    if (status !== 'all') {
        query += ` AND p.status = ?`;
        params.push(status);
    }

    if (startDate && endDate) {
        query += ` AND DATE(p.payment_date) BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }

    query += ` ORDER BY p.payment_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, payments) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM payments WHERE 1=1';
        let countParams = [];

        if (memberId) {
            countQuery += ` AND member_id = ?`;
            countParams.push(memberId);
        }

        if (status !== 'all') {
            countQuery += ` AND status = ?`;
            countParams.push(status);
        }

        if (startDate && endDate) {
            countQuery += ` AND DATE(payment_date) BETWEEN ? AND ?`;
            countParams.push(startDate, endDate);
        }

        db.get(countQuery, countParams, (err, countResult) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({
                payments,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(countResult.total / limit),
                    total: countResult.total
                }
            });
        });
    });
};

// Get payment by ID
const getPaymentById = (req, res) => {
    const { id } = req.params;

    db.get(
        `SELECT p.*, m.name as member_name, m.email as member_email
         FROM payments p
         JOIN members m ON p.member_id = m.id
         WHERE p.id = ?`,
        [id],
        (err, payment) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (!payment) {
                return res.status(404).json({ message: 'Payment not found' });
            }

            res.json({ payment });
        }
    );
};

// Create new payment
const createPayment = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        memberId, amount, paymentType, paymentMethod, transactionId,
        status = 'success', description, dueDate
    } = req.body;

    db.run(
        `INSERT INTO payments (
            member_id, amount, payment_type, payment_method, transaction_id,
            status, description, due_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [memberId, amount, paymentType, paymentMethod, transactionId,
         status, description, dueDate],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Error creating payment' });
            }

            // Update member's payment status if payment is successful
            if (status === 'success') {
                db.run(
                    `UPDATE members SET 
                        payment_status = 'paid', 
                        payment_due_date = ?,
                        updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [dueDate, memberId],
                    (err) => {
                        if (err) {
                            console.error('Error updating member payment status:', err);
                        }
                    }
                );
            }

            res.status(201).json({
                message: 'Payment created successfully',
                paymentId: this.lastID
            });
        }
    );
};

// Update payment
const updatePayment = (req, res) => {
    const { id } = req.params;
    const { amount, paymentType, paymentMethod, transactionId, status, description } = req.body;

    db.run(
        `UPDATE payments SET 
            amount = ?, payment_type = ?, payment_method = ?, 
            transaction_id = ?, status = ?, description = ?
         WHERE id = ?`,
        [amount, paymentType, paymentMethod, transactionId, status, description, id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Payment not found' });
            }

            res.json({ message: 'Payment updated successfully' });
        }
    );
};

// Delete payment
const deletePayment = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM payments WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.json({ message: 'Payment deleted successfully' });
    });
};

// Get member's payment history
const getMemberPayments = (req, res) => {
    const { memberId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
        `SELECT * FROM payments 
         WHERE member_id = ? 
         ORDER BY payment_date DESC 
         LIMIT ? OFFSET ?`,
        [memberId, parseInt(limit), parseInt(offset)],
        (err, payments) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            // Get total count
            db.get(
                'SELECT COUNT(*) as total FROM payments WHERE member_id = ?',
                [memberId],
                (err, countResult) => {
                    if (err) {
                        return res.status(500).json({ message: 'Database error' });
                    }

                    res.json({
                        payments,
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

// Get payment statistics
const getPaymentStats = (req, res) => {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    let params = [];

    switch (period) {
        case 'today':
            dateFilter = "DATE(payment_date) = DATE('now')";
            break;
        case 'week':
            dateFilter = "DATE(payment_date) >= DATE('now', '-7 days')";
            break;
        case 'month':
            dateFilter = "DATE(payment_date) >= DATE('now', '-30 days')";
            break;
        case 'year':
            dateFilter = "DATE(payment_date) >= DATE('now', '-365 days')";
            break;
    }

    db.all(
        `SELECT 
            DATE(payment_date) as date,
            COUNT(*) as payment_count,
            SUM(amount) as total_amount,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_payments,
            SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as successful_amount
         FROM payments 
         WHERE ${dateFilter}
         GROUP BY DATE(payment_date)
         ORDER BY date DESC`,
        params,
        (err, stats) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ stats });
        }
    );
};

// Get overdue payments
const getOverduePayments = (req, res) => {
    const today = moment().format('YYYY-MM-DD');

    db.all(
        `SELECT m.*, p.name as plan_name, p.price as plan_price
         FROM members m
         LEFT JOIN plans p ON m.plan_id = p.id
         WHERE m.payment_status = 'overdue' 
         OR (m.payment_due_date < ? AND m.payment_status != 'paid')
         ORDER BY m.payment_due_date ASC`,
        [today],
        (err, members) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ overdueMembers: members });
        }
    );
};

// Process payment (simulate payment gateway)
const processPayment = (req, res) => {
    const { memberId, amount, paymentType, paymentMethod } = req.body;

    // Simulate payment processing
    const isSuccessful = Math.random() > 0.1; // 90% success rate for demo

    const paymentData = {
        memberId,
        amount,
        paymentType,
        paymentMethod,
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: isSuccessful ? 'success' : 'failed',
        description: `${paymentType} payment for membership`
    };

    if (isSuccessful) {
        // Create payment record
        db.run(
            `INSERT INTO payments (
                member_id, amount, payment_type, payment_method, transaction_id,
                status, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [paymentData.memberId, paymentData.amount, paymentData.paymentType,
             paymentData.paymentMethod, paymentData.transactionId, paymentData.status,
             paymentData.description],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: 'Error processing payment' });
                }

                // Update member payment status
                const newDueDate = moment().add(1, 'month').format('YYYY-MM-DD');
                db.run(
                    `UPDATE members SET 
                        payment_status = 'paid', 
                        payment_due_date = ?,
                        updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [newDueDate, memberId],
                    (err) => {
                        if (err) {
                            console.error('Error updating member payment status:', err);
                        }
                    }
                );

                res.json({
                    message: 'Payment processed successfully',
                    paymentId: this.lastID,
                    transactionId: paymentData.transactionId,
                    status: 'success'
                });
            }
        );
    } else {
        res.status(400).json({
            message: 'Payment failed',
            status: 'failed'
        });
    }
};

module.exports = {
    getAllPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment,
    getMemberPayments,
    getPaymentStats,
    getOverduePayments,
    processPayment
};
