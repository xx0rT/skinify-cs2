import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'trade' | 'price_alert' | 'trade_offer_received' | 'trade_offer_accepted' | 'trade_offer_cancelled' | 'trade_completed';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  trade_offer_id?: string;
  metadata?: Record<string, any>;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: (steamId: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  fetchNotifications: async (steamId: string) => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/notifications?steam_id=${steamId}`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        set({
          notifications: data.notifications || [],
          unreadCount: data.unread_count || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  },

  addNotification: (notification) => set((state) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false
    };
    
    return {
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    };
  }),
  
  markAsRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map(notification =>
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    ),
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(notification => ({
      ...notification,
      read: true
    })),
    unreadCount: 0
  })),
  
  removeNotification: async (notificationId) => {
    const state = get();
    const notification = state.notifications.find(n => n.id === notificationId);
    const wasUnread = notification && !notification.read;
    
    // Remove from local state immediately
    set({
      notifications: state.notifications.filter(n => n.id !== notificationId),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    });
    
    // Delete from database
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/notifications?id=${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error('Failed to delete notification from database');
        // Don't re-add to local state on failure, just log the error
      } else {
        console.log('Notification deleted from database:', notificationId);
      }
    } catch (error) {
      console.error('Error deleting notification from database:', error);
      // Don't re-add to local state on failure, just log the error
    }
  },
  
  clearAll: async () => {
    const currentUser = localStorage.getItem('auth-storage') 
      ? JSON.parse(localStorage.getItem('auth-storage')!).state?.user?.steamId 
      : null;
      
    if (!currentUser) {
      console.error('No user found for clearing notifications');
      return;
    }
    
    // Clear local state immediately
    set({
      notifications: [],
      unreadCount: 0
    });
    
    // Clear from database
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/notifications?steam_id=${currentUser}&action=clear_all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        console.log('All notifications cleared from database');
      } else {
        console.error('Failed to clear notifications from database');
      }
    } catch (error) {
      console.error('Error clearing notifications from database:', error);
    }
  }
}));

// Add markAllAsRead as async function that works with backend
const originalStore = useNotificationStore.getState();
useNotificationStore.setState({
  ...originalStore,
  markAllAsRead: async () => {
    const currentUser = localStorage.getItem('auth-storage') 
      ? JSON.parse(localStorage.getItem('auth-storage')!).state?.user?.steamId 
      : null;
      
    if (!currentUser) {
      console.error('No user found for marking notifications as read');
      return;
    }
    
    // Update local state immediately
    const state = useNotificationStore.getState();
    useNotificationStore.setState({
      notifications: state.notifications.map(notification => ({
        ...notification,
        read: true
      })),
      unreadCount: 0
    });
    
    // Update database
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/notifications?steam_id=${currentUser}&action=mark_all_read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        console.log('All notifications marked as read in database');
      } else {
        console.error('Failed to mark all notifications as read in database');
      }
    } catch (error) {
      console.error('Error marking all notifications as read in database:', error);
    }
  }
});