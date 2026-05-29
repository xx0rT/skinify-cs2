import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Activity, Package, Shield, TrendingUp, AlertTriangle, Sparkles, Crown, Wallet } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  pendingWithdrawals: number;
  activeListings: number;
  successRate: number;
  avgResponseTime: string;
}

interface RecentActivity {
  id: string;
  message: string;
  time: string;
  type: 'user' | 'transaction' | 'alert' | 'system';
}

const DashboardTab: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    pendingWithdrawals: 0,
    activeListings: 0,
    successRate: 0,
    avgResponseTime: '0s'
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        console.warn('Supabase not initialized');
        setLoading(false);
        return;
      }

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        usersCount,
        activeUsersCount,
        transactionsResult,
        withdrawalsCount,
        listingsCount,
        recentTransactions
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login', last24h.toISOString()),
        supabase.from('user_transactions').select('amount, status, type'),
        supabase.from('user_transactions').select('*', { count: 'exact', head: true }).eq('type', 'withdrawal').eq('status', 'pending'),
        supabase.from('marketplace_listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('user_transactions').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      const transactions = transactionsResult.data || [];
      const completedTransactions = transactions.filter(t => t.status === 'completed');
      const revenue = completedTransactions
        .filter(t => t.type === 'deposit' || t.type === 'purchase')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const successRate = transactions.length > 0
        ? (completedTransactions.length / transactions.length) * 100
        : 100;

      setStats({
        totalUsers: usersCount.count || 0,
        activeUsers: activeUsersCount.count || 0,
        totalRevenue: revenue,
        totalTransactions: transactions.length,
        pendingWithdrawals: withdrawalsCount.count || 0,
        activeListings: listingsCount.count || 0,
        successRate: Math.round(successRate * 10) / 10,
        avgResponseTime: '1.2s'
      });

      const activities: RecentActivity[] = (recentTransactions.data || []).map(tx => ({
        id: tx.id,
        message: formatTransactionMessage(tx),
        time: formatTimeAgo(tx.created_at),
        type: tx.type === 'deposit' || tx.type === 'withdrawal' ? 'transaction' : 'system'
      }));

      setRecentActivity(activities);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTransactionMessage = (tx: any): string => {
    const amount = tx.amount?.toLocaleString() || '0';
    const types: Record<string, string> = {
      'deposit': `Deposit: ${amount} CZK`,
      'withdrawal': `Withdrawal: ${amount} CZK`,
      'purchase': `Purchase: ${amount} CZK`,
      'refund': `Refund: ${amount} CZK`
    };
    return types[tx.type] || `Transaction: ${amount} CZK`;
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user': return 'purple';
      case 'transaction': return 'purple';
      case 'alert': return 'purple';
      case 'system': return 'purple';
      default: return 'purple';
    }
  };

  const statCards = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      change: `${stats.activeUsers} active today`,
      gradient: 'from-purple-600/20 via-purple-500/20 to-fuchsia-600/20'
    },
    {
      icon: DollarSign,
      label: 'Total Revenue',
      value: `${(stats.totalRevenue / 1000).toFixed(1)}K CZK`,
      change: 'All deposits',
      gradient: 'from-purple-600/20 via-purple-500/20 to-pink-600/20'
    },
    {
      icon: Activity,
      label: 'Success Rate',
      value: `${stats.successRate}%`,
      change: stats.avgResponseTime + ' avg',
      gradient: 'from-fuchsia-600/20 via-purple-500/20 to-purple-600/20'
    },
    {
      icon: Package,
      label: 'Transactions',
      value: stats.totalTransactions.toLocaleString(),
      change: 'All time',
      gradient: 'from-pink-600/20 via-purple-500/20 to-purple-600/20'
    }
  ];

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 shadow-lg hover:shadow-purple-500/20 transition-all duration-300`}
                style={{
                  boxShadow: '0 0 30px rgba(168, 85, 247, 0.15)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                <div className="relative z-10">
                  <stat.icon className="w-8 h-8 text-purple-400 mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-purple-300 text-sm font-medium">{stat.label}</div>
                  <div className="text-purple-400/80 text-xs mt-1">{stat.change}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/20 via-gray-900/50 to-gray-900/50 rounded-xl border border-purple-500/30 p-6 shadow-lg" style={{ boxShadow: '0 0 30px rgba(168, 85, 247, 0.1)' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-6 flex items-center">
                  <Shield className="w-6 h-6 text-purple-400 mr-2" />
                  <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                    System Status
                  </span>
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'API Status', status: 'Operational', icon: Sparkles },
                    { label: 'Database', status: 'Healthy', icon: Shield },
                    { label: 'Steam Integration', status: 'Connected', icon: Crown },
                    { label: 'Payment System', status: 'Active', icon: Wallet },
                    { label: 'Pending Withdrawals', status: `${stats.pendingWithdrawals} pending`, icon: AlertTriangle },
                    { label: 'Active Listings', status: `${stats.activeListings} live`, icon: Package }
                  ].map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-800/30 rounded-lg p-3 border border-purple-500/10">
                      <div className="flex items-center">
                        <item.icon className="w-4 h-4 text-purple-400 mr-2" />
                        <span className="text-gray-300">{item.label}</span>
                      </div>
                      <span className="text-purple-400 flex items-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse shadow-lg shadow-purple-500/50"></div>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/20 via-gray-900/50 to-gray-900/50 rounded-xl border border-purple-500/30 p-6 shadow-lg" style={{ boxShadow: '0 0 30px rgba(168, 85, 247, 0.1)' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-6 flex items-center">
                  <Activity className="w-6 h-6 text-purple-400 mr-2" />
                  <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Recent Activity
                  </span>
                </h3>
                <div className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">No recent activity</div>
                  ) : (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="bg-gray-800/30 rounded-lg p-3 border border-purple-500/10 hover:border-purple-500/30 transition-all duration-300">
                        <div className="flex justify-between items-start">
                          <span className="text-gray-300 text-sm flex-1">{activity.message}</span>
                          <span className="text-xs text-purple-400 ml-2">
                            {activity.time}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/20 via-gray-900/50 to-gray-900/50 rounded-xl border border-purple-500/30 p-6 shadow-lg" style={{ boxShadow: '0 0 30px rgba(168, 85, 247, 0.1)' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-6 flex items-center">
                <TrendingUp className="w-6 h-6 text-purple-400 mr-2" />
                <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Quick Actions
                </span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Users, label: 'Manage Users' },
                  { icon: DollarSign, label: 'Transactions' },
                  { icon: AlertTriangle, label: 'Alerts' },
                  { icon: Package, label: 'Listings' }
                ].map((action, index) => (
                  <button
                    key={index}
                    className="group relative overflow-hidden bg-gradient-to-br from-purple-600/10 to-purple-500/5 hover:from-purple-600/20 hover:to-purple-500/10 border border-purple-500/30 hover:border-purple-400/50 rounded-lg p-4 transition-all duration-300 flex flex-col items-center justify-center space-y-2"
                    style={{
                      boxShadow: '0 0 20px rgba(168, 85, 247, 0.1)'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:to-transparent transition-all duration-300"></div>
                    <action.icon className="relative z-10 w-6 h-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    <span className="relative z-10 text-purple-300 group-hover:text-purple-200 text-sm transition-colors">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default DashboardTab;
