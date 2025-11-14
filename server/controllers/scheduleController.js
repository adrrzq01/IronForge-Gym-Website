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

// Get all available class schedules
const getSchedules = async (req, res) => {
    const { startDate, endDate } = req.query;

    // Corrected table name from class_schedules to schedule
    let query = `
        SELECT s.*, sv.name as service_name, e.name as trainer_name
        FROM class_schedules s
        JOIN services sv ON s.service_id = sv.id
        LEFT JOIN employees e ON s.trainer_id = e.id
        WHERE s.start_time > CURRENT_TIMESTAMP
    `;
    const params = [];

    if (startDate && endDate) {
        query += ' AND DATE(s.start_time) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    query += ' ORDER BY s.start_time ASC';

    try {
        const schedules = await dbAll(query, params);
        res.json({ schedules });
    } catch (error) {
        console.error("Error in getSchedules:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Create a new class schedule (Admin only)
const createSchedule = async (req, res) => {
    const { service_id, trainer_id, start_time, end_time, capacity } = req.body;

    try {
        const result = await dbRun(
            `INSERT INTO class_schedules (service_id, trainer_id, start_time, end_time, capacity)
             VALUES (?, ?, ?, ?, ?)`,
            [service_id, trainer_id, start_time, end_time, capacity]
        );
        res.status(201).json({ message: 'Schedule created', scheduleId: result.lastID });
    } catch (error) {
        console.error("Error in createSchedule:", error);
        res.status(500).json({ message: 'Error creating schedule' });
    }
};

// Book a spot in a class (Member only)
const bookSchedule = async (req, res) => {
    const { schedule_id } = req.body;
    const { userId } = req.user;

    try {
        const member = await dbGet('SELECT id FROM members WHERE user_id = ?', [userId]);
        if (!member) {
            return res.status(404).json({ message: 'Member profile not found for this user.' });
        }
        const memberId = member.id;

        // Use a transaction to ensure atomicity
        db.serialize(() => {
            (async () => {
                await dbRun('BEGIN TRANSACTION');
                // 1. Check capacity and existing booking
                const schedule = await dbGet('SELECT * FROM class_schedules WHERE id = ?', [schedule_id]);
                if (!schedule) {
                    await dbRun('ROLLBACK');
                    return res.status(404).json({ message: 'Schedule not found' });
                }
                if (schedule.booked_count >= schedule.capacity) {
                    await dbRun('ROLLBACK');
                    return res.status(400).json({ message: 'Class is full' });
                }

                // 2. Insert booking
                const bookingResult = await dbRun('INSERT INTO bookings (member_id, schedule_id) VALUES (?, ?)', [memberId, schedule_id]);

                // 3. Update booked_count
                await dbRun('UPDATE class_schedules SET booked_count = booked_count + 1 WHERE id = ?', [schedule_id]);

                await dbRun('COMMIT');
                res.status(201).json({ message: 'Booking successful', bookingId: bookingResult.lastID });
            })().catch(async (err) => {
                await dbRun('ROLLBACK');
                // Check for unique constraint error
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ message: 'You have already booked this class.' });
                }
                console.error("Error in bookSchedule transaction:", err);
                res.status(500).json({ message: 'Failed to book schedule' });
            });
        });
    } catch (error) {
        console.error("Error in bookSchedule:", error);
        res.status(500).json({ message: 'Server error during booking' });
    }
};

// Get a member's bookings
const getMemberBookings = async (req, res) => {
    const { userId } = req.user;

    try {
        const member = await dbGet('SELECT id FROM members WHERE user_id = ?', [userId]);
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        const bookings = await dbAll(`
            SELECT b.id as booking_id, b.status, sch.*, s.name as service_name, e.name as trainer_name
            FROM bookings b
            JOIN class_schedules sch ON b.schedule_id = sch.id
            JOIN services s ON sch.service_id = s.id
            LEFT JOIN employees e ON sch.trainer_id = e.id
            WHERE b.member_id = ?
            ORDER BY sch.start_time DESC
        `, [member.id]);

        res.json({ bookings });
    } catch (error) {
        console.error("Error in getMemberBookings:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

// Cancel a booking
const cancelBooking = async (req, res) => {
    const { booking_id } = req.params;
    const { userId } = req.user;

    try {
        const member = await dbGet('SELECT id FROM members WHERE user_id = ?', [userId]);
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        const booking = await dbGet('SELECT * FROM bookings WHERE id = ? AND member_id = ?', [booking_id, member.id]);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found or you do not have permission to cancel it.' });
        }

        db.serialize(() => {
            (async () => {
                await dbRun('BEGIN TRANSACTION');
                await dbRun('DELETE FROM bookings WHERE id = ?', [booking_id]);
                await dbRun('UPDATE class_schedules SET booked_count = booked_count - 1 WHERE id = ? AND booked_count > 0', [booking.schedule_id]);
                await dbRun('COMMIT');
                res.json({ message: 'Booking cancelled' });
            })().catch(async (err) => {
                await dbRun('ROLLBACK');
                console.error("Error in cancelBooking transaction:", err);
                res.status(500).json({ message: 'Failed to cancel booking' });
            });
        });

    } catch (error) {
        console.error("Error in cancelBooking:", error);
        res.status(500).json({ message: 'Server error during cancellation' });
    }
};

// Get available trainers (employees with 'trainer' in their position)
const getTrainers = async (req, res) => {
    try {
        const trainers = await dbAll(`
            SELECT id, name, position FROM employees 
            WHERE position LIKE '%trainer%' AND is_active = 1
        `);
        res.json({ trainers: trainers || [] });
    } catch (error) {
        console.error("Error in getTrainers:", error);
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    getSchedules,
    createSchedule,
    bookSchedule,
    getMemberBookings,
    cancelBooking,
    getTrainers
};