const db = require('../database/init');

// Get admin dashboard data
const getAdminDashboard = (req, res) => {
    const queries = [
        // Total members
        'SELECT COUNT(*) as total FROM members WHERE is_active = 1',
    // Active members (paid)
    "SELECT COUNT(*) as active FROM members WHERE is_active = 1 AND payment_status = 'paid'",
    // Pending payments
    "SELECT COUNT(*) as pending FROM members WHERE is_active = 1 AND payment_status = 'pending'",
    // Overdue payments
    "SELECT COUNT(*) as overdue FROM members WHERE is_active = 1 AND payment_status = 'overdue'",
        // Total employees
        'SELECT COUNT(*) as employees FROM employees WHERE is_active = 1',
        // Today's check-ins
        `SELECT COUNT(*) as today_checkins FROM attendance 
         WHERE DATE(check_in_time) = DATE('now')`,
        // Monthly revenue
        `SELECT COALESCE(SUM(amount), 0) as monthly_revenue FROM payments 
         WHERE status = 'success' AND DATE(payment_date) >= DATE('now', '-30 days')`,
        // Recent members (last 7 days)
        `SELECT COUNT(*) as recent_members FROM members 
         WHERE is_active = 1 AND DATE(created_at) >= DATE('now', '-7 days')`
    ];

    // temporary file logging removed for production readiness; keep console errors with context

    Promise.all(queries.map(query => 
        new Promise((resolve, reject) => {
            db.get(query, (err, result) => {
                if (err) reject({ err, query });
                else resolve(result);
            });
        })
    ))
    .then(results => {
        const [
            totalMembers,
            activeMembers,
            pendingPayments,
            overduePayments,
            totalEmployees,
            todayCheckins,
            monthlyRevenue,
            recentMembers
        ] = results;

        res.json({
            stats: {
                totalMembers: totalMembers.total,
                activeMembers: activeMembers.active,
                pendingPayments: pendingPayments.pending,
                overduePayments: overduePayments.overdue,
                totalEmployees: totalEmployees.employees,
                todayCheckins: todayCheckins.today_checkins,
                monthlyRevenue: monthlyRevenue.monthly_revenue,
                recentMembers: recentMembers.recent_members
            }
        });
    })
    .catch(e => {
        // e may be {err, query} or an Error
        const err = e && e.err ? e.err : e;
        const query = e && e.query ? e.query : undefined;
        console.error('Error in getAdminDashboard:', err && err.stack ? err.stack : err, query ? `Query: ${query}` : '');
        res.status(500).json({ message: 'Database error' });
    });
};

// Get employee dashboard data
const getEmployeeDashboard = (req, res) => {
    const { userId } = req.user;

    // Get employee info
    db.get(
        'SELECT * FROM employees WHERE user_id = ?',
        [userId],
        (err, employee) => {
            if (err) {
                        console.error('Error fetching employee:', err);
                        return res.status(500).json({ message: 'Database error' });
            }

            if (!employee) {
                return res.status(404).json({ message: 'Employee not found' });
            }

            // Get assigned members if employee is a trainer
            const memberQuery = employee.position.toLowerCase().includes('trainer') 
                ? `SELECT COUNT(*) as assigned_members FROM member_trainers mt
                   JOIN members m ON mt.member_id = m.id
                   WHERE mt.trainer_id = ? AND mt.is_active = 1 AND m.is_active = 1`
                : 'SELECT COUNT(*) as assigned_members FROM members WHERE is_active = 1';

            const memberParams = employee.position.toLowerCase().includes('trainer') 
                ? [employee.id] : [];

            db.get(memberQuery, memberParams, (err, memberResult) => {
                if (err) {
                    console.error('Error fetching memberResult for employee dashboard:', err);
                    return res.status(500).json({ message: 'Database error' });
                }

                // Get today's check-ins
                db.get(
                    `SELECT COUNT(*) as today_checkins FROM attendance 
                     WHERE DATE(check_in_time) = DATE('now')`,
                    (err, checkinResult) => {
                        if (err) {
                           console.error('Error fetching checkinResult for employee dashboard:', err);
                           return res.status(500).json({ message: 'Database error' });
                        }

                        res.json({
                            employee: {
                                id: employee.id,
                                name: employee.name,
                                position: employee.position,
                                shift_start: employee.shift_start,
                                shift_end: employee.shift_end
                            },
                            stats: {
                                assignedMembers: memberResult.assigned_members,
                                todayCheckins: checkinResult.today_checkins
                            }
                        });
                    }
                );
            });
        }
    );
};

// Get member dashboard data
const getMemberDashboard = (req, res) => {
    const { userId } = req.user;

    // Get member info
    db.get(
        `SELECT m.*, p.name as plan_name, p.price as plan_price, p.duration_months
         FROM members m
         LEFT JOIN plans p ON m.plan_id = p.id
         WHERE m.user_id = ?`,
        [userId],
        (err, member) => {
            if (err) {
                console.error('Error fetching member for member dashboard:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (!member) {
                return res.status(404).json({ message: 'Member not found' });
            }

            // Get attendance summary
            db.get(
                `SELECT 
                    COUNT(*) as total_visits,
                    COUNT(CASE WHEN check_out_time IS NOT NULL THEN 1 END) as completed_visits,
                    COUNT(CASE WHEN DATE(check_in_time) = DATE('now') AND check_out_time IS NULL THEN 1 END) as current_checkin
                 FROM attendance 
                 WHERE member_id = ?`,
                [member.id],
                (err, attendanceResult) => {
                    if (err) {
                        console.error('Error fetching attendance for member dashboard:', err);
                        return res.status(500).json({ message: 'Database error' });
                    }

                    // Get recent payments
                    db.all(
                        `SELECT * FROM payments 
                         WHERE member_id = ? 
                         ORDER BY payment_date DESC 
                         LIMIT 5`,
                        [member.id],
                        (err, payments) => {
                            if (err) {
                              console.error('Error fetching payments for member dashboard:', err);
                              return res.status(500).json({ message: 'Database error' });
                            }

                            // Get assigned services
                            db.all(
                                `SELECT s.*, ms.assigned_date, ms.expiry_date
                                 FROM services s
                                 JOIN member_services ms ON s.id = ms.service_id
                                 WHERE ms.member_id = ? AND ms.is_active = 1
                                 ORDER BY ms.assigned_date DESC`,
                                [member.id],
                                (err, services) => {
                                    if (err) {
                                    console.error('Error fetching services for member dashboard:', err);
                                    return res.status(500).json({ message: 'Database error' });
                                    }

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
                                        assignedServices: services
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

// Get dashboard charts data
const getDashboardCharts = (req, res) => {
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

    // Get attendance data
    db.all(
        `SELECT 
            ${groupBy} as period,
            COUNT(*) as checkins,
            COUNT(DISTINCT member_id) as unique_members
         FROM attendance 
         WHERE ${dateFilter}
         GROUP BY ${groupBy}
         ORDER BY period DESC`,
        (err, attendanceData) => {
            if (err) {
                console.error('Error fetching attendanceData for charts:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            // Get payment data
            db.all(
                `SELECT 
                    ${groupBy} as period,
                    COUNT(*) as payments,
                    SUM(amount) as revenue
                 FROM payments 
                 WHERE status = 'success' AND ${dateFilter.replace('check_in_time', 'payment_date')}
                 GROUP BY ${groupBy}
                 ORDER BY period DESC`,
                (err, paymentData) => {
                    if (err) {
                        console.error('Error fetching paymentData for charts:', err);
                        return res.status(500).json({ message: 'Database error' });
                    }

                    res.json({
                        attendance: attendanceData,
                        payments: paymentData
                    });
                }
            );
        }
    );
};

// Get notifications
const getNotifications = (req, res) => {
    const { userId } = req.user;

    db.all(
        `SELECT * FROM notifications 
         WHERE user_id = ? OR user_id IS NULL
         ORDER BY created_at DESC 
         LIMIT 10`,
        [userId],
        (err, notifications) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ notifications });
        }
    );
};

// Mark notification as read
const markNotificationRead = (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;

    db.run(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [id, userId],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Notification not found' });
            }

            res.json({ message: 'Notification marked as read' });
        }
    );
};

module.exports = {
    getAdminDashboard,
    getEmployeeDashboard,
    getMemberDashboard,
    getDashboardCharts,
    getNotifications,
    markNotificationRead
};
