const db = require('../database/init');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const Razorpay = require('razorpay');
const crypto = require('crypto');

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

// Instantiate Razorpay
// IMPORTANT: These should be stored in environment variables
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_XXXXXXXXXXXXXX',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'XXXXXXXXXXXXXXXXXXXXXXXX'
});

// Create a Razorpay Order
const createRazorpayOrder = async (req, res) => {
    const { amount, planId } = req.body;
    const { userId } = req.user;

    if (!amount || !planId) {
        return res.status(400).json({ message: 'Amount and Plan ID are required.' });
    }

    try {
        const options = {
            amount: amount * 100, // amount in the smallest currency unit
            currency: "INR",
            receipt: `receipt_plan_${planId}_${new Date().getTime()}`,
            notes: {
                planId,
                userId
            }
        };

        const order = await razorpay.orders.create(options);
        res.json(order);

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ message: 'Error creating Razorpay order' });
    }
};

// Verify Razorpay Payment
const verifyRazorpayPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, amount } = req.body;
    const { userId } = req.user;

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'XXXXXXXXXXXXXXXXXXXXXXXX');
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
        return res.status(400).json({ message: 'Invalid signature' });
    }

    // Signature is valid, now update database within a transaction
    try {
        const member = await dbGet('SELECT id FROM members WHERE user_id = ?', [userId]);
        if (!member) {
            return res.status(404).json({ message: 'Could not find member profile for this user.' });
        }

        const memberId = member.id;
        const newDueDate = moment().add(1, 'month').format('YYYY-MM-DD');

        await dbRun('BEGIN TRANSACTION');

        // 1. Insert into payments table
        await dbRun(
            `INSERT INTO payments (member_id, amount, payment_type, transaction_id, status, description) VALUES (?, ?, ?, ?, ?, ?)`,
            [memberId, amount, 'online', razorpay_payment_id, 'success', `Online payment for Plan ID ${planId}`]
        );

        // 2. Update member's plan and payment status
        await dbRun(
            `UPDATE members SET plan_id = ?, payment_status = 'paid', payment_due_date = ? WHERE id = ?`,
            [planId, newDueDate, memberId]
        );

        await dbRun('COMMIT');

        res.json({ message: 'Payment successful and plan updated.' });

    } catch (error) {
        await dbRun('ROLLBACK');
        console.error('Error during Razorpay payment verification DB update:', error);
        res.status(500).json({ message: 'Payment verified, but failed to update database.' });
    }
};


// Get all payments
const getAllPayments = async (req, res) => {
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

    try {
        const payments = await dbAll(query, params);
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

        const countResult = await dbGet(countQuery, countParams);

        res.json({
            payments,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(countResult.total / limit),
                total: countResult.total
            }
        });
    } catch (error) {
        console.error("Error in getAllPayments:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
    const { id } = req.params;

    try {
        const payment = await dbGet(`SELECT p.*, m.name as member_name, m.email as member_email
         FROM payments p
         JOIN members m ON p.member_id = m.id
         WHERE p.id = ?`,
            [id]
        );
            if (!payment) {
                return res.status(404).json({ message: 'Payment not found' });
            }

            res.json({ payment });
    } catch (error) {
        console.error("Error in getPaymentById:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Create new payment
const createPayment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        memberId, amount, paymentType, paymentMethod, transactionId,
        status = 'success', description, dueDate
    } = req.body;

    try {
        const result = await dbRun(`INSERT INTO payments (
            member_id, amount, payment_type, payment_method, transaction_id,
            status, description, due_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [memberId, amount, paymentType, paymentMethod, transactionId, status, description, dueDate]
        );

        // Update member's payment status if payment is successful
        if (status === 'success') {
            await dbRun(`UPDATE members SET 
                        payment_status = 'paid', 
                        payment_due_date = ?,
                        updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`, // Corrected from user_id to id
                [dueDate, memberId]
            );
        }

        res.status(201).json({
            message: 'Payment created successfully',
            paymentId: result.lastID
        });
    } catch (error) {
        console.error("Error in createPayment:", error);
        res.status(500).json({ message: 'Error creating payment' });
    }
};

// Update payment
const updatePayment = async (req, res) => {
    const { id } = req.params;
    const { amount, paymentType, paymentMethod, transactionId, status, description } = req.body;

    try {
        const result = await dbRun(`UPDATE payments SET 
            amount = ?, payment_type = ?, payment_method = ?, 
            transaction_id = ?, status = ?, description = ?
         WHERE id = ?`,
            [amount, paymentType, paymentMethod, transactionId, status, description, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.json({ message: 'Payment updated successfully' });
    } catch (error) {
        console.error("Error in updatePayment:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Delete payment
const deletePayment = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await dbRun('DELETE FROM payments WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error("Error in deletePayment:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get member's payment history
const getMemberPayments = async (req, res) => {
    const { memberId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const payments = await dbAll(`SELECT * FROM payments 
         WHERE member_id = ? 
         ORDER BY payment_date DESC 
         LIMIT ? OFFSET ?`,
            [memberId, parseInt(limit), parseInt(offset)]
        );

        const countResult = await dbGet('SELECT COUNT(*) as total FROM payments WHERE member_id = ?', [memberId]);

        res.json({
            payments,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(countResult.total / limit),
                total: countResult.total
            }
        });
    } catch (error) {
        console.error("Error in getMemberPayments:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get payment statistics
const getPaymentStats = async (req, res) => {
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

    try {
        const stats = await dbAll(`SELECT 
            DATE(payment_date) as date,
            COUNT(*) as payment_count,
            SUM(amount) as total_amount,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_payments,
            SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as successful_amount
         FROM payments 
         WHERE ${dateFilter}
         GROUP BY DATE(payment_date)
         ORDER BY date DESC`,
            params
        );
        res.json({ stats });
    } catch (error) {
        console.error("Error in getPaymentStats:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get overdue payments
const getOverduePayments = async (req, res) => {
    const today = moment().format('YYYY-MM-DD');

    try {
        const members = await dbAll(`SELECT m.*, p.name as plan_name, p.price as plan_price
         FROM members m
         LEFT JOIN plans p ON m.plan_id = p.id
         WHERE m.payment_status = 'overdue' 
         OR (m.payment_due_date < ? AND m.payment_status != 'paid')
         ORDER BY m.payment_due_date ASC`,
            [today]
        );
        res.json({ overdueMembers: members });
    } catch (error) {
        console.error("Error in getOverduePayments:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Process payment (simulate payment gateway)
const processPayment = async (req, res) => {
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
        try {
            // Use a transaction for atomicity
            await dbRun('BEGIN TRANSACTION');

            const result = await dbRun(`INSERT INTO payments (
                member_id, amount, payment_type, payment_method, transaction_id,
                status, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [paymentData.memberId, paymentData.amount, paymentData.paymentType,
                 paymentData.paymentMethod, paymentData.transactionId, paymentData.status,
                 paymentData.description]
            );

            const newDueDate = moment().add(1, 'month').format('YYYY-MM-DD');
            await dbRun(`UPDATE members SET 
                        payment_status = 'paid', 
                        payment_due_date = ?,
                        updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                [newDueDate, memberId]
            );

            await dbRun('COMMIT');

            res.json({ message: 'Payment processed successfully', paymentId: result.lastID, transactionId: paymentData.transactionId, status: 'success' });
        } catch (error) {
            await dbRun('ROLLBACK');
            console.error("Error in processPayment:", error);
            return res.status(500).json({ message: 'Error processing payment' });
        }
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
    processPayment,
    createRazorpayOrder,
    verifyRazorpayPayment
};
