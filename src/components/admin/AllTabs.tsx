// This file contains all remaining admin tab components for efficient import

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Lock, BarChart3, Settings, MessageSquare, Wrench, Wallet, Activity, Search, RefreshCw, Download, Eye, CreditCard as Edit3, Trash2, CheckCircle, X, Shield, TrendingUp, Users, DollarSign, AlertTriangle, Bell, Database, Code, TestTube, FileText } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Inventory Tab
export const InventoryTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('marketplace_listings')
          .select('*, users(display_name)')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setListings(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Inventory & Listings</h2>
          <p className="text-gray-400 text-sm">Manage marketplace listings</p>
        </div>
        <button onClick={fetchListings} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-white">{listings.length}</div>
          <div className="text-gray-400 text-sm">Total Listings</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-green-400">{listings.filter(l => l.status === 'active').length}</div>
          <div className="text-gray-400 text-sm">Active</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-yellow-400">{listings.filter(l => l.status === 'pending').length}</div>
          <div className="text-gray-400 text-sm">Pending Review</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-accent">{listings.filter(l => (l.price || 0) > 50000).length}</div>
          <div className="text-gray-400 text-sm">High Value</div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400">Item</th>
                <th className="text-left py-3 px-4 text-gray-400">Seller</th>
                <th className="text-left py-3 px-4 text-gray-400">Price</th>
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
                <th className="text-right py-3 px-4 text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-3 px-4 text-white">{listing.item_name || 'Unknown Item'}</td>
                  <td className="py-3 px-4 text-gray-300">{listing.users?.display_name || 'Unknown'}</td>
                  <td className="py-3 px-4 text-white font-semibold">{(listing.price || 0).toLocaleString('cs-CZ')} Kč</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      listing.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      listing.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {listing.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="text-accent hover:text-blue-300 p-2"><Eye size={16} /></button>
                      <button className="text-yellow-400 hover:text-yellow-300 p-2"><Edit3 size={16} /></button>
                      <button className="text-red-400 hover:text-red-300 p-2"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

// Security Tab
export const SecurityTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      if (supabase) {
        const [logsData, suspiciousData] = await Promise.all([
          supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('suspicious_activities').select('*').eq('status', 'pending').limit(10)
        ]);
        
        setLogs(logsData.data || []);
        setSuspiciousActivities(suspiciousData.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Lock className="w-6 h-6 text-red-400" />
        Security & Monitoring
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Admin Action Logs
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="bg-gray-700/30 rounded-lg p-3">
                <div className="text-sm text-gray-300">{log.action}</div>
                <div className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString('cs-CZ')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Suspicious Activities
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {suspiciousActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No suspicious activities detected</div>
            ) : (
              suspiciousActivities.map((activity) => (
                <div key={activity.id} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="text-sm text-white">{activity.description}</div>
                  <div className="text-xs text-red-400">Severity: {activity.severity}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Analytics Tab
export const AnalyticsTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [analytics, setAnalytics] = useState({
    dau: 0,
    mau: 0,
    revenue30d: 0,
    growthRate: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      if (supabase) {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [dauData, mauData, revenueData] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login', yesterday.toISOString()),
          supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login', month.toISOString()),
          supabase.from('transactions').select('amount').eq('status', 'completed').gte('created_at', month.toISOString())
        ]);

        const revenue = revenueData.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

        setAnalytics({
          dau: dauData.count || 0,
          mau: mauData.count || 0,
          revenue30d: revenue,
          growthRate: 12.5
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-purple-400" />
        Analytics & Reporting
      </h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-6 border border-accent/20">
          <Users className="w-8 h-8 text-accent mb-3" />
          <div className="text-2xl font-bold text-white">{analytics.dau}</div>
          <div className="text-blue-300 text-sm">Daily Active Users</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg p-6 border border-purple-500/20">
          <Users className="w-8 h-8 text-purple-400 mb-3" />
          <div className="text-2xl font-bold text-white">{analytics.mau}</div>
          <div className="text-purple-300 text-sm">Monthly Active Users</div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-6 border border-green-500/20">
          <DollarSign className="w-8 h-8 text-green-400 mb-3" />
          <div className="text-2xl font-bold text-white">{(analytics.revenue30d / 1000).toFixed(1)}K Kč</div>
          <div className="text-green-300 text-sm">30-Day Revenue</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-lg p-6 border border-orange-500/20">
          <TrendingUp className="w-8 h-8 text-orange-400 mb-3" />
          <div className="text-2xl font-bold text-white">+{analytics.growthRate}%</div>
          <div className="text-orange-300 text-sm">Growth Rate</div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-xl font-bold mb-4">Revenue Trends</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          Chart placeholder - Connect to data visualization library
        </div>
      </div>
    </motion.div>
  );
};

// Support Tab
export const SupportTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('*, users(display_name)')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setTickets(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-accent" />
        Support & Communication
      </h2>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400">ID</th>
              <th className="text-left py-3 px-4 text-gray-400">User</th>
              <th className="text-left py-3 px-4 text-gray-400">Subject</th>
              <th className="text-left py-3 px-4 text-gray-400">Status</th>
              <th className="text-left py-3 px-4 text-gray-400">Priority</th>
              <th className="text-right py-3 px-4 text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-3 px-4 text-gray-300 font-mono text-sm">{ticket.id.slice(0, 8)}</td>
                <td className="py-3 px-4 text-white">{ticket.users?.display_name || 'Unknown'}</td>
                <td className="py-3 px-4 text-gray-300">{ticket.subject}</td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    ticket.status === 'open' ? 'bg-green-500/20 text-green-400' :
                    ticket.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-300">{ticket.priority}</td>
                <td className="py-3 px-4 text-right">
                  <button className="text-accent hover:text-blue-300 px-3 py-1 rounded bg-accent-soft">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// Settings Tab
export const SettingsTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [settings, setSettings] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('system_settings').select('*');
        if (error) throw error;
        setSettings(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Settings className="w-6 h-6 text-gray-400" />
        System Settings
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settings.map((setting) => (
          <div key={setting.id} className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-bold text-white mb-2">{setting.key}</h3>
            <p className="text-gray-400 text-sm mb-4">{setting.description}</p>
            <div className="bg-gray-700/50 rounded px-3 py-2 text-white font-mono text-sm">
              {JSON.stringify(setting.value)}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Developer Tab
export const DeveloperTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [systemHealth, setSystemHealth] = useState({
    database: 'operational',
    api: 'operational',
    payments: 'operational',
    storage: 'operational'
  });

  const apiEndpoints = [
    { name: 'User Authentication', endpoint: '/auth', status: 'active', requests: '1.2K' },
    { name: 'Marketplace API', endpoint: '/marketplace', status: 'active', requests: '856' },
    { name: 'Payment Processing', endpoint: '/payments', status: 'active', requests: '432' },
    { name: 'Trade System', endpoint: '/trades', status: 'active', requests: '678' },
    { name: 'Admin Panel', endpoint: '/admin', status: 'active', requests: '89' }
  ];

  const databaseStats = [
    { table: 'users', records: '2,453', size: '12.3 MB' },
    { table: 'marketplace_items', records: '8,921', size: '45.6 MB' },
    { table: 'user_transactions', records: '5,678', size: '23.4 MB' },
    { table: 'orders', records: '4,321', size: '18.7 MB' }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
        <Wrench className="w-6 h-6 text-purple-400" />
        Developer & Maintenance Tools
      </h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-6 border border-purple-500/30">
          <Database className="w-8 h-8 text-purple-400 mb-3" />
          <div className="text-2xl font-bold text-white">{systemHealth.database}</div>
          <div className="text-purple-300 text-sm">Database Status</div>
        </div>
        <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 rounded-xl p-6 border border-pink-500/30">
          <Activity className="w-8 h-8 text-pink-400 mb-3" />
          <div className="text-2xl font-bold text-white">{systemHealth.api}</div>
          <div className="text-pink-300 text-sm">API Status</div>
        </div>
        <div className="bg-gradient-to-br from-fuchsia-500/10 to-fuchsia-600/10 rounded-xl p-6 border border-fuchsia-500/30">
          <DollarSign className="w-8 h-8 text-fuchsia-400 mb-3" />
          <div className="text-2xl font-bold text-white">{systemHealth.payments}</div>
          <div className="text-fuchsia-300 text-sm">Payment System</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/30">
          <FileText className="w-8 h-8 text-purple-400 mb-3" />
          <div className="text-2xl font-bold text-white">{systemHealth.storage}</div>
          <div className="text-purple-300 text-sm">Storage Status</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gray-900 to-purple-900/20 rounded-xl border border-purple-500/30 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-purple-400" />
            API Endpoints
          </h3>
          <div className="space-y-3">
            {apiEndpoints.map((api, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">{api.name}</span>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                    {api.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 font-mono">{api.endpoint}</span>
                  <span className="text-purple-300">{api.requests} req/day</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-pink-900/20 rounded-xl border border-pink-500/30 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-pink-400" />
            Database Statistics
          </h3>
          <div className="space-y-3">
            {databaseStats.map((stat, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg p-4 border border-pink-500/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium font-mono">{stat.table}</span>
                  <span className="text-pink-300 text-sm">{stat.size}</span>
                </div>
                <div className="text-sm text-gray-400">
                  {stat.records} records
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-900 to-purple-900/20 rounded-xl border border-purple-500/30 p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-400" />
          System Logs (Last 24h)
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {[
            { time: '14:32:15', type: 'info', message: 'User authentication successful - user_id: 7623847' },
            { time: '14:28:43', type: 'success', message: 'Payment processed successfully - 5000 CZK' },
            { time: '14:15:22', type: 'info', message: 'New marketplace listing created - AK-47 Redline' },
            { time: '13:58:09', type: 'warning', message: 'High API request rate detected - monitoring' },
            { time: '13:42:17', type: 'info', message: 'Trade offer sent - offer_id: 982374' },
            { time: '13:25:33', type: 'success', message: 'Database backup completed successfully' },
            { time: '12:58:44', type: 'info', message: 'Admin panel accessed - admin_id: super_admin' }
          ].map((log, i) => (
            <div key={i} className="bg-gray-800/30 rounded p-3 border border-gray-700/50 hover:border-purple-500/30 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 font-mono text-xs">{log.time}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  log.type === 'success' ? 'bg-purple-500/20 text-purple-400' :
                  log.type === 'warning' ? 'bg-pink-500/20 text-pink-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {log.type}
                </span>
                <span className="text-gray-300 text-sm">{log.message}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Withdrawals Tab
export const WithdrawalsTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*, users(display_name)')
          .eq('type', 'withdrawal')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setWithdrawals(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Wallet className="w-6 h-6 text-green-400" />
        Withdrawal Management
      </h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-yellow-400">{withdrawals.filter(w => w.status === 'pending').length}</div>
          <div className="text-gray-400 text-sm">Pending</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-green-400">{withdrawals.filter(w => w.status === 'completed').length}</div>
          <div className="text-gray-400 text-sm">Completed</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-red-400">{withdrawals.filter(w => w.status === 'failed').length}</div>
          <div className="text-gray-400 text-sm">Failed</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-white">
            {withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + (w.amount || 0), 0).toLocaleString('cs-CZ')} Kč
          </div>
          <div className="text-gray-400 text-sm">Pending Amount</div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400">User</th>
              <th className="text-left py-3 px-4 text-gray-400">Amount</th>
              <th className="text-left py-3 px-4 text-gray-400">Method</th>
              <th className="text-left py-3 px-4 text-gray-400">Status</th>
              <th className="text-right py-3 px-4 text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => (
              <tr key={w.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-3 px-4 text-white">{w.users?.display_name || 'Unknown'}</td>
                <td className="py-3 px-4 text-white font-semibold">{(w.amount || 0).toLocaleString('cs-CZ')} Kč</td>
                <td className="py-3 px-4 text-gray-300">{w.payment_method || 'N/A'}</td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    w.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {w.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {w.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <button className="text-green-400 hover:text-green-300 px-3 py-1 rounded bg-green-500/10">Approve</button>
                      <button className="text-red-400 hover:text-red-300 px-3 py-1 rounded bg-red-500/10">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// Monitoring Tab
export const MonitoringTab: React.FC<{ addToast: any }> = ({ addToast }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
      <Activity className="w-6 h-6 text-accent" />
      Real-time Monitoring
    </h2>
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-xl font-bold mb-4">Active Users</h3>
        <div className="text-4xl font-bold text-green-400">247</div>
        <div className="text-sm text-gray-400">Online now</div>
      </div>
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-xl font-bold mb-4">Transactions/min</h3>
        <div className="text-4xl font-bold text-accent">12.5</div>
        <div className="text-sm text-gray-400">Average rate</div>
      </div>
    </div>
  </motion.div>
);
