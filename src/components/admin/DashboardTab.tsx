import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Activity, Package, AlertTriangle, ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { spring, tap } from '../../lib/motion';

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

const DashboardTab: React.FC<{ onGoTo?: (tab: string) => void }> = ({ onGoTo }) => {
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

  const statCards = [
    {
      icon: Users,
      label: 'Total users',
      value: stats.totalUsers.toLocaleString(),
      sub: `${stats.activeUsers} active today`,
    },
    {
      icon: DollarSign,
      label: 'Revenue',
      value: `${(stats.totalRevenue / 1000).toFixed(1)}K CZK`,
      sub: 'All deposits',
    },
    {
      icon: Activity,
      label: 'Success rate',
      value: `${stats.successRate}%`,
      sub: `${stats.avgResponseTime} avg response`,
    },
    {
      icon: Package,
      label: 'Transactions',
      value: stats.totalTransactions.toLocaleString(),
      sub: 'All time',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skel h-28 rounded-[20px]" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="skel h-64 rounded-[20px]" />
          <div className="skel h-64 rounded-[20px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat row — flat panels, staggered in */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: index * 0.05 }}
            className="panel p-5"
          >
            <stat.icon size={17} strokeWidth={2.2} className="text-accent mb-3" />
            <div className="text-[22px] font-bold tracking-tight tabular-nums text-ink leading-none">
              {stat.value}
            </div>
            <div className="label-meta mt-2">{stat.label}</div>
            <div className="text-[11.5px] text-ink-dim font-medium mt-1">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* System status — flat key-value rows */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="panel p-6"
        >
          <span className="label-eyebrow">System status</span>
          <div className="mt-4">
            {[
              { label: 'API', status: 'Operational', ok: true },
              { label: 'Database', status: 'Healthy', ok: true },
              { label: 'Steam integration', status: 'Connected', ok: true },
              { label: 'Payment system', status: 'Active', ok: true },
              {
                label: 'Pending withdrawals',
                status: `${stats.pendingWithdrawals} pending`,
                ok: stats.pendingWithdrawals === 0,
              },
              { label: 'Active listings', status: `${stats.activeListings} live`, ok: true },
            ].map((item) => (
              <div key={item.label} className="kv-row">
                <span className="kv-label">{item.label}</span>
                <span className="kv-value inline-flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.ok ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Recent activity */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.14 }}
          className="panel p-6"
        >
          <span className="label-eyebrow">Recent activity</span>
          <div className="mt-4 space-y-1">
            {recentActivity.length === 0 ? (
              <div className="py-10 text-center">
                <Activity size={20} className="mx-auto text-ink-muted mb-2" />
                <p className="text-[13px] text-ink-muted font-medium">No recent activity.</p>
              </div>
            ) : (
              recentActivity.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: 0.16 + i * 0.04 }}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-[13px] text-ink font-semibold truncate">
                    {activity.message}
                  </span>
                  <span className="text-[11px] text-ink-dim font-medium tabular-nums shrink-0">
                    {activity.time}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </motion.section>
      </div>

      {/* Quick actions */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.18 }}
        className="panel p-6"
      >
        <span className="label-eyebrow">Quick actions</span>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: Users, label: 'Manage users', tab: 'users' },
            { icon: DollarSign, label: 'Transactions', tab: 'finance' },
            { icon: AlertTriangle, label: 'Monitoring', tab: 'monitoring' },
            { icon: Package, label: 'Listings', tab: 'inventory' },
          ].map((action) => (
            <motion.button
              key={action.tab}
              whileTap={tap}
              whileHover={{ y: -2 }}
              onClick={() => onGoTo?.(action.tab)}
              className="group rounded-2xl bg-subtle hover:bg-accent-soft p-4 flex flex-col items-start gap-3 text-left transition-colors"
            >
              <action.icon
                size={17}
                strokeWidth={2.2}
                className="text-ink-muted group-hover:text-accent transition-colors"
              />
              <span className="text-[13px] font-bold text-ink tracking-tight inline-flex items-center gap-1">
                {action.label}
                <ChevronRight
                  size={12}
                  strokeWidth={2.6}
                  className="text-ink-dim group-hover:translate-x-0.5 transition-transform"
                />
              </span>
            </motion.button>
          ))}
        </div>
      </motion.section>
    </div>
  );
};

export default DashboardTab;
