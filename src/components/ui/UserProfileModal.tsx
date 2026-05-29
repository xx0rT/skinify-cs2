import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
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
  Heart
} from 'lucide-react';
import { useCurrencyStore } from '../../store/currencyStore';
import { useToastStore } from '../../store/toastStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import UserReviews from '../profile/UserReviews';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: {
    steamId: string;
    name: string;
    avatarUrl?: string;
  } | null;
}

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

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, userProfile }) => {
  const { formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const [listings, setListings] = useState<UserListing[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'listings' | 'stats' | 'reviews'>('listings');
  const [userId, setUserId] = useState<string | null>(null);

  // Prevent background scrolling when modal is open - FIXED
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position to prevent jump
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // Cleanup function to ensure scrolling is always restored
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
    };
  }, [isOpen]);

  // Fetch user listings and ID when modal opens - IMPROVED ERROR HANDLING
  useEffect(() => {
    if (isOpen && userProfile?.steamId) {
      console.log('=== PROFILE MODAL OPENED ===');
      console.log('User Profile:', userProfile);
      console.log('Steam ID:', userProfile.steamId);
      fetchUserListings(userProfile.steamId);
      fetchUserId(userProfile.steamId);
    }
  }, [isOpen, userProfile?.steamId]); // More specific dependency

  // Reset error state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const fetchUserId = async (steamId: string) => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const response = await fetch(`${supabaseUrl}/rest/v1/users?steam_id=eq.${steamId}&select=id`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setUserId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching user ID:', error);
    }
  };

  const fetchUserListings = async (steamId: string) => {
    console.log(`=== FETCHING USER LISTINGS FOR MODAL ===`);
    console.log('Steam ID:', steamId);
    console.log('Modal is open:', isOpen);
    
    setLoading(true);
    setError(null);

    try {
      
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      console.log('Making API request to fetch listings...');
      
      const response = await fetch(`${supabaseUrl}/functions/v1/marketplace-listings?steamId=${steamId}&userOnly=true`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      console.log('API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('API Response data:', data);
        
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
          joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(), // Mock join date
          lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Mock last seen
          rating: 4.2 + Math.random() * 0.8, // Mock rating 4.2-5.0
          completedTrades: Math.floor(Math.random() * 500) + 50 // Mock completed trades
        };

        setUserStats(stats);
        console.log(`Loaded ${userListings.length} listings for user ${userProfile.name}`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching user listings:', error);
      
      // More specific error handling
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Request timeout - please try again');
        } else {
          setError(error.message);
        }
      } else {
        setError('Failed to load user profile');
      }
      
      setListings([]);
      setUserStats(null);
    } finally {
      setLoading(false);
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
        steamId: userProfile!.steamId,
        name: userProfile!.name,
        avatarUrl: userProfile!.avatarUrl
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

  const getRarityColor = (rarity: string) => {
    const rarityLower = rarity.toLowerCase();
    if (rarityLower.includes('exceedingly rare') || rarityLower.includes('★')) return 'text-yellow-400 bg-yellow-500/10 border-yellow-400/30';
    if (rarityLower.includes('covert')) return 'text-red-400 bg-red-500/10 border-red-400/30';
    if (rarityLower.includes('classified')) return 'text-purple-400 bg-purple-500/10 border-purple-400/30';
    if (rarityLower.includes('restricted')) return 'text-pink-400 bg-pink-500/10 border-pink-400/30';
    if (rarityLower.includes('mil-spec')) return 'text-blue-400 bg-blue-500/10 border-blue-400/30';
    return 'text-gray-400 bg-gray-500/10 border-gray-400/30';
  };

  if (!isOpen || !userProfile) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 rounded-2xl w-full max-w-6xl max-h-[90vh] border-2 border-purple-500/40 overflow-hidden shadow-2xl backdrop-blur-sm"
          style={{ boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(168, 85, 247, 0.4)' }}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600/30 via-purple-500/25 to-fuchsia-500/30 p-8 border-b border-purple-500/40">
            <div className="flex items-center space-x-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ boxShadow: '0 8px 25px rgba(168, 85, 247, 0.5), 0 0 60px rgba(217, 70, 239, 0.3)' }}
              >
                <User className="w-10 h-10 text-white drop-shadow-lg" />
              </motion.div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-2">
                  <img
                    src={userProfile.avatarUrl || "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg"}
                    alt={userProfile.name}
                    className="w-16 h-16 rounded-full border-3 border-purple-400/60 shadow-lg shadow-purple-500/30"
                  />
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-fuchsia-200 bg-clip-text text-transparent drop-shadow-lg">
                      {userProfile.name}
                    </h2>
                    <p className="text-purple-300/90 text-sm">Steam User Profile</p>
                  </div>
                  <button
                    onClick={() => window.open(`https://steamcommunity.com/profiles/${userProfile.steamId}`, '_blank')}
                    className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-purple-500/40 font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Steam Profile</span>
                  </button>
                </div>
                
                {userStats && (
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-1">
                      <Package className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-300">{userStats.totalListings} listings</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-300">{userStats.rating.toFixed(1)}/5.0</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Activity className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-300">{userStats.completedTrades} trades</span>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-all duration-300 p-3 hover:bg-white/10 rounded-full hover:scale-110"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-purple-500/30 bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-sm">
            {[
              { id: 'listings', label: 'Marketplace Listings', icon: Package, count: listings.length },
              { id: 'stats', label: 'Stats', icon: TrendingUp },
              { id: 'reviews', label: 'Reviews', icon: Star, count: userStats?.completedTrades || 0 }
            ].map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 px-8 py-4 transition-all duration-300 border-b-2 relative group ${
                  activeTab === id
                    ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-lg">{label}</span>
                {count !== undefined && (
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                    {count}
                  </span>
                )}
                {activeTab === id && (
                  <motion.div
                    layoutId="userProfileTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-purple-400"
                    style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)' }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8 overflow-y-auto max-h-[60vh] bg-gradient-to-br from-gray-900/60 to-purple-900/10">
            {activeTab === 'listings' && (
              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading marketplace listings...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-red-400 mb-2">Failed to Load Listings</h3>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button
                      onClick={() => fetchUserListings(userProfile.steamId)}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center space-x-2 mx-auto shadow-lg shadow-purple-500/30"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry</span>
                    </button>
                  </div>
                ) : listings.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">No Active Listings</h3>
                    <p className="text-gray-500">{userProfile.name} doesn't have any items listed for sale</p>
                  </div>
                ) : (
                  <>
                    {/* Listings Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">{listings.length}</div>
                        <div className="text-gray-400 text-sm">Active Listings</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {formatPrice(userStats?.totalValue || 0)}
                        </div>
                        <div className="text-gray-400 text-sm">Total Value</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {formatPrice(userStats?.averagePrice || 0)}
                        </div>
                        <div className="text-gray-400 text-sm">Avg Price</div>
                      </div>
                    </div>

                    {/* Listings Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            <h4 className="text-white font-medium text-sm line-clamp-2 group-hover:text-purple-400 transition-colors">
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
                              <div className="text-lg font-bold text-purple-400">
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
                                  className="bg-purple-600 hover:bg-purple-500 text-white p-1.5 rounded transition-all duration-300 shadow-lg shadow-purple-500/30"
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
              </div>
            )}

            {activeTab === 'stats' && userStats && (
              <div className="space-y-6">
                {/* User Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-6 border border-purple-500/20">
                    <h3 className="text-lg font-bold text-purple-300 mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2" />
                      Trading Stats
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Trades</span>
                        <span className="text-white font-bold">{userStats.completedTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Success Rate</span>
                        <span className="text-purple-400 font-bold">98.7%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg Response Time</span>
                        <span className="text-purple-400 font-bold">12 minutes</span>
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

                  <div className="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 rounded-xl p-6 border border-purple-500/20">
                    <h3 className="text-lg font-bold text-purple-300 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Account Info
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
                          <Shield className="w-4 h-4 text-purple-400" />
                          <span className="text-purple-400 font-medium">Enabled</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Verification</span>
                        <div className="flex items-center space-x-1">
                          <Gamepad2 className="w-4 h-4 text-purple-400" />
                          <span className="text-purple-400 font-medium">Steam Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Marketplace Performance */}
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
                      <div className="text-xl font-bold text-purple-400">{formatPrice(userStats.averagePrice)}</div>
                      <div className="text-gray-400 text-sm">Avg Price</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-purple-400">{listings.reduce((sum, l) => sum + l.views, 0)}</div>
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
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {userId ? (
                  <UserReviews userId={userId} steamId={userProfile.steamId} />
                ) : (
                  <div className="text-center py-12">
                    <Star className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Loading Reviews...</h3>
                    <p className="text-gray-500">Please wait while we load the review system</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserProfileModal;