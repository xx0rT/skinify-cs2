import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Settings, Home, CreditCard, Wallet, Gift, Crown, Star, TrendingUp, ShoppingCart, MessageCircle, Trophy, Search, Plus, ChevronDown, Bell, Package, Activity, DollarSign, Clock, Eye, CreditCard as Edit3, Save, X, CheckCircle, AlertCircle, ExternalLink, Calendar, Shield, Gamepad2, Link as LinkIcon, History, BarChart3, RefreshCw, Copy, Trash2, Archive, Users, Minus, Heart, Store, Twitch } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useBalanceStore } from '../store/balanceStore';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { useNotificationStore } from '../store/notificationStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useWishlistStore } from '../store/wishlistStore';
import SteamLogin from '../components/auth/SteamLogin';
import UserProfile from '../components/auth/UserProfile';
import BalanceDisplay from '../components/balance/BalanceDisplay';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import TradingPerformanceChart from '../components/profile/TradingPerformanceChart';
import InventoryManager from '../components/profile/InventoryManager';
import MarketplaceListingsManager from '../components/profile/MarketplaceListingsManager';
import WishlistManager from '../components/profile/WishlistManager';
import TradeSetupModal from '../components/auth/TradeSetupModal';
import ShopManager from '../components/profile/ShopManager';
import TradeOffersManager from '../components/trade/TradeOffersManager';
import TwitchIntegration from '../components/profile/TwitchIntegration';
import { StyledPrice } from '../utils/formatPrice';
import Footer from '../components/Footer';
import SearchModal from '../components/SearchModal';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateTradeLink } = useAuthStore();
  const { addToast } = useToastStore();
  const { balance, pendingBalance, totalDeposited, totalSpent, transactions, fetchBalance, fetchTransactions } = useBalanceStore();
  const { getItemCount } = useCartStore();
  const { orders, fetchOrders } = useOrderStore();
  const { notifications, unreadCount, fetchNotifications } = useNotificationStore();
  const { formatPrice } = useCurrencyStore();
  const { items: wishlistItems } = useWishlistStore();

  const [activeSection, setActiveSection] = useState('Profile');
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [editingTradeLink, setEditingTradeLink] = useState(false);
  const [tradeLink, setTradeLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTradeSetupModal, setShowTradeSetupModal] = useState(false);
  const [showFloatingTabs, setShowFloatingTabs] = useState(false);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [userRating, setUserRating] = useState({ averageRating: 0, totalReviews: 0 });

  const cartCount = getItemCount();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          setShowFloatingTabs(scrollY > 500);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sidebarSections = [
    {
      name: 'Navigation',
      items: [
        { icon: Home, label: 'Home', active: false, onClick: () => navigate('/') },
        { icon: User, label: 'Profile', active: true, onClick: () => navigate('/profile') }
      ]
    },
    {
      name: 'Trading',
      items: [
        { icon: Star, label: 'Rewards', active: false, onClick: () => navigate('/rewards') },
        { icon: TrendingUp, label: 'Stats', active: false, onClick: () => setActiveTab('overview') }
      ]
    },
    {
      name: 'Wallet',
      items: [
        { icon: CreditCard, label: 'Deposit', active: false, onClick: () => setActiveTab('balance') },
        { icon: Wallet, label: 'Withdraw', active: false, onClick: () => setActiveTab('balance') }
      ]
    },
    {
      name: 'Features',
      items: [
        { icon: Users, label: 'Referral', active: false, onClick: () => navigate('/referral') },
        { icon: Crown, label: 'VIP', active: false, onClick: () => navigate('/vip') },
        { icon: Settings, label: 'Settings', active: false, onClick: () => setActiveTab('settings') }
      ]
    }
  ];

  const languages = [
    { code: 'EN', flag: '🇬🇧', name: 'English' },
    { code: 'ES', flag: '🇪🇸', name: 'Español' },
    { code: 'DE', flag: '🇩🇪', name: 'Deutsch' },
    { code: 'FR', flag: '🇫🇷', name: 'Français' }
  ];

  const navigationItems = [
    { name: 'Market', href: '/', icon: ShoppingCart, onClick: () => { setActiveSection('Market'); navigate('/'); } },
    { name: 'Profile', href: '/profile', icon: User, onClick: () => { setActiveSection('Profile'); } },
    { name: 'Search', href: '#', icon: Search, onClick: () => { setActiveSection('Search'); setShowSearchModal(true); } },
    { name: 'Bonuses', href: '/bonuses', icon: Gift, onClick: () => { setActiveSection('Bonuses'); navigate('/bonuses'); } },
    { name: 'Claims', href: '/claims', icon: Trophy, onClick: () => { setActiveSection('Claims'); addToast({ type: 'info', title: 'Coming Soon', message: 'Claims system coming soon!' }); } }
  ];

  const handleNavigation = (item: any) => {
    if (item.onClick) {
      item.onClick();
    }
  };

  // Update URL when tab changes
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      setSearchParams({ tab: activeTab });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setTradeLink(user.tradeLink || '');
      fetchBalance(user.steamId);
      fetchTransactions(user.steamId);
      fetchOrders(user.steamId);
      fetchNotifications(user.steamId);
    }
  }, [user, fetchBalance, fetchTransactions, fetchOrders, fetchNotifications]);

  // Check for URL parameters to set initial tab
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  // Fetch user rating
  useEffect(() => {
    const fetchUserRating = async () => {
      if (!user?.steamId) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_reviews?reviewed_user_id=eq.${user.steamId}&select=rating`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });

        if (response.ok) {
          const reviews = await response.json();
          if (reviews.length > 0) {
            const total = reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
            const avg = total / reviews.length;
            setUserRating({ averageRating: avg, totalReviews: reviews.length });
          }
        }
      } catch (error) {
        console.error('Error fetching user rating:', error);
      }
    };

    fetchUserRating();
  }, [user]);

  // Refresh orders when orders tab becomes active
  useEffect(() => {
    if (user && activeTab === 'orders') {
      console.log('Orders tab active, refreshing orders...');
      fetchOrders(user.steamId);
    }
  }, [activeTab, user, fetchOrders]);

  // Check PayU payment status on return
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;
    let checkCount = 0;
    const MAX_CHECKS = 18;

    const checkPayUPayment = async () => {
      const orderId = localStorage.getItem('payu_order_id');
      const extOrderId = localStorage.getItem('payu_ext_order_id');
      const userId = localStorage.getItem('payu_user_id');
      const amount = localStorage.getItem('payu_amount');

      console.log('=== PAYMENT STATUS CHECK TRIGGERED ===');
      console.log('PayU Order ID from localStorage:', orderId);
      console.log('Ext Order ID from localStorage:', extOrderId);
      console.log('User ID from localStorage:', userId);
      console.log('Amount from localStorage:', amount);
      console.log('Check attempt:', checkCount + 1, '/', MAX_CHECKS);

      const orderIdToCheck = orderId || extOrderId;

      if (!orderIdToCheck || !userId) {
        console.log('No pending PayU payment found');
        if (pollingInterval) clearInterval(pollingInterval);
        return;
      }

      console.log('=== CHECKING PAYU PAYMENT STATUS ===');
      console.log('Using Order ID:', orderIdToCheck);

      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payu-payment?checkStatus=true`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId: orderIdToCheck, userId })
        });

        console.log('Payment check response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Payment status check result:', data);

          const status = (data.status || '').toUpperCase();

          if (data.success && status === 'COMPLETED') {
            if (pollingInterval) clearInterval(pollingInterval);

            localStorage.removeItem('payu_order_id');
            localStorage.removeItem('payu_ext_order_id');
            localStorage.removeItem('payu_user_id');
            localStorage.removeItem('payu_amount');

            addToast({
              type: 'success',
              title: 'Payment Successful!',
              message: `${amount} Kč has been added to your balance.`
            });

            if (user) {
              await fetchBalance(user.steamId);
              await fetchTransactions(user.steamId);
            }
          } else if (status === 'PENDING' || status === 'WAITING_FOR_CONFIRMATION') {
            console.log('Payment still processing, status:', status);

            if (checkCount === 0) {
              addToast({
                type: 'info',
                title: 'Payment Processing',
                message: 'Your payment is being processed. We will check automatically every 10 seconds.'
              });
            }

            checkCount++;

            if (checkCount >= MAX_CHECKS) {
              if (pollingInterval) clearInterval(pollingInterval);
              addToast({
                type: 'warning',
                title: 'Payment Still Pending',
                message: 'Payment is taking longer than expected. Please check back in a few minutes or refresh the page.'
              });
            }
          } else if (status === 'CANCELED' || status === 'CANCELLED') {
            if (pollingInterval) clearInterval(pollingInterval);

            console.log('Payment was cancelled');
            localStorage.removeItem('payu_order_id');
            localStorage.removeItem('payu_ext_order_id');
            localStorage.removeItem('payu_user_id');
            localStorage.removeItem('payu_amount');

            addToast({
              type: 'warning',
              title: 'Payment Cancelled',
              message: 'Your payment was cancelled.'
            });
          } else {
            console.log('Payment status:', status, '| Full data:', data);
          }
        } else {
          const errorText = await response.text();
          console.error('Payment check failed:', response.status, errorText);

          if (checkCount === 0) {
            addToast({
              type: 'error',
              title: 'Payment Check Failed',
              message: 'Could not verify payment status. We will keep trying.'
            });
          }

          checkCount++;
          if (checkCount >= MAX_CHECKS && pollingInterval) {
            clearInterval(pollingInterval);
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        checkCount++;
        if (checkCount >= MAX_CHECKS && pollingInterval) {
          clearInterval(pollingInterval);
        }
      }
    };

    if (user) {
      checkPayUPayment();

      const orderId = localStorage.getItem('payu_order_id');
      const extOrderId = localStorage.getItem('payu_ext_order_id');

      if (orderId || extOrderId) {
        pollingInterval = setInterval(checkPayUPayment, 10000);
      }
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [user, addToast, fetchBalance, fetchTransactions]);

  useEffect(() => {
    const handleTwitchCallback = async () => {
      const twitchCallback = searchParams.get('twitch');
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (twitchCallback === 'callback' && code && state && user) {
        console.log('=== TWITCH CALLBACK DETECTED ===');
        console.log('Code:', code);
        console.log('State:', state);

        try {
          const stateData = JSON.parse(atob(state));
          console.log('State data:', stateData);

          addToast({
            type: 'info',
            title: 'Linking Twitch Account',
            message: 'Please wait...'
          });

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twitch-integration/link`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                code,
                steam_id: user.steamId,
                user_id: stateData.user_id,
              }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to link Twitch account');
          }

          const result = await response.json();
          console.log('Twitch link result:', result);

          addToast({
            type: 'success',
            title: 'Twitch Account Linked',
            message: `Successfully linked @${result.twitch_account.twitch_username}!`
          });

          searchParams.delete('code');
          searchParams.delete('state');
          searchParams.delete('scope');
          searchParams.set('tab', 'settings');
          searchParams.set('twitch', 'linked');
          setSearchParams(searchParams);
          setActiveTab('settings');

          setTimeout(() => {
            searchParams.delete('twitch');
            setSearchParams(searchParams);
          }, 2000);

        } catch (error) {
          console.error('Failed to link Twitch account:', error);
          addToast({
            type: 'error',
            title: 'Twitch Link Failed',
            message: error instanceof Error ? error.message : 'Failed to link Twitch account'
          });

          searchParams.delete('twitch');
          searchParams.delete('code');
          searchParams.delete('state');
          searchParams.delete('scope');
          setSearchParams(searchParams);
        }
      }
    };

    if (user) {
      handleTwitchCallback();
    }
  }, [searchParams, setSearchParams, user, addToast]);

  const handleSaveTradeLink = async () => {
    if (!tradeLink.trim()) {
      addToast({
        type: 'warning',
        title: 'Invalid Trade Link',
        message: 'Please enter a valid Steam trade link'
      });
      return;
    }

    setSaving(true);

    try {
      const success = await updateTradeLink(tradeLink.trim());
      
      if (success) {
        setEditingTradeLink(false);
        addToast({
          type: 'success',
          title: 'Trade Link Updated',
          message: 'Your Steam trade link has been saved successfully'
        });
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: error instanceof Error ? error.message : 'Failed to save trade link'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOrderClick = (order: any) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Gamepad2 className="w-16 h-16 text-purple-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
          <p className="text-gray-400 mb-8">Please sign in with Steam to access your profile</p>
          <SteamLogin />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Search Modal */}
      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />

      {/* Main Layout */}
      <div className="flex min-h-screen">
        {/* Left Sidebar */}
        <motion.div
          className="group fixed left-0 top-0 h-full z-50 w-16 hover:w-64 bg-gray-800 border-r border-gray-700/50 flex flex-col transition-all duration-300 ease-in-out py-4 shadow-xl"
        >
          {/* Logo */}
          <div className="h-12 flex items-center justify-center mb-4 mx-auto group-hover:mx-3 overflow-hidden">
            <div className="relative flex items-center">
              <motion.img
                src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                alt="Skinify Logo"
                className="h-12 w-auto object-contain cursor-pointer"
                onClick={() => navigate('/')}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              <div className="hidden group-hover:block">
                <motion.img
                  src="https://i.postimg.cc/xqdxTY2d/skinify2-2-removebg-preview.png"
                  alt="Skinify Logo Extended"
                  className="h-12 w-auto object-contain cursor-pointer"
                  onClick={() => navigate('/')}
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: 1,
                    transition: {
                      delay: 0.15,
                      duration: 0.4,
                      type: "spring",
                      stiffness: 200,
                      damping: 20
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sidebar Items with Neon Flash */}
          <div className="flex flex-col space-y-1 flex-1 px-2 group-hover:px-3">
            {sidebarSections.map((section, sectionIndex) => (
              <div key={section.name} className="relative">
                {sectionIndex > 0 && (
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent my-2 mx-2" />
                )}

                <div className="hidden group-hover:block mb-2">
                  <div className="text-xs text-purple-400 font-medium px-3 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200">
                    {section.name}
                  </div>
                </div>

                {section.items.map((item, itemIndex) => (
                  <motion.button
                    key={itemIndex}
                    onClick={item.onClick}
                    whileHover={{
                      scale: 1.02,
                      filter: 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.8))'
                    }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex items-center p-3 rounded-lg transition-all duration-300 overflow-hidden group/item w-full mb-1 ${
                      item.active
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <motion.div
                      animate={item.active ? {
                        boxShadow: ['0 0 0px rgba(168, 85, 247, 0)', '0 0 20px rgba(168, 85, 247, 0.8)', '0 0 0px rgba(168, 85, 247, 0)'],
                        scale: [1, 1.1, 1]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <item.icon size={20} className="flex-shrink-0" />
                    </motion.div>

                    <div className="hidden group-hover:block ml-3">
                      <span className="text-current whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
                        {item.label}
                      </span>
                    </div>

                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900/95 border border-gray-600/50 text-white text-sm opacity-0 group-hover:opacity-0 group/item:hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-[60]">
                      {item.label}
                    </div>
                  </motion.button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col ml-16 relative">
          {/* Main Header Navigation */}
          <motion.header
            className="fixed top-0 left-16 right-0 bg-gray-800 border-b border-gray-700/50 p-4 z-30 shadow-lg"
          >
            <div className="flex items-center relative">
              {/* Center Navigation */}
              <div className="flex justify-center w-full">
                <Flipper flipKey={`${activeSection}-${hoveredNavItem}`}>
                  <motion.nav 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                  >
                    <div 
                      className="flex justify-center space-x-1 bg-gray-900 px-6 py-3 border border-purple-500/40 shadow-2xl rounded-lg"
                      style={{ 
                        boxShadow: '0 0 30px rgba(168, 85, 247, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)',
                        background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9))'
                      }}
                    >
                      {navigationItems.map((item) => (
                        <Flipped key={item.name} flipId={`header-nav-${item.name}`}>
                          <motion.button
                            onClick={() => handleNavigation(item)}
                            onMouseEnter={() => setHoveredNavItem(item.name)}
                            onMouseLeave={() => setHoveredNavItem(null)}
                            whileHover={{ 
                              scale: 1.05,
                              filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.9))'
                            }}
                            whileTap={{ scale: 0.95 }}
                            className={`flex justify-center relative px-4 py-2 text-sm font-medium transition-all duration-300 flex items-center space-x-2 rounded-lg ${
                              activeSection === item.name
                                ? 'text-white bg-purple-600'
                                : hoveredNavItem === item.name
                                  ? 'text-purple-200 bg-purple-500/30'
                                  : 'text-gray-300 hover:text-white hover:bg-purple-500/20'
                            }`}
                            style={activeSection === item.name ? {
                              boxShadow: '0 0 25px rgba(168, 85, 247, 0.7), 0 4px 20px rgba(147, 51, 234, 0.5)',
                              background: 'linear-gradient(145deg, #9333EA, #A855F7)'
                            } : hoveredNavItem === item.name ? {
                              boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)',
                              background: 'linear-gradient(145deg, rgba(147, 51, 234, 0.3), rgba(168, 85, 247, 0.3))'
                            } : {}}
                          >
                            <motion.div
                              animate={{ 
                                scale: activeSection === item.name || hoveredNavItem === item.name ? 1.1 : 1,
                                color: activeSection === item.name ? '#E879F9' : hoveredNavItem === item.name ? '#D8B4FE' : '#9CA3AF'
                              }}
                              transition={{ duration: 0.2 }}
                            >
                              <item.icon size={16} />
                            </motion.div>
                            <span>{item.name}</span>
                            
                            {(activeSection === item.name || hoveredNavItem === item.name) && (
                              <Flipped flipId="header-nav-glow">
                                <motion.div
                                  layoutId="headerNavActiveIndicator"
                                  className="absolute inset-0 bg-gradient-to-r from-purple-600/50 via-purple-500/70 to-purple-600/50 -z-10 rounded-lg"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ 
                                    type: "spring", 
                                    stiffness: 400, 
                                    damping: 30,
                                    duration: 0.3 
                                  }}
                                />
                              </Flipped>
                            )}
                          </motion.button>
                        </Flipped>
                      ))}
                    </div>
                  </motion.nav>
                </Flipper>
              </div>

              {/* Right Side - Positioned Absolutely */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                {/* Wishlist Button */}
                <motion.button
                  onClick={() => navigate('/profile?tab=wishlist')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 text-gray-300 hover:text-purple-400 transition-colors relative"
                >
                  <Heart size={20} />
                </motion.button>

                {/* Cart Button */}
                <motion.button
                  onClick={() => navigate('/cart')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 text-gray-300 hover:text-purple-400 transition-colors relative"
                >
                  <ShoppingCart size={20} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </motion.button>

                {/* Sign In / User Profile */}
                <div className="ml-2">
                  {user ? <UserProfile /> : <SteamLogin />}
                </div>
              </div>
            </div>
          </motion.header>

          {/* Elegant Expandable Floating Menu */}
          <AnimatePresence>
            {showFloatingTabs && (
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed right-6 top-32 z-50"
                onMouseEnter={() => setIsMenuExpanded(true)}
                onMouseLeave={() => setIsMenuExpanded(false)}
              >
                <motion.div
                  className="relative"
                  animate={{
                    width: isMenuExpanded ? 240 : 64
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div
                    className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden"
                    style={{
                      boxShadow: '0 0 60px rgba(168, 85, 247, 0.3), 0 20px 80px rgba(0, 0, 0, 0.7)'
                    }}
                  >
                    {/* Animated gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 opacity-50" />

                    <div className="relative p-2">
                      {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'balance', label: 'Balance', icon: Wallet },
                        { id: 'transactions', label: 'Transactions', icon: History },
                        { id: 'orders', label: 'Orders', icon: Package },
                        { id: 'inventory', label: 'Inventory', icon: Archive },
                        { id: 'listings', label: 'Listings', icon: ShoppingCart },
                        { id: 'wishlist', label: 'Wishlist', icon: Heart },
                        { id: 'trades', label: 'Trades', icon: TrendingUp },
                        { id: 'shop', label: 'My Shop', icon: Store },
                        { id: 'notifications', label: 'Notifications', icon: Bell },
                        { id: 'settings', label: 'Settings', icon: Settings }
                      ].map(({ id, label, icon: Icon }, index) => (
                        <motion.button
                          key={id}
                          onClick={() => {
                            setActiveTab(id);
                            setSearchParams({ tab: id });
                            const element = document.getElementById(`tab-${id}`);
                            if (element) {
                              const yOffset = -100;
                              const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                              window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                          }}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02, x: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative w-full flex items-center mb-1.5 rounded-xl transition-all duration-300 ${
                            isMenuExpanded ? 'gap-4 px-4 py-3 justify-start' : 'justify-center py-3 px-0'
                          } ${
                            activeTab === id
                              ? 'bg-gradient-to-r from-purple-500 via-purple-600 to-purple-500 text-white shadow-lg'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                          style={activeTab === id ? {
                            boxShadow: '0 0 25px rgba(168, 85, 247, 0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
                          } : {}}
                        >
                          {/* Icon container with consistent width */}
                          <motion.div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{ width: 20, height: 20 }}
                            animate={{ rotate: activeTab === id ? [0, -5, 5, 0] : 0 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Icon size={20} className={activeTab === id ? 'drop-shadow-lg' : ''} />
                          </motion.div>

                          {/* Notification badge */}
                          {id === 'notifications' && unreadCount > 0 && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 left-8 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg"
                            >
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </motion.span>
                          )}

                          {/* Label with smooth expansion */}
                          <AnimatePresence>
                            {isMenuExpanded && (
                              <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`text-sm font-medium whitespace-nowrap overflow-hidden ${
                                  activeTab === id ? 'text-white' : ''
                                }`}
                              >
                                {label}
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {/* Active indicator line */}
                          {activeTab === id && (
                            <motion.div
                              layoutId="activeTab"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                        </motion.button>
                      ))}
                    </div>

                    {/* Expand indicator */}
                    <motion.div
                      className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 flex items-center justify-center"
                      animate={{ opacity: isMenuExpanded ? 0 : 1 }}
                    >
                      <div className="w-1 h-8 bg-gradient-to-b from-transparent via-purple-500/50 to-transparent rounded-full" />
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile Content */}
          <div className="flex-1 pt-20 pb-12" id="profile-content">
            <div className="container mx-auto px-6">
              
              {/* Profile Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8 mb-8"
              >
                <div className="flex items-center space-x-6">
                  <motion.img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-20 h-20 rounded-2xl border-4 border-purple-500/50"
                    whileHover={{ scale: 1.1 }}
                  />
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-white mb-2">{user.displayName}</h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Gamepad2 className="w-4 h-4 text-purple-400" />
                        <span>Steam User</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <span>Member since 2024</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-purple-400" />
                        <span>Verified</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(`https://steamcommunity.com/profiles/${user.steamId}`, '_blank')}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Steam Profile</span>
                  </button>
                </div>
              </motion.div>

              {/* Tab Navigation */}
              <div className="sticky top-20 z-10 flex space-x-2 mb-8 bg-gray-800/95 backdrop-blur-md rounded-lg p-2 overflow-x-auto shadow-lg border border-purple-500/20">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'balance', label: 'Balance', icon: Wallet },
                  { id: 'transactions', label: 'Transactions', icon: History },
                  { id: 'orders', label: 'Orders', icon: Package },
                  { id: 'inventory', label: 'Inventory', icon: Archive },
                  { id: 'listings', label: 'Listings', icon: ShoppingCart },
                  { id: 'wishlist', label: 'Wishlist', icon: Heart },
                  { id: 'shop', label: 'My Shop', icon: Store },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'settings', label: 'Settings', icon: Settings }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-300 flex-1 justify-center ${
                      activeTab === id
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{label}</span>
                    {id === 'notifications' && unreadCount > 0 && (
                      <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {activeTab === 'overview' && (
                  <div id="tab-overview" className="space-y-8">
                    {/* User Info Card */}
                    <div className="bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                        <User className="w-5 h-5 text-purple-400 mr-2" />
                        Account Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">User ID</div>
                          <div className="text-sm text-white font-mono bg-gray-900/50 px-2 py-1 rounded">{user.id}</div>
                        </div>
                        <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Referred By</div>
                          <div className="text-sm text-purple-400">
                            {user.referred_by ? (
                              <a href={`/user/${user.referred_by}`} className="hover:text-purple-300 transition-colors">
                                View Referrer Profile
                              </a>
                            ) : (
                              <span className="text-gray-500">No referrer</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">{formatPrice(balance)}</div>
                        <div className="text-gray-400 text-sm">Current Balance</div>
                      </div>
                      <div className="bg-purple-600/10 border border-purple-600/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">{orders.length}</div>
                        <div className="text-gray-400 text-sm">Total Orders</div>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {userRating.totalReviews > 0 ? userRating.averageRating.toFixed(1) : 'N/A'}
                        </div>
                        <div className="text-gray-400 text-sm">Rating ({userRating.totalReviews} reviews)</div>
                      </div>
                      <div className="bg-purple-700/10 border border-purple-700/20 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">98.7%</div>
                        <div className="text-gray-400 text-sm">Success Rate</div>
                      </div>
                    </div>

                    {/* Trading Performance Chart */}
                    <TradingPerformanceChart />
                  </div>
                )}

                {activeTab === 'balance' && (
                  <motion.div
                    id="tab-balance"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    {/* Balance Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <BalanceDisplay onDepositSuccess={() => fetchBalance(user.steamId)} />
                      
                      {/* Balance Stats */}
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                          <Activity className="w-6 h-6 text-purple-400 mr-2" />
                          Balance Statistics
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Total Deposited</span>
                            <span className="font-bold">
                              <StyledPrice
                                price={totalDeposited}
                                wholeClassName="text-purple-400"
                                decimalClassName="text-purple-400/60"
                                symbolClassName="text-purple-400"
                              />
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Total Spent</span>
                            <span className="font-bold">
                              <StyledPrice
                                price={totalSpent}
                                wholeClassName="text-purple-300"
                                decimalClassName="text-purple-300/60"
                                symbolClassName="text-purple-300"
                              />
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Current Balance</span>
                            <span className="font-bold">
                              <StyledPrice
                                price={balance}
                                wholeClassName="text-purple-400"
                                decimalClassName="text-purple-400/60"
                                symbolClassName="text-purple-400"
                              />
                            </span>
                          </div>
                          {/* {pendingBalance > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Pending Balance</span>
                              <span className="text-purple-500 font-bold">{formatPrice(pendingBalance)}</span>
                            </div>
                          )} */}
                        </div>
                      </div>
                    </div>
                    
                    {/* Recent Transaction History */}
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center">
                          <Activity className="w-6 h-6 text-purple-500 mr-2" />
                          Recent Transactions
                        </h3>
                        <motion.button
                          onClick={() => fetchBalance(user.steamId)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          <RefreshCw size={16} />
                        </motion.button>
                      </div>
                      
                      <div className="space-y-3">
                        {transactions.length === 0 ? (
                          <div className="text-center py-8">
                            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 text-sm">No recent transactions</p>
                          </div>
                        ) : (
                          transactions.slice(0, 5).map((transaction, index) => (
                          <motion.div
                            key={transaction.id || index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between bg-gray-700/30 rounded-lg p-4 border border-gray-600/30"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                transaction.type === 'deposit' ? 'bg-purple-500/20 text-purple-400' :
                                transaction.type === 'purchase' ? 'bg-purple-600/20 text-purple-400' :
                                transaction.type === 'sale' ? 'bg-purple-700/20 text-purple-400' :
                                transaction.type === 'withdrawal' ? 'bg-purple-800/20 text-purple-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {transaction.type === 'deposit' && <Plus size={16} />}
                                {transaction.type === 'purchase' && <ShoppingCart size={16} />}
                                {transaction.type === 'sale' && <DollarSign size={16} />}
                                {transaction.type === 'withdrawal' && <Minus size={16} />}
                              </div>
                              <div>
                                <div className="text-white font-medium text-sm">{transaction.description}</div>
                                <div className="text-gray-400 text-xs">
                                  {new Date(transaction.created_at).toLocaleDateString('cs-CZ', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${
                                transaction.type === 'deposit' || transaction.type === 'sale' ? 'text-purple-400' : 'text-purple-300'
                              }`}>
                                {(transaction.type === 'deposit' || transaction.type === 'sale') ? '+' : '-'}{formatPrice(Math.abs(transaction.amount))}
                              </div>
                              <div className={`text-xs px-2 py-1 rounded-full ${
                                transaction.status === 'completed' ? 'bg-purple-500/20 text-purple-400' :
                                transaction.status === 'pending' ? 'bg-purple-600/20 text-purple-400' :
                                transaction.status === 'failed' ? 'bg-purple-700/20 text-purple-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {transaction.status}
                              </div>
                            </div>
                          </motion.div>
                          ))
                        )}
                      </div>
                      
                      <div className="mt-6 text-center">
                        <motion.button
                          onClick={() => navigate('/profile?tab=transactions')}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium"
                        >
                          View All Transactions →
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'transactions' && (
                  <motion.div
                    id="tab-transactions"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white flex items-center">
                        <History className="w-6 h-6 text-purple-400 mr-2" />
                        All Transactions
                      </h3>
                      <div className="flex items-center space-x-3">
                        <select className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                          <option>All Types</option>
                          <option>Deposits</option>
                          <option>Purchases</option>
                          <option>Sales</option>
                          <option>Withdrawals</option>
                        </select>
                        <motion.button
                          onClick={() => fetchBalance(user.steamId)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          <RefreshCw size={16} />
                        </motion.button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {transactions.length === 0 ? (
                        <div className="text-center py-12">
                          <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Transactions Yet</h3>
                          <p className="text-gray-500 mb-6">Your transaction history will appear here</p>
                          <button
                            onClick={() => setActiveTab('balance')}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg transition-all duration-300"
                          >
                            Make Your First Deposit
                          </button>
                        </div>
                      ) : (
                        transactions.map((transaction, index) => (
                        <motion.div
                          key={transaction.id || index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between bg-gray-700/30 rounded-lg p-4 border border-gray-600/30 hover:bg-gray-600/30 transition-all duration-300 group"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                              transaction.type === 'deposit' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                              transaction.type === 'purchase' ? 'bg-purple-600/20 text-purple-400 border-purple-600/30' :
                              transaction.type === 'sale' ? 'bg-purple-700/20 text-purple-400 border-purple-700/30' :
                              transaction.type === 'withdrawal' ? 'bg-purple-800/20 text-purple-400 border-purple-800/30' :
                              'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            } group-hover:scale-110 transition-transform duration-300`}>
                              {transaction.type === 'deposit' && <Plus size={20} />}
                              {transaction.type === 'purchase' && <ShoppingCart size={20} />}
                              {transaction.type === 'sale' && <DollarSign size={20} />}
                              {transaction.type === 'withdrawal' && <Minus size={20} />}
                            </div>
                            <div>
                              <div className="text-white font-medium">{transaction.description}</div>
                              <div className="text-gray-400 text-sm flex items-center space-x-2">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {new Date(transaction.created_at).toLocaleDateString('cs-CZ', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              transaction.type === 'deposit' || transaction.type === 'sale' ? 'text-purple-400' : 'text-purple-300'
                            }`}>
                              {(transaction.type === 'deposit' || transaction.type === 'sale') ? '+' : '-'}{formatPrice(Math.abs(transaction.amount))}
                            </div>
                            <div className={`text-xs px-3 py-1 rounded-full border ${
                              transaction.status === 'completed' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                              transaction.status === 'pending' ? 'bg-purple-600/20 text-purple-400 border-purple-600/30' :
                              transaction.status === 'failed' ? 'bg-purple-700/20 text-purple-400 border-purple-700/30' :
                              transaction.status === 'cancelled' ? 'bg-purple-800/20 text-purple-400 border-purple-800/30' :
                              'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            }`}>
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </div>
                          </div>
                        </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'orders' && (
                  <div id="tab-orders" className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white">
                        My Orders ({orders?.length || 0})
                        {orders && orders.length > 0 && (
                          <span className="text-sm font-normal text-gray-400 ml-2">
                            - Showing {orders.filter(o => o.buyer_steam_id === user?.steamId).length} purchases, {orders.filter(o => o.seller_steam_id === user?.steamId).length} sales
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={() => {
                          console.log('=== MANUAL REFRESH DEBUG ===');
                          console.log('Current user Steam ID:', user?.steamId);
                          console.log('Current orders count:', orders?.length);
                          console.log('Orders array:', orders);
                          fetchOrders(user.steamId);
                        }}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>

                    {!orders || orders.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">No Orders Found</h3>
                        <p className="text-gray-500 mb-6">You haven't made any purchases yet. Start trading to see your orders here!</p>
                        <motion.button
                          onClick={() => navigate('/')}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 mx-auto"
                          style={{ boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)' }}
                        >
                          <ShoppingCart className="w-5 h-5" />
                          <span>Browse Marketplace</span>
                        </motion.button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.map((order) => {
                          const isBuyOrder = order.buyer_steam_id === user?.steamId;
                          const isSellOrder = order.seller_steam_id === user?.steamId;

                          console.log('🔍 Rendering order:', {
                            transaction_id: order.transaction_id,
                            buyer_steam_id: order.buyer_steam_id,
                            seller_steam_id: order.seller_steam_id,
                            user_steam_id: user?.steamId,
                            isBuyOrder,
                            isSellOrder
                          });

                          return (
                            <div
                              key={order.id}
                              onClick={() => handleOrderClick(order)}
                              className="bg-gray-700/30 rounded-lg p-4 hover:bg-gray-700/50 transition-all duration-300 cursor-pointer border border-gray-600/30"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-white">{order.transaction_id}</span>
                                    {isBuyOrder && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                        BUY ORDER
                                      </span>
                                    )}
                                    {isSellOrder && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                                        SELL ORDER
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    {new Date(order.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-purple-400">
                                    {formatPrice(order.total_amount)}
                                  </div>
                                  <div className={`text-xs px-2 py-1 rounded-full ${
                                    order.status === 'completed' ? 'bg-purple-500/20 text-purple-400' :
                                    order.status === 'pending' ? 'bg-purple-600/20 text-purple-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {order.status}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'inventory' && (
                  <div id="tab-inventory">
                    <InventoryManager steamId={user.steamId} />
                  </div>
                )}

                {activeTab === 'listings' && (
                  <div id="tab-listings">
                    <MarketplaceListingsManager steamId={user.steamId} />
                  </div>
                )}

                {activeTab === 'wishlist' && (
                  <div id="tab-wishlist">
                    <WishlistManager />
                  </div>
                )}

                {activeTab === 'shop' && (
                  <div id="tab-shop">
                    <ShopManager onNavigateToListings={() => setActiveTab('listings')} />
                  </div>
                )}

                {activeTab === 'trades' && (
                  <div id="tab-trades">
                    <TradeOffersManager />
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div id="tab-notifications" className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white flex items-center">
                        <Bell className="w-6 h-6 text-purple-400 mr-2" />
                        Notifications
                        {unreadCount > 0 && (
                          <span className="ml-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={() => fetchNotifications(user.steamId)}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="text-center py-12">
                        <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">No Notifications</h3>
                        <p className="text-gray-500">You're all caught up!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 rounded-lg border transition-all duration-300 ${
                              notification.read 
                                ? 'bg-gray-700/30 border-gray-600/30' 
                                : 'bg-purple-500/10 border-purple-500/30'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                notification.read ? 'bg-gray-500' : 'bg-purple-500'
                              }`} />
                              <div className="flex-1">
                                <h4 className="font-medium text-white mb-1">{notification.title}</h4>
                                <p className="text-gray-300 text-sm mb-2">{notification.message}</p>
                                <div className="text-xs text-gray-500">
                                  {new Date(notification.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div id="tab-settings" className="space-y-6">
                    {/* Account Settings */}
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                        <Settings className="w-6 h-6 text-purple-400 mr-2" />
                        Account Settings
                      </h3>

                      {/* Steam Trade Link */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Steam Trade Link
                          </label>
                          <div className="flex items-center space-x-3">
                            <div className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white text-sm">
                              {user.tradeLink || 'No trade link set'}
                            </div>
                            <button
                              onClick={() => setShowTradeSetupModal(true)}
                              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>{user.tradeLink ? 'Edit' : 'Setup'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Trade Link Information */}
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <Shield className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                            <div>
                              <h4 className="text-purple-300 font-semibold mb-2">Why do I need a trade link?</h4>
                              <ul className="text-gray-300 text-sm space-y-1">
                                <li>• Required for sellers to send you items</li>
                                <li>• Enables secure Steam trade offers</li>
                                <li>• Protects both buyer and seller</li>
                                <li>• Industry standard for CS2 marketplaces</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        {/* Safety Notice */}
                        <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                            <div>
                              <h4 className="text-purple-300 font-semibold mb-2">Your trade link is secure</h4>
                              <ul className="text-gray-300 text-sm space-y-1">
                                <li>• Only used for sending you items you purchased</li>
                                <li>• Never shared with unauthorized parties</li>
                                <li>• You can regenerate it anytime on Steam</li>
                                <li>• Stored with bank-level encryption</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        {/* Trade Link Required Warning */}
                        {!user.tradeLink && (
                          <div className="bg-purple-700/10 border border-purple-700/30 rounded-lg p-6 text-center">
                            <h4 className="text-purple-300 font-semibold mb-3">Trade Link Required</h4>
                            <p className="text-gray-300 text-sm mb-4">
                              You need to set up your Steam trade link to receive items from purchases.
                            </p>
                            <button
                              onClick={() => setShowTradeSetupModal(true)}
                              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center space-x-2 mx-auto"
                            >
                              <LinkIcon className="w-5 h-5" />
                              <span>Set Up Trade Link Now</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Privacy Settings */}
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-white mb-6">Privacy Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium">Show Online Status</div>
                            <div className="text-gray-400 text-sm">Let others see when you're online</div>
                          </div>
                          <div className="w-12 h-6 bg-purple-600 rounded-full relative">
                            <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium">Show Trading History</div>
                            <div className="text-gray-400 text-sm">Display your trading statistics</div>
                          </div>
                          <div className="w-12 h-6 bg-gray-600 rounded-full relative">
                            <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Twitch Integration & Loyalty Points */}
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <Twitch className="w-6 h-6 text-purple-500" />
                        <h3 className="text-xl font-bold text-white">Twitch Integration & Loyalty Points</h3>
                      </div>
                      <TwitchIntegration />
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {showOrderModal && selectedOrder && (
          <OrderDetailsModal
            isOpen={showOrderModal}
            onClose={() => setShowOrderModal(false)}
            order={selectedOrder}
          />
        )}
      </AnimatePresence>

      {/* Trade Setup Modal */}
      <TradeSetupModal
        isOpen={showTradeSetupModal}
        onComplete={() => {
          setShowTradeSetupModal(false);
          // Refresh user data after trade link is set
          if (user) {
            fetchBalance(user.steamId);
          }
        }}
        canSkip={true}
      />
    </div>
  );
};

export default ProfilePage;