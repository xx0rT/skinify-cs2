import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export interface WishlistItem {
  id: string;
  name: string;
  market_name: string;
  type: string;
  condition: string;
  price: number;
  image: string;
  rarity: string;
  seller: {
    steamId: string;
    name: string;
    avatarUrl?: string;
  };
  addedAt: string;
}

interface WishlistState {
  items: WishlistItem[];
  loading: boolean;
  addItem: (item: Omit<WishlistItem, 'addedAt'>, userId: string) => Promise<boolean>;
  removeItem: (itemId: string, userId: string) => Promise<boolean>;
  clearWishlist: () => void;
  isInWishlist: (itemId: string) => boolean;
  getItemCount: () => number;
  toggleItem: (item: Omit<WishlistItem, 'addedAt'>, userId?: string) => Promise<boolean>;
  fetchWishlist: (userId: string) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  items: [],
  loading: false,

  fetchWishlist: async (userId: string) => {
    if (!userId) return;

    try {
      set({ loading: true });

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('No active session for wishlist');
        set({ items: [], loading: false });
        return;
      }

      const { data: wishlistData, error } = await supabase
        .from('wishlist_items')
        .select('listing_id');

      if (error) {
        console.error('Error fetching wishlist IDs:', error);
        throw error;
      }

      const wishlistIds = wishlistData?.map(item => item.listing_id) || [];
      set({ items: wishlistIds.map(id => ({ id } as WishlistItem)) });
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      set({ items: [] });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (item, userId) => {
    console.log('🔷 [WISHLIST] Starting addItem:', { itemId: item.id, userId });

    if (!userId) {
      console.error('❌ [WISHLIST] No userId provided');
      alert('🚫 ERROR!\n\nNo user ID provided. Please refresh and try again.');
      return false;
    }

    const state = get();
    if (state.isInWishlist(item.id)) {
      console.log('✅ [WISHLIST] Item already in wishlist');
      return true;
    }

    try {
      console.log('📝 [WISHLIST] Attempting insert:', {
        user_id: userId,
        listing_id: item.id
      });

      const { data, error } = await supabase
        .from('wishlist_items')
        .insert({
          user_id: userId,
          listing_id: item.id
        })
        .select();

      if (error) {
        console.error('❌ [WISHLIST] Insert error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error
        });

        // Handle duplicate - this is actually success
        if (error.code === '23505') {
          console.log('⚠️ [WISHLIST] Duplicate entry - already in wishlist');
          set((state) => ({
            items: [...state.items, { ...item, addedAt: new Date().toISOString() }]
          }));
          return true;
        }

        // Show specific error alerts
        if (error.code === '42501') {
          alert('🚫 PERMISSION DENIED!\n\nThe database RLS policy is blocking the insert.\n\n👉 You need to run SIMPLE_FIX.sql in Supabase SQL Editor!\n\nGo to: https://supabase.com/dashboard/project/jtxqvctllitlhijfcsxg/sql');
        } else if (error.code === '42P01') {
          alert('🚫 TABLE DOES NOT EXIST!\n\nThe wishlist_items table does not exist.\n\n👉 You MUST run SIMPLE_FIX.sql in Supabase SQL Editor NOW!\n\nGo to: https://supabase.com/dashboard/project/jtxqvctllitlhijfcsxg/sql');
        } else {
          alert(`❌ WISHLIST ERROR:\n\nCode: ${error.code}\nMessage: ${error.message}\n\n👉 Run SIMPLE_FIX.sql in Supabase SQL Editor!\n\nGo to: https://supabase.com/dashboard/project/jtxqvctllitlhijfcsxg/sql`);
        }

        return false;
      }

      console.log('✅ [WISHLIST] Successfully added to wishlist:', data);
      set((state) => ({
        items: [...state.items, { ...item, addedAt: new Date().toISOString() }]
      }));

      return true;
    } catch (error: any) {
      console.error('💥 [WISHLIST] Exception caught:', {
        message: error?.message,
        stack: error?.stack,
        fullError: error
      });
      alert('💥 EXCEPTION!\n\n' + error?.message + '\n\nCheck console for details.');
      return false;
    }
  },

  removeItem: async (itemId, userId) => {
    console.log('🔷 [WISHLIST] Starting removeItem:', { itemId, userId });

    if (!userId) {
      console.error('❌ [WISHLIST] No userId provided for removal');
      return false;
    }

    try {
      console.log('📝 [WISHLIST] Attempting delete:', {
        user_id: userId,
        listing_id: itemId
      });

      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', userId)
        .eq('listing_id', itemId);

      if (error) {
        console.error('❌ [WISHLIST] Delete error:', error);
        throw error;
      }

      console.log('✅ [WISHLIST] Successfully removed from wishlist');
      set((state) => ({
        items: state.items.filter(item => item.id !== itemId)
      }));

      return true;
    } catch (error: any) {
      console.error('💥 [WISHLIST] Error removing from wishlist:', error);
      return false;
    }
  },

  clearWishlist: () => set({ items: [] }),

  isInWishlist: (itemId) => {
    return get().items.some(item => item.id === itemId);
  },

  getItemCount: () => {
    return get().items.length;
  },

  toggleItem: async (item, userId) => {
    const { isInWishlist, addItem, removeItem } = get();

    if (!userId) {
      console.error('User ID required for wishlist operations');
      return false;
    }

    if (isInWishlist(item.id)) {
      const success = await removeItem(item.id, userId);
      return !success;
    } else {
      const success = await addItem(item, userId);
      return success;
    }
  }
}));
