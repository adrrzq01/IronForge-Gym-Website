import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const Scheduling = () => {
    const [schedules, setSchedules] = useState([]); // Initialize with an empty array
    const [myBookings, setMyBookings] = useState([]); // Initialize with an empty array
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [schedulesRes, bookingsRes] = await Promise.all([
                api.get('/schedule'),
                api.get('/schedule/my-bookings')
            ]);
            setSchedules(schedulesRes.data.schedules || []);
            setMyBookings(bookingsRes.data.bookings || []);
        } catch (error) {
            toast.error('Failed to load schedule data.');
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async (scheduleId) => {
        try {
            await api.post('/schedule/book', { schedule_id: scheduleId });
            toast.success('Class booked successfully!');
            fetchData(); // Refresh all data
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to book class.');
        }
    };

    const handleCancel = async (bookingId) => {
        try {
            await api.delete(`/schedule/bookings/${bookingId}`);
            toast.success('Booking cancelled.');
            fetchData(); // Refresh all data
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to cancel booking.');
        }
    };

    const isBooked = (scheduleId) => {
        return myBookings.some(b => b.schedule_id === scheduleId && b.status === 'confirmed');
    };

    // === Defensive mapping + diagnostics ===
    const safeSchedules = Array.isArray(schedules) ? schedules : [];

    // Find any bad entries and log them for debugging
    const badIndexes = [];
    safeSchedules.forEach((row, i) => {
      if (!row) badIndexes.push({ index: i, row });
      else if (typeof row !== 'object') badIndexes.push({ index: i, row });
      // flag rows missing start_time (common cause)
      else if (row.start_time == null && row.startTime == null && !(row.sch && row.sch.start_time)) {
        badIndexes.push({ index: i, reason: 'missing start_time', row });
      }
    });

    if (badIndexes.length) {
      console.warn('SCHEDULE DEBUG: found bad schedule rows ->', badIndexes);
      // Optionally, send to server or break into console.table for clarity
      console.table(badIndexes.map(b => ({ index: b.index, sample: JSON.stringify(b.row).slice(0,200), reason: b.reason || 'invalid' })));
    }

    // Render using filtered, normalized list
    const cleanedSchedules = safeSchedules
      .map((row, i) => {
        if (!row || typeof row !== 'object') return null;
        // Normalize known variants into a single shape
        const normalized = {
          id: row.id ?? row.schedule_id ?? row.booking_id ?? i,
          start_time: row.start_time ?? row.startTime ?? row?.sch?.start_time ?? null,
          end_time: row.end_time ?? row.endTime ?? row?.sch?.end_time ?? null,
          service_name: row.service_name ?? row.service ?? row?.service?.name ?? 'Unknown service',
          trainer_name: row.trainer_name ?? row.trainer ?? row?.trainer?.name ?? 'Gym Staff',
          booked_count: Number(row.booked_count ?? row.bookedCount ?? 0),
          capacity: Number(row.capacity ?? 0),
          raw: row
        };
        return normalized;
      })
      .filter(Boolean); // remove nulls

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <div className="lg:pl-64">
                <Header />
                <main className="py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Class Schedule & Bookings</h1>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Available Classes */}
                            <div className="card p-6">
                                <h2 className="text-xl font-semibold mb-4">Available Classes</h2>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {loading ? <p>Loading...</p> : 
                                     cleanedSchedules.length === 0 ? (
                                        <p>No classes available.</p>
                                      ) : (
                                        cleanedSchedules.map(s => (
                                            <div key={s.id} className="p-3 border rounded-lg dark:border-gray-700">
                                                <p className="font-bold">{s.service_name}</p>
                                                <p className="text-sm">with {s.trainer_name || 'Gym Staff'}</p>
                                                <p className="text-sm">{s.start_time ? new Date(s.start_time).toLocaleString() : 'N/A'}</p>
                                                <p className="text-sm">{s.booked_count} / {s.capacity} booked</p>
                                                <button 
                                                    onClick={() => handleBook(s.id)}
                                                    disabled={isBooked(s.id) || s.booked_count >= s.capacity}
                                                    className="btn btn-primary btn-sm mt-2 disabled:bg-gray-400"
                                                >
                                                    {isBooked(s.id) ? 'Booked' : (s.booked_count >= s.capacity ? 'Full' : 'Book Now')}
                                                </button>
                                            </div>
                                        ))
                                     )
                                    }</div>
                            </div>

                            {/* My Bookings */}
                            <div className="card p-6">
                                <h2 className="text-xl font-semibold mb-4">My Bookings</h2>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {loading ? (
                                        <p>Loading...</p>
                                    ) : (
                                        (myBookings || []).map(b => (
                                            <div key={b.booking_id} className="p-3 border rounded-lg dark:border-gray-700">
                                                <p className="font-bold">{b.service_name}</p>
                                                <p className="text-sm">with {b.trainer_name || 'Gym Staff'}</p>
                                                <p className="text-sm">{b.start_time ? new Date(b.start_time).toLocaleString() : 'N/A'}</p>
                                                {b.status === 'confirmed' ? (
                                                    <button onClick={() => handleCancel(b.booking_id)} className="btn btn-secondary btn-sm mt-2">
                                                        Cancel Booking
                                                    </button>
                                                ) : (
                                                    <p className="text-sm text-red-500 mt-2">Cancelled</p>
                                                )}
                                            </div>
                                        ))
                                    )}
                                    {(myBookings || []).length === 0 && !loading && <p>You have no upcoming bookings.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Scheduling;
