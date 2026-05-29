import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, TrendingUp, TrendingDown, DollarSign, Sparkles, Flame } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useCurrencyStore } from '../store/currencyStore';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { handleImageError } from '../utils/imageErrorHandler';

interface MarketStats {
  floorValue: number;
  marketCap: number;
  change7d: number;
  change30d: number;
  change90d: number;
  changeYesterday: number;
}

const MobileWeaponCategoryPage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { formatPrice } = useCurrencyStore();
  const { addItem } = useCartStore();
  const { addToast } = useToastStore();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketStats, setMarketStats] = useState<MarketStats>({
    floorValue: 0,
    marketCap: 0,
    change7d: 0,
    change30d: 0,
    change90d: 0,
    changeYesterday: 0
  });
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'popular'>('popular');

  const categoryNames: { [key: string]: string } = {
    'rifles': 'Rifles',
    'pistols': 'Pistols',
    'knives': 'Knives',
    'gloves': 'Gloves',
    'smgs': 'SMGs',
    'heavy': 'Heavy Weapons'
  };

  const categoryTypes: { [key: string]: string[] } = {
    'rifles': ['Rifle', 'Sniper Rifle'],
    'pistols': ['Pistol'],
    'knives': ['Knife'],
    'gloves': ['Gloves'],
    'smgs': ['SMG'],
    'heavy': ['Shotgun', 'Machinegun']
  };

  useEffect(() => {
    fetchCategoryData();
  }, [category, sortBy]);

  const fetchCategoryData = async () => {
    if (!category) return;

    setLoading(true);
    try {
      const types = categoryTypes[category.toLowerCase()] || [];

      let query = supabase
        .from('marketplace_listings')
        .select('*')
        .eq('is_active', true);

      if (types.length > 0) {
        query = query.in('item_type', types);
      }

      // Apply sorting
      if (sortBy === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (sortBy === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('views', { ascending: false });
      }

      const { data: listings, error } = await query.limit(50);

      if (error) throw error;

      setItems(listings || []);

      // Calculate market stats
      if (listings && listings.length > 0) {
        const floorValue = Math.min(...listings.map(l => Number(l.price)));
        const marketCap = listings.reduce((sum, l) => sum + Number(l.price), 0);

        setMarketStats({
          floorValue,
          marketCap,
          change7d: 2.1,
          change30d: 6.67,
          change90d: 1.58,
          changeYesterday: -3.2
        });
      }
    } catch (error) {
      console.error('Error fetching category data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load items',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: any) => {
    addItem({
      id: item.id,
      name: item.item_name,
      market_name: item.item_name,
      type: item.item_type,
      condition: item.condition || 'N/A',
      price: Number(item.price),
      image: item.image_url,
      rarity: item.rarity,
      seller: { steamId: item.user_id || 'unknown', name: 'Seller' }
    });

    addToast({
      type: 'success',
      title: 'Added to Cart',
      message: item.item_name,
      duration: 2000
    });
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-purple-500/30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <h1 className="text-lg font-bold text-white">
              {categoryNames[category?.toLowerCase() || ''] || 'Category'}
            </h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="px-4 py-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-b border-purple-500/20">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-purple-500/30">
            <div className="text-gray-400 text-xs mb-1">Floor Value</div>
            <div className="text-white font-bold text-lg">{formatPrice(marketStats.floorValue)}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-purple-500/30">
            <div className="text-gray-400 text-xs mb-1">Market Cap</div>
            <div className="text-white font-bold text-lg">{formatPrice(marketStats.marketCap)}</div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-full px-3 py-1.5 border border-purple-500/30 whitespace-nowrap">
            <span className="text-gray-400 text-xs">7d:</span>
            <span className={`text-xs font-medium ${getChangeColor(marketStats.change7d)}`}>
              {marketStats.change7d > 0 ? '+' : ''}{marketStats.change7d.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-full px-3 py-1.5 border border-purple-500/30 whitespace-nowrap">
            <span className="text-gray-400 text-xs">30d:</span>
            <span className={`text-xs font-medium ${getChangeColor(marketStats.change30d)}`}>
              {marketStats.change30d > 0 ? '+' : ''}{marketStats.change30d.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-full px-3 py-1.5 border border-purple-500/30 whitespace-nowrap">
            <span className="text-gray-400 text-xs">24h:</span>
            <span className={`text-xs font-medium ${getChangeColor(marketStats.changeYesterday)}`}>
              {marketStats.changeYesterday > 0 ? '+' : ''}{marketStats.changeYesterday.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Sorting */}
      <div className="px-4 py-3 bg-gray-800/30 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Sort by:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('popular')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === 'popular'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Popular
            </button>
            <button
              onClick={() => setSortBy('price_asc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === 'price_asc'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Price ↑
            </button>
            <button
              onClick={() => setSortBy('price_desc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === 'price_desc'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Price ↓
            </button>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">No items found</div>
            <button
              onClick={() => navigate('/')}
              className="text-purple-400 text-sm hover:text-purple-300"
            >
              Browse all items
            </button>
          </div>
        ) : (
          <>
            <div className="text-gray-400 text-sm mb-3">{items.length} items</div>
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="bg-gradient-to-br from-purple-900/20 to-gray-800/50 border border-purple-500/30 rounded-lg p-3 hover:border-purple-400/50 transition-all cursor-pointer"
                >
                  <div className="w-full h-24 bg-gray-700/30 rounded-lg flex items-center justify-center mb-2 relative">
                    <img
                      src={item.image_url}
                      alt={item.item_name}
                      className="max-w-full max-h-full object-contain"
                      onError={handleImageError}
                    />
                    {item.views > 100 && (
                      <div className="absolute top-1 right-1 bg-orange-500 rounded-full p-1">
                        <Flame className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-medium text-xs truncate mb-1">
                    {item.item_name}
                  </h3>
                  <div className="text-gray-400 text-xs mb-2">{item.condition || 'N/A'}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-400 font-bold text-sm">
                      {formatPrice(Number(item.price))}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(item);
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MobileWeaponCategoryPage;
