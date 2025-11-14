import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const MemberPlans = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/plans');
        setPlans(data.plans || []);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load plans');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePurchase = async (plan) => {
    try {
      // 1. Create a Razorpay order on the backend
      const { data: order } = await api.post('/payments/create-order', {
        amount: plan.price,
        planId: plan.id,
      });

      // 2. Configure Razorpay options
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_XXXXXXXXXXXXXX',
        amount: order.amount,
        currency: order.currency,
        name: 'IronForge Gym',
        description: `Payment for ${plan.name}`,
        order_id: order.id,
        handler: async function (response) {
          // 3. Verify the payment on the backend
          try {
            await api.post('/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan.id,
              amount: plan.price,
            });
            toast.success('Payment successful! Your plan is now active.');
            // Optionally, redirect or update UI
          } catch (verifyError) {
            toast.error('Payment verification failed.');
          }
        },
        prefill: {
          name: user?.username || '',
          email: user?.email || '',
        },
        theme: {
          color: '#3b82f6',
        },
      };

      // 4. Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      toast.error('Could not initiate payment.');
      console.error('Error creating Razorpay order:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Available Plans</h1>

            {loading ? (
              <p>Loading plans...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.length === 0 && (
                  <div className="col-span-1 md:col-span-3 text-center py-8">
                    <p className="text-gray-700 dark:text-gray-300">No plans available.</p>
                  </div>
                )}

                {plans.map(p => (
                  <div key={p.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800 flex flex-col">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg">{p.name}</h3>
                      <p className="text-sm text-gray-500">{p.description}</p>
                      <p className="mt-2 font-semibold">₹{Number(p.price).toLocaleString()} • {p.duration_months} month(s)</p>
                      <p className="text-sm text-gray-600 mt-1">{p.services_included}</p>
                    </div>
                    <div className="mt-3">
                      <button onClick={() => handlePurchase(p)} className="btn btn-primary btn-sm w-full">Join / Purchase</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MemberPlans;
