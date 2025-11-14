import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import DataTable from '../../components/common/DataTable';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const Scheduling = () => {
    const [schedules, setSchedules] = useState([]);
    const [services, setServices] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        service_id: '',
        trainer_id: '',
        start_time: '',
        end_time: '',
        capacity: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [schedulesRes, servicesRes, trainersRes] = await Promise.all([
                api.get('/schedule'),
                api.get('/services'),
                api.get('/employees')
            ]);
            setSchedules(schedulesRes.data.schedules || []);
            setServices(servicesRes.data.services || []);
            setTrainers(trainersRes.data.employees || []);
        } catch (error) {
            toast.error('Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/schedule', form);
            toast.success('Schedule created successfully');
            setShowForm(false);
            fetchInitialData(); // Refresh schedules
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create schedule');
        }
    };

    const columns = [
        { key: 'service_name', title: 'Class/Service' },
        { key: 'trainer_name', title: 'Trainer' },
        { key: 'start_time', title: 'Starts', render: (row) => new Date(row.start_time).toLocaleString() },
        { key: 'end_time', title: 'Ends', render: (row) => new Date(row.end_time).toLocaleString() },
        { key: 'booked_count', title: 'Booked', render: (row) => `${row.booked_count} / ${row.capacity}` },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <div className="lg:pl-64">
                <Header />
                <main className="py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Scheduling</h1>
                            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                                {showForm ? 'Cancel' : 'Create Schedule'}
                            </button>
                        </div>

                        {showForm && (
                            <div className="card p-6 mb-6">
                                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <select name="service_id" value={form.service_id} onChange={handleChange} className="input" required>
                                        <option value="">Select Service</option>
                                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <select name="trainer_id" value={form.trainer_id} onChange={handleChange} className="input">
                                        <option value="">Select Trainer (Optional)</option>
                                        {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <input type="datetime-local" name="start_time" value={form.start_time} onChange={handleChange} className="input" required />
                                    <input type="datetime-local" name="end_time" value={form.end_time} onChange={handleChange} className="input" required />
                                    <input type="number" name="capacity" placeholder="Capacity" value={form.capacity} onChange={handleChange} className="input" required min="1" />
                                    <div className="md:col-span-2 flex justify-end">
                                        <button type="submit" className="btn btn-primary">Save Schedule</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="card p-6">
                            <h2 className="text-lg font-semibold mb-4">Upcoming Classes</h2>
                            <DataTable columns={columns} data={schedules} loading={loading} />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Scheduling;
