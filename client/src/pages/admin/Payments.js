import React from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';

const Payments = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Payments Management
            </h1>
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payments</h2>
                <button className="btn btn-primary btn-md">Record Payment</button>
              </div>
              <div className="text-center py-16">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 flex items-center justify-center mb-4">
                  <span className="text-2xl text-white">💳</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-semibold">No payments yet</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Click "Record Payment" to add a payment.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Payments;
