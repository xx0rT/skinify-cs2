import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Gift,
  Star,
  Crown,
  Calendar,
  TrendingUp,
  Award,
  Target,
  Zap,
  Heart,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Home,
  User,
  Settings,
  CreditCard,
  Wallet,
  ChevronDown,
  ShoppingCart,
  MessageCircle,
  Trophy,
  Search,
  Plus,
  Sparkles,
  Coins,
  Percent,
  RefreshCw
} from 'lucide-react';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import SteamLogin from '../components/auth/SteamLogin';
import UserProfile from '../components/auth/UserProfile';

const BonusesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState('Bonuses');
  const [hoveredNavItem, setHoveredNavItem] = useState(null);
  const [claimedBonuses, setClaimedBonuses] = useState<string[]>([]);
  const [sidebarY, setSidebarY] = useState(0);
  const [sidebarOpacity, setSidebarOpacity] = useState(1);
  const { getItemCount } = useCartStore();
  const cartCount = getItemCount();

  const sidebarSections = [
    {
      name: 'Navigation',
      items: [
        { icon: Home, label: 'Home', active: false, onClick: () => { navigate('/'); setActiveSection('Market'); } },
        { icon: User, label: 'Profile', active: false, onClick: () => { navigate('/profile'); setActiveSection('Profile'); } }
      ]
    },
    {
      name: 'Trading',
      items: [
        { icon: Star, label: 'Rewards', active: false, onClick: () => { navigate('/rewards'); setActiveSection('Rewards'); } },
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
        { icon: Users, label: 'Referral', active: false, onClick: () => navigate('/referral') },
        { icon: Gift, label: 'Bonuses', active: true, onClick: () => { navigate('/bonuses'); setActiveSection('Bonuses'); } },
        { icon: Users, label: 'Referral', active: false, onClick: () => navigate('/referral') },
        { icon: Crown, label: 'VIP', active: false, onClick: () => { navigate('/vip'); setActiveSection('VIP'); } },
        { icon: Settings, label: 'Settings', active: false, onClick: () => navigate('/profile?tab=settings') }
      ]
    }
  ];

  const languages = [
    { name: 'Market', href: '/', icon: ShoppingCart, onClick: () => { setActiveSection('Market'); navigate('/'); } },
    { name: 'Support', href: '/support', icon: MessageCircle, onClick: () => { setActiveSection('Support'); navigate('/support'); } },
    { name: 'Bonuses', href: '/bonuses', icon: Gift, onClick: () => { setActiveSection('Bonuses'); } },
    { name: 'VIP', href: '/vip', icon: Crown, onClick: () => { setActiveSection('VIP'); navigate('/vip'); } },
    { name: 'Rewards', href: '/rewards', icon: Star, onClick: () => { setActiveSection('Rewards'); navigate('/rewards'); } }
  ];

  const navigationItems = [
    { type: "link", name: 'Market', href: '/', icon: ShoppingCart, onClick: () => { setActiveSection('Market'); navigate('/'); } },
    { type: "link", name: 'Referral', href: '/referral', icon: Users, onClick: () => { setActiveSection('Referral'); navigate('/referral'); } },
    { type: "link", name: 'Search', href: '/', icon: Search, onClick: () => { setActiveSection('Search'); } },
    { type: "link", name: 'Affiliate', href: '/affiliate', icon: Gift, onClick: () => { setActiveSection('Affiliate'); } },
    { type: "link", name: 'Claims', href: '/claims', icon: Trophy, onClick: () => { setActiveSection('Claims'); } }
  ];

  const handleNavigation = (item: any) => {
    if (item.onClick) {
      item.onClick();
    }
  };

  const bonusTypes = [
    {
      id: 'welcome',
      title: 'Welcome Bonus',
      description: 'Get started with a fantastic welcome bonus!',
      amount: '500 Kč',
      icon: <Gift className="w-8 h-8" />,
      color: 'green',
      requirements: 'Complete your first deposit',
      progress: user ? 100 : 0,
      claimed: claimedBonuses.includes('welcome'),
      category: 'Deposit'
    },
    {
      id: 'first_trade',
      title: 'First Trade Bonus',
      description: 'Complete your first successful trade',
      amount: '200 Kč',
      icon: <Target className="w-8 h-8" />,
      color: 'blue',
      requirements: 'Make your first trade',
      progress: 45,
      claimed: false,
      category: 'Trading'
    },
    {
      id: 'daily_login',
      title: 'Daily Login Streak',
      description: 'Login every day for increasing rewards',
      amount: '50-500 Kč',
      icon: <Calendar className="w-8 h-8" />,
      color: 'purple',
      requirements: 'Login daily (3-day streak)',
      progress: 66,
      claimed: false,
      category: 'Daily'
    },
    {
      id: 'referral',
      title: 'Referral Bonus',
      description: 'Invite friends and earn together',
      amount: '1000 Kč',
      icon: <Users className="w-8 h-8" />,
      color: 'orange',
      requirements: 'Refer 5 active friends',
      progress: 20,
      claimed: false,
      category: 'Social'
    },
    {
      id: 'volume_trader',
      title: 'Volume Trader',
      description: 'High volume trading rewards',
      amount: '2500 Kč',
      icon: <TrendingUp className="w-8 h-8" />,
      color: 'indigo',
      requirements: 'Trade 100,000 Kč volume',
      progress: 78,
      claimed: false,
      category: 'Trading'
    },
    {
      id: 'loyal_customer',
      title: 'Loyalty Bonus',
      description: 'Long-term customer appreciation',
      amount: '1500 Kč',
      icon: <Heart className="w-8 h-8" />,
      color: 'pink',
      requirements: 'Active for 6+ months',
      progress: 85,
      claimed: false,
      category: 'Loyalty'
    }
  ];

  const claimBonus = (bonusId: string) => {
    if (!user) {
      addToast({
        type: 'warning',
        title: 'Login Required',
        message: 'Please log in to claim bonuses'
      });
      return;
    }

    const bonus = bonusTypes.find(b => b.id === bonusId);
    if (!bonus) return;

    if (bonus.progress >= 100 && !bonus.claimed) {
      setClaimedBonuses(prev => [...prev, bonusId]);
      addToast({
        type: 'success',
        title: `🎉 Bonus Claimed!`,
        message: `You've received ${bonus.amount} - ${bonus.title}`,
        duration: 4000
      });
    } else {
      addToast({
        type: 'info',
        title: 'Bonus Not Available',
        message: bonus.progress < 100 ? 'Complete requirements first' : 'Already claimed',
        duration: 3000
      });
    }
  };

  const getBonusCardColor = (color: string) => {
    const colorMap = {
      green: 'from-green-500/20 via-emerald-500/20 to-green-500/20 border-green-500/30',
      blue: 'from-blue-500/20 via-sky-500/20 to-blue-500/20 border-blue-500/30',
      purple: 'from-purple-500/20 via-violet-500/20 to-purple-500/20 border-purple-500/30',
      orange: 'from-orange-500/20 via-amber-500/20 to-orange-500/20 border-orange-500/30',
      indigo: 'from-indigo-500/20 via-blue-600/20 to-indigo-500/20 border-indigo-500/30',
      pink: 'from-pink-500/20 via-rose-500/20 to-pink-500/20 border-pink-500/30'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.green;
  };

  const getTotalClaimableValue = () => {
    return bonusTypes
      .filter(bonus => bonus.progress >= 100 && !claimedBonuses.includes(bonus.id))
      .reduce((sum, bonus) => {
        const amount = parseInt(bonus.amount.replace(/[^\d]/g, ''));
        return sum + amount;
      }, 0);
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
            className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-b border-purple-500/20 p-4 z-40 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              {/* Left Side - Logo */}
              <div className="flex items-center space-x-4">
                <motion.img
                  src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                  alt="Skinify Logo"
                  className="h-8 w-auto object-contain"
                  whileHover={{ scale: 1.05 }}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.3))' }}
                />
              </div>
            </div>
          </motion.header>
        </div>
      </div>
    </div>
  );
};

export default BonusesPage;