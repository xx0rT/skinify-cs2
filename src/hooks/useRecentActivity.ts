import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface RecentActivity {
  id: string;
  buyer_name: string;
  seller_name: string;
  item_name: string;
  item_image: string;
  price: number;
  created_at: string;
  listing_id?: string;
}

const censorName = (name: string): string => {
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `Buyer #${randomNum}`;
};

const generateFallbackActivities = (): RecentActivity[] => {
  const items = [
    { name: 'AK-47 | Redline', price: 85 },
    { name: 'AWP | Dragon Lore', price: 1250 },
    { name: 'Karambit | Fade', price: 890 },
    { name: 'M4A4 | Howl', price: 1100 },
    { name: 'Glock-18 | Fade', price: 420 },
    { name: 'Desert Eagle | Blaze', price: 180 },
    { name: 'Butterfly Knife | Doppler', price: 950 },
    { name: 'USP-S | Kill Confirmed', price: 75 },
    { name: 'M4A1-S | Hyper Beast', price: 65 },
    { name: 'AK-47 | Fire Serpent', price: 850 }
  ];

  const buyers = ['Player123', 'ProGamer', 'SkinCollector', 'TradeKing', 'CSGOFan', 'MarketPro', 'SkinHunter', 'TradeMaster'];

  return Array.from({ length: 30 }, (_, i) => {
    const item = items[i % items.length];
    const buyerName = buyers[Math.floor(Math.random() * buyers.length)];
    return {
      id: `fallback-${i}`,
      buyer_name: censorName(buyerName),
      seller_name: 'Seller',
      item_name: item.name,
      item_image: '',
      price: item.price,
      created_at: new Date().toISOString(),
      listing_id: undefined
    };
  });
};

export const useRecentActivity = (limit: number = 30) => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(`
            id,
            buyer_steam_id,
            seller_steam_id,
            items,
            total_amount,
            created_at
          `)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);

        if (fetchError) throw fetchError;

        const formattedActivities: RecentActivity[] = [];

        if (data && data.length > 0) {
          const steamIds = data.map(order => order.buyer_steam_id).filter(Boolean);

          const { data: usersData } = await supabase
            .from('users')
            .select('steam_id, display_name')
            .in('steam_id', steamIds);

          const userMap = new Map(
            (usersData || []).map(user => [user.steam_id, user.display_name])
          );

          data.forEach(order => {
            const items = Array.isArray(order.items) ? order.items : [];
            const buyerName = userMap.get(order.buyer_steam_id) || 'Anonymous';
            const censoredBuyerName = censorName(buyerName);

            items.forEach((item: any) => {
              formattedActivities.push({
                id: `${order.id}-${item.id || Math.random()}`,
                buyer_name: censoredBuyerName,
                seller_name: item.seller_name || 'Seller',
                item_name: item.market_name || item.name || 'Unknown Item',
                item_image: item.image || '',
                price: parseFloat(item.price) || 0,
                created_at: order.created_at,
                listing_id: item.id
              });
            });
          });
        }

        if (formattedActivities.length === 0) {
          setActivities(generateFallbackActivities());
        } else {
          setActivities(formattedActivities);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch activity');
        setActivities(generateFallbackActivities());
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();

    const subscription = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.completed'
        },
        () => {
          fetchRecentActivity();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [limit]);

  return { activities, loading, error };
};
