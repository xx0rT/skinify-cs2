import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Users,
  Copy,
  Share2,
  Gift,
  DollarSign,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Home,
  User,
  Settings,
  CreditCard,
  Wallet,
  Crown,
  ChevronDown,
  ShoppingCart,
  MessageCircle,
  Trophy,
  Search,
  Plus,
  Star,
  Activity,
  Clock,
  Target,
  Award,
  Link as LinkIcon,
  RefreshCw,
  HelpCircle,
  Heart,
  BarChart3,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import SteamLogin from '../components/auth/SteamLogin';
import UserProfile from '../components/auth/UserProfile';

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalEarnings: number;
  pendingRewards: number;
  clickCount: number;
  conversionRate: number;
}

interface ReferralData {
  id: string;
  referredUser: string;
  status: 'clicked' | 'registered' | 'qualified' | 'completed';
  reward: number;
  date: string;
  qualifyingAction?: string;
}

const ReferralPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { getItemCount } = useCartStore();
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState('Referral');
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    completedReferrals: 0,
    totalEarnings: 0,
    pendingRewards: 0,
    clickCount: 0,
    conversionRate: 0
  });
  const [referralHistory, setReferralHistory] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarY, setSidebarY] = useState(0);
  const [sidebarOpacity, setSidebarOpacity] = useState(1);

  const cartCount = getItemCount();

  const sidebarSections = [
    {
      name: 'Navigation',
      items: [
        { icon: Home, label: 'Home', active: false, onClick: () => navigate('/') },
        { icon: User, label: 'Profile', active: false, onClick: () => navigate('/profile') }
      ]
    },
    {
      name: 'Trading',
      items: [
        { icon: Star, label: 'Rewards', active: false, onClick: () => navigate('/rewards') },
        { icon: TrendingUp, label: 'Stats', active: false, onClick: () => navigate('/profile?tab=overview') }
      ]
    },
    {
      name: 'Wallet',
      items: [
        { icon: CreditCard, label: 'Deposit', active: false, onClick: () => navigate('/profile?tab=balance') },
        { icon: Wallet, label: 'Withdraw', active: false, onClick: () => navigate('/profile?tab=balance') }
      ]
    },
    {
      name: 'Features',
      items: [
        { icon: Users, label: 'Referral', active: true, onClick: () => navigate('/referral') },
        { icon: Crown, label: 'VIP', active: false, onClick: () => navigate('/vip') },
        { icon: Settings, label: 'Settings', active: false, onClick: () => navigate('/profile?tab=settings') }
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
    { name: 'FAQ', href: '/faq', icon: HelpCircle, onClick: () => { setActiveSection('FAQ'); navigate('/faq'); } },
    { name: 'Bonuses', href: '/bonuses', icon: Gift, onClick: () => { setActiveSection('Bonuses'); navigate('/bonuses'); } },
    { name: 'Claims', href: '/claims', icon: Trophy, onClick: () => { setActiveSection('Claims'); addToast({ type: 'info', title: 'Coming Soon', message: 'Claims system coming soon!' }); } }
  ];

  const handleNavigation = (item: any) => {
    if (item.onClick) {
      item.onClick();
    }
  };

  // Load referral code from database
  useEffect(() => {
    if (user) {
      fetchReferralCode();
      loadReferralData();
    }
  }, [user]);

  const [maxUses, setMaxUses] = useState(10);
  const [currentUses, setCurrentUses] = useState(0);

  const fetchReferralCode = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, referral_code')
        .eq('steam_id', user.steamId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching referral code:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load your referral code',
          duration: 3000
        });
        return;
      }

      if (data && data.referral_code) {
        setReferralCode(data.referral_code);
        setReferralLink(`${window.location.origin}/?ref=${data.referral_code}`);

        // Count how many times this code has been used
        const { count } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referral_code', data.referral_code);

        setMaxUses(10);  // Default max uses
        setCurrentUses(count || 0);
      } else {
        // If no referral code exists, trigger the database to create one
        console.log('No referral code found, triggering creation...');
        // Update the user row to trigger the referral code generation trigger
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('steam_id', user.steamId);

        if (updateError) {
          console.error('Error triggering referral code creation:', updateError);
          // Show error to user
          addToast({
            type: 'error',
            title: 'Error',
            message: 'Failed to generate referral code. Please contact support.',
            duration: 4000
          });
          return;
        }

        // Retry fetching after a short delay
        setTimeout(fetchReferralCode, 1000);
      }
    } catch (error) {
      console.error('Error in fetchReferralCode:', error);
    }
  };

  const loadReferralData = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // First get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('steam_id', user.steamId)
        .maybeSingle();

      if (!userData) {
        console.error('User not found');
        setLoading(false);
        return;
      }

      // Fetch referrals where current user is the referrer
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userData.id);

      if (referralsError) {
        console.error('Error fetching referrals:', referralsError);
        // Set default empty stats
        setStats({
          totalReferrals: 0,
          completedReferrals: 0,
          totalEarnings: 0,
          pendingRewards: 0,
          clickCount: 0,
          conversionRate: 0
        });
        setReferralHistory([]);
        return;
      }

      const referrals = referralsData || [];

      // Fetch rewards for these referrals
      const { data: rewardsData } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('user_id', userData.id);

      const rewards = rewardsData || [];

      // Calculate stats
      const totalReferrals = referrals.length;
      const completedReferrals = referrals.filter(r => r.status === 'completed').length;
      const totalEarnings = rewards
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + Number(r.reward_value), 0);
      const pendingRewards = rewards
        .filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + Number(r.reward_value), 0);
      const clickCount = referrals.filter(r => r.status === 'clicked').length;
      const conversionRate = totalReferrals > 0
        ? (completedReferrals / totalReferrals) * 100
        : 0;

      setStats({
        totalReferrals,
        completedReferrals,
        totalEarnings: Math.round(totalEarnings),
        pendingRewards: Math.round(pendingRewards),
        clickCount,
        conversionRate: Math.round(conversionRate * 10) / 10
      });

      // Build referral history
      const history: ReferralData[] = await Promise.all(
        referrals.slice(0, 10).map(async (referral) => {
          // Get referred user's display name
          let referredUserName = 'Unknown User';
          if (referral.referred_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('display_name')
              .eq('id', referral.referred_id)
              .maybeSingle();

            if (userData) {
              referredUserName = userData.display_name;
            }
          }

          // Get reward for this referral
          const reward = rewards.find(r => r.referral_id === referral.id);

          return {
            id: referral.id.toString(),
            referredUser: referredUserName,
            status: referral.status as any,
            reward: reward ? Number(reward.reward_value) : 0,
            date: new Date(referral.created_at).toISOString().split('T')[0],
            qualifyingAction: referral.qualifying_action || undefined
          };
        })
      );

      setReferralHistory(history);
    } catch (error) {
      console.error('Failed to load referral data:', error);
      // Set default empty stats on error
      setStats({
        totalReferrals: 0,
        completedReferrals: 0,
        totalEarnings: 0,
        pendingRewards: 0,
        clickCount: 0,
        conversionRate: 0
      });
      setReferralHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    addToast({
      type: 'success',
      title: 'Link Copied',
      message: 'Referral link copied to clipboard'
    });
  };

  const shareReferralLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Skinify CS2 Marketplace',
        text: 'Join me on Skinify and get bonus rewards!',
        url: referralLink
      });
    } else {
      copyReferralLink();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'qualified': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'registered': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'clicked': return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Main Layout */}
      <div className="flex min-h-screen">
        {/* Left Sidebar */}
        <motion.div 
          style={{
            y: sidebarY,
            opacity: sidebarOpacity,
          }}
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
          {/* Top Header */}
          <motion.header
            style={{
              y: sidebarY,
              opacity: sidebarOpacity,
            }}
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
                      {navigationItems.map((item, index) => (
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

          {/* Referral Content */}
          <div className="flex-1 pt-20 pb-12">
            <div className="container mx-auto px-6 max-w-6xl">
              
              {/* Hero Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-white" />
                </div>

                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                  Referral Program
                </h1>
                
                <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
                  Invite friends and earn rewards together. Get 100 Kč for each successful referral.
                </p>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                  {[
                    { label: 'Total Referrals', value: stats.totalReferrals, icon: Users },
                    { label: 'Total Earnings', value: `${stats.totalEarnings} Kč`, icon: DollarSign },
                    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: TrendingUp },
                    { label: 'Pending Rewards', value: `${stats.pendingRewards} Kč`, icon: Clock }
                  ].map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-center mb-2">
                        <stat.icon className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-sm text-gray-400">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Referral Link Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 mb-8"
              >
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <LinkIcon className="w-6 h-6 text-purple-400 mr-3" />
                  Your Referral Link
                </h2>

                <div className="space-y-4">
                  {/* Usage Counter */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-400">Referral Code Usage</div>
                        <div className="text-2xl font-bold text-white mt-1">
                          {currentUses} / {maxUses}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Remaining Uses</div>
                        <div className="text-2xl font-bold text-purple-400 mt-1">
                          {maxUses - currentUses}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                          style={{ width: `${(currentUses / maxUses) * 100}%` }}
                        />
                      </div>
                    </div>
                    {currentUses >= maxUses && (
                      <div className="mt-3 text-sm text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Your referral code has reached its usage limit
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-400 mb-2">Referral Code</label>
                      <div className="bg-gray-900/50 border border-gray-600/50 rounded-lg p-3 font-mono text-lg">
                        {referralCode}
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-400 mb-2">Referral Link</label>
                      <div className="bg-gray-900/50 border border-gray-600/50 rounded-lg p-3 text-sm text-gray-300 truncate">
                        {referralLink}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={copyReferralLink}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <Copy className="w-5 h-5" />
                      <span>Copy Link</span>
                    </button>
                    <button
                      onClick={shareReferralLink}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <Share2 className="w-5 h-5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* How It Works */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 mb-8"
              >
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <Target className="w-6 h-6 text-purple-400 mr-3" />
                  How It Works
                </h2>

                <div className="grid md:grid-cols-4 gap-6">
                  {[
                    {
                      step: '1',
                      title: 'Share Your Link',
                      description: 'Send your referral link to friends',
                      icon: Share2
                    },
                    {
                      step: '2',
                      title: 'Friend Registers',
                      description: 'They create an account using your link',
                      icon: User
                    },
                    {
                      step: '3',
                      title: 'First Deposit',
                      description: 'Friend makes their first deposit (500+ Kč)',
                      icon: CreditCard
                    },
                    {
                      step: '4',
                      title: 'Both Get Rewards',
                      description: 'You get 100 Kč, they get 50 Kč bonus',
                      icon: Gift
                    }
                  ].map((step, index) => (
                    <div key={index} className="text-center">
                      <div className="w-16 h-16 bg-purple-600/20 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <step.icon className="w-8 h-8 text-purple-400" />
                      </div>
                      <div className="text-sm text-purple-400 font-medium mb-2">Step {step.step}</div>
                      <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-sm text-gray-400">{step.description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Referral History */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8"
              >
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <BarChart3 className="w-6 h-6 text-purple-400 mr-3" />
                  Referral History
                </h2>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading referral data...</p>
                  </div>
                ) : referralHistory.length > 0 ? (
                  <div className="space-y-4">
                    {referralHistory.map((referral) => (
                      <div
                        key={referral.id}
                        className="bg-gray-900/50 border border-gray-600/50 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-purple-600/20 border border-purple-500/30 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{referral.referredUser}</div>
                            <div className="text-sm text-gray-400">{referral.date}</div>
                            {referral.qualifyingAction && (
                              <div className="text-xs text-purple-400">{referral.qualifyingAction}</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="font-medium text-white">
                              {referral.reward > 0 ? `${referral.reward} Kč` : 'Pending'}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(referral.status)}`}>
                              {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No referrals yet. Start sharing your link!</p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;