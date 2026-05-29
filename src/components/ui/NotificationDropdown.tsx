import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle, AlertTriangle, Info, TrendingUp, ShoppingCart, Star, Trash2, BookMarked as MarkAsRead } from 'lucide-react';
import { useNotificationStore, Notification } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';

const NotificationDropdown: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications,
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAll 
  } = useNotificationStore();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications when user is available
  React.useEffect(() => {
    if (user && isOpen) {
      fetchNotifications(user.steamId);
    }
  }, [user, isOpen, fetchNotifications]);

  // Close dropdown on window scroll (but not internal dropdown scroll)
  React.useEffect(() => {
    if (!isOpen) return;

    const handleScroll = (event: Event) => {
      // Only close if scrolling outside the dropdown
      const dropdown = document.getElementById('notification-dropdown');
      if (dropdown && event.target instanceof Node && !dropdown.contains(event.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'trade':
        return <ShoppingCart className="w-5 h-5 text-blue-400" />;
      case 'price_alert':
        return <TrendingUp className="w-5 h-5 text-purple-400" />;
      case 'order':
        return <ShoppingCart className="w-5 h-5 text-green-400" />;
      default:
        return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const getNotificationBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      case 'trade':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'price_alert':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'order':
        return 'bg-green-500/10 border-green-500/20';
      default:
        return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    
    // Validate timestamp
    if (isNaN(time.getTime())) {
      return 'Unknown time';
    }
    
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    }
    
    const days = Math.floor(diffInMinutes / 1440);
    if (days === 1) return '1d ago';
    if (days < 7) return `${days}d ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return '1w ago';
    if (weeks < 4) return `${weeks}w ago`;
    
    const months = Math.floor(days / 30);
    if (months === 1) return '1mo ago';
    return `${months}mo ago`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.action) {
      notification.action.onClick();
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-2 text-gray-300 hover:text-white rounded-full hover:bg-gray-700/50 transition-all duration-300"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              id="notification-dropdown"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-96 bg-gray-800 rounded-xl border border-gray-700/50 shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-700/50 bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </h3>
                  <div className="flex space-x-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                        title="Mark all as read"
                      >
                        <MarkAsRead size={16} />
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-red-400 hover:text-red-300 text-xs transition-colors"
                        title="Clear all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {notifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`relative p-4 rounded-lg mb-2 cursor-pointer transition-all duration-300 border ${
                          notification.read 
                            ? 'bg-gray-700/30 border-gray-600/30 hover:bg-gray-700/50' 
                            : `${getNotificationBgColor(notification.type)} hover:opacity-80`
                        } group`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`font-medium text-sm ${
                                notification.read ? 'text-gray-300' : 'text-white'
                              }`}>
                                {notification.title}
                              </h4>
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                            </div>
                            
                            <p className={`text-sm ${
                              notification.read ? 'text-gray-400' : 'text-gray-200'
                            }`}>
                              {notification.message}
                            </p>
                            
                            {notification.action && (
                              <button className="text-blue-400 hover:text-blue-300 text-xs mt-2 transition-colors">
                                {notification.action.label}
                              </button>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all duration-200 p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        {!notification.read && (
                          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;