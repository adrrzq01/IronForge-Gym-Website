import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import axios from 'axios';
import toast from 'react-hot-toast';
import { DownloadCloud, FileSpreadsheet, Users, CreditCard, Activity } from 'lucide-react';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    pendingPayments: 0,
    overduePayments: 0,
    todayCheckins: 0,
    monthlyRevenue: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/dashboard/admin');
      setStats(response.data.stats);
    } catch (e) {
      console.error('Failed to load stats:', e);
      toast.error('Failed to load dashboard stats');
    }
  };

  const downloadReport = async (type, format) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/reports/${type}`, {
        params: { format },
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        // Handle CSV download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${type}-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // Handle JSON response
        console.log(`${type} data:`, response.data);
        toast.success('Report data loaded');
      }
    } catch (e) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Reports & Analytics
            </h1>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold">Members</h3>
                    <p className="text-2xl font-bold">{stats.totalMembers}</p>
                    <p className="text-sm text-gray-500">
                      {stats.activeMembers} active • {stats.pendingPayments + stats.overduePayments} pending
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                    <CreditCard className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold">Payments</h3>
                    <p className="text-2xl font-bold">₹{stats.monthlyRevenue?.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">
                      {stats.pendingPayments} pending • {stats.overduePayments} overdue
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                    <Activity className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold">Attendance</h3>
                    <p className="text-2xl font-bold">{stats.todayCheckins}</p>
                    <p className="text-sm text-gray-500">
                      Last 30 days activity
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Reports */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Reports</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4 dark:border-gray-700">
                  <div className="flex items-center mb-4">
                    <FileSpreadsheet className="h-5 w-5 text-blue-500 mr-2" />
                    <h3 className="font-semibold">Members Report</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Export member details including contact info, plan details, and status.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadReport('members', 'csv')}
                      disabled={loading}
                      className="btn btn-primary btn-sm"
                    >
                      <DownloadCloud className="h-4 w-4 mr-1" />
                      Export CSV
                    </button>
                    <button
                      onClick={() => downloadReport('members', 'json')}
                      disabled={loading}
                      className="btn btn-secondary btn-sm"
                    >
                      View Data
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg p-4 dark:border-gray-700">
                  <div className="flex items-center mb-4">
                    <FileSpreadsheet className="h-5 w-5 text-green-500 mr-2" />
                    <h3 className="font-semibold">Payments Report</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Export payment records including member details, amounts, and status.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadReport('payments', 'csv')}
                      disabled={loading}
                      className="btn btn-primary btn-sm"
                    >
                      <DownloadCloud className="h-4 w-4 mr-1" />
                      Export CSV
                    </button>
                    <button
                      onClick={() => downloadReport('payments', 'json')}
                      disabled={loading}
                      className="btn btn-secondary btn-sm"
                    >
                      View Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;
