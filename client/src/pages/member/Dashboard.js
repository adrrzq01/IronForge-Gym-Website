import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import StatsCard from '../../components/dashboard/StatsCard';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Dumbbell, Calendar, Wallet, Award, AlertTriangle, CheckCircle } from 'lucide-react';

const MemberDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data } = await api.get('/dashboard/member');
        setDashboardData(data);
      } catch (error) {
        toast.error('Failed to load dashboard data.');
        console.error('Error fetching member dashboard data:', error);
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

  const { member, attendance, recentPayments, assignedServices } = dashboardData || {};

  const getPaymentStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return { icon: Award, color: 'green' };
      case 'pending':
        return { icon: Wallet, color: 'yellow' };
      case 'overdue':
        return { icon: AlertTriangle, color: 'red' };
      default:
        return { icon: Wallet, color: 'blue' };
    }
  };

  const statsCards = [
    {
      title: 'Current Plan',
      value: member?.plan_name || 'N/A',
      icon: Dumbbell,
      color: 'blue',
    },
    {
      title: 'Payment Status',
      value: member?.payment_status ? member.payment_status.charAt(0).toUpperCase() + member.payment_status.slice(1) : 'N/A',
      icon: getPaymentStatusIcon(member?.payment_status).icon,
      color: getPaymentStatusIcon(member?.payment_status).color,
    },
    {
      title: 'Total Visits',
      value: attendance?.total_visits || 0,
      icon: Calendar,
      color: 'purple',
    },
    {
      title: 'Services Active',
      value: assignedServices?.length || 0,
      icon: CheckCircle,
      color: 'green',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 animate-slide-up">
              <h1 className="text-4xl font-black bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                Welcome, {user?.username}!
              </h1>
              <p className="mt-2 text-lg font-medium text-gray-600 dark:text-gray-300">
                Here's your fitness journey at a glance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {statsCards.map((stat, index) => (
                <div key={index} className="animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
                  <StatsCard {...stat} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card-gradient p-6 animate-slide-in-left">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Dumbbell className="mr-2" /> Assigned Services
                </h3>
                <div className="space-y-3">
                  {assignedServices && assignedServices.length > 0 ? (
                    assignedServices.map(service => (
                      <div key={service.id} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{service.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{service.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No services assigned.</p>
                  )}
                </div>
              </div>

              <div className="card-gradient p-6 animate-slide-in-right">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Wallet className="mr-2" /> Recent Payments
                </h3>
                <div className="space-y-3">
                  {recentPayments && recentPayments.length > 0 ? (
                    recentPayments.map(payment => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">
                            ₹{payment.amount}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No recent payments.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MemberDashboard;
