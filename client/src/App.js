import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/admin/Dashboard';
import EmployeeDashboard from './pages/employee/Dashboard';
import MemberDashboard from './pages/member/Dashboard';
import MemberPlans from './pages/member/Plans';
import Members from './pages/admin/Members';
import AddMember from './pages/admin/AddMember';
import MemberDetail from './pages/admin/MemberDetail';
import EditMember from './pages/admin/EditMember';
import Employees from './pages/admin/Employees';
import AddEmployee from './pages/admin/AddEmployee';
import Plans from './pages/admin/Plans';
import Services from './pages/admin/Services';
import Payments from './pages/admin/Payments';
import Attendance from './pages/admin/Attendance';
import Reports from './pages/admin/Reports';
import AdminScheduling from './pages/admin/Scheduling';
import MemberScheduling from './pages/member/Scheduling';
import Profile from './pages/Profile';
import TwoFactorAuth from './pages/TwoFactorAuth';

import Test from './pages/Test';

// (no-op) loading component removed to restore original behavior

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Role-based routing
const RoleBasedRoutes = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return (
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/members/new" element={<AddMember />} />
          <Route path="/members/:id" element={<MemberDetail />} />
          <Route path="/members/:id/edit" element={<EditMember />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/new" element={<AddEmployee />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/services" element={<Services />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/scheduling" element={<AdminScheduling />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/2fa" element={<TwoFactorAuth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      );
    case 'employee':
      return (
        <Routes>
          <Route path="/" element={<EmployeeDashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/2fa" element={<TwoFactorAuth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      );
    case 'member':
      return (
        <Routes>
          <Route path="/" element={<MemberDashboard />} />
          <Route path="/plans" element={<MemberPlans />} />
          <Route path="/scheduling" element={<MemberScheduling />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      );
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Routes>
              <Route path="/test" element={<Test />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/unauthorized" element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">403</h1>
                    <p className="text-gray-600 dark:text-gray-400">Access Denied</p>
                  </div>
                </div>
              } />
              <Route path="/*" element={
                <ProtectedRoute>
                  <RoleBasedRoutes />
                </ProtectedRoute>
              } />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
