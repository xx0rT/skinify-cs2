import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, DollarSign, ShoppingBag, Bell, Settings, Star, Package, Eye, EyeOff, Plus, Minus, CreditCard, Wallet, TrendingUp, Calendar, Gamepad2, Shield, ExternalLink, Heart, RefreshCw, CheckCircle, Clock, Activity, Menu, X, Home, Crown, Gift, CreditCard as Edit3, Save, Copy } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBalanceStore } from '../store/balanceStore';
import { useToastStore } from '../store/toastStore';
import { useOrderStore } from '../store/orderStore';
import { useNotificationStore } from '../store/notificationStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useWishlistStore } from '../store/wishlistStore';
import BalanceDisplay from '../components/balance/BalanceDisplay';
import DepositModal from '../components/ui/DepositModal';
import WithdrawModal from '../components/ui/WithdrawModal';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import SteamLogin from '../components/auth/SteamLogin';
import { StyledPrice } from '../utils/formatPrice';

const MobileProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateTradeLink } = useAuthStore();
  const { balance, fetchBalance, transactions } = useBalanceStore();
  const { orders, fetchOrders } = useOrderStore();
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotificationStore();
  const { formatPrice } = useCurrencyStore();
  const { items: wishlistItems } = useWishlistStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'balance' | 'orders' | 'wishlist' | 'notifications' | 'settings'>('overview');
  const [showBalance, setShowBalance] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editingTradeLink, setEditingTradeLink] = useState(false);
  const [tempTradeLink, setTempTradeLink] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // Fetch data when component mounts
  useEffect(() => {
    if (user) {
      fetchBalance(user.steamId);
      fetchOrders(user.steamId);
    }
  }, [user, fetchBalance, fetchOrders]);

  // Initialize trade link edit
  useEffect(() => {
    if (user) {
      setTempTradeLink(user.tradeLink || '');
    }
  }, [user]);

  const handleSaveTradeLink = async () => {
    if (!tempTradeLink.trim()) {
      addToast({
        type: 'warning',
        title: 'Invalid Trade Link',
        message: 'Please enter a valid Steam trade link'
      });
      return;
    }

    try {
      const success = await updateTradeLink(tempTradeLink.trim());
      if (success) {
        setEditingTradeLink(false);
        addToast({
          type: 'success',
          title: 'Trade Link Updated',
          message: 'Your Steam trade link has been updated successfully'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update trade link'
      });
    }
  };

  const handleCopyTradeLink = () => {
    if (user?.tradeLink) {
      navigator.clipboard.writeText(user.tradeLink);
      addToast({
        type: 'success',
        title: 'Copied!',
        message: 'Trade link copied to clipboard'
      });
    }
  };

  const handleOrderClick = (order: any) => {
    navigate(`/order/${order.transaction_id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-purple-400 bg-purple-500/20';
      case 'pending': return 'text-purple-400 bg-purple-600/20';
      case 'escrow': return 'text-purple-400 bg-purple-700/20';
      case 'cancelled': return 'text-purple-400 bg-purple-800/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-8 text-center max-w-sm w-full"
        >
          <Gamepad2 className="w-16 h-16 text-purple-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Sign In Required</h1>
          <p className="text-gray-300 mb-6">
            Please sign in with Steam to access your profile
          </p>
          <SteamLogin />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">{/* Mobile Header */}
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-purple-500/30">
        <div className="flex items-center justify-between p-4">
          {/* Back Button */}
          <motion.button
            onClick={() => navigate('/')}
            whileTap={{ scale: 0.9 }}
            className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </motion.button>

          {/* Title */}
          <h1 className="text-lg font-bold text-white">Profile</h1>

          {/* Menu */}
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
                  { icon: Package, label: 'Marketplace', onClick: () => navigate('/') },
                  { icon: Star, label: 'Rewards', onClick: () => navigate('/rewards') },
                  { icon: Crown, label: 'VIP', onClick: () => navigate('/vip') },
                  { icon: Gift, label: 'Bonuses', onClick: () => navigate('/bonuses') }
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
                
                <div className="border-t border-gray-700/50 pt-4">
                  <button
                    onClick={() => {
                      logout();
                      setShowMenu(false);
                      navigate('/');
                    }}
                    className="w-full flex items-center space-x-3 p-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all duration-300"
                  >
                    <ArrowLeft size={20} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* User Header */}
      <div className="p-4 border-b border-gray-700/30">
        <div className="flex items-center space-x-4">
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-16 h-16 rounded-full border-2 border-purple-500/50"
          />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{user.displayName}</h2>
            <p className="text-purple-300">Steam User</p>
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-purple-400 text-sm">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-16 z-40 bg-gray-800/90 backdrop-blur-xl border-b border-gray-700/50 overflow-x-auto">
        <div className="flex min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'balance', label: 'Balance', icon: Wallet },
            { id: 'orders', label: 'Orders', icon: ShoppingBag },
            { id: 'wishlist', label: 'Wishlist', icon: Heart },
            { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all duration-300 border-b-2 whitespace-nowrap ${
                activeTab === id
                  ? 'text-purple-400 bg-purple-500/20 border-purple-500'
                  : 'text-gray-400 hover:text-white border-transparent'
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {badge && badge > 0 && (
                <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 pb-20">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 text-center">
                <Wallet className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-xl font-bold text-white">
                  {showBalance ? (
                    <StyledPrice
                      price={balance}
                      wholeClassName="text-white"
                      decimalClassName="text-white/70"
                      symbolClassName="text-white"
                    />
                  ) : '••••••'}
                </div>
                <div className="text-gray-400 text-sm">Balance</div>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-gray-400 hover:text-white transition-colors mt-2"
                >
                  {showBalance ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 text-center">
                <ShoppingBag className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-xl font-bold text-white">{orders.length}</div>
                <div className="text-gray-400 text-sm">Orders</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 text-center">
                <Heart className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-xl font-bold text-white">{wishlistItems.length}</div>
                <div className="text-gray-400 text-sm">Wishlist</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 text-center">
                <Bell className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-xl font-bold text-white">{unreadCount}</div>
                <div className="text-gray-400 text-sm">Unread</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  onClick={() => setShowDepositModal(true)}
                  whileTap={{ scale: 0.95 }}
                  className="bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus size={20} />
                  <span>Deposit</span>
                </motion.button>

                <motion.button
                  onClick={() => setShowWithdrawModal(true)}
                  whileTap={{ scale: 0.95 }}
                  className="bg-purple-700 hover:bg-purple-600 text-white p-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <Minus size={20} />
                  <span>Withdraw</span>
                </motion.button>

                <motion.button
                  onClick={() => navigate('/')}
                  whileTap={{ scale: 0.95 }}
                  className="bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <Package size={20} />
                  <span>Marketplace</span>
                </motion.button>

                <motion.button
                  onClick={() => setActiveTab('orders')}
                  whileTap={{ scale: 0.95 }}
                  className="bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <ShoppingBag size={20} />
                  <span>Orders</span>
                </motion.button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Activity className="w-5 h-5 text-purple-400 mr-2" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction, index) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        transaction.type === 'deposit' ? 'bg-purple-500' :
                        transaction.type === 'purchase' ? 'bg-purple-600' :
                        transaction.type === 'sale' ? 'bg-purple-700' : 'bg-gray-500'
                      }`} />
                      <div>
                        <div className="text-white text-sm font-medium">
                          {transaction.description}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${
                      transaction.type === 'deposit' || transaction.type === 'sale' 
                        ? 'text-purple-400'
                        : 'text-purple-300'
                    }`}>
                      {transaction.type === 'deposit' || transaction.type === 'sale' ? '+' : '-'}
                      {formatPrice(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="space-y-6">
            <BalanceDisplay onDepositSuccess={() => fetchBalance(user.steamId)} />
            
            {/* Transaction History */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">Transaction History</h3>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="bg-gray-700/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">
                        {transaction.description}
                      </span>
                      <span className={`font-bold text-sm ${
                        transaction.type === 'deposit' || transaction.type === 'sale' 
                          ? 'text-green-400' 
                          : 'text-red-400'
                      }`}>
                        {transaction.type === 'deposit' || transaction.type === 'sale' ? '+' : '-'}
                        {formatPrice(transaction.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        {new Date(transaction.created_at).toLocaleString()}
                      </span>
                      <span className={`px-2 py-1 rounded-full ${
                        transaction.status === 'completed' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-purple-600/20 text-purple-400'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Your Orders</h3>
              <span className="text-gray-400 text-sm">{orders.length} orders</span>
            </div>

            {orders.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8 text-center">
                <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">No Orders Yet</h3>
                <p className="text-gray-500 mb-4">You haven't made any purchases yet</p>
                <motion.button
                  onClick={() => navigate('/')}
                  whileTap={{ scale: 0.95 }}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Browse Marketplace
                </motion.button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOrderClick(order)}
                    className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 cursor-pointer hover:border-purple-400/50 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-white font-semibold text-sm">
                        Order #{order.transaction_id.slice(-8)}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                        {order.status}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Items</span>
                        <span className="text-white text-sm">{order.items.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Total</span>
                        <span className="text-purple-400 font-bold">{formatPrice(order.total_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Date</span>
                        <span className="text-white text-sm">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Wishlist</h3>
              <span className="text-gray-400 text-sm">{wishlistItems.length} items</span>
            </div>

            {wishlistItems.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8 text-center">
                <Heart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">Empty Wishlist</h3>
                <p className="text-gray-500 mb-4">Add items you like to your wishlist</p>
                <motion.button
                  onClick={() => navigate('/')}
                  whileTap={{ scale: 0.95 }}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Browse Items
                </motion.button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {wishlistItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-3"
                    onClick={() => navigate(`/item/${item.id}`)}
                  >
                    <div className="aspect-square bg-gray-700/30 rounded-lg mb-3 flex items-center justify-center">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <h4 className="text-white font-medium text-sm line-clamp-2 mb-2">
                      {item.name}
                    </h4>
                    <div className="text-purple-400 font-bold text-sm">
                      {formatPrice(item.price)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Notifications</h3>
              <div className="flex space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                  >
                    Mark All Read
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8 text-center">
                <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400">No Notifications</h3>
                <p className="text-gray-500">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl p-4 ${
                      notification.read 
                        ? 'border-gray-700/50' 
                        : 'border-blue-500/30 bg-blue-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-semibold text-sm">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="text-gray-300 text-sm mb-2">
                      {notification.message}
                    </p>
                    <div className="text-gray-500 text-xs">
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Trade Link Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <ExternalLink className="w-5 h-5 text-blue-400 mr-2" />
                Steam Trade Link
              </h3>
              
              {editingTradeLink ? (
                <div className="space-y-3">
                  <textarea
                    value={tempTradeLink}
                    onChange={(e) => setTempTradeLink(e.target.value)}
                    placeholder="https://steamcommunity.com/tradeoffer/new/?partner=XXXXXXXX&token=XXXXXXXX"
                    rows={3}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  />
                  <div className="flex space-x-2">
                    <motion.button
                      onClick={handleSaveTradeLink}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Save size={16} />
                      <span>Save</span>
                    </motion.button>
                    <button
                      onClick={() => {
                        setEditingTradeLink(false);
                        setTempTradeLink(user.tradeLink || '');
                      }}
                      className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {user.tradeLink ? (
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="text-green-400 text-sm font-medium mb-2">✅ Trade Link Set</div>
                      <div className="text-gray-300 text-xs font-mono break-all mb-3">
                        {user.tradeLink}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCopyTradeLink}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <Copy size={14} />
                          <span>Copy</span>
                        </button>
                        <button
                          onClick={() => setEditingTradeLink(true)}
                          className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <div className="text-yellow-400 text-sm font-medium mb-2">⚠️ Trade Link Required</div>
                      <p className="text-gray-300 text-sm mb-3">
                        Set your Steam trade link to start buying items
                      </p>
                      <motion.button
                        onClick={() => setEditingTradeLink(true)}
                        whileTap={{ scale: 0.95 }}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        <Plus size={16} />
                        <span>Set Trade Link</span>
                      </motion.button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Account Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">Account Information</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Steam ID</span>
                  <span className="text-white font-mono text-sm">{user.steamId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Member Since</span>
                  <span className="text-white text-sm">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Account Status</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm">Verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <motion.button
                onClick={() => window.open(`https://steamcommunity.com/profiles/${user.steamId}`, '_blank')}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <ExternalLink size={18} />
                <span>View Steam Profile</span>
              </motion.button>

              <motion.button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft size={18} />
                <span>Sign Out</span>
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onSuccess={() => {
          setShowDepositModal(false);
          fetchBalance(user.steamId);
        }}
        currentBalance={balance}
      />

      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={() => {
          setShowWithdrawModal(false);
          fetchBalance(user.steamId);
        }}
        currentBalance={balance}
      />

      {showOrderDetails && selectedOrder && (
        <OrderDetailsModal
          isOpen={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      )}
    </div>
  );
};

export default MobileProfilePage;