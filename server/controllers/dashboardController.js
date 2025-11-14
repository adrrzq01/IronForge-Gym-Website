const db = require('../database/init');

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

// Get admin dashboard data
const getAdminDashboard = async (req, res) => {
    try {
        const queries = [
            dbGet('SELECT COUNT(*) as total FROM members WHERE is_active = 1'),
            dbGet("SELECT COUNT(*) as active FROM members WHERE is_active = 1 AND payment_status = 'paid'"),
            dbGet("SELECT COUNT(*) as pending FROM members WHERE is_active = 1 AND payment_status = 'pending'"),
            dbGet("SELECT COUNT(*) as overdue FROM members WHERE is_active = 1 AND payment_status = 'overdue'"),
            dbGet('SELECT COUNT(*) as employees FROM employees WHERE is_active = 1'),
            dbGet(`SELECT COUNT(*) as today_checkins FROM attendance 
         WHERE DATE(check_in_time) = DATE('now')`),
            dbGet(`SELECT COALESCE(SUM(amount), 0) as monthly_revenue FROM payments 
         WHERE status = 'success' AND DATE(payment_date) >= DATE('now', '-30 days')`),
            dbGet(`SELECT COUNT(*) as recent_members FROM members 
         WHERE is_active = 1 AND DATE(created_at) >= DATE('now', '-7 days')`)
        ];

        const [
            totalMembers,
            activeMembers,
            pendingPayments,
            overduePayments,
            totalEmployees,
            todayCheckins,
            monthlyRevenue,
            recentMembers
        ] = await Promise.all(queries);

        res.json({
            stats: {
                totalMembers: totalMembers?.total || 0,
                activeMembers: activeMembers?.active || 0,
                pendingPayments: pendingPayments?.pending || 0,
                overduePayments: overduePayments?.overdue || 0,
                totalEmployees: totalEmployees?.employees || 0,
                todayCheckins: todayCheckins?.today_checkins || 0,
                monthlyRevenue: monthlyRevenue?.monthly_revenue || 0,
                recentMembers: recentMembers?.recent_members || 0
            }
        });
    } catch (error) {
        console.error('Error in getAdminDashboard:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get employee dashboard data
const getEmployeeDashboard = async (req, res) => {
    const { userId } = req.user;

    try {
        const employee = await dbGet('SELECT * FROM employees WHERE user_id = ?', [userId]);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        let stats = {};
        let upcomingSchedules = [];

        if (employee.position.toLowerCase().includes('trainer')) {
            const memberResult = await dbGet(`SELECT COUNT(*) as assigned_members FROM member_trainers mt
                JOIN members m ON mt.member_id = m.id
                WHERE mt.trainer_id = ? AND mt.is_active = 1 AND m.is_active = 1`, [employee.id]);
            stats.assignedMembers = memberResult?.assigned_members || 0;
        }

        // All employees can see upcoming schedules and check-ins
        upcomingSchedules = await dbAll(`SELECT s.*, sv.name as service_name, e.name as trainer_name 
           FROM schedule s 
           JOIN services sv ON s.service_id = sv.id 
           LEFT JOIN employees e ON s.trainer_id = e.id
           WHERE s.start_time > CURRENT_TIMESTAMP ORDER BY s.start_time ASC LIMIT 5`);

        const checkinResult = await dbGet(`SELECT COUNT(*) as today_checkins FROM attendance 
                                             WHERE DATE(check_in_time) = DATE('now')`);

        res.json({
            employee: {
                id: employee.id,
                name: employee.name,
                position: employee.position,
                shift_start: employee.shift_start,
                shift_end: employee.shift_end
            },
            stats: { ...stats,
                todayCheckins: checkinResult?.today_checkins || 0 },
            upcomingSchedules: upcomingSchedules
        });
    } catch (error) {
        console.error('Error in getEmployeeDashboard:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get member dashboard data
const getMemberDashboard = async (req, res) => {
    const { userId } = req.user;

    try {
        const member = await dbGet(`SELECT m.*, p.name as plan_name, p.price as plan_price, p.duration_months
         FROM members m
         LEFT JOIN plans p ON m.plan_id = p.id
         WHERE m.user_id = ?`, [userId]);

        if (!member) {
            return res.status(404).json({ message: 'Member profile not found for this user.' });
        }

        const attendanceResult = await dbGet(`SELECT 
                    COUNT(*) as total_visits,
                    COUNT(CASE WHEN check_out_time IS NOT NULL THEN 1 END) as completed_visits,
                    COUNT(CASE WHEN DATE(check_in_time) = DATE('now') AND check_out_time IS NULL THEN 1 END) as current_checkin
                 FROM attendance 
                 WHERE member_id = ?`, [member.id]);

        const payments = await dbAll(`SELECT * FROM payments 
                         WHERE member_id = ? 
                         ORDER BY payment_date DESC 
                         LIMIT 5`, [member.id]);

        const upcomingBookings = await dbAll(`SELECT b.id as booking_id, s.start_time, s.end_time, sv.name as service_name, e.name as trainer_name
                                 FROM bookings b
                                 JOIN schedule s ON b.schedule_id = s.id
                                 JOIN services sv ON s.service_id = sv.id
                                 LEFT JOIN employees e ON s.trainer_id = e.id
                                 WHERE b.member_id = ? AND b.status = 'confirmed' AND s.start_time > CURRENT_TIMESTAMP
                                 ORDER BY s.start_time ASC
                                 LIMIT 5`, [member.id]);

        res.json({
            member: {
                id: member.id,
                name: member.name,
                email: member.email,
                phone: member.phone,
                plan_name: member.plan_name,
                plan_price: member.plan_price,
                payment_status: member.payment_status,
                payment_due_date: member.payment_due_date,
                join_date: member.join_date
            },
            attendance: attendanceResult,
            recentPayments: payments,
            assignedServices: upcomingBookings // Renamed for consistency, but it's now bookings
        });
    } catch (error) {
        console.error('Error in getMemberDashboard:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get dashboard charts data
const getDashboardCharts = async (req, res) => {
    const { type = 'monthly' } = req.query;

    let dateFilter = '';
    let groupBy = '';

    switch (type) {
        case 'daily':
            dateFilter = "DATE(check_in_time) >= DATE('now', '-30 days')";
            groupBy = "DATE(check_in_time)";
            break;
        case 'weekly':
            dateFilter = "DATE(check_in_time) >= DATE('now', '-12 weeks')";
            groupBy = "strftime('%Y-%W', check_in_time)";
            break;
        case 'monthly':
            dateFilter = "DATE(check_in_time) >= DATE('now', '-12 months')";
            groupBy = "strftime('%Y-%m', check_in_time)";
            break;
    }

    // Safety: ensure groupBy and dateFilter have defaults
    if (!groupBy) groupBy = "DATE(check_in_time)";
    if (!dateFilter) dateFilter = "DATE(check_in_time) >= DATE('now', '-12 months')";

    try {
        const attendanceData = await dbAll(`SELECT 
            ${groupBy} as period,
            COUNT(*) as checkins,
            COUNT(DISTINCT member_id) as unique_members
         FROM attendance 
         WHERE ${dateFilter}
         GROUP BY ${groupBy}
         ORDER BY period DESC`);

        // Create a separate groupBy for payments table which uses 'payment_date'
        const paymentGroupBy = groupBy.replace('check_in_time', 'payment_date');
        const paymentDateFilter = dateFilter.replace('check_in_time', 'payment_date');

        const paymentData = await dbAll(`SELECT 
                    ${paymentGroupBy} as period,
                    COUNT(*) as payments,
                    SUM(amount) as revenue
                 FROM payments 
                 WHERE status = 'success' AND ${paymentDateFilter}
                 GROUP BY ${paymentGroupBy}
                 ORDER BY period DESC`);

        res.json({
            attendance: attendanceData,
            payments: paymentData
        });
    } catch (error) {
        console.error('Error in getDashboardCharts:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Get notifications
const getNotifications = async (req, res) => {
    const { userId } = req.user;

    try {
        const notifications = await dbAll(`SELECT * FROM notifications 
         WHERE user_id = ? OR user_id IS NULL
         ORDER BY created_at DESC 
         LIMIT 10`, [userId]);
        res.json({ notifications });
    } catch (error) {
        console.error('Error in getNotifications:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    try {
        const result = await dbRun('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Notification not found or you do not have permission to mark it as read.' });
        }
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error in markNotificationRead:', error);
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    getAdminDashboard,
    getEmployeeDashboard,
    getMemberDashboard,
    getDashboardCharts,
    getNotifications,
    markNotificationRead
};
