import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Package, Shield, Award, User, MessageCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useCurrencyStore } from '../store/currencyStore';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { handleImageError } from '../utils/imageErrorHandler';
import Header from '../components/Header';

const MobileUserShopPage: React.FC = () => {
  const { shopUrl } = useParams<{ shopUrl: string }>();
  const navigate = useNavigate();
  const { formatPrice } = useCurrencyStore();
  const { addItem } = useCartStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<any>(null);
  const [shopOwner, setShopOwner] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    avgPrice: 0,
    rating: 4.8
  });

  useEffect(() => {
    fetchShopData();
  }, [shopUrl]);

  const fetchShopData = async () => {
    if (!shopUrl) return;

    setLoading(true);
    try {
      // Fetch shop info
      const { data: shopData, error: shopError } = await supabase
        .from('user_shops')
        .select('*')
        .eq('shop_url', shopUrl)
        .eq('is_active', true)
        .maybeSingle();

      if (shopError && shopError.code !== 'PGRST116') throw shopError;

      setShop(shopData);

      if (!shopData) {
        addToast({
          type: 'error',
          title: 'Shop Not Found',
          message: 'The shop you are looking for does not exist',
          duration: 3000
        });
        navigate('/marketplace');
        return;
      }

      // Fetch shop owner
      const { data: ownerData, error: ownerError } = await supabase
        .from('users')
        .select('display_name, avatar_url, created_at')
        .eq('id', shopData.user_id)
        .maybeSingle();

      if (ownerError && ownerError.code !== 'PGRST116') throw ownerError;

      setShopOwner(ownerData);

      // Fetch shop items
      const { data: itemsData, error: itemsError } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('user_id', shopData.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      setItems(itemsData || []);

      // Calculate stats
      if (itemsData && itemsData.length > 0) {
        const totalValue = itemsData.reduce((sum, item) => sum + Number(item.price), 0);
        setStats({
          totalItems: itemsData.length,
          totalValue,
          avgPrice: totalValue / itemsData.length,
          rating: 4.8
        });
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load shop',
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
      seller: { steamId: shop?.user_id || 'unknown', name: shopOwner?.display_name || 'Seller' }
    });

    addToast({
      type: 'success',
      title: 'Added to Cart',
      message: item.item_name,
      duration: 2000
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <Header activeSection="Shop" />

      {/* Shop Header */}
      <div className="px-4 py-6 bg-gray-800/20 border-b border-gray-700/50">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            {shopOwner?.avatar_url ? (
              <img
                src={shopOwner.avatar_url}
                alt={shop?.shop_name || 'Shop'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-white" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">
              {shop?.shop_name || shopOwner?.display_name || 'User Shop'}
            </h2>
            <div className="text-gray-400 text-sm mb-2">
              by {shopOwner?.display_name || 'Unknown'}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-white text-sm font-medium">{stats.rating}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400 text-sm">
                <Package className="w-4 h-4" />
                <span>{stats.totalItems} items</span>
              </div>
            </div>
          </div>
        </div>

        {shop?.description && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 mb-4">
            <p className="text-gray-300 text-sm">{shop.description}</p>
          </div>
        )}

        {/* Shop Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 text-center">
            <div className="text-purple-400 font-bold text-lg">{stats.totalItems}</div>
            <div className="text-gray-400 text-xs">Items</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 text-center">
            <div className="text-purple-400 font-bold text-lg">{formatPrice(stats.totalValue)}</div>
            <div className="text-gray-400 text-xs">Total Value</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 text-center">
            <div className="text-purple-400 font-bold text-lg">{formatPrice(stats.avgPrice)}</div>
            <div className="text-gray-400 text-xs">Avg Price</div>
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="px-4 py-4 bg-gray-800/20 border-b border-gray-700/50">
        <div className="flex items-center justify-around">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-gray-300 text-xs">Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-300 text-xs">Trusted Seller</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300 text-xs">Fast Reply</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <div className="text-gray-400 mb-2">No items available</div>
            <button
              onClick={() => navigate('/marketplace')}
              className="text-purple-400 text-sm hover:text-purple-300"
            >
              Browse marketplace
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">Shop Items</h3>
              <span className="text-gray-400 text-sm">{items.length} items</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="bg-gradient-to-br from-purple-900/20 to-gray-800/50 border border-purple-500/30 rounded-lg p-3 hover:border-purple-400/50 transition-all cursor-pointer"
                >
                  <div className="w-full h-24 bg-gray-700/30 rounded-lg flex items-center justify-center mb-2">
                    <img
                      src={item.image_url}
                      alt={item.item_name}
                      className="max-w-full max-h-full object-contain"
                      onError={handleImageError}
                    />
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

export default MobileUserShopPage;
