import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Eye, EyeOff, Sun, Moon, Dumbbell } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login, user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [apiHealth, setApiHealth] = useState(null);
  const apiBase = (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/i, '') || '/api';

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    // quick health check for deployed environments
    const check = async () => {
      try {
        const res = await fetch(`${apiBase}/health`);
        if (res.ok) {
          setApiHealth('ok');
        } else {
          setApiHealth('bad');
        }
      } catch (e) {
        setApiHealth('down');
      }
    };
    check();
  }, [apiBase]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result === true) {
      navigate('/');
    } else {
      // Keep on the login page and show an inline error or toast is already shown by context
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center animate-bounce-in">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 rounded-2xl shadow-2xl animate-glow">
              <Dumbbell className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-black bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
            IronForge Gym
          </h2>
          <p className="mt-3 text-lg font-medium text-gray-600 dark:text-gray-300">
            Welcome back! Sign in to continue your fitness journey
          </p>
        </div>

        {/* Theme Toggle */}
        <div className="flex justify-end animate-slide-in-right">
          <button
            onClick={toggleDarkMode}
            className="p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6 animate-slide-up" onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="animate-slide-in-left">
              <label htmlFor="email" className="label">
                📧 Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input mt-2"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="animate-slide-in-right">
              <label htmlFor="password" className="label">
                🔒 Password
              </label>
              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input pr-12"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-r-lg transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="animate-bounce-in">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  <span className="font-semibold">Signing you in...</span>
                </div>
              ) : (
                <span className="font-semibold">🚀 Sign In to IronForge</span>
              )}
            </button>
          </div>

          <div className="text-center animate-fade-in">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              New to IronForge?{' '}
              <Link
                to="/register"
                className="font-semibold text-primary-600 hover:text-primary-500 transition-colors duration-200"
              >
                Create your account
              </Link>
            </p>
          </div>

          {/* Demo Credentials - development only */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-blue-200 dark:border-gray-600 animate-slide-up">
              {/* Debug banner */}
              <div className="mb-4 p-3 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200">
                API: <span className="font-mono">{apiBase}</span> — Health: <span className="font-semibold">{apiHealth || 'checking...'}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                🎯 Quick Access Demo Accounts
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">👑 Admin</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Full system access</p>
                  </div>
                  <code className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">admin@ironforge.com</code>
                </div>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">👨‍💼 Employee</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Member management</p>
                  </div>
                  <code className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">employee@ironforge.com</code>
                </div>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">🏋️ Member</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Personal dashboard</p>
                  </div>
                  <code className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">member@ironforge.com</code>
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                  Password for all accounts: <span className="font-mono font-semibold">password123</span>
                </p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
