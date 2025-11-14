import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import StatsCard from '../../components/dashboard/StatsCard';
import DataTable from '../../components/common/DataTable';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Users, Calendar, Clock } from 'lucide-react';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data } = await api.get('/dashboard/employee');
        setDashboardData(data);
      } catch (error) {
        toast.error('Failed to load dashboard data.');
        console.error('Error fetching employee dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const { employee, stats, upcomingSchedules } = dashboardData || {};

  const statsCards = [
    {
      title: 'Today\'s Check-ins',
      value: stats?.todayCheckins || 0,
      icon: Calendar,
      color: 'blue',
    },
    {
      title: 'Assigned Members',
      value: stats?.assignedMembers || 'N/A',
      icon: Users,
      color: 'green',
    },
    {
      title: 'Your Shift',
      value: `${employee?.shift_start || 'N/A'} - ${employee?.shift_end || 'N/A'}`,
      icon: Clock,
      color: 'purple',
    },
  ];

  const scheduleColumns = [
    { header: 'Class', render: (row) => row.service_name },
    { header: 'Trainer', render: (row) => row.trainer_name || 'N/A' },
    { header: 'Time', render: (row) => row.start_time ? new Date(row.start_time).toLocaleString() : 'N/A' },
    { header: 'Booked', render: (row) => `${row.booked_count} / ${row.capacity}` },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Welcome, {employee?.name || user?.username}!
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {statsCards.map((stat, index) => (
                <StatsCard key={index} {...stat} />
              ))}
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4">Upcoming Classes</h2>
              <DataTable
                columns={scheduleColumns}
                data={upcomingSchedules || []} // Use the correct property here
                emptyMessage="No upcoming classes."
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;