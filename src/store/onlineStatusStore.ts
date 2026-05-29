import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { create } from 'zustand';

interface OnlineUser {
  steamId: string;
  lastSeen: string;
  status: 'online' | 'away' | 'offline';
}

interface OnlineStatusState {
  onlineUsers: { [steamId: string]: OnlineUser };
  currentUserStatus: 'online' | 'away' | 'offline';
  
  // Actions
  updateUserStatus: (steamId: string, status: 'online' | 'away' | 'offline') => void;
  setCurrentUserOnline: () => void;
  setCurrentUserAway: () => void;
  setCurrentUserOffline: () => void;
  getUserStatus: (steamId: string) => 'online' | 'away' | 'offline';
  sendHeartbeat: (steamId: string) => Promise<void>;
  startHeartbeat: (steamId: string) => () => void;
}

export const useOnlineStatusStore = create<OnlineStatusState>((set, get) => ({
  onlineUsers: {},
  currentUserStatus: 'online',

  updateUserStatus: (steamId: string, status: 'online' | 'away' | 'offline') => {
    set({
      onlineUsers: {
        ...get().onlineUsers,
        [steamId]: {
          steamId,
          lastSeen: new Date().toISOString(),
          status
        }
      }
    });
  },

  setCurrentUserOnline: () => set({ currentUserStatus: 'online' }),
  setCurrentUserAway: () => set({ currentUserStatus: 'away' }),
  setCurrentUserOffline: () => set({ currentUserStatus: 'offline' }),

  getUserStatus: (steamId: string) => {
    const user = get().onlineUsers[steamId];
    if (!user) return 'offline';
    
    const lastSeen = new Date(user.lastSeen);
    const now = new Date();
    const minutesAgo = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (minutesAgo < 2) return 'online';
    if (minutesAgo < 15) return 'away';
    return 'offline';
  },

  sendHeartbeat: async (steamId: string) => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      await fetch(`${supabaseUrl}/functions/v1/presence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          steam_id: steamId,
          status: get().currentUserStatus,
          timestamp: new Date().toISOString()
        })
      });
      
      // Update local status
      get().updateUserStatus(steamId, get().currentUserStatus);
      
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  },

  startHeartbeat: (steamId: string) => {
    // Send initial heartbeat
    get().sendHeartbeat(steamId);
    
    // Set up interval for heartbeat
    const interval = setInterval(() => {
      get().sendHeartbeat(steamId);
    }, 30000); // Send heartbeat every 30 seconds
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        get().setCurrentUserAway();
      } else {
        get().setCurrentUserOnline();
      }
      get().sendHeartbeat(steamId);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle beforeunload
    const handleBeforeUnload = () => {
      get().setCurrentUserOffline();
      // Send offline status (may not complete due to page unload)
      navigator.sendBeacon(`https://jtxqvctllitlhijfcsxg.supabase.co/functions/v1/presence`, 
        JSON.stringify({
          steam_id: steamId,
          status: 'offline',
          timestamp: new Date().toISOString()
        })
      );
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Return cleanup function
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      get().setCurrentUserOffline();
      get().sendHeartbeat(steamId);
    };
  }
}));