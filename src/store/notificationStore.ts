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

/* Admin-published global announcements have no per-user rows, so read
   and dismissed state lives in this browser's localStorage. */
const GLOBAL_NOTIF_STATE_KEY = 'skinify_global_notif_state';

const readGlobalState = (): { read: string[]; dismissed: string[] } => {
  try {
    const raw = JSON.parse(localStorage.getItem(GLOBAL_NOTIF_STATE_KEY) || '{}');
    return { read: raw.read || [], dismissed: raw.dismissed || [] };
  } catch {
    return { read: [], dismissed: [] };
  }
};

const writeGlobalState = (patch: Partial<{ read: string[]; dismissed: string[] }>) => {
  try {
    localStorage.setItem(
      GLOBAL_NOTIF_STATE_KEY,
      JSON.stringify({ ...readGlobalState(), ...patch }),
    );
  } catch {
    /* private mode */
  }
};

const isGlobalId = (id: string) => id.startsWith('global-');

/* Active global_notifications, mapped into the store's Notification
   shape. Anon SELECT is allowed by RLS so this is a plain REST read. */
const fetchGlobalNotifications = async (): Promise<Notification[]> => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
    const now = new Date().toISOString();
    const params =
      `is_active=eq.true&starts_at=lte.${now}&or=(ends_at.is.null,ends_at.gte.${now})` +
      `&order=created_at.desc&limit=20`;
    const res = await fetch(`${supabaseUrl}/rest/v1/global_notifications?${params}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    if (!res.ok) return [];
    const rows = await res.json();
    const state = readGlobalState();
    return (rows || [])
      .filter((row: any) => !state.dismissed.includes(`global-${row.id}`))
      .map((row: any) => ({
        id: `global-${row.id}`,
        type: (['info', 'success', 'warning', 'error'].includes(row.type) ? row.type : 'info') as Notification['type'],
        title: row.title,
        message: row.message,
        timestamp: row.starts_at || row.created_at,
        read: state.read.includes(`global-${row.id}`),
        metadata: {
          global: true,
          link_url: row.link_url || undefined,
          link_label: row.link_label || undefined,
        },
      }));
  } catch {
    return [];
  }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async (steamId: string) => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const [response, globalNotifs] = await Promise.all([
        fetch(`${supabaseUrl}/functions/v1/notifications?steam_id=${steamId}`, {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          }
        }),
        fetchGlobalNotifications(),
      ]);

      if (response.ok) {
        const data = await response.json();
        /* Rows from user_notifications carry `created_at`; the UI
           reads `timestamp` — without this mapping every personal
           notification rendered "Invalid Date". Also surface the row's
           action_url through metadata so the link button renders. */
        const personal: Notification[] = (data.notifications || []).map((n: any) => ({
          ...n,
          id: String(n.id),
          timestamp: n.timestamp || n.created_at || new Date().toISOString(),
          metadata: {
            ...(n.metadata || {}),
            action_url: n.metadata?.action_url || n.action_url || undefined,
          },
        }));
        const merged = [...globalNotifs, ...personal];
        set({
          notifications: merged,
          unreadCount: (data.unread_count || 0) + globalNotifs.filter((n) => !n.read).length
        });
      } else {
        set({
          notifications: globalNotifs,
          unreadCount: globalNotifs.filter((n) => !n.read).length
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
  
  markAsRead: (notificationId) => set((state) => {
    if (isGlobalId(notificationId)) {
      const gs = readGlobalState();
      if (!gs.read.includes(notificationId)) {
        writeGlobalState({ read: [...gs.read, notificationId] });
      }
    }
    return {
      notifications: state.notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    };
  }),
  
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

    /* Global announcements have no per-user DB row — dismissing is a
       local action remembered in this browser. */
    if (isGlobalId(notificationId)) {
      const gs = readGlobalState();
      writeGlobalState({
        dismissed: [...gs.dismissed, notificationId],
        read: gs.read.includes(notificationId) ? gs.read : [...gs.read, notificationId],
      });
      return;
    }

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
    
    // Dismiss globals locally so they don't reappear on next fetch
    const globalIds = get().notifications.filter(n => isGlobalId(n.id)).map(n => n.id);
    if (globalIds.length > 0) {
      const gs = readGlobalState();
      writeGlobalState({ dismissed: Array.from(new Set([...gs.dismissed, ...globalIds])) });
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
    const globalIds = state.notifications.filter(n => isGlobalId(n.id)).map(n => n.id);
    if (globalIds.length > 0) {
      const gs = readGlobalState();
      writeGlobalState({ read: Array.from(new Set([...gs.read, ...globalIds])) });
    }
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