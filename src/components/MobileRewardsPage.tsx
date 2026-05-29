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
  Sparkles,
  Coins,
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
import SteamLogin from './auth/SteamLogin';

const MobileRewardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);

  const rewards = [
    {
      id: 'welcome',
      title: 'Welcome Bonus',
      description: 'Get started with bonus funds!',
      amount: '500 Kč',
      icon: <Gift className="w-8 h-8" />,
      color: 'green',
      progress: user ? 100 : 0,
      claimed: claimedRewards.includes('welcome'),
      category: 'Deposit'
    },
    {
      id: 'daily_login',
      title: 'Daily Login Streak',
      description: 'Login daily for rewards',
      amount: '50-500 Kč',
      icon: <Calendar className="w-8 h-8" />,
      color: 'purple',
      progress: 66,
      claimed: false,
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Menu</h2>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

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

      {/* Main Content */}
      <div className="p-4 pb-20">
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

            {/* Rewards List */}
            <div className="space-y-4">
              {rewards.map((reward, index) => (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4"
                >
                  <div className="flex items-center space-x-4 mb-3">
                    <div className={`w-12 h-12 bg-${reward.color}-500/20 rounded-xl flex items-center justify-center text-${reward.color}-400 border border-${reward.color}-500/30`}>
                      {reward.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">{reward.title}</h3>
                      <p className="text-gray-300 text-sm">{reward.description}</p>
                      <div className="text-green-400 font-bold mt-1">{reward.amount}</div>
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
                        ? 'bg-green-600 hover:bg-green-500 text-white'
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
};

export default MobileRewardsPage;