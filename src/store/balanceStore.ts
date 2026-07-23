import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { create } from 'zustand';

interface BalanceTransaction {
  id: string;
  type: 'deposit' | 'purchase' | 'sale' | 'refund' | 'withdrawal' | 'admin_adjustment';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id?: string;
  metadata?: any;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  completed_at?: string;
  created_at: string;
}

interface BalanceState {
  balance: number;
  /** Pre-Connect DB balance still owed to a Connect-onboarded seller.
   *  0 for everyone else (their DB balance IS `balance`, nothing
   *  separate to surface). Claimable only through the legacy
   *  withdraw-submit / admin-review flow. */
  legacyBalance: number;
  /** True once `balance` is a live Stripe number rather than the DB's
   *  current_balance — drives whether the UI shows the "Legacy
   *  balance" callout at all. */
  stripeConnectBalance: boolean;
  pendingBalance: number;
  totalDeposited: number;
  totalSpent: number;
  totalEarned: number;
  transactions: BalanceTransaction[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchBalance: (steamId: string) => Promise<void>;
  fetchTransactions: (steamId: string) => Promise<void>;
  depositFunds: (steamId: string, amount: number, paymentMethod: string) => Promise<boolean>;
  purchaseWithBalance: (amount: number, items: any[]) => Promise<boolean>;
  refreshTransactions: (steamId: string) => Promise<void>;
  reset: () => void;
}

/* ─── Single-flight + rate-limit for the /balance endpoint ──────────
   The balance fetch is called by many components on mount. Without
   coalescing, a single page render can fire 6-10 identical requests in
   parallel, and during batch operations the endpoint started returning
   500s under the load. We:
     - share a single in-flight promise per steamId,
     - skip calls within 3s of the last successful fetch,
   so even if every component calls fetchBalance on mount, at most one
   network request actually goes out. */
const balanceInFlight = new Map<string, Promise<void>>();
const balanceLastFetch = new Map<string, number>();
const BALANCE_RATE_LIMIT_MS = 3000;

export const useBalanceStore = create<BalanceState>((set, get) => ({
  balance: 0,
  legacyBalance: 0,
  stripeConnectBalance: false,
  pendingBalance: 0,
  totalDeposited: 0,
  totalSpent: 0,
  totalEarned: 0,
  transactions: [],
  loading: false,
  error: null,

  fetchBalance: async (steamId: string) => {
    const now = Date.now();
    const last = balanceLastFetch.get(steamId) || 0;
    if (now - last < BALANCE_RATE_LIMIT_MS) return;

    const existing = balanceInFlight.get(steamId);
    if (existing) return existing;

    set({ loading: true, error: null });

    const run = (async () => {
      try {
        const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
        const response = await fetch(`${supabaseUrl}/functions/v1/balance?steam_id=${steamId}`, {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          set({
            balance: data.balance || 0,
            legacyBalance: data.legacy_balance || 0,
            stripeConnectBalance: !!data.stripe_connect_balance,
            totalDeposited: data.total_deposited || 0,
            totalSpent: data.total_spent || 0,
            transactions: data.transactions || [],
            loading: false,
            error: null
          });
        } else {
          /* 4xx/5xx — leave existing balance intact (don't reset to 0 on
             a transient 500 mid-batch). Only initialize to zero on the
             very first fetch when we still have no data. */
          if (get().balance === 0 && get().transactions.length === 0) {
            set({
              balance: 0,
              totalDeposited: 0,
              totalSpent: 0,
              transactions: [],
              loading: false,
              error: null
            });
          } else {
            set({ loading: false });
          }
        }
        balanceLastFetch.set(steamId, Date.now());
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        set({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch balance'
        });
      } finally {
        balanceInFlight.delete(steamId);
      }
    })();

    balanceInFlight.set(steamId, run);
    return run;
  },

  fetchTransactions: async (steamId: string) => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/balance?steam_id=${steamId}`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        set({
          transactions: data.transactions || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  },

  depositFunds: async (steamId: string, amount: number, paymentMethod: string) => {
    // This function is now disabled - deposits handled by external payment flow
    console.log('Deposit initiated for:', steamId, amount, paymentMethod);
    return true; // Always return true to let the payment flow continue
  },

  purchaseWithBalance: async (amount: number, items: any[]) => {
    const { balance } = get();
    
    // Validate inputs to prevent errors
    if (!items || !Array.isArray(items)) {
      console.error('Invalid items array passed to purchaseWithBalance:', items);
      set({ error: 'Invalid items data' });
      return false;
    }

    if (items.length === 0) {
      console.error('Empty items array passed to purchaseWithBalance');
      set({ error: 'No items to purchase' });
      return false;
    }

    if (balance < amount) {
      set({ error: 'Insufficient balance' });
      return false;
    }
    
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      // Get user steam ID
      const steamId = localStorage.getItem('auth-storage') 
        ? JSON.parse(localStorage.getItem('auth-storage')!).state?.user?.steamId 
        : null;
      
      if (!steamId) {
        throw new Error('User not found');
      }
      
      // Step 1: Create the order record (order function handles payment verification internally)
      console.log('=== CREATING ORDER ===');
      console.log('Buyer Steam ID:', steamId);
      console.log('Items being purchased:', items.length);

      // Log seller info for each item
      items.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          name: item.name,
          price: item.price,
          seller: item.seller,
          seller_steamId: item.seller?.steamId
        });

        if (!item.seller?.steamId || item.seller?.steamId === 'unknown') {
          console.error(`⚠️ ITEM ${index + 1} HAS INVALID SELLER INFO:`, item);
        }
      });

      const orderResponse = await fetch(`${supabaseUrl}/functions/v1/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyer_steam_id: steamId,
          payment_transaction_id: `BALANCE-${Date.now()}`,
          items: items.map(item => {
            const sellerSteamId = item.seller?.steamId;

            if (!sellerSteamId || sellerSteamId === 'unknown') {
              console.error('⚠️ Creating order with unknown seller for item:', item.name);
            }

            return {
              id: item.id,
              name: item.name,
              market_name: item.market_name || item.name,
              price: item.price,
              seller_steam_id: sellerSteamId || 'unknown',
              seller_name: item.seller?.displayName || item.seller?.name || 'Unknown Seller',
              seller_avatar_url: item.seller?.avatarUrl,
              image: item.image,
              type: item.type,
              condition: item.condition,
              rarity: item.rarity
            };
          }),
          total_amount: amount,
          payment_method: 'balance'
        })
      });

      let orderData = null;
      console.log('=== ORDER CREATION RESPONSE ===');
      console.log('Order response status:', orderResponse.status);

      if (orderResponse.ok) {
        orderData = await orderResponse.json();
        console.log('✅ ORDER CREATED SUCCESSFULLY');
        console.log('Order details:', orderData);
        console.log('Transaction ID:', orderData.transaction_id);
      } else {
        const orderError = await orderResponse.json();
        console.error('❌ ORDER CREATION FAILED');
        console.error('Error:', orderError);

        throw new Error(`Order creation failed: ${orderError.error || orderError.details?.join(', ') || 'Unknown error'}`);
      }

      // Step 3: Order was created successfully, balance already deducted by edge function
      console.log('=== ORDER PROCESSING COMPLETE ===');
      console.log('✅ PURCHASE COMPLETED SUCCESSFULLY');
      console.log('Order ID:', orderData.order?.id);
      console.log('Transaction ID:', orderData.transaction_id);
      console.log('✅ Balance deducted automatically by order creation');
      console.log('✅ Items removed from marketplace automatically');

      // DO NOT update local balance here - the server already deducted it
      // Doing so would double-deduct and then the refresh would add it back

      // Refresh data including orders from server
      await get().fetchBalance(steamId);

      // CRITICAL: Refresh orders so new purchase appears immediately
      // Import and call orderStore to refresh orders
      // Add a small delay to ensure database has propagated the order
      console.log('⏳ Waiting 500ms for database propagation...');
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        console.log('🔄 Refreshing orders after purchase...');
        const { useOrderStore } = await import('./orderStore');
        await useOrderStore.getState().fetchOrders(steamId);
        console.log('✅ Orders refreshed successfully after purchase');
      } catch (error) {
        console.error('❌ Failed to refresh orders after purchase:', error);
      }

      return true;
      
    } catch (error) {
      console.error('Purchase failed:', error);
      set({ error: error instanceof Error ? error.message : 'Purchase failed' });
      return false;
    }
  },

  refreshTransactions: async (steamId: string) => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/balance/transactions?steam_id=${steamId}`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        set({ transactions: data.transactions || [] });
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  },

  reset: () => set({
    balance: 0,
    legacyBalance: 0,
    stripeConnectBalance: false,
    pendingBalance: 0,
    totalDeposited: 0,
    totalSpent: 0,
    totalEarned: 0,
    transactions: [],
    loading: false,
    error: null
  })
}));