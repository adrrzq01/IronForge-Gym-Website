import React from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';

const Attendance = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Attendance Management
            </h1>
            <div className="card p-6">
              <p className="text-gray-600 dark:text-gray-400">
                Attendance management will include:
                - Check-in/check-out with photo verification
                - Daily attendance reports
                - Member attendance history
                - Attendance analytics and trends
                - Face recognition for verification
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Attendance;
