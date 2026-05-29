import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Heart, Filter, Grid2x2 as Grid, List, Menu, X, User, Wallet, Star, TrendingUp, Package, Gamepad2, Plus, Minus, Eye, Share2, Settings, Bell, DollarSign, Crown, Gift, ArrowRight, ChevronDown, Zap, Sparkles, Siren as Fire, Home, Shield, Clock, CheckCircle, Users, Award, TrendingDown, Target, Activity, Percent, Globe, Mail, Phone, ExternalLink, Calendar, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useHotItems } from '../hooks/useHotItems';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useBalanceStore } from '../store/balanceStore';
import { useToastStore } from '../store/toastStore';
import { useCurrencyStore } from '../store/currencyStore';
import SteamLogin from '../components/auth/SteamLogin';
import UserProfile from '../components/auth/UserProfile';
import Footer from '../components/Footer';
import { handleImageError } from '../utils/imageErrorHandler';
import { StyledPrice } from '../utils/formatPrice';


const MobileLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, loading, error, refetch } = useMarketplaceItems();
  const { hotItems, loading: hotLoading } = useHotItems(6);
  const { addItem, getItemCount } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { balance, fetchBalance } = useBalanceStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();
  
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'newest' | 'popular'>('newest');
  const [activeTab, setActiveTab] = useState<'featured' | 'market' | 'hot'>('featured');
  const [showFullStats, setShowFullStats] = useState(false);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [marketStatistics, setMarketStatistics] = useState({
    itemsSoldToday: 0,
    activeTraders: 0,
    totalVolume: 0,
    avgResponse: 0
  });
  const [bestSellersWeek, setBestSellersWeek] = useState<any[]>([]);
  const [topShops, setTopShops] = useState<any[]>([]);
  const [categoryPreviews, setCategoryPreviews] = useState<any[]>([]);

  const cartCount = getItemCount();

  // Debug logging
  useEffect(() => {
    console.log('📱 MobileLandingPage mounted', {
      itemsCount: items.length,
      loading,
      error,
      user: user?.displayName,
      timestamp: new Date().toISOString()
    });
  }, [items.length, loading, error, user]);

  // Fetch balance when user is available
  useEffect(() => {
    if (user) {
      fetchBalance(user.steamId);
    }
  }, [user, fetchBalance]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (showMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMenu]);

  // Fetch real category stats from database
  useEffect(() => {
    const fetchCategoryStats = async () => {
      try {
        const { data: listings, error } = await supabase
          .from('marketplace_listings')
          .select('item_type')
          .eq('is_active', true);

        if (error) throw error;

        const categoryMap: { [key: string]: { id: string; name: string; types: string[]; color: string } } = {
          rifles: { id: 'rifles', name: 'Rifles', types: ['Rifle', 'Sniper Rifle'], color: 'from-red-500 to-orange-500' },
          pistols: { id: 'pistols', name: 'Pistols', types: ['Pistol'], color: 'from-blue-500 to-cyan-500' },
          knives: { id: 'knives', name: 'Knives', types: ['Knife'], color: 'from-yellow-500 to-orange-500' },
          gloves: { id: 'gloves', name: 'Gloves', types: ['Gloves'], color: 'from-green-500 to-emerald-500' },
          smgs: { id: 'smgs', name: 'SMGs', types: ['SMG'], color: 'from-cyan-500 to-blue-500' },
          heavy: { id: 'heavy', name: 'Heavy', types: ['Shotgun', 'Machinegun'], color: 'from-orange-500 to-red-500' }
        };

        const stats = Object.values(categoryMap).map(cat => {
          const count = listings?.filter(l => cat.types.includes(l.item_type)).length || 0;
          return { ...cat, count };
        });

        setCategoryStats(stats);

        // Fetch category previews (top 3 items per category)
        const previews = await Promise.all(
          Object.values(categoryMap).slice(0, 3).map(async (cat) => {
            const { data: items, error: itemsError } = await supabase
              .from('marketplace_listings')
              .select('id, item_name, price, image_url, rarity')
              .eq('is_active', true)
              .in('item_type', cat.types)
              .order('views', { ascending: false })
              .limit(3);

            return {
              category: cat.name,
              categoryId: cat.id,
              items: items || []
            };
          })
        );

        setCategoryPreviews(previews.filter(p => p.items.length > 0));
      } catch (error) {
        console.error('Error fetching category stats:', error);
      }
    };

    fetchCategoryStats();
  }, []);

  // Fetch real market statistics
  useEffect(() => {
    const fetchMarketStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, created_at')
          .gte('created_at', today.toISOString())
          .eq('status', 'completed');

        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id')
          .gte('last_login', new Date(Date.now() - 3600000).toISOString());

        const { data: listings, error: listingsError } = await supabase
          .from('marketplace_listings')
          .select('price')
          .eq('is_active', true);

        if (!ordersError && !usersError && !listingsError) {
          const totalVolume = listings?.reduce((sum, l) => sum + Number(l.price), 0) || 0;

          setMarketStatistics({
            itemsSoldToday: orders?.length || 0,
            activeTraders: users?.length || 0,
            totalVolume: totalVolume,
            avgResponse: 2
          });
        }
      } catch (error) {
        console.error('Error fetching market stats:', error);
      }
    };

    fetchMarketStats();
  }, []);

  // Fetch best sellers of the week
  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentItems, error } = await supabase
          .from('marketplace_listings')
          .select('id, item_name, price, image_url, rarity, item_type, views')
          .eq('is_active', true)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('views', { ascending: false })
          .limit(6);

        if (error) throw error;

        setBestSellersWeek(recentItems || []);
      } catch (error) {
        console.error('Error fetching best sellers:', error);
      }
    };

    fetchBestSellers();
  }, []);

  // Fetch top shops
  useEffect(() => {
    const fetchTopShops = async () => {
      try {
        const { data: shops, error } = await supabase
          .from('user_shops')
          .select(`
            id,
            shop_name,
            description,
            user_id,
            users!user_shops_user_id_fkey(display_name, avatar_url)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;

        // Get item count for each shop
        const shopsWithCounts = await Promise.all(
          (shops || []).map(async (shop: any) => {
            const { data: listings } = await supabase
              .from('marketplace_listings')
              .select('id', { count: 'exact' })
              .eq('user_id', shop.user_id)
              .eq('is_active', true);

            return {
              id: shop.id,
              name: shop.shop_name,
              description: shop.description,
              ownerName: shop.users?.display_name || 'Unknown',
              ownerAvatar: shop.users?.avatar_url,
              itemCount: listings?.length || 0,
              userId: shop.user_id,
              shopUrl: shop.shop_url
            };
          })
        );

        setTopShops(shopsWithCounts.filter(s => s.itemCount > 0));
      } catch (error) {
        console.error('Error fetching top shops:', error);
      }
    };

    fetchTopShops();
  }, []);

  const trustIndicators = [
    { icon: Shield, label: '256-bit SSL', value: 'Bank-grade security', color: 'text-purple-400' },
    { icon: Users, label: '1M+ Traders', value: 'Trusted community', color: 'text-purple-400' },
    { icon: CheckCircle, label: '99.9% Success', value: 'Secure trades', color: 'text-purple-400' },
    { icon: Clock, label: '24/7 Support', value: 'Always available', color: 'text-purple-400' }
  ];

  const marketStats = [
    { label: 'Items Sold Today', value: marketStatistics.itemsSoldToday.toString(), trend: '+12%', icon: TrendingUp, color: 'text-purple-400' },
    { label: 'Active Traders', value: marketStatistics.activeTraders.toString(), trend: '+8%', icon: Users, color: 'text-purple-400' },
    { label: 'Total Volume', value: formatPrice(marketStatistics.totalVolume), trend: '+23%', icon: DollarSign, color: 'text-purple-400' },
    { label: 'Avg Response', value: `${marketStatistics.avgResponse} min`, trend: '-15%', icon: Clock, color: 'text-purple-400' }
  ];

  // Filter items based on search, category, price, condition
  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.market_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory ||
      item.type.toLowerCase().includes(selectedCategory) ||
      (selectedCategory === 'knives' && item.name.includes('★')) ||
      (selectedCategory === 'rifles' && (item.name.includes('AK-47') || item.name.includes('M4') || item.name.includes('AWP')));

    const matchesPrice = !priceRange ||
      (item.price >= priceRange.min && item.price <= priceRange.max);

    const matchesCondition = !selectedCondition ||
      item.condition?.toLowerCase().includes(selectedCondition.toLowerCase());

    return matchesSearch && matchesCategory && matchesPrice && matchesCondition;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'newest':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case 'popular':
        return (b.views || 0) - (a.views || 0);
      default:
        return 0;
    }
  });

  const handleAddToCart = (item: any) => {
    const cartItem = {
      id: item.id,
      name: item.name,
      market_name: item.market_name,
      type: item.type,
      condition: item.condition,
      price: item.price,
      image: item.image,
      rarity: item.rarity,
      seller: item.seller || { steamId: 'unknown', name: 'Unknown Seller' }
    };

    addItem(cartItem);
    addToast({
      type: 'success',
      title: 'Added to Cart!',
      message: `${item.name}`,
      duration: 2000
    });
  };

  const handleToggleWishlist = (item: any) => {
    toggleItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      rarity: item.rarity
    });

    const isNowFavorited = !isInWishlist(item.id);
    addToast({
      type: isNowFavorited ? 'success' : 'info',
      title: isNowFavorited ? 'Added to Wishlist' : 'Removed from Wishlist',
      message: item.name,
      duration: 2000
    });
  };

  const getRarityColor = (rarity: string) => {
    const rarityLower = rarity.toLowerCase();
    if (rarityLower.includes('exceedingly rare') || rarityLower.includes('★')) {
      return 'border-yellow-400/50 bg-yellow-500/10';
    }
    if (rarityLower.includes('covert')) return 'border-red-400/50 bg-red-500/10';
    if (rarityLower.includes('classified')) return 'border-purple-400/50 bg-purple-500/10';
    if (rarityLower.includes('restricted')) return 'border-pink-400/50 bg-pink-500/10';
    if (rarityLower.includes('mil-spec')) return 'border-blue-400/50 bg-blue-500/10';
    return 'border-gray-400/50 bg-gray-500/10';
  };

  console.log('📱 MobileLandingPage render:', { activeTab, items: items.length });

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-x-hidden">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-purple-500/30">
        <div className="flex items-center justify-between p-4">
          {/* Logo */}
          <motion.div
            onClick={() => setActiveTab('featured')}
            className="flex items-center space-x-2"
            whileTap={{ scale: 0.95 }}
          >
            <img
              src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
              alt="Skinify"
              className="h-8 w-auto object-contain"
            />
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Skinify
            </span>
          </motion.div>

          {/* Header Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Icon */}
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-gray-300 hover:text-white transition-colors"
            >
              <Search size={20} />
            </motion.button>

            {/* Cart */}
            <motion.button
              onClick={() => navigate('/cart')}
              whileTap={{ scale: 0.9 }}
              className="relative p-2 text-gray-300 hover:text-white transition-colors"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </motion.button>

            {/* Menu */}
            <motion.button
              onClick={() => setShowMenu(!showMenu)}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-gray-300 hover:text-white transition-colors"
            >
              {showMenu ? <X size={20} /> : <Menu size={20} />}
            </motion.button>
          </div>
        </div>

        {/* Enhanced Filter Panel (Collapsible) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-gray-700/50"
            >
              <div className="p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search CS2 items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* Sort By */}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-2 block">Sort By</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'newest', label: 'Newest' },
                      { id: 'price_asc', label: 'Price: Low-High' },
                      { id: 'price_desc', label: 'Price: High-Low' },
                      { id: 'popular', label: 'Most Popular' }
                    ].map((sort) => (
                      <button
                        key={sort.id}
                        onClick={() => setSortBy(sort.id as any)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          sortBy === sort.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        }`}
                      >
                        {sort.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Filters */}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-2 block">Categories</label>
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {[
                      { id: null, name: 'All' },
                      { id: 'knives', name: '🔪 Knives' },
                      { id: 'rifles', name: '🔫 Rifles' },
                      { id: 'pistol', name: '🔫 Pistols' },
                      { id: 'gloves', name: '🧤 Gloves' }
                    ].map((cat) => (
                      <button
                        key={cat.id || 'all'}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === cat.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-2 block">Price Range</label>
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {[
                      { id: null, label: 'Any', min: 0, max: Infinity },
                      { id: 'under_1000', label: '< 1,000 Kč', min: 0, max: 1000 },
                      { id: 'under_5000', label: '< 5,000 Kč', min: 0, max: 5000 },
                      { id: 'under_10000', label: '< 10,000 Kč', min: 0, max: 10000 },
                      { id: 'over_10000', label: '> 10,000 Kč', min: 10000, max: Infinity }
                    ].map((range) => (
                      <button
                        key={range.id || 'any'}
                        onClick={() => setPriceRange(range.id ? { min: range.min, max: range.max } : null)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          (priceRange?.min === range.min && priceRange?.max === range.max) || (!priceRange && !range.id)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Condition Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-2 block">Condition</label>
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {[
                      { id: null, name: 'All' },
                      { id: 'factory new', name: 'FN' },
                      { id: 'minimal wear', name: 'MW' },
                      { id: 'field-tested', name: 'FT' },
                      { id: 'well-worn', name: 'WW' },
                      { id: 'battle-scarred', name: 'BS' }
                    ].map((cond) => (
                      <button
                        key={cond.id || 'all'}
                        onClick={() => setSelectedCondition(cond.id)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedCondition === cond.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        }`}
                      >
                        {cond.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters Button */}
                {(searchQuery || selectedCategory || priceRange || selectedCondition || sortBy !== 'newest') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory(null);
                      setPriceRange(null);
                      setSelectedCondition(null);
                      setSortBy('newest');
                    }}
                    className="w-full bg-gray-700/50 hover:bg-gray-600/50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Navigation Tabs */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-gray-800/90 backdrop-blur-xl border-b border-gray-700/50">
        <div className="flex">
          {[
            { id: 'featured', label: 'Featured', icon: Star },
            { id: 'market', label: 'Market', icon: Package },
            { id: 'hot', label: 'Hot Items', icon: Fire }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                if (id === 'market') {
                  navigate('/marketplace');
                } else {
                  setActiveTab(id as any);
                }
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-all duration-300 ${
                activeTab === id
                  ? 'text-purple-400 bg-purple-500/20 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Side Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-80 bg-gray-900/95 backdrop-blur-xl border-l border-purple-500/30 z-50 overflow-y-auto"
            >
              <div className="p-4">
                {/* Menu Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Menu</h2>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* User Section */}
                <div className="mb-6">
                  {user ? (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="w-12 h-12 rounded-full border-2 border-purple-500/50"
                        />
                        <div>
                          <div className="text-white font-semibold">{user.displayName}</div>
                          <div className="text-purple-300 text-sm">Steam User</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-400">Balance:</span>
                        <span className="text-green-400 font-bold">
                          {showBalance ? (
                            <StyledPrice
                              price={balance}
                              wholeClassName="text-white"
                              decimalClassName="text-white/70"
                              symbolClassName="text-white"
                            />
                          ) : '••••••'}
                        </span>
                        <button
                          onClick={() => setShowBalance(!showBalance)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => navigate('/profile?tab=balance')}
                          className="bg-green-600 hover:bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <Plus size={14} />
                          <span>Deposit</span>
                        </button>
                        <button
                          onClick={() => navigate('/profile')}
                          className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <User size={14} />
                          <span>Profile</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                      <Gamepad2 className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                      <h3 className="text-white font-semibold mb-2">Sign In Required</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Sign in with Steam to start trading CS2 items
                      </p>
                      <SteamLogin />
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="space-y-2">
                  {[
                    { icon: Home, label: 'Home', onClick: () => navigate('/') },
                    { icon: Package, label: 'Marketplace', onClick: () => navigate('/marketplace') },
                    { icon: ShoppingCart, label: 'Cart', onClick: () => navigate('/cart'), badge: cartCount },
                    { icon: Heart, label: 'Wishlist', onClick: () => navigate('/profile?tab=wishlist') },
                    { icon: Star, label: 'Rewards', onClick: () => navigate('/rewards') },
                    { icon: Crown, label: 'VIP', onClick: () => navigate('/vip') },
                    { icon: Gift, label: 'Bonuses', onClick: () => navigate('/bonuses') },
                    { icon: Settings, label: 'Settings', onClick: () => navigate('/profile?tab=settings') }
                  ].map(({ icon: Icon, label, onClick, badge }) => (
                    <button
                      key={label}
                      onClick={() => {
                        onClick();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center justify-between p-3 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-300"
                    >
                      <div className="flex items-center space-x-3">
                        <Icon size={20} />
                        <span>{label}</span>
                      </div>
                      {badge && badge > 0 && (
                        <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="pb-6 pt-[104px]">
        {/* Hero Section */}
        {activeTab === 'featured' && (
          <>
            {/* Hero Banner */}
            <div className="p-4 mb-4">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/30 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10"></div>
                <div className="relative z-10">
                  <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Premium CS2 Marketplace
                  </h1>
                  <p className="text-gray-300 text-sm mb-4">
                    Buy, sell & trade CS2 skins safely with 2% fees
                  </p>
                  
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">1M+</div>
                      <div className="text-gray-400 text-xs">Traders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-400">99.9%</div>
                      <div className="text-gray-400 text-xs">Safe</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-400">24/7</div>
                      <div className="text-gray-400 text-xs">Support</div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/marketplace')}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Package size={16} />
                    <span>Browse Market</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Categories Slider */}
            <div className="mb-6">
              <div className="px-4 mb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-purple-400" />
                  Browse Categories
                </h2>
              </div>
              <div className="overflow-hidden">
                <div className="flex space-x-3 overflow-x-auto px-4 pb-3 scrollbar-hide snap-x snap-mandatory">
                  {categoryStats.map((category, index) => (
                    <motion.button
                      key={category.id}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        navigate(`/weapons/${category.id}`);
                      }}
                      className="flex-shrink-0 w-36 snap-center"
                    >
                      <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 border border-purple-500/30 rounded-xl p-4 text-center hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all h-full">
                        <div className="text-white font-medium text-sm mb-2">{category.name}</div>
                        <div className="text-purple-400 text-xs font-medium">{category.count} items</div>
                        <div className="mt-2 w-full h-1 bg-purple-500/20 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${Math.min((category.count / 100) * 100, 100)}%` }}></div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Featured Deals */}
            <div className="px-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">Featured Deals</h2>
                <button
                  onClick={() => navigate('/marketplace')}
                  className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {!hotLoading && hotItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/item/${item.id}`)}
                    className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-3 flex items-center space-x-3 hover:border-purple-400/50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center">
                      <img
                        src={item.image_url}
                        alt={item.item_name}
                        className="max-w-full max-h-full object-contain"
                        onError={handleImageError}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm truncate">{item.item_name}</h3>
                      <div className="text-gray-400 text-xs">{item.condition || 'N/A'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-bold text-sm">{formatPrice(Number(item.price))}</div>
                      <div className="text-purple-400 text-xs">{item.rarity || 'Common'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Sellers of the Week - Interactive Slider */}
            {bestSellersWeek.length > 0 && (
              <div className="mb-6">
                <div className="px-4 flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Fire className="w-5 h-5 text-orange-400" />
                    Best Sellers This Week
                  </h2>
                  <div className="text-xs text-gray-400">{bestSellersWeek.length} items</div>
                </div>
                <div className="overflow-hidden">
                  <div className="flex space-x-3 overflow-x-auto px-4 pb-3 scrollbar-hide snap-x snap-mandatory">
                    {bestSellersWeek.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => navigate(`/item/${item.id}`)}
                        className="flex-shrink-0 w-36 snap-center"
                      >
                        <div className="bg-gradient-to-br from-purple-900/20 to-gray-800/50 border border-purple-500/30 rounded-xl p-3 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer h-full">
                          <div className="relative">
                            <div className="w-full h-24 bg-gray-700/30 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                              <img
                                src={item.image_url}
                                alt={item.item_name}
                                className="max-w-full max-h-full object-contain transition-transform hover:scale-110 duration-300"
                                onError={handleImageError}
                              />
                            </div>
                            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
                              #{index + 1}
                            </div>
                          </div>
                          <h3 className="text-white font-medium text-xs truncate mb-2">{item.item_name}</h3>
                          <div className="flex flex-col space-y-1">
                            <span className="text-green-400 font-bold text-sm">{formatPrice(Number(item.price))}</span>
                            <span className="text-purple-400 text-[10px]">{item.views || 0} views</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top Shops */}
            {topShops.length > 0 && (
              <div className="px-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    Top Shops
                  </h2>
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {topShops.slice(0, 4).map((shop, index) => (
                    <div
                      key={shop.id}
                      onClick={() => navigate(`/shop/${shop.shopUrl}`)}
                      className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-3 hover:border-purple-400/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            {shop.ownerAvatar ? (
                              <img src={shop.ownerAvatar} alt={shop.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-white" />
                            )}
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                              <Crown className="w-3 h-3 text-gray-900" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-sm truncate">{shop.name}</h3>
                          <div className="text-gray-400 text-xs">{shop.ownerName}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-purple-400 font-bold text-sm">{shop.itemCount}</div>
                          <div className="text-gray-400 text-xs">items</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Previews - Interactive Sliders */}
            {categoryPreviews.length > 0 && categoryPreviews.slice(0, 3).map((preview, idx) => (
              <div key={idx} className="mb-6">
                <div className="px-4 flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white">{preview.category} Collection</h2>
                  <button
                    onClick={() => navigate(`/weapons/${preview.categoryId}`)}
                    className="text-purple-400 text-sm hover:text-purple-300 transition-colors flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-hidden">
                  <div className="flex space-x-3 overflow-x-auto px-4 pb-3 scrollbar-hide snap-x snap-mandatory">
                    {preview.items.map((item: any, index: number) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => navigate(`/item/${item.id}`)}
                        className="flex-shrink-0 w-32 snap-center"
                      >
                        <div className="bg-gray-800/50 border border-purple-500/30 rounded-xl p-2.5 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer h-full">
                          <div className="w-full h-20 bg-gray-700/30 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                            <img
                              src={item.image_url}
                              alt={item.item_name}
                              className="max-w-full max-h-full object-contain transition-transform hover:scale-110 duration-300"
                              onError={handleImageError}
                            />
                          </div>
                          <h3 className="text-white text-[10px] font-medium truncate mb-1">{item.item_name}</h3>
                          <div className="text-green-400 font-bold text-xs">{formatPrice(Number(item.price))}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Trust Indicators */}
            <div className="px-4 mb-4">
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                <h3 className="text-white font-medium text-center mb-3">Why Choose Skinify?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {trustIndicators.map((indicator, index) => (
                    <div key={index} className="text-center">
                      <indicator.icon className={`w-5 h-5 mx-auto mb-1 ${indicator.color}`} />
                      <div className="text-white text-xs font-medium">{indicator.label}</div>
                      <div className="text-gray-400 text-xs">{indicator.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Market Stats */}
            <div className="px-4 mb-6">
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                <h3 className="text-white font-medium text-center mb-3">Live Market Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  {marketStats.slice(0, 4).map((stat, index) => (
                    <div key={index} className="text-center">
                      <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                      <div className="text-white text-xs font-medium">{stat.value}</div>
                      <div className="text-gray-400 text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}


        {/* Hot Items Tab Content */}
        {activeTab === 'hot' && (
          <div className="pb-6">
            {hotLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : hotItems.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center mx-auto">
                    <Fire className="w-10 h-10 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">No Hot Items Yet</h3>
                  <p className="text-gray-400 text-sm max-w-xs mx-auto">
                    Hot items are trending items with high demand. Check back soon to discover the hottest deals in the marketplace!
                  </p>
                  <button
                    onClick={() => setActiveTab('market')}
                    className="mt-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300"
                  >
                    Browse Marketplace
                  </button>
                </motion.div>
              </div>
            ) : (
              <>
                {/* Hot Items Header */}
                <div className="px-4 py-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-y border-orange-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Fire className="w-5 h-5 text-orange-400" />
                      <h2 className="text-lg font-bold text-white">Trending Now</h2>
                    </div>
                    <div className="text-xs text-orange-400 font-medium">
                      {hotItems.length} Hot Items
                    </div>
                  </div>
                </div>

                {/* Horizontal Scrolling Hot Items Slider */}
                <div className="py-4 overflow-hidden">
                  <div className="flex space-x-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
                    {hotItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => navigate(`/item/${item.id}`)}
                        className="flex-shrink-0 w-40 snap-center"
                      >
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-orange-500/30 rounded-xl p-3 cursor-pointer hover:border-orange-400/60 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300 h-full">
                          <div className="relative">
                            <div className="aspect-square bg-gray-700/30 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="max-w-full max-h-full object-contain transition-transform hover:scale-110 duration-300"
                                onError={handleImageError}
                              />
                            </div>
                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-1.5 shadow-lg">
                              <Fire className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          <h3 className="text-white font-medium text-xs truncate mb-1">{item.name}</h3>
                          <div className="flex items-center justify-between">
                            <span className="text-orange-400 text-[10px] font-medium">🔥 Trending</span>
                            <span className="text-green-400 font-bold text-xs">{formatPrice(item.price)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Hot Items Grid */}
                <div className="px-4 space-y-3 mt-4">
                  {hotItems.slice(0, 10).map((item, index) => (
                    <motion.div
                      key={`list-${item.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => navigate(`/item/${item.id}`)}
                      className="bg-gray-800/50 border border-orange-500/30 rounded-lg p-3 flex items-center space-x-3 cursor-pointer hover:border-orange-400/50 hover:bg-gray-800/70 transition-all duration-300"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 bg-gray-700/50 rounded-lg flex items-center justify-center">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain"
                            onError={handleImageError}
                          />
                        </div>
                        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-1">
                          <Fire className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-sm truncate mb-1">{item.name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-orange-400 text-xs font-medium">🔥 Hot</span>
                          {item.condition && (
                            <span className="text-gray-400 text-xs">{item.condition}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-sm">{formatPrice(item.price)}</div>
                        <div className="text-gray-500 text-xs">#{index + 1}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default MobileLandingPage;