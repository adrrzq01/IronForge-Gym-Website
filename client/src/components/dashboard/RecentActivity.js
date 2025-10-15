import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, User, CreditCard, Calendar } from 'lucide-react';

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActivities([]);
    setLoading(false);
  }, []);

  const fetchRecentActivity = async () => {
    // Placeholder: integrate with /api/dashboard/notifications later
    setActivities([]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center space-x-3">
          <div className={`flex-shrink-0 ${activity.color}`}>
            <activity.icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {activity.message}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activity.time}
            </p>
          </div>
        </div>
      ))}
      
      {activities.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No recent activity yet</p>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
