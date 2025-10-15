import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatsCard = ({ title, value, icon: Icon, color, change, changeType }) => {
  const colorConfigs = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      iconBg: 'bg-gradient-to-r from-blue-500 to-blue-600',
      iconColor: 'text-blue-600',
      changeBg: 'bg-blue-100 dark:bg-blue-900',
      changeText: 'text-blue-800 dark:text-blue-200'
    },
    green: {
      bg: 'from-green-500 to-green-600',
      iconBg: 'bg-gradient-to-r from-green-500 to-green-600',
      iconColor: 'text-green-600',
      changeBg: 'bg-green-100 dark:bg-green-900',
      changeText: 'text-green-800 dark:text-green-200'
    },
    purple: {
      bg: 'from-purple-500 to-purple-600',
      iconBg: 'bg-gradient-to-r from-purple-500 to-purple-600',
      iconColor: 'text-purple-600',
      changeBg: 'bg-purple-100 dark:bg-purple-900',
      changeText: 'text-purple-800 dark:text-purple-200'
    },
    yellow: {
      bg: 'from-yellow-500 to-yellow-600',
      iconBg: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
      iconColor: 'text-yellow-600',
      changeBg: 'bg-yellow-100 dark:bg-yellow-900',
      changeText: 'text-yellow-800 dark:text-yellow-200'
    },
    orange: {
      bg: 'from-orange-500 to-orange-600',
      iconBg: 'bg-gradient-to-r from-orange-500 to-orange-600',
      iconColor: 'text-orange-600',
      changeBg: 'bg-orange-100 dark:bg-orange-900',
      changeText: 'text-orange-800 dark:text-orange-200'
    },
    red: {
      bg: 'from-red-500 to-red-600',
      iconBg: 'bg-gradient-to-r from-red-500 to-red-600',
      iconColor: 'text-red-600',
      changeBg: 'bg-red-100 dark:bg-red-900',
      changeText: 'text-red-800 dark:text-red-200'
    },
  };

  const config = colorConfigs[color] || colorConfigs.blue;

  const isNeutral = changeType === 'neutral';

  return (
    <div className="card-gradient p-6 group hover:scale-105 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`${config.iconBg} p-4 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300`}>
            <Icon className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">
              {value}
            </p>
          </div>
        </div>
        {typeof change !== 'undefined' && (
          <div className={`px-3 py-2 rounded-full flex items-center space-x-1 ${
            isNeutral ? 'bg-gray-200 dark:bg-gray-700' : config.changeBg
          }`}>
            {isNeutral ? null : (
              changeType === 'positive' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )
            )}
            <span className={`text-sm font-bold ${
              isNeutral
                ? 'text-gray-800 dark:text-gray-200'
                : changeType === 'positive'
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              {change}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
