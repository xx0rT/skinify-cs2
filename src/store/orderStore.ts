import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { create } from 'zustand';

interface OrderItem {
  id: string;
  name: string;
  market_name: string;
  price: number;
  seller_steam_id: string;
  seller_name: string;
  image: string;
  type: string;
  condition: string;
  rarity: string;
}

interface Order {
  id: number;
  buyer_steam_id: string;
  seller_steam_id: string;
  transaction_id: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'disputed' | 'refunded' | 'escrow';
  payment_method: string;
  created_at: string;
  completed_at?: string;
  tracking_notes?: string;
  metadata?: any;
}

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchOrders: (steamId: string, type?: 'purchases' | 'sales' | 'all') => Promise<void>;
  createOrder: (orderData: {
    buyer_steam_id: string;
    items: OrderItem[];
    total_amount: number;
    payment_method: string;
  }) => Promise<boolean>;
  updateOrderStatus: (orderId: number, status: Order['status'], notes?: string) => Promise<boolean>;
  reset: () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  fetchOrders: async (steamId: string, type: 'purchases' | 'sales' | 'all' = 'all') => {
    set({ loading: true, error: null });

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const response = await fetch(`${supabaseUrl}/functions/v1/orders?steam_id=${steamId}&type=${type}`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        set({
          orders: data.orders || [],
          loading: false,
          error: null
        });
      } else {
        const errorData = await response.json();
        console.error('❌ ORDERS FETCH FAILED');
        console.error('Response status:', response.status);
        console.error('Error data:', errorData);
        throw new Error(errorData.error || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch orders'
      });
    }
  },

  createOrder: async (orderData) => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });
      
      if (response.ok) {
        const result = await response.json();

        // Refresh orders after creating new one
        await get().fetchOrders(orderData.buyer_steam_id);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to create order:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to create order' });
      return false;
    }
  },

  updateOrderStatus: async (orderId: number, status: Order['status'], notes?: string) => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      // Get current user's Steam ID for authorization
      const steamId = localStorage.getItem('auth-storage') 
        ? JSON.parse(localStorage.getItem('auth-storage')!).state?.user?.steamId 
        : null;
      
      if (!steamId) {
        throw new Error('User not authenticated');
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/orders?id=${orderId}&steam_id=${steamId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          tracking_notes: notes
        })
      });
      
      if (response.ok) {
        // Refresh orders after update
        await get().fetchOrders(steamId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update order:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to update order' });
      return false;
    }
  },

  reset: () => set({
    orders: [],
    loading: false,
    error: null
  })
}));