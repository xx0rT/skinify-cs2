import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { supabase } from '../lib/supabaseClient';
import { useState, useEffect } from 'react';

interface HotItem {
  id: string;
  name: string;
  market_name: string;
  type: string;
  condition: string;
  price: number;
  priceChange: number;
  image: string;
  expiresIn: string;
  itemCount: number;
  itemId: string;
  special?: 'stattrak' | 'souvenir';
  favorite?: boolean;
  rarity: string;
  tradable: boolean;
  marketable: boolean;
  float?: string;
  patternTemplate?: string;
  stickers?: string[];
  seller: {
    steamId: string;
    name: string;
  };
  isHot: boolean;
  promotedAt: string;
  expiresAt: string;
  hotViews: number;
  hotClicks: number;
}

interface UseHotItemsResult {
  hotItems: HotItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useHotItems = (limit: number = 20, category?: string): UseHotItemsResult => {
  const [hotItems, setHotItems] = useState<HotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHotItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const params = new URLSearchParams({
        limit: limit.toString()
      });
      
      if (category) {
        params.append('category', category);
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/hot-items?${params}`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHotItems(data.items || []);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch hot items');
      }
    } catch (error) {
      console.error('Hot items fetch error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load hot items');
      setHotItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotItems();

    // Subscribe to hot items changes
    const subscription = supabase
      .channel('hot_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hot_items'
        },
        () => {
          fetchHotItems();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [limit, category]);

  const refetch = () => {
    fetchHotItems();
  };

  return {
    hotItems,
    loading,
    error,
    refetch
  };
};