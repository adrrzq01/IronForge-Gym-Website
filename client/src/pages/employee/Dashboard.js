import React from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';

const EmployeeDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Employee Dashboard
            </h1>
            <div className="card p-6">
              <p className="text-gray-600 dark:text-gray-400">
                Employee dashboard will include:
                - Assigned members list
                - Today's check-ins
                - Member attendance tracking
                - Task management
                - Performance metrics
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
