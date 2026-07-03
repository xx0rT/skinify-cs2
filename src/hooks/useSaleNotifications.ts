import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { notifyItemSold, notifyNewOrder } from '../utils/notificationUtils';
import { useCurrencyStore } from '../store/currencyStore';

/* 60s — sale notifications don't need sub-minute latency, and the old
   10s cadence hammered the orders function (and flooded the console
   with network errors whenever the connection dropped). */
const POLL_INTERVAL = 60000;

interface Order {
  id: string;
  item_name: string;
  price: number;
  status: string;
  created_at: string;
  buyer_steam_id: string;
  buyer_name?: string;
}

export const useSaleNotifications = () => {
  const { user } = useAuthStore();
  const { selectedCurrency } = useCurrencyStore();
  const lastCheckedRef = useRef<string | null>(null);
  const isCheckingRef = useRef(false);
  const failureCountRef = useRef(0);

  const checkForNewSales = async () => {
    if (!user?.steamId || isCheckingRef.current) return;
    /* Don't fire requests we know will fail (offline) or that nobody
       will see (tab in background). Also back off exponentially after
       consecutive failures so a flaky connection doesn't spam the
       console with ERR_INTERNET_DISCONNECTED every tick. */
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (failureCountRef.current > 0) {
      /* Skip 2^failures - 1 ticks (max ~8 min between attempts). */
      const skipTicks = Math.min(2 ** failureCountRef.current - 1, 7);
      if ((Date.now() / POLL_INTERVAL) % (skipTicks + 1) >= 1) return;
    }

    try {
      isCheckingRef.current = true;
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const response = await fetch(
        `${supabaseUrl}/functions/v1/orders?steamId=${user.steamId}&seller=true`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        failureCountRef.current += 1;
        return;
      }
      failureCountRef.current = 0;

      const data = await response.json();
      const orders: Order[] = data.orders || [];

      const allOrders = orders.filter(
        (order) => order.status === 'completed' || order.status === 'paid' || order.status === 'pending'
      );

      if (allOrders.length > 0) {
        const lastChecked = lastCheckedRef.current;
        const newOrders = lastChecked
          ? allOrders.filter((order) => new Date(order.created_at) > new Date(lastChecked))
          : [];

        newOrders.forEach((order) => {
          const buyerName = order.buyer_name || 'A buyer';
          if (order.status === 'pending') {
            notifyNewOrder(order.item_name, order.price, buyerName, selectedCurrency);
          } else {
            notifyItemSold(order.item_name, order.price, selectedCurrency);
          }
        });

        if (allOrders.length > 0) {
          const mostRecentOrder = allOrders.reduce((latest, current) =>
            new Date(current.created_at) > new Date(latest.created_at) ? current : latest
          );
          lastCheckedRef.current = mostRecentOrder.created_at;
        }
      }
    } catch {
      /* Network hiccup — count it for backoff, stay quiet in the console. */
      failureCountRef.current += 1;
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    if (!user?.steamId) return;

    lastCheckedRef.current = new Date().toISOString();

    const intervalId = setInterval(checkForNewSales, POLL_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [user?.steamId]);

  return null;
};
