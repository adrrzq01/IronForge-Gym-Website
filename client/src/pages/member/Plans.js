import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import axios from 'axios';
import toast from 'react-hot-toast';

const MemberPlans = () => {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/api/plans');
        setPlans(data.plans || data || []);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load plans');
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Available Plans</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.length === 0 && (
                <div className="col-span-1 md:col-span-3 text-center py-8">
                  <p className="text-gray-700 dark:text-gray-300">No plans available.</p>
                </div>
              )}

              {plans.map(p => (
                <div key={p.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800">
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <p className="text-sm text-gray-500">{p.description}</p>
                  <p className="mt-2 font-semibold">₹{Number(p.price).toLocaleString()} • {p.duration_months} month(s)</p>
                  <p className="text-sm text-gray-600 mt-1">{p.services_included}</p>
                  <div className="mt-3">
                    <button className="btn btn-primary btn-sm">Join / Purchase</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MemberPlans;
