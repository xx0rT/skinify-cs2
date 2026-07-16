import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { useNavigate } from 'react-router-dom';
import { Home, User, Settings, CreditCard, Wallet, Gift, Crown, Star, TrendingUp, ShoppingCart, Users, Shield, Bell, BarChart3, Activity, DollarSign, Package, AlertTriangle, CheckCircle, X, Ban, AlertOctagon, Send, Search, Filter, Download, Upload, Eye, Trash2, CreditCard as Edit3, Plus, MessageSquare, Clock, Heart, Database, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import SteamLogin from '../components/auth/SteamLogin';
import UserProfile from '../components/auth/UserProfile';

interface Withdrawal {
  id: string;
  userId: string;
  steamId: string;
  username: string;
  amount: number;
  method: string;
  accountDetails: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedAt: string;
  processedAt?: string;
}

interface UserData {
  id: string;
  steamId: string;
  username: string;
  email: string;
  balance: number;
  totalSpent: number;
  totalEarned: number;
  trades: number;
  joinedAt: string;
  status: 'active' | 'warned' | 'banned';
  warningCount: number;
  lastActive: string;
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isOwner } = useAuthStore();
  const { addToast } = useToastStore();
  const [activeSection, setActiveSection] = useState('Admin');
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('withdrawals');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);

  // Notification Modal State
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    title: '',
    message: '',
    targetUser: 'all'
  });

  // User Action Modal State
  const [showUserActionModal, setShowUserActionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [actionType, setActionType] = useState<'warn' | 'ban' | ''>('');
  const [actionReason, setActionReason] = useState('');

  const cartCount = 0;

  const sidebarSections = [
    {
      name: 'Navigation',
      items: [
        { icon: Home, label: 'Home', active: false, onClick: () => navigate('/') },
        { icon: Shield, label: 'Admin', active: true, onClick: () => {} }
      ]
    },
    {
      name: 'Management',
      items: [
        { icon: Wallet, label: 'Withdrawals', active: false, onClick: () => setActiveTab('withdrawals') },
        { icon: Users, label: 'Users', active: false, onClick: () => setActiveTab('users') },
        { icon: Bell, label: 'Notifications', active: false, onClick: () => setActiveTab('notifications') }
      ]
    },
    {
      name: 'Analytics',
      items: [
        { icon: BarChart3, label: 'Dashboard', active: false, onClick: () => setActiveTab('dashboard') },
        { icon: Activity, label: 'Activity', active: false, onClick: () => setActiveTab('activity') }
      ]
    },
    {
      name: 'System',
      items: [
        { icon: Database, label: 'Database', active: false, onClick: () => setActiveTab('database') },
        { icon: Settings, label: 'Settings', active: false, onClick: () => setActiveTab('settings') }
      ]
    }
  ];

  const navigationItems = [
    { name: 'Dashboard', href: '#', icon: BarChart3, onClick: () => setActiveTab('dashboard') },
    { name: 'Withdrawals', href: '#', icon: Wallet, onClick: () => setActiveTab('withdrawals') },
    { name: 'Users', href: '#', icon: Users, onClick: () => setActiveTab('users') },
    { name: 'Notify', href: '#', icon: Bell, onClick: () => setActiveTab('notifications') },
    { name: 'Settings', href: '#', icon: Settings, onClick: () => setActiveTab('settings') }
  ];

  useEffect(() => {
    if (user && isOwner) {
      fetchWithdrawals();
      fetchUsers();
    }
  }, [user, isOwner]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockWithdrawals: Withdrawal[] = [
        {
          id: '1',
          userId: 'user1',
          steamId: '76561198000000001',
          username: 'ProTrader2024',
          amount: 5000,
          method: 'PayPal',
          accountDetails: 'protrader@email.com',
          status: 'pending',
          requestedAt: new Date().toISOString()
        },
        {
          id: '2',
          userId: 'user2',
          steamId: '76561198000000002',
          username: 'SkinHunter',
          amount: 12500,
          method: 'Bank Transfer',
          accountDetails: 'CZ12 3456 7890 1234 5678',
          status: 'pending',
          requestedAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      setWithdrawals(mockWithdrawals);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch withdrawals'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Mock data - replace with actual API call
      const mockUsers: UserData[] = [
        {
          id: 'user1',
          steamId: '76561198000000001',
          username: 'ProTrader2024',
          email: 'protrader@email.com',
          balance: 8500,
          totalSpent: 45000,
          totalEarned: 52000,
          trades: 156,
          joinedAt: '2024-01-15',
          status: 'active',
          warningCount: 0,
          lastActive: new Date().toISOString()
        },
        {
          id: 'user2',
          steamId: '76561198000000002',
          username: 'SkinHunter',
          email: 'skinhunter@email.com',
          balance: 23000,
          totalSpent: 89000,
          totalEarned: 112000,
          trades: 245,
          joinedAt: '2024-02-10',
          status: 'warned',
          warningCount: 1,
          lastActive: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      setUsers(mockUsers);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch users'
      });
    }
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject') => {
    try {
      // TODO: Implement actual API call
      setWithdrawals(prev => prev.map(w =>
        w.id === withdrawalId
          ? { ...w, status: action === 'approve' ? 'approved' : 'rejected', processedAt: new Date().toISOString() }
          : w
      ));

      addToast({
        type: 'success',
        title: 'Withdrawal ' + (action === 'approve' ? 'Approved' : 'Rejected'),
        message: `Withdrawal ${withdrawalId} has been ${action}d`
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to process withdrawal'
      });
    }
  };

  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) {
      addToast({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in all fields'
      });
      return;
    }

    try {
      // TODO: Implement actual API call to send notification
      addToast({
        type: 'success',
        title: 'Notification Sent',
        message: `Notification sent to ${notificationData.targetUser === 'all' ? 'all users' : 'specific user'}`
      });

      setShowNotificationModal(false);
      setNotificationData({
        type: 'info',
        title: '',
        message: '',
        targetUser: 'all'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to send notification'
      });
    }
  };

  const handleUserAction = async () => {
    if (!selectedUser || !actionType || !actionReason) {
      addToast({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please provide a reason for this action'
      });
      return;
    }

    try {
      // TODO: Implement actual API call
      if (actionType === 'ban') {
        setUsers(prev => prev.map(u =>
          u.id === selectedUser.id ? { ...u, status: 'banned' } : u
        ));
        addToast({
          type: 'success',
          title: 'User Banned',
          message: `${selectedUser.username} has been banned`
        });
      } else if (actionType === 'warn') {
        setUsers(prev => prev.map(u =>
          u.id === selectedUser.id ? { ...u, status: 'warned', warningCount: u.warningCount + 1 } : u
        ));
        addToast({
          type: 'success',
          title: 'Warning Issued',
          message: `Warning issued to ${selectedUser.username}`
        });
      }

      setShowUserActionModal(false);
      setSelectedUser(null);
      setActionType('');
      setActionReason('');
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to process user action'
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-purple-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-gray-400 mb-8">Please sign in to access the admin panel</p>
          <SteamLogin />
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertOctagon className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-8">You don't have permission to access this page</p>
          <button
            onClick={() => navigate('/')}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg transition-all duration-300"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesSearch = w.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         w.steamId.includes(searchQuery);
    const matchesFilter = filterStatus === 'all' || w.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.steamId.includes(searchQuery) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || u.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
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
                src="/favicon.png"
                alt="Skinify Logo"
                className="h-12 w-auto object-contain cursor-pointer"
                onClick={() => navigate('/')}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              <div className="hidden group-hover:block">
                <motion.img
                  src="/logo-alt.png"
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
          <motion.header className="fixed top-0 left-16 right-0 bg-gray-800 border-b border-gray-700/50 p-4 z-30 shadow-lg">
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
                            onClick={item.onClick}
                            onMouseEnter={() => setHoveredNavItem(item.name)}
                            onMouseLeave={() => setHoveredNavItem(null)}
                            whileHover={{
                              scale: 1.05,
                              filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.9))'
                            }}
                            whileTap={{ scale: 0.95 }}
                            className={`flex justify-center relative px-4 py-2 text-sm font-medium transition-all duration-300 flex items-center space-x-2 rounded-lg ${
                              activeTab === item.name.toLowerCase()
                                ? 'text-white bg-purple-600'
                                : hoveredNavItem === item.name
                                  ? 'text-purple-200 bg-purple-500/30'
                                  : 'text-gray-300 hover:text-white hover:bg-purple-500/20'
                            }`}
                          >
                            <item.icon size={16} />
                            <span>{item.name}</span>
                          </motion.button>
                        </Flipped>
                      ))}
                    </div>
                  </motion.nav>
                </Flipper>
              </div>

              {/* Right Side - User Profile */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                <UserProfile />
              </div>
            </div>
          </motion.header>

          {/* Content Area */}
          <div className="flex-1 pt-24 pb-12 px-6">
            <div className="container mx-auto max-w-7xl">
              {/* Admin Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                      Admin Control Panel
                    </h1>
                    <p className="text-sm text-gray-400">Manage platform operations and users</p>
                  </div>
                </div>
              </motion.div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {/* Withdrawals Tab */}
                {activeTab === 'withdrawals' && (
                  <motion.div
                    key="withdrawals"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold flex items-center">
                          <Wallet className="w-6 h-6 text-green-400 mr-2" />
                          Withdrawal Management
                        </h2>
                        <button
                          onClick={fetchWithdrawals}
                          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
                        >
                          <RefreshCw size={16} />
                          <span>Refresh</span>
                        </button>
                      </div>

                      {/* Filters */}
                      <div className="flex gap-4 mb-6">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search by username or Steam ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                          />
                        </div>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        >
                          <option value="all">All Status</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      {/* Withdrawals List */}
                      <div className="space-y-4">
                        {filteredWithdrawals.length === 0 ? (
                          <div className="text-center py-12 text-gray-400">
                            <Wallet className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No withdrawal requests found</p>
                          </div>
                        ) : (
                          filteredWithdrawals.map((withdrawal) => (
                            <div
                              key={withdrawal.id}
                              className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30 hover:border-purple-500/50 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h3 className="text-lg font-semibold text-white">{withdrawal.username}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      withdrawal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                      withdrawal.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                                      withdrawal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                      'bg-green-500/20 text-green-400'
                                    }`}>
                                      {withdrawal.status}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-400">Amount:</span>
                                      <span className="text-green-400 font-bold ml-2">{withdrawal.amount.toLocaleString('cs-CZ')} Kč</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Method:</span>
                                      <span className="text-white ml-2">{withdrawal.method}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Account:</span>
                                      <span className="text-white ml-2">{withdrawal.accountDetails}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Requested:</span>
                                      <span className="text-white ml-2">{new Date(withdrawal.requestedAt).toLocaleString('cs-CZ')}</span>
                                    </div>
                                  </div>
                                </div>

                                {withdrawal.status === 'pending' && (
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handleWithdrawalAction(withdrawal.id, 'approve')}
                                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
                                    >
                                      <CheckCircle size={16} />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      onClick={() => handleWithdrawalAction(withdrawal.id, 'reject')}
                                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
                                    >
                                      <X size={16} />
                                      <span>Reject</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                  <motion.div
                    key="users"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold flex items-center">
                          <Users className="w-6 h-6 text-blue-400 mr-2" />
                          User Management
                        </h2>
                        <button
                          onClick={fetchUsers}
                          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
                        >
                          <RefreshCw size={16} />
                          <span>Refresh</span>
                        </button>
                      </div>

                      {/* Filters */}
                      <div className="flex gap-4 mb-6">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search by username, email, or Steam ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                          />
                        </div>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        >
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="warned">Warned</option>
                          <option value="banned">Banned</option>
                        </select>
                      </div>

                      {/* Users List */}
                      <div className="space-y-4">
                        {filteredUsers.length === 0 ? (
                          <div className="text-center py-12 text-gray-400">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No users found</p>
                          </div>
                        ) : (
                          filteredUsers.map((user) => (
                            <div
                              key={user.id}
                              className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30 hover:border-purple-500/50 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h3 className="text-lg font-semibold text-white">{user.username}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      user.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                      user.status === 'warned' ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-red-500/20 text-red-400'
                                    }`}>
                                      {user.status}
                                    </span>
                                    {user.warningCount > 0 && (
                                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">
                                        {user.warningCount} warning{user.warningCount > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-400">Balance:</span>
                                      <span className="text-green-400 font-bold ml-2">{user.balance.toLocaleString('cs-CZ')} Kč</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Trades:</span>
                                      <span className="text-white ml-2">{user.trades}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Spent:</span>
                                      <span className="text-white ml-2">{user.totalSpent.toLocaleString('cs-CZ')} Kč</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Joined:</span>
                                      <span className="text-white ml-2">{new Date(user.joinedAt).toLocaleDateString('cs-CZ')}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setActionType('warn');
                                      setShowUserActionModal(true);
                                    }}
                                    className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
                                  >
                                    <AlertTriangle size={16} />
                                    <span>Warn</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setActionType('ban');
                                      setShowUserActionModal(true);
                                    }}
                                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
                                  >
                                    <Ban size={16} />
                                    <span>Ban</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold flex items-center">
                          <Bell className="w-6 h-6 text-purple-400 mr-2" />
                          Send Notifications
                        </h2>
                        <button
                          onClick={() => setShowNotificationModal(true)}
                          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
                        >
                          <Send size={16} />
                          <span>New Notification</span>
                        </button>
                      </div>

                      <div className="text-center py-12">
                        <Bell className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
                        <p className="text-gray-400 mb-4">Send notifications to all users or specific users</p>
                        <button
                          onClick={() => setShowNotificationModal(true)}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-lg transition-all"
                        >
                          Create Notification
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                        <Users className="w-8 h-8 text-blue-400 mb-3" />
                        <div className="text-2xl font-bold text-white mb-1">12,478</div>
                        <div className="text-blue-300 text-sm">Total Users</div>
                        <div className="text-green-400 text-xs mt-1">+156 this week</div>
                      </div>

                      <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
                        <DollarSign className="w-8 h-8 text-green-400 mb-3" />
                        <div className="text-2xl font-bold text-white mb-1">4.5M Kč</div>
                        <div className="text-green-300 text-sm">Total Volume</div>
                        <div className="text-green-400 text-xs mt-1">+125K today</div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                        <Activity className="w-8 h-8 text-purple-400 mb-3" />
                        <div className="text-2xl font-bold text-white mb-1">99.8%</div>
                        <div className="text-purple-300 text-sm">Success Rate</div>
                        <div className="text-green-400 text-xs mt-1">1.2s avg response</div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                        <Package className="w-8 h-8 text-orange-400 mb-3" />
                        <div className="text-2xl font-bold text-white mb-1">89,456</div>
                        <div className="text-orange-300 text-sm">Transactions</div>
                        <div className="text-green-400 text-xs mt-1">System operational</div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                      <h3 className="text-xl font-bold mb-6 flex items-center">
                        <Shield className="w-6 h-6 text-green-500 mr-2" />
                        System Status
                      </h3>
                      <div className="space-y-4">
                        {[
                          { label: 'API Status', status: 'Operational' },
                          { label: 'Database', status: 'Healthy' },
                          { label: 'Steam Integration', status: 'Connected' },
                          { label: 'Payment System', status: 'Active' }
                        ].map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-gray-400">{item.label}</span>
                            <span className="text-green-400 flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                      <h2 className="text-2xl font-bold flex items-center mb-6">
                        <Settings className="w-6 h-6 text-gray-400 mr-2" />
                        Site Settings
                      </h2>
                      <div className="text-center py-12 text-gray-400">
                        <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Site configuration options coming soon</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-purple-500/30 max-w-2xl w-full shadow-2xl"
          >
            <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center">
                <Bell className="w-6 h-6 text-purple-400 mr-2" />
                Send Notification
              </h3>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  value={notificationData.type}
                  onChange={(e) => setNotificationData({ ...notificationData, type: e.target.value as any })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target</label>
                <select
                  value={notificationData.targetUser}
                  onChange={(e) => setNotificationData({ ...notificationData, targetUser: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Users</option>
                  <option value="specific">Specific User</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={notificationData.title}
                  onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })}
                  placeholder="Notification title"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea
                  value={notificationData.message}
                  onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
                  placeholder="Notification message"
                  rows={4}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-700/50 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg transition-all flex items-center space-x-2"
              >
                <Send size={16} />
                <span>Send Notification</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* User Action Modal */}
      {showUserActionModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-red-500/30 max-w-2xl w-full shadow-2xl"
          >
            <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center">
                {actionType === 'ban' ? (
                  <>
                    <Ban className="w-6 h-6 text-red-400 mr-2" />
                    Ban User
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-6 h-6 text-yellow-400 mr-2" />
                    Warn User
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowUserActionModal(false);
                  setSelectedUser(null);
                  setActionType('');
                  setActionReason('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-700/30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Target User</div>
                <div className="text-lg font-semibold text-white">{selectedUser.username}</div>
                <div className="text-sm text-gray-400">{selectedUser.email}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reason *</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={`Enter reason for ${actionType}ning this user...`}
                  rows={4}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-300">
                    {actionType === 'ban'
                      ? 'This will permanently ban the user from the platform. They will not be able to log in or access any features.'
                      : 'This will issue a warning to the user. Multiple warnings may result in a ban.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700/50 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUserActionModal(false);
                  setSelectedUser(null);
                  setActionType('');
                  setActionReason('');
                }}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUserAction}
                className={`px-6 py-2 rounded-lg transition-all flex items-center space-x-2 ${
                  actionType === 'ban'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                }`}
              >
                {actionType === 'ban' ? <Ban size={16} /> : <AlertTriangle size={16} />}
                <span>Confirm {actionType === 'ban' ? 'Ban' : 'Warning'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
