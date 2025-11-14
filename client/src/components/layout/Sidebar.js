import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Calendar, 
  CreditCard, 
  Settings,
  FileText,
  Dumbbell,
  BarChart3,
  Package
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const adminNavItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Employees', href: '/employees', icon: UserCheck },
    { name: 'Plans', href: '/plans', icon: Package },
    { name: 'Services', href: '/services', icon: Settings },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Attendance', href: '/attendance', icon: Calendar },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Scheduling', href: '/scheduling', icon: Calendar },
  ];

  const employeeNavItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Attendance', href: '/attendance', icon: Calendar },
  ];

  const memberNavItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Book Classes', href: '/scheduling', icon: Calendar },
    { name: 'Plans', href: '/plans', icon: Package },
  ];

  const getNavItems = () => {
    switch (user?.role) {
      case 'admin':
        return adminNavItems;
      case 'employee':
        return employeeNavItems;
      case 'member':
        return memberNavItems;
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50">
      <div className="flex flex-col flex-grow bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700 pt-6 pb-4 overflow-y-auto shadow-xl">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6 mb-8 animate-bounce-in">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-3 rounded-2xl shadow-lg animate-glow">
            <Dumbbell className="h-7 w-7 text-white" />
          </div>
          <div className="ml-4">
            <h1 className="text-2xl font-black bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              IronForge
            </h1>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              💪 Gym Management
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 animate-slide-in-left ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                }`}
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 transition-all duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'
                  }`}
                />
                <span className="font-semibold">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-6 animate-slide-up">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-white">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {user?.username}
              </p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">
                {user?.role === 'admin' && '👑 Admin'}
                {user?.role === 'employee' && '👨‍💼 Employee'}
                {user?.role === 'member' && '🏋️ Member'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
