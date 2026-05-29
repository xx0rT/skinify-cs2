import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number; // Exchange rate to CZK
}

export const currencies: Currency[] = [
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', rate: 1.0 },
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 0.0426 },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.0392 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.0337 },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', rate: 0.1774 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', rate: 8.73 }
];

interface CurrencyState {
  selectedCurrency: Currency;
  isAutoDetected: boolean;
  setCurrency: (currency: Currency) => void;
  setSelectedCurrency: (currency: Currency) => void;
  setAutoDetectedCurrency: (currency: Currency) => void;
  convertPrice: (priceInCZK: number) => number;
  formatPrice: (priceInCZK: number) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      selectedCurrency: currencies[0],
      isAutoDetected: false,

      setCurrency: (currency) => set({
        selectedCurrency: currency,
      }),

      setSelectedCurrency: (currency) => {
        set({
          selectedCurrency: currency,
          isAutoDetected: false
        });

        // Save to database if user is logged in
        import('../lib/supabaseClient').then(({ supabase }) => {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              import('../utils/userPreferences').then(({ saveUserCurrency }) => {
                saveUserCurrency(user.id, currency.code);
              });
            }
          });
        });
      },

      setAutoDetectedCurrency: (currency) => {
        const { isAutoDetected } = get();
        if (!isAutoDetected) {
          console.log('Setting auto-detected currency:', currency.code);
          set({
            selectedCurrency: currency,
            isAutoDetected: true
          });
        }
      },

      convertPrice: (priceInCZK: number) => {
        const { selectedCurrency } = get();
        return priceInCZK * selectedCurrency.rate;
      },

      formatPrice: (priceInCZK: number) => {
        const { selectedCurrency, convertPrice } = get();
        const convertedPrice = convertPrice(priceInCZK);

        return `${convertedPrice.toLocaleString('en-US', {
          minimumFractionDigits: selectedCurrency.code === 'CZK' ? 0 : 2,
          maximumFractionDigits: selectedCurrency.code === 'CZK' ? 0 : 2
        })} ${selectedCurrency.symbol}`;
      }
    }),
    {
      name: 'currency-storage',
    }
  )
);