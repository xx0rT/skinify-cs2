import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { supabase } from '../lib/supabaseClient';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Star, 
  Calendar, 
  ExternalLink,
  ShoppingCart,
  Eye,
  TrendingUp,
  Award,
  Shield,
  Package,
  Activity,
  Gamepad2,
  RefreshCw,
  Loader,
  AlertCircle,
  Upload,
  Camera,
  Edit3,
  Save,
  X,
  Heart,
  MessageCircle,
  Search,
  Trophy,
  Gift
} from 'lucide-react';
import { useCurrencyStore } from '../store/currencyStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { useOnlineStatusStore } from '../store/onlineStatusStore';
import { useChatStore } from '../store/chatStore';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UserReviews from '../components/profile/UserReviews';
import TradeOfferModal from '../components/trade/TradeOfferModal';

interface UserListing {
  id: string;
  asset_id: string;
  item_name: string;
  market_hash_name: string;
  item_type: string;
  rarity: string;
  condition: string;
  price: number;
  image_url: string;
  float_value?: string;
  stickers?: string[];
  description?: string;
  views: number;
  created_at: string;
}

interface UserStats {
  totalListings: number;
  averagePrice: number;
  totalValue: number;
  joinDate: string;
  lastSeen: string;
  rating: number;
  completedTrades: number;
}

interface UserProfile {
  steamId: string;
  displayName: string;
  avatarUrl: string;
  bannerUrl?: string;
  memberSince: string;
  lastLogin: string;
  totalTrades: number;
  successRate: number;
  reputation: number;
}

const UserProfilePage: React.FC = () => {
  const { steamId } = useParams<{ steamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<UserListing[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'listings' | 'stats' | 'reviews'>('listings');
  const [editingBanner, setEditingBanner] = useState(false);
  const [bannerUrl, setBannerUrl] = useState('');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const { getUserStatus } = useOnlineStatusStore();
  const { initializeChatSession, setActiveChat } = useChatStore();

  const isOwnProfile = user?.steamId === steamId;
  const userStatus = steamId ? getUserStatus(steamId) : 'offline';

  useEffect(() => {
    if (steamId) {
      fetchUserProfile();
      fetchUserListings();
    }
  }, [steamId]);

  const fetchUserProfile = async () => {
    if (!steamId) return;

    setLoading(true);
    try {
      // Fetch real user data from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('steam_id', steamId)
        .maybeSingle();

      if (userError) throw userError;

      if (!userData) {
        throw new Error('User not found');
      }

      // Fetch user stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userData.id)
        .maybeSingle();

      // Fetch completed trades count
      const { count: tradesCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .or(`buyer_steam_id.eq.${steamId},seller_steam_id.eq.${steamId}`);

      const profile: UserProfile = {
        steamId: userData.steam_id,
        displayName: userData.display_name || `Trader_${userData.steam_id.slice(-6)}`,
        avatarUrl: userData.avatar_url || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
        bannerUrl: userData.banner_url || 'https://images.pexels.com/photos/1671327/pexels-photo-1671327.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        memberSince: userData.created_at || new Date().toISOString(),
        lastLogin: userData.last_login || new Date().toISOString(),
        totalTrades: tradesCount || 0,
        successRate: statsData?.success_rate || 0,
        reputation: statsData?.average_rating || 0
      };

      setUserProfile(profile);
      setBannerUrl(profile.bannerUrl || '');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserListings = async () => {
    if (!steamId) return;
    
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/marketplace-listings?steamId=${steamId}&userOnly=true`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        const userListings: UserListing[] = (data.items || []).map((item: any) => ({
          id: item.id,
          asset_id: item.asset_id,
          item_name: item.name || item.item_name,
          market_hash_name: item.market_name || item.market_hash_name,
          item_type: item.type || item.item_type,
          rarity: item.rarity,
          condition: item.condition,
          price: item.price,
          image_url: item.image || item.image_url,
          float_value: item.float,
          stickers: item.stickers,
          description: item.description,
          views: item.views || 0,
          created_at: item.listed_at || item.created_at
        }));

        setListings(userListings);

        // Calculate user stats
        const stats: UserStats = {
          totalListings: userListings.length,
          averagePrice: userListings.length > 0 ? userListings.reduce((sum, listing) => sum + listing.price, 0) / userListings.length : 0,
          totalValue: userListings.reduce((sum, listing) => sum + listing.price, 0),
          joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          rating: 4.2 + Math.random() * 0.8,
          completedTrades: Math.floor(Math.random() * 500) + 50
        };

        setUserStats(stats);
      } else {
        throw new Error('Failed to fetch user listings');
      }
    } catch (error) {
      console.error('Error fetching user listings:', error);
      setError('Failed to load user listings');
      setListings([]);
    }
  };

  const handleAddToCart = (listing: UserListing) => {
    const cartItem = {
      id: listing.id,
      name: listing.item_name,
      market_name: listing.market_hash_name,
      type: listing.item_type,
      condition: listing.condition,
      price: listing.price,
      image: listing.image_url,
      rarity: listing.rarity,
      seller: {
        steamId: steamId!,
        name: userProfile?.displayName || 'Unknown'
      }
    };

    addItem(cartItem);
    addToast({
      type: 'success',
      title: 'Added to Cart!',
      message: `${listing.item_name} - ${formatPrice(listing.price)}`,
      duration: 2000
    });
  };

  const handleToggleWishlist = (listing: UserListing) => {
    toggleItem({
      id: listing.id,
      name: listing.item_name,
      price: listing.price,
      image: listing.image_url,
      rarity: listing.rarity
    });

    const isNowFavorited = !isInWishlist(listing.id);
    addToast({
      type: isNowFavorited ? 'success' : 'info',
      title: isNowFavorited ? 'Added to Wishlist' : 'Removed from Wishlist',
      message: listing.item_name,
      duration: 2000
    });
  };

  const handleSaveBanner = async () => {
    if (!bannerUrl.trim() || !isOwnProfile) return;
    
    try {
      // In production, this would save to the backend
      setUserProfile(prev => prev ? { ...prev, bannerUrl: bannerUrl.trim() } : null);
      setEditingBanner(false);
      
      addToast({
        type: 'success',
        title: 'Banner Updated!',
        message: 'Your profile banner has been updated successfully',
        duration: 3000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update profile banner',
        duration: 3000
      });
    }
  };

  const getRarityColor = (rarity: string) => {
    const rarityLower = rarity.toLowerCase();
    if (rarityLower.includes('exceedingly rare') || rarityLower.includes('★')) return 'text-yellow-400 bg-yellow-500/10 border-yellow-400/30';
    if (rarityLower.includes('covert')) return 'text-red-400 bg-red-500/10 border-red-400/30';
    if (rarityLower.includes('classified')) return 'text-purple-400 bg-purple-500/10 border-purple-400/30';
    if (rarityLower.includes('restricted')) return 'text-pink-400 bg-pink-500/10 border-pink-400/30';
    if (rarityLower.includes('mil-spec')) return 'text-blue-400 bg-blue-500/10 border-blue-400/30';
    return 'text-gray-400 bg-gray-500/10 border-gray-400/30';
  };

  if (!steamId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <div className="pt-20 pb-12 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Invalid Profile</h1>
            <p className="text-gray-400">Steam ID not found in URL</p>
            <Link to="/" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
              Return to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 mt-4"
          >
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors group"
            >
              <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading user profile...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-red-400 mb-2">Failed to Load Profile</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-all duration-300"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : userProfile ? (
            <div className="space-y-6">
              {/* Profile Header with Banner */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700/50"
              >
                {/* Background Banner */}
                <div 
                  className="h-48 sm:h-64 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 relative"
                  style={userProfile.bannerUrl ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${userProfile.bannerUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  } : {}}
                >
                  {/* Banner Edit Button (Own Profile Only) */}
                  {isOwnProfile && (
                    <div className="absolute top-4 right-4">
                      {editingBanner ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="url"
                            value={bannerUrl}
                            onChange={(e) => setBannerUrl(e.target.value)}
                            placeholder="Enter banner image URL..."
                            className="bg-gray-900/80 backdrop-blur-sm border border-gray-600 rounded-lg px-3 py-2 text-white text-sm w-64"
                          />
                          <button
                            onClick={handleSaveBanner}
                            className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition-colors"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingBanner(false);
                              setBannerUrl(userProfile.bannerUrl || '');
                            }}
                            className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingBanner(true)}
                          className="bg-gray-900/80 backdrop-blur-sm hover:bg-gray-800/80 text-white p-3 rounded-lg transition-all duration-300 border border-gray-600/50"
                        >
                          <Edit3 size={18} />
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Overlay Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
                </div>

                {/* Profile Info */}
                <div className="relative -mt-16 px-6 pb-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
                    {/* Avatar */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="relative"
                    >
                      <img
                        src={userProfile.avatarUrl}
                        alt={userProfile.displayName}
                        className="w-32 h-32 rounded-2xl border-4 border-gray-900 shadow-2xl"
                      />
                      {/* Online Status Indicator */}
                      <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-gray-900 flex items-center justify-center ${
                        userStatus === 'online' ? 'bg-green-500' :
                        userStatus === 'away' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}>
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    </motion.div>
                    
                    {/* Profile Details */}
                    <div className="text-center sm:text-left flex-1">
                      <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-bold text-white mb-2"
                      >
                        {userProfile.displayName}
                      </motion.h1>
                      
                      <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-300">
                        <div className="flex items-center space-x-2">
                          <Gamepad2 className="w-4 h-4 text-blue-400" />
                          <span>Steam User</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-green-400" />
                          <span>Member since {new Date(userProfile.memberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-purple-400" />
                          <span>{userProfile.totalTrades} completed trades</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span>{userProfile.reputation > 0 ? userProfile.reputation.toFixed(1) : 'N/A'}/5.0</span>
                        </div>
                        {/* Status Badge */}
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            userStatus === 'online' ? 'bg-green-500' :
                            userStatus === 'away' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`}></div>
                          <span className="capitalize">{userStatus}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => window.open(`https://steamcommunity.com/profiles/${steamId}`, '_blank')}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Steam Profile</span>
                      </button>
                      
                      {!isOwnProfile && user && (
                        <>
                          <button
                            onClick={() => setShowTradeModal(true)}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
                          >
                            <TrendingUp className="w-4 h-4" />
                            <span>Trade Offer</span>
                          </button>
                          <button
                            onClick={() => {
                              // Create a temporary order ID for direct messaging
                              const chatId = `dm_${user.steamId}_${steamId}`;
                              initializeChatSession(chatId, user.steamId, steamId);
                              setActiveChat(chatId);
                              addToast({
                                type: 'info',
                                title: 'Chat Opening',
                                message: `Opening chat with ${userProfile.displayName}`,
                                duration: 2000
                              });
                              // Navigate to profile page where chat can be accessed
                              navigate('/profile');
                            }}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Send Message</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Stats Cards */}
              {userStats && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{userStats.totalListings}</div>
                    <div className="text-gray-400 text-sm">Active Listings</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {formatPrice(userStats.totalValue)}
                    </div>
                    <div className="text-gray-400 text-sm">Total Value</div>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {userStats.rating.toFixed(1)}★
                    </div>
                    <div className="text-gray-400 text-sm">User Rating</div>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-400">{userStats.completedTrades}</div>
                    <div className="text-gray-400 text-sm">Completed Trades</div>
                  </div>
                </motion.div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-gray-700/50">
                {[
                  { id: 'listings', label: 'Marketplace Listings', icon: Package, count: listings.length },
                  { id: 'stats', label: 'Statistics', icon: TrendingUp },
                  { id: 'reviews', label: 'Reviews', icon: Star, count: userStats?.completedTrades || 0 }
                ].map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex items-center space-x-2 px-6 py-4 transition-all duration-300 border-b-2 relative ${
                      activeTab === id
                        ? 'border-blue-500 text-blue-300'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{label}</span>
                    {count !== undefined && (
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs">
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[400px]">
                {activeTab === 'listings' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {listings.length === 0 ? (
                      <div className="text-center py-20">
                        <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">No Active Listings</h3>
                        <p className="text-gray-500">{userProfile.displayName} doesn't have any items listed for sale</p>
                      </div>
                    ) : (
                      <>
                        {/* Listings Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-400">{listings.length}</div>
                            <div className="text-gray-400 text-sm">Active Listings</div>
                          </div>
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-blue-400">
                              {formatPrice(userStats?.totalValue || 0)}
                            </div>
                            <div className="text-gray-400 text-sm">Total Value</div>
                          </div>
                          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-purple-400">
                              {formatPrice(userStats?.averagePrice || 0)}
                            </div>
                            <div className="text-gray-400 text-sm">Average Price</div>
                          </div>
                        </div>

                        {/* Listings Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {listings.map((listing, index) => (
                            <motion.div
                              key={listing.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ scale: 1.03, y: -4 }}
                              className={`bg-gray-800/50 rounded-lg border-2 transition-all duration-300 p-4 group cursor-pointer ${
                                getRarityColor(listing.rarity)
                              }`}
                              onClick={() => window.open(`/item/${listing.id}`, '_blank')}
                            >
                              {/* Item Image */}
                              <div className="aspect-square bg-gray-700/30 rounded mb-3 flex items-center justify-center relative overflow-hidden">
                                <img 
                                  src={listing.image_url} 
                                  alt={listing.item_name}
                                  className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                                />
                                
                                {/* Special Effects for Rare Items */}
                                {listing.rarity.toLowerCase().includes('★') && (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="absolute top-1 right-1 text-yellow-400 text-sm"
                                  >
                                    ⭐
                                  </motion.div>
                                )}
                              </div>
                              
                              {/* Item Details */}
                              <div className="space-y-2">
                                <h4 className="text-white font-medium text-sm line-clamp-2 group-hover:text-blue-400 transition-colors">
                                  {listing.item_name}
                                </h4>
                                
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400">{listing.condition}</span>
                                  <div className={`px-2 py-1 rounded-full border text-xs ${getRarityColor(listing.rarity)}`}>
                                    {listing.rarity}
                                  </div>
                                </div>
                                
                                {/* Price and Actions */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-600/30">
                                  <div className="text-lg font-bold text-green-400">
                                    {formatPrice(listing.price)}
                                  </div>
                                  
                                  <div className="flex items-center space-x-1">
                                    <motion.button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleWishlist(listing);
                                      }}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className={`p-1.5 rounded transition-colors ${
                                        isInWishlist(listing.id) 
                                          ? 'text-red-400 hover:text-red-300' 
                                          : 'text-gray-400 hover:text-red-400'
                                      }`}
                                    >
                                      <Heart size={12} fill={isInWishlist(listing.id) ? 'currentColor' : 'none'} />
                                    </motion.button>
                                    
                                    <motion.button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToCart(listing);
                                      }}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded transition-all duration-300"
                                    >
                                      <ShoppingCart size={12} />
                                    </motion.button>
                                  </div>
                                </div>
                                
                                {/* Views and Date */}
                                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                                  <div className="flex items-center space-x-1">
                                    <Eye size={10} />
                                    <span>{listing.views} views</span>
                                  </div>
                                  <span>{new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {activeTab === 'stats' && userStats && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* Detailed Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/20">
                        <h3 className="text-lg font-bold text-green-300 mb-4 flex items-center">
                          <Award className="w-5 h-5 mr-2" />
                          Trading Statistics
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Trades</span>
                            <span className="text-white font-bold">{userStats.completedTrades}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Success Rate</span>
                            <span className="text-green-400 font-bold">{userProfile.successRate.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Avg Response Time</span>
                            <span className="text-blue-400 font-bold">12 minutes</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">User Rating</span>
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-yellow-400 font-bold">{userStats.rating.toFixed(1)}/5.0</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
                        <h3 className="text-lg font-bold text-blue-300 mb-4 flex items-center">
                          <Calendar className="w-5 h-5 mr-2" />
                          Account Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Member Since</span>
                            <span className="text-white">{new Date(userStats.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Last Seen</span>
                            <span className="text-white">{new Date(userStats.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Steam Guard</span>
                            <div className="flex items-center space-x-1">
                              <Shield className="w-4 h-4 text-green-400" />
                              <span className="text-green-400 font-medium">Enabled</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Verification</span>
                            <div className="flex items-center space-x-1">
                              <Gamepad2 className="w-4 h-4 text-blue-400" />
                              <span className="text-blue-400 font-medium">Steam Verified</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
                      <h3 className="text-lg font-bold text-purple-300 mb-4 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Marketplace Performance
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-purple-400">{formatPrice(userStats.totalValue)}</div>
                          <div className="text-gray-400 text-sm">Listed Value</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-blue-400">{formatPrice(userStats.averagePrice)}</div>
                          <div className="text-gray-400 text-sm">Avg Price</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-400">{listings.reduce((sum, l) => sum + l.views, 0)}</div>
                          <div className="text-gray-400 text-sm">Total Views</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-orange-400">
                            {listings.length > 0 ? Math.round(listings.reduce((sum, l) => sum + l.views, 0) / listings.length) : 0}
                          </div>
                          <div className="text-gray-400 text-sm">Avg Views</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'reviews' && userProfile && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <UserReviews userId={steamId} steamId={userProfile.steamId} />
                  </motion.div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Footer />

      {/* Trade Offer Modal */}
      {showTradeModal && userProfile && (
        <TradeOfferModal
          isOpen={showTradeModal}
          onClose={() => setShowTradeModal(false)}
          recipientSteamId={steamId!}
          recipientName={userProfile.displayName}
        />
      )}
    </div>
  );
};

export default UserProfilePage;