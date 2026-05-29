import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  market_name?: string;
  type: string;
  condition: string;
  price: number;
  image: string;
  rarity: string;
  seller: {
    steamId: string;
    name?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  addedAt: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'addedAt'>) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
  canAddToCart: () => { allowed: boolean; reason?: string };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => set((state) => {
        // Check if user can add to cart
        const { allowed, reason } = useCartStore.getState().canAddToCart();
        if (!allowed) {
          // Import toast store dynamically to avoid circular dependencies
          import('../store/toastStore').then(({ useToastStore }) => {
            const { addToast } = useToastStore.getState();
            
            // Check if it's a login issue vs trade link issue
            const authStorage = localStorage.getItem('auth-storage');
            const isLoggedIn = authStorage && JSON.parse(authStorage).state?.user;
            
            if (!isLoggedIn) {
              addToast({
                type: 'warning',
                title: 'Login Required',
                message: 'Please log in with Steam to add items to your cart',
                duration: 3000
              });
            } else {
              addToast({
                type: 'warning',
                title: 'Trade Link Required',
                message: reason || 'Please set your Steam trade link in your profile',
                duration: 3000
              });
            }
          }).catch(console.error);
          
          return state;
        }
        
        // Check if item already exists
        const existingItem = state.items.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
          // Show toast notification for duplicate item attempt
          import('../store/toastStore').then(({ useToastStore }) => {
            const { addToast } = useToastStore.getState();
            addToast({
              type: 'info',
              title: 'Item Already in Cart',
              message: `${item.name} is already in your cart`,
              duration: 2000
            });
          }).catch(console.error);
          return state; // Don't add duplicates
        }
        
        // Play add to cart sound
        import('../utils/soundUtils').then(({ playAddToCart }) => {
          playAddToCart();
        }).catch(console.error);
        
        return {
          items: [...state.items, { ...item, addedAt: new Date().toISOString() }]
        };
      }),
      
      removeItem: (itemId) => set((state) => ({
        items: state.items.filter(item => item.id !== itemId)
      })),
      
      clearCart: () => set({ items: [] }),
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price, 0);
      },
      
      getItemCount: () => {
        return get().items.length;
      },
      
      canAddToCart: () => {
        // Get current user from auth store
        const authStorage = localStorage.getItem('auth-storage');
        if (!authStorage) {
          return { allowed: false, reason: 'Please log in to add items to cart' };
        }
        
        try {
          const { state } = JSON.parse(authStorage);
          const user = state?.user;
          
          if (!user) {
            return { allowed: false, reason: 'Please log in to add items to cart' };
          }
          
          if (!user.tradeLink) {
            return { 
              allowed: false, 
              reason: 'Please set your Steam trade link in your profile before adding items to cart' 
            };
          }
          
          return { allowed: true };
        } catch (error) {
          return { allowed: false, reason: 'Authentication error' };
        }
      }
    }),
    {
      name: 'cart-storage',
    }
  )
);