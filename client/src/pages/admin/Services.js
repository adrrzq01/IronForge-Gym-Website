import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import axios from 'axios';
import toast from 'react-hot-toast';

// Simple admin services listing + create

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', description: '', duration_minutes: 60 });

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    try {
      const { data } = await axios.get('/api/services');
      setServices(data.services || data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load services');
      setServices([]);
    }
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const createService = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/services', form);
      toast.success('Service created');
      setForm({ name: '', price: '', description: '', duration_minutes: 60 });
      setShowForm(false);
      loadServices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create service');
    } finally { setLoading(false); }
  };

  const deleteService = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await axios.delete(`/api/services/${id}`);
      toast.success('Service deleted');
      loadServices();
    } catch (e) {
      toast.error('Failed to delete service');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Services Management</h1>
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Services</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowForm(s => !s)} className="btn btn-primary btn-md">{showForm ? 'Close' : 'Add Service'}</button>
                </div>
              </div>

              {showForm && (
                <form onSubmit={createService} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <input name="name" placeholder="Service name" className="input" required value={form.name} onChange={handleChange} />
                  <input name="price" type="number" step="0.01" placeholder="Price" className="input" required value={form.price} onChange={handleChange} />
                  <input name="duration_minutes" type="number" placeholder="Duration (minutes)" className="input" value={form.duration_minutes} onChange={handleChange} />
                  <textarea name="description" placeholder="Description" className="input md:col-span-2" value={form.description} onChange={handleChange} />
                  <div className="md:col-span-2 text-right">
                    <button disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : 'Save Service'}</button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {services.length === 0 && (
                  <div className="col-span-1 md:col-span-3 text-center py-8">
                    <p className="text-gray-700 dark:text-gray-300 font-semibold">No services yet</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Click "Add Service" to create a service.</p>
                  </div>
                )}

                {services.map(s => (
                  <div key={s.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800">
                    <h3 className="font-semibold text-lg">{s.name}</h3>
                    <p className="text-sm text-gray-500">{s.description}</p>
                    <p className="mt-2 font-semibold">₹{Number(s.price).toLocaleString()} • {s.duration_minutes || '-'} min</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => deleteService(s.id)} className="btn btn-secondary btn-sm">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Services;
