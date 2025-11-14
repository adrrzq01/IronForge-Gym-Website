import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import axios from 'axios';
import toast from 'react-hot-toast';

// Simple admin plans listing + create

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', duration_months: 1, price: '', description: '', services_included: '' });

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    try {
      const { data } = await axios.get('/api/plans');
      setPlans(data.plans || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load plans');
      setPlans([]);
    }
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const createPlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/plans', form);
      toast.success('Plan created');
      setForm({ name: '', duration_months: 1, price: '', description: '', services_included: '' });
      setShowForm(false);
      loadPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create plan');
    } finally { setLoading(false); }
  };

  const deletePlan = async (id) => {
    if (!window.confirm('Delete this plan?')) return;
    try {
      await axios.delete(`/api/plans/${id}`);
      toast.success('Plan deleted');
      loadPlans();
    } catch (e) {
      toast.error('Failed to delete plan');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Plans Management</h1>
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Plans</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowForm(s => !s)} className="btn btn-primary btn-md">{showForm ? 'Close' : 'Create Plan'}</button>
                </div>
              </div>

              {showForm && (
                <form onSubmit={createPlan} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <input name="name" placeholder="Plan name" className="input" required value={form.name} onChange={handleChange} />
                  <input name="duration_months" type="number" min="1" placeholder="Duration (months)" className="input" required value={form.duration_months} onChange={handleChange} />
                  <input name="price" type="number" step="0.01" placeholder="Price" className="input" required value={form.price} onChange={handleChange} />
                  <input name="services_included" placeholder="Services included (comma separated)" className="input" value={form.services_included} onChange={handleChange} />
                  <textarea name="description" placeholder="Description" className="input md:col-span-2" value={form.description} onChange={handleChange} />
                  <div className="md:col-span-2 text-right">
                    <button disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : 'Save Plan'}</button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.length === 0 && (
                  <div className="col-span-1 md:col-span-3 text-center py-8">
                    <p className="text-gray-700 dark:text-gray-300 font-semibold">No plans yet</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Click "Create Plan" to add a plan.</p>
                  </div>
                )}

                {plans.map(p => (
                  <div key={p.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800">
                    <h3 className="font-semibold text-lg">{p.name}</h3>
                    <p className="text-sm text-gray-500">{p.description}</p>
                    <p className="mt-2 font-semibold">₹{Number(p.price).toLocaleString()} • {p.duration_months} month(s)</p>
                    <p className="text-sm text-gray-600 mt-1">{p.services_included}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => deletePlan(p.id)} className="btn btn-secondary btn-sm">Delete</button>
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

export default Plans;
