import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';

/* AuthUser models BOTH supported sign-in paths in one shape:
   - Steam OpenID: steamId set, steamLinked true, authUserId may be missing
   - Email/password: authUserId + email set, steamId may be empty until linked
   We expose `steamLinked` so feature gates (listing creation) can switch
   on it without re-deriving the same boolean everywhere. */
export interface AuthUser {
  id?: string;
  /** Supabase auth.users UUID — set when the user signed up via email. */
  authUserId?: string;
  /** Account email (email signups + Steam users who later add one). */
  email?: string;
  /** Steam ID — empty string when a fresh email user hasn't linked yet. */
  steamId: string;
  /** True when steamId is non-empty (denormalised for UI gates). */
  steamLinked?: boolean;
  displayName: string;
  avatarUrl: string;
  tradeLink?: string;
  referred_by?: string;
  referral_code?: string;
}

interface AuthState {
  user: AuthUser | null;
  isOwner: boolean;
  setUser: (user: AuthUser | null) => void;
  patchUser: (patch: Partial<AuthUser>) => void;
  updateTradeLink: (tradeLink: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isOwner: false,
      setUser: (user) => set(() => ({
        user: user
          ? { ...user, steamLinked: !!(user.steamId && user.steamId.length > 0) }
          : null,
        isOwner: user?.steamId === 'troxx-troxx' || user?.steamId === '76561198021723640' || user?.steamId === '76561198169902302'
      })),
      patchUser: (patch) => set((state) => {
        if (!state.user) return {} as any;
        const merged = { ...state.user, ...patch };
        return {
          user: { ...merged, steamLinked: !!(merged.steamId && merged.steamId.length > 0) },
          isOwner: merged.steamId === 'troxx-troxx' || merged.steamId === '76561198021723640' || merged.steamId === '76561198169902302',
        };
      }),
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
      logout: () => {
        /* Sign out from Supabase Auth too — silent failure is fine
           because the local zustand state is the source of truth for
           the UI, and a stale session token just expires naturally. */
        import('../utils/credentialAuth')
          .then((m) => m.signOut())
          .catch(() => {});
        set({ user: null, isOwner: false });
      },
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