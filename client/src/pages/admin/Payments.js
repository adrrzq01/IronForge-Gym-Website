import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ memberId: '', amount: '', paymentType: 'cash', paymentMethod: '', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments', { params: { page: 1, limit: 20 } });
      setPayments(data.payments || []);
    } catch (e) {
      toast.error('Failed to load payments');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments', {
        memberId: form.memberId,
        amount: form.amount,
        paymentType: form.paymentType,
        paymentMethod: form.paymentMethod,
        description: form.description,
        status: 'success'
      });
      toast.success('Payment recorded');
      setForm({ memberId: '', amount: '', paymentType: 'cash', paymentMethod: '', description: '' });
      load();
    } catch (e) {
      toast.error('Failed to record payment');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Payments Management</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h2 className="text-xl font-semibold mb-4">Record Payment</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input required value={form.memberId} onChange={e=>setForm({...form, memberId:e.target.value})} placeholder="Member ID" className="input" />
                  <input required value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} placeholder="Amount" className="input" />
                  <select value={form.paymentType} onChange={e=>setForm({...form, paymentType:e.target.value})} className="input">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="online">Online</option>
                  </select>
                  <input value={form.paymentMethod} onChange={e=>setForm({...form, paymentMethod:e.target.value})} placeholder="Payment Method" className="input" />
                  <input value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder="Description" className="input" />
                  <div className="flex items-center justify-end">
                    <button className="btn btn-primary" type="submit">Record</button>
                  </div>
                </form>
              </div>

              <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Payments</h2>
                {loading ? <p>Loading...</p> : (
                  <ul className="space-y-2">
                    {payments.map(p=> (
                      <li key={p.id} className="p-3 border rounded">{p.member_name || p.memberId} — ₹{p.amount} — {p.status}</li>
                    ))}
                    {payments.length===0 && <li className="text-gray-500">No payments yet</li>}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Payments;
