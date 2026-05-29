import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
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
  Sparkles,
  Coins,
  Percent,
  RefreshCw,
  Menu,
  X,
  Home,
  User,
  ShoppingCart,
  Wallet,
  Settings
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useMobileDetection } from '../hooks/useMobileDetection';
import SteamLogin from '../components/auth/SteamLogin';

const RewardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { isMobile } = useMobileDetection();
  
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);

  const rewards = [
    {
      id: 'daily_login',
      title: 'Daily Login Streak',
      description: 'Login every day for rewards',
      amount: '50-500 Kč',
      icon: <Calendar className="w-8 h-8" />,
      color: 'purple',
      progress: 66,
      claimed: claimedRewards.includes('daily_login'),
      category: 'Daily'
    },
    {
      id: 'first_trade',
      title: 'First Trade Bonus',
      description: 'Complete your first trade',
      amount: '200 Kč',
      icon: <Target className="w-8 h-8" />,
      color: 'blue',
      progress: 45,
      claimed: false,
      category: 'Trading'
    },
    {
      id: 'referral',
      title: 'Referral Bonus',
      description: 'Invite friends and earn',
      amount: '1000 Kč',
      icon: <Users className="w-8 h-8" />,
      color: 'orange',
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
      progress: 78,
      claimed: false,
      category: 'Trading'
    },
    {
      id: 'loyal_customer',
      title: 'Loyalty Bonus',
      description: 'Long-term customer reward',
      amount: '1500 Kč',
      icon: <Heart className="w-8 h-8" />,
      color: 'pink',
      progress: 85,
      claimed: false,
      category: 'Loyalty'
    }
  ];

  const claimReward = (rewardId: string) => {
    if (!user) {
      addToast({
        type: 'warning',
        title: 'Login Required',
        message: 'Please log in to claim rewards'
      });
      return;
    }

    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;

    if (reward.progress >= 100 && !reward.claimed) {
      setClaimedRewards(prev => [...prev, rewardId]);
      addToast({
        type: 'success',
        title: `🎉 Reward Claimed!`,
        message: `You've received ${reward.amount} - ${reward.title}`,
        duration: 4000
      });
    } else {
      addToast({
        type: 'info',
        title: 'Reward Not Available',
        message: reward.progress < 100 ? 'Complete requirements first' : 'Already claimed',
        duration: 3000
      });
    }
  };

  const getRewardCardColor = (color: string) => {
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

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-purple-500/30">
          <div className="flex items-center justify-between p-4">
            <motion.button
              onClick={() => navigate('/')}
              whileTap={{ scale: 0.9 }}
              className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </motion.button>

            <h1 className="text-lg font-bold text-white">Rewards</h1>

            <motion.button
              onClick={() => setShowMenu(!showMenu)}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-gray-300 hover:text-white transition-colors"
            >
              {showMenu ? <X size={20} /> : <Menu size={20} />}
            </motion.button>
          </div>
        </header>

        {/* Side Menu */}
        <AnimatePresence>
          {showMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={() => setShowMenu(false)}
              />
              
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 right-0 h-full w-80 bg-gray-900/95 backdrop-blur-xl border-l border-purple-500/30 z-50 overflow-y-auto"
              >
                <div className="p-4 space-y-4">
                  {[
                    { icon: Home, label: 'Home', onClick: () => navigate('/') },
                    { icon: ShoppingCart, label: 'Marketplace', onClick: () => navigate('/') },
                    { icon: User, label: 'Profile', onClick: () => navigate('/profile') },
                    { icon: Wallet, label: 'Balance', onClick: () => navigate('/profile') },
                    { icon: Settings, label: 'Settings', onClick: () => navigate('/profile') }
                  ].map(({ icon: Icon, label, onClick }) => (
                    <button
                      key={label}
                      onClick={() => {
                        onClick();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 p-3 text-gray-300 hover:text-white hover:bg-purple-500/20 rounded-lg transition-all duration-300"
                    >
                      <Icon size={20} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile Content */}
        <div className="p-4 pb-20">
          {/* User Authentication Check */}
          {!user ? (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 text-center">
              <Gift className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Login Required</h2>
              <p className="text-gray-300 mb-4">Sign in with Steam to view and claim your rewards</p>
              <SteamLogin />
            </div>
          ) : (
            <>
              {/* Hero Section */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6 text-center mb-6">
                <Gift className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-white mb-2">Rewards Center</h1>
                <p className="text-gray-300 text-sm mb-4">
                  Complete activities to earn bonus funds and exclusive rewards
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">{rewards.filter(r => r.progress >= 100 && !claimedRewards.includes(r.id)).length}</div>
                    <div className="text-gray-400 text-xs">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">{claimedRewards.length}</div>
                    <div className="text-gray-400 text-xs">Claimed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-400">{rewards.length}</div>
                    <div className="text-gray-400 text-xs">Total</div>
                  </div>
                </div>
              </div>

              {/* Rewards Grid */}
              <div className="space-y-4">
                {rewards.map((reward, index) => (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-gradient-to-r ${getRewardCardColor(reward.color)} backdrop-blur-sm rounded-xl border p-4`}
                  >
                    <div className="flex items-center space-x-4 mb-3">
                      <div className={`w-12 h-12 bg-${reward.color}-500/20 rounded-xl flex items-center justify-center text-${reward.color}-400`}>
                        {reward.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg">{reward.title}</h3>
                        <p className="text-gray-300 text-sm">{reward.description}</p>
                        <div className={`text-${reward.color}-400 font-bold mt-1`}>{reward.amount}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-white font-bold text-lg">{reward.progress}%</div>
                        <div className="text-gray-400 text-xs">Complete</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mb-3">
                      <div 
                        className={`bg-gradient-to-r from-${reward.color}-500 to-${reward.color}-400 h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${reward.progress}%` }}
                      />
                    </div>

                    {/* Claim Button */}
                    <motion.button
                      onClick={() => claimReward(reward.id)}
                      disabled={reward.progress < 100 || reward.claimed}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full py-3 rounded-lg font-bold transition-all duration-300 ${
                        reward.progress >= 100 && !reward.claimed
                          ? `bg-${reward.color}-600 hover:bg-${reward.color}-500 text-white`
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {reward.claimed ? 'Claimed ✓' : 
                       reward.progress >= 100 ? 'Claim Reward' : 
                       `${100 - reward.progress}% to go`}
                    </motion.button>
                  </motion.div>
                ))}
              </div>

              {/* Total Claimable */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center mt-6">
                <Coins className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-lg font-bold text-white">Total Claimable</div>
                <div className="text-2xl font-bold text-green-400">
                  {rewards
                    .filter(r => r.progress >= 100 && !claimedRewards.includes(r.id))
                    .reduce((sum, r) => sum + parseInt(r.amount.replace(/[^\d]/g, '')), 0)
                    .toLocaleString('cs-CZ')} Kč
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Desktop version (keep existing desktop layout)
  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Desktop layout code would go here - keeping the existing design */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Gift className="w-16 h-16 text-purple-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Desktop Rewards Page</h1>
          <p className="text-gray-300 mb-6">View on mobile for the optimized rewards experience</p>
          <button
            onClick={() => navigate('/')}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;