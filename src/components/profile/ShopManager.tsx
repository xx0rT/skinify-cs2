import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Store, CreditCard as Edit, Eye, Share2, Settings, Plus, TrendingUp, Users, DollarSign, ExternalLink, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import ShopEditor from './ShopEditor';
import VisualShopEditor from './VisualShopEditor';

interface Shop {
  id: string;
  shop_name: string;
  shop_url: string;
  description: string;
  logo_url: string;
  banner_url: string;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
  total_views: number;
  total_sales: number;
  total_revenue: number;
  created_at: string;
}

interface ShopManagerProps {
  onNavigateToListings?: () => void;
}

const ShopManager: React.FC<ShopManagerProps> = ({ onNavigateToListings }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopDescription, setShopDescription] = useState('');

  useEffect(() => {
    if (user) {
      fetchShop();
    }
  }, [user]);

  const fetchShop = async () => {
    if (!user) {
      console.log('No user in auth store');
      setLoading(false);
      return;
    }

    console.log('=== FETCHING SHOP ===');
    console.log('Current user:', user);

    try {
      // Get the user ID from the users table by steam_id
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, steam_id, display_name')
        .eq('steam_id', user.steamId)
        .maybeSingle();

      console.log('User lookup:', { userRecord, userError, steamId: user.steamId });

      if (!userRecord) {
        console.log('❌ User not found in users table');
        setLoading(false);
        return;
      }

      console.log('✅ Found user in database:', userRecord);

      // First try to get ALL shops to test RLS
      const { data: allShops, error: allError } = await supabase
        .from('user_shops')
        .select('*');

      console.log('All shops in database:', { count: allShops?.length, allShops, allError });

      // Now get THIS user's shop
      const { data, error } = await supabase
        .from('user_shops')
        .select('*')
        .eq('user_id', userRecord.id)
        .maybeSingle();

      console.log('This user shop query:', {
        query: `user_id = ${userRecord.id}`,
        data,
        error,
        found: !!data
      });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Shop fetch error:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Found shop for user:', data);
      } else {
        console.log('ℹ️ No shop found for this user');
      }

      setShop(data);
    } catch (error) {
      console.error('❌ Error fetching shop:', error);
    } finally {
      setLoading(false);
    }
  };

  const createShop = async () => {
    if (!shopName.trim() || !user) return;

    try {
      // Get user_id from users table by steam_id
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('steam_id', user.steamId)
        .maybeSingle();

      if (!userRecord) {
        alert('User account not found. Please make sure you are logged in properly.');
        return;
      }

      const userId = userRecord.id;

      // Try to get display name from users table using steam_id
      const { data: userData } = await supabase
        .from('users')
        .select('display_name')
        .eq('steam_id', user.steamId)
        .maybeSingle();

      // Safely get username with fallback
      const username = userData?.display_name || user.displayName || user.steamId || 'user-' + Date.now();

      const { data: urlData, error: rpcError } = await supabase.rpc('generate_shop_url', {
        username: username
      });

      if (rpcError) {
        console.warn('RPC error, using fallback URL generation:', rpcError);
      }

      // Fallback URL generation if RPC fails
      const fallbackUrl = username.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const shopUrl = urlData || fallbackUrl;

      const { data, error } = await supabase
        .from('user_shops')
        .insert({
          user_id: userId,
          shop_name: shopName.trim(),
          shop_url: shopUrl,
          description: shopDescription.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setShop(data);
      setShowCreateModal(false);
      setShopName('');
      setShopDescription('');
    } catch (error: any) {
      console.error('Error creating shop:', error);
      alert(error.message || 'Failed to create shop');
    }
  };

  const copyShopLink = () => {
    if (shop) {
      const link = `${window.location.origin}/shop/${shop.shop_url}`;
      navigator.clipboard.writeText(link);
      alert('Shop link copied to clipboard!');
    }
  };

  const toggleShopStatus = async () => {
    if (!shop) return;

    try {
      const { error } = await supabase
        .from('user_shops')
        .update({ is_active: !shop.is_active })
        .eq('id', shop.id);

      if (error) throw error;
      setShop({ ...shop, is_active: !shop.is_active });
    } catch (error) {
      console.error('Error updating shop status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (showVisualEditor && shop) {
    return <VisualShopEditor shop={shop} onClose={() => { setShowVisualEditor(false); fetchShop(); }} />;
  }

  if (showEditor && shop) {
    return <ShopEditor shop={shop} onClose={() => { setShowEditor(false); fetchShop(); }} />;
  }

  if (!shop) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-8 border border-blue-500/20">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Store className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-3">Create Your Own Shop</h2>
          <p className="text-gray-300 text-center mb-6 max-w-2xl mx-auto">
            Start your own marketplace with a personalized shop. Customize your branding, showcase your items,
            and share your unique shop link with customers. Build your brand and grow your business!
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                <Edit className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Custom Design</h3>
              <p className="text-gray-400 text-sm">Personalize colors, logo, and layout to match your brand</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3">
                <Share2 className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Unique Shop URL</h3>
              <p className="text-gray-400 text-sm">Get your own shareable link to promote anywhere</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Analytics</h3>
              <p className="text-gray-400 text-sm">Track views, sales, and grow your business</p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all"
            >
              <Plus size={20} />
              Create My Shop
            </button>
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-4">Create Your Shop</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Shop Name *</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="My Awesome Shop"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Description (Optional)</label>
                  <textarea
                    value={shopDescription}
                    onChange={(e) => setShopDescription(e.target.value)}
                    placeholder="Tell customers about your shop..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    rows={3}
                    maxLength={500}
                  />
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-300 text-sm">
                    Your shop URL will be automatically generated based on your username and will be unique.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createShop}
                  disabled={!shopName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Shop
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.shop_name} className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Store className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">{shop.shop_name}</h2>
              <p className="text-gray-400">/{shop.shop_url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${shop.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {shop.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {shop.description && (
          <p className="text-gray-300 mb-4">{shop.description}</p>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Views</span>
            </div>
            <div className="text-2xl font-bold text-white">{shop.total_views.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Sales</span>
            </div>
            <div className="text-2xl font-bold text-white">{shop.total_sales.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">Revenue</span>
            </div>
            <div className="text-2xl font-bold text-white">{shop.total_revenue.toLocaleString()} Kč</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowVisualEditor(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg transition shadow-lg"
          >
            <Wand2 size={18} />
            Visual Editor
          </button>
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
          >
            <Settings size={18} />
            Advanced Settings
          </button>
          <button
            onClick={() => window.open(`/shop/${shop.shop_url}`, '_blank')}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
          >
            <Eye size={18} />
            Preview
          </button>
          <button
            onClick={copyShopLink}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition"
          >
            <Share2 size={18} />
            Share Link
          </button>
          <button
            onClick={toggleShopStatus}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
          >
            <Settings size={18} />
            {shop.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => onNavigateToListings?.()}
            className="bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 text-left transition"
          >
            <Plus className="w-8 h-8 text-blue-400 mb-2" />
            <h4 className="text-white font-semibold mb-1">Manage Items</h4>
            <p className="text-gray-400 text-sm">Add marketplace listings to your shop from the Listings tab</p>
          </button>
          <button
            onClick={() => window.open(`/shop/${shop.shop_url}`, '_blank')}
            className="bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 text-left transition"
          >
            <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
            <h4 className="text-white font-semibold mb-1">View Shop</h4>
            <p className="text-gray-400 text-sm">See your shop as customers see it</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopManager;
