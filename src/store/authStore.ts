import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';

interface AuthState {
  user: {
    id?: string;
    steamId: string;
    displayName: string;
    avatarUrl: string;
    tradeLink?: string;
    referred_by?: string;
    referral_code?: string;
  } | null;
  isOwner: boolean;
  setUser: (user: AuthState['user']) => void;
  updateTradeLink: (tradeLink: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isOwner: false,
      setUser: (user) => set((state) => ({
        user,
        isOwner: user?.steamId === 'troxx-troxx' || user?.steamId === '76561198021723640' || user?.steamId === '76561198169902302'
      })),
      updateTradeLink: async (tradeLink: string) => {
        const { user } = useAuthStore.getState();
        if (!user) return false;
        
        try {
          console.log('=== TRADE LINK UPDATE ATTEMPT ===');
          console.log('User Steam ID:', user.steamId);
          console.log('Trade link to save:', tradeLink);
          
          const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
          
          const requestBody = {
            steam_id: user.steamId,
            trade_link: tradeLink
          };
          
          console.log('Request body:', requestBody);
          console.log('Request URL:', `${supabaseUrl}/functions/v1/user-profile`);
          
          const response = await fetch(`${supabaseUrl}/functions/v1/user-profile`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });
          
          console.log('Response status:', response.status);
          console.log('Response ok:', response.ok);
          
          if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Trade link update successful:', responseData);
            
            // Update local state with the trade link from backend response
            set(state => ({
              user: state.user ? { 
                ...state.user, 
                tradeLink: responseData.user?.trade_link || tradeLink 
              } : null
            }));
            return true;
          } else {
            // Get error details from response
            let errorData;
            try {
              errorData = await response.json();
            } catch (e) {
              errorData = { error: 'Could not parse error response' };
            }
            
            console.error('❌ Trade link update failed:');
            console.error('Status:', response.status);
            console.error('Status text:', response.statusText);
            console.error('Error data:', errorData);
            
            // Show specific error to user if available
            if (errorData.error) {
              throw new Error(errorData.error);
            }
            
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.error('Failed to update trade link:', error);
          
          // More specific error handling
          if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Network error - please check your connection');
          }
          
          throw error;
        }
      },
      logout: () => set({ user: null, isOwner: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isOwner: state.isOwner 
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Auth store rehydrated:', state?.user?.displayName || 'No user');
      },
    }
  )
);