import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import StatsCard from '../../components/dashboard/StatsCard';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Chart from '../../components/dashboard/Chart';
import { 
  Users, 
  UserCheck, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardResponse, chartsResponse] = await Promise.all([
        axios.get('/api/dashboard/admin'),
        axios.get('/api/dashboard/charts?type=monthly')
      ]);

      setDashboardData(dashboardResponse.data.stats);
      setChartData(chartsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Members',
      value: dashboardData?.totalMembers || 0,
      icon: Users,
      color: 'blue',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Active Members',
      value: dashboardData?.activeMembers || 0,
      icon: UserCheck,
      color: 'green',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Today\'s Check-ins',
      value: dashboardData?.todayCheckins || 0,
      icon: Clock,
      color: 'purple',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Monthly Revenue',
      value: `$${dashboardData?.monthlyRevenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'yellow',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Pending Payments',
      value: dashboardData?.pendingPayments || 0,
      icon: AlertTriangle,
      color: 'orange',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Overdue Payments',
      value: dashboardData?.overduePayments || 0,
      icon: AlertTriangle,
      color: 'red',
      change: '0%',
      changeType: 'neutral'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Page Header */}
            <div className="mb-10 animate-slide-up">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-3 rounded-2xl shadow-lg">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome back, {user?.username}! 👋
                  </h1>
                  <p className="mt-2 text-lg font-medium text-gray-600 dark:text-gray-300">
                    Here's what's happening at IronForge Gym today. Let's make fitness happen! 💪
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
              {statsCards.map((stat, index) => (
                <div key={index} className="animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
                  <StatsCard {...stat} />
                </div>
              ))}
            </div>

            {/* Charts and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              {/* Attendance Chart */}
              <div className="card-gradient p-8 animate-slide-in-left">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-xl">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      📈 Attendance Trend
                    </h3>
                  </div>
                  <div />
                </div>
                <Chart 
                  data={chartData?.attendance || []} 
                  type="line"
                  dataKey="checkins"
                  color="#3b82f6"
                />
              </div>

              {/* Revenue Chart */}
              <div className="card-gradient p-8 animate-slide-in-right">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-xl">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      💰 Revenue Trend
                    </h3>
                  </div>
                  <div />
                </div>
                <Chart 
                  data={chartData?.payments || []} 
                  type="bar"
                  dataKey="revenue"
                  color="#10b981"
                />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card-gradient p-8 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-2 rounded-xl">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    🔥 Recent Activity
                  </h3>
                </div>
                <div />
              </div>
              <RecentActivity />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
