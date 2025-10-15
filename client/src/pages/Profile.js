import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

const Profile = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Profile Settings
            </h1>
            <div className="card p-6">
              <p className="text-gray-600 dark:text-gray-400">
                Profile management will include:
                - Update personal information
                - Change password
                - Profile photo upload
                - Account settings
                - Notification preferences
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
