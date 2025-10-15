import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Bell, Sun, Moon, LogOut, User } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <header className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              type="button"
              className="bg-white dark:bg-gray-800 p-3 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <span className="sr-only">Open sidebar</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </button>
          </div>

          {/* Page title - hidden on mobile */}
          <div className="hidden lg:block animate-slide-in-left">
            <h1 className="text-2xl font-black bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              🏋️ IronForge Gym Management
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              Where fitness meets excellence
            </p>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-3 animate-slide-in-right">
            {/* Theme toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-3 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
            >
              <span className="sr-only">Toggle theme</span>
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            <button className="relative p-3 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110">
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">3</span>
              </span>
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-2 rounded-xl shadow-lg">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-sm font-bold text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
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

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-3 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
