import React from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';

const MemberDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Member Dashboard
            </h1>
            <div className="card p-6">
              <p className="text-gray-600 dark:text-gray-400">
                Member dashboard will include:
                - Personal profile and plan details
                - Attendance record and statistics
                - Payment history and due dates
                - Assigned services and trainers
                - Check-in/check-out functionality
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MemberDashboard;
