import { useState, useEffect } from 'react';
import { useFilterStore } from '../store/filterStore';

interface MarketplaceItem {
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
  stickers?: string[];
  seller: {
    steamId: string;
    name: string;
  };
  views?: number;
  description?: string;
  listed_at?: string;
}

interface UseMarketplaceItemsResult {
  items: MarketplaceItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useMarketplaceItems = (): UseMarketplaceItemsResult => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<MarketplaceItem[]>([]);
  const { selectedCategory, selectedWeapon, searchQuery } = useFilterStore();

  /**
   * Fetch marketplace items - only items that users have specifically listed for sale
   */
  const fetchMarketplaceItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get Supabase credentials from config
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials. Please configure your environment variables.');
      }
      
      const listingsUrl = `${supabaseUrl}/functions/v1/marketplace-listings`;
      
      const response = await fetch(listingsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      setAllItems(data.items);
      setItems(data.items);
      setError(null);
      
    } catch (error) {
      console.error('Failed to fetch marketplace listings:', error);
      setError(`Failed to load marketplace items: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on selected filters
  const filterItems = () => {
    let filteredItems = [...allItems];
    
    // Group items by market name and calculate quantities
    const itemGroups = new Map<string, any[]>();
    filteredItems.forEach(item => {
      const key = item.market_name || item.name;
      if (!itemGroups.has(key)) {
        itemGroups.set(key, []);
      }
      itemGroups.get(key)!.push(item);
    });
    
    // Add quantity information to each item
    filteredItems = filteredItems.map(item => {
      const key = item.market_name || item.name;
      const group = itemGroups.get(key) || [item];
      return {
        ...item,
        availableQuantity: group.length,
        allCopies: group
      };
    });
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.market_name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.condition.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (selectedCategory && selectedCategory !== 'ALL') {
      filteredItems = filteredItems.filter(item => {
        const itemType = item.type.toLowerCase();
        const categoryLower = selectedCategory.toLowerCase();
        
        switch (categoryLower) {
          case 'knife':
            return itemType.includes('knife') || item.name.includes('★');
          case 'pistol':
            return itemType.includes('pistol') || 
                   item.name.includes('Glock') || 
                   item.name.includes('USP') ||
                   item.name.includes('P250') ||
                   item.name.includes('Desert Eagle');
          case 'rifle':
            return itemType.includes('rifle') ||
                   item.name.includes('AK-47') ||
                   item.name.includes('M4A4') ||
                   item.name.includes('M4A1-S') ||
                   item.name.includes('AWP');
          case 'gloves':
            return itemType.includes('gloves') || item.name.includes('Gloves');
          default:
            return itemType.includes(categoryLower);
        }
      });
    }
    
    // Filter by specific weapon
    if (selectedWeapon) {
      filteredItems = filteredItems.filter(item =>
        item.name.includes(selectedWeapon) || item.market_name.includes(selectedWeapon)
      );
    }
    
    setItems(filteredItems);
  };

  useEffect(() => {
    fetchMarketplaceItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [selectedCategory, selectedWeapon, searchQuery, allItems]);

  const refetch = async () => {
    await fetchMarketplaceItems();
  };

  return {
    items,
    loading,
    error,
    refetch
  };
};