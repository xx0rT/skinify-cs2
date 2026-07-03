import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Lock, BarChart3, Settings, MessageSquare, Wrench, Wallet, Activity, Search, RefreshCw, Download, Eye, CreditCard as Edit, Trash2, CheckCircle, X, Shield, TrendingUp, Users, DollarSign, AlertTriangle, Bell, Database, Code, TestTube, FileText, MousePointerClick, Calendar, ShoppingCart } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
          .select('*, users(username)')
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
          <h2 className="text-2xl font-bold text-ink">Inventory & Listings</h2>
          <p className="text-ink-muted text-sm">Manage marketplace listings</p>
        </div>
        <button onClick={fetchListings} className="bg-subtle hover:bg-bg px-4 py-2 rounded-lg text-ink flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-ink">{listings.length}</div>
          <div className="text-ink-muted text-sm">Total Listings</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{listings.filter(l => l.status === 'active').length}</div>
          <div className="text-ink-muted text-sm">Active</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{listings.filter(l => l.status === 'pending').length}</div>
          <div className="text-ink-muted text-sm">Pending Review</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{listings.filter(l => (l.price || 0) > 50000).length}</div>
          <div className="text-ink-muted text-sm">High Value</div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-line/50 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left py-3 px-4 text-ink-muted">Item</th>
                <th className="text-left py-3 px-4 text-ink-muted">Seller</th>
                <th className="text-left py-3 px-4 text-ink-muted">Price</th>
                <th className="text-left py-3 px-4 text-ink-muted">Status</th>
                <th className="text-right py-3 px-4 text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-ink-muted">No listings found</td></tr>
              ) : (
                listings.map((listing) => (
                  <tr key={listing.id} className="border-b border-line/50 hover:bg-subtle/30">
                    <td className="py-3 px-4 text-ink">{listing.item_name || 'Unknown Item'}</td>
                    <td className="py-3 px-4 text-ink-muted">{listing.users?.username || 'Unknown'}</td>
                    <td className="py-3 px-4 text-ink font-semibold">{(listing.price || 0).toLocaleString('cs-CZ')} Kč</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        listing.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        listing.status === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-gray-500/20 text-ink-muted'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="text-sky-600 dark:text-sky-400 hover:text-blue-300 p-2"><Eye size={16} /></button>
                        <button className="text-amber-600 dark:text-amber-400 hover:text-yellow-300 p-2"><Edit size={16} /></button>
                        <button className="text-rose-600 dark:text-rose-400 hover:text-red-300 p-2"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

export const AnalyticsTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [pageStats, setPageStats] = useState<any[]>([]);
  const [eventStats, setEventStats] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data: todayData } = await supabase.rpc('get_today_stats');
        if (todayData) {
          setTodayStats(todayData);
        }

        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: activityRaw } = await supabase
          .from('user_activity')
          .select('created_at, event_type, event_data')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (activityRaw) {
          const groupedByDate: Record<string, any> = {};

          activityRaw.forEach((activity: any) => {
            const date = new Date(activity.created_at).toLocaleDateString();

            if (!groupedByDate[date]) {
              groupedByDate[date] = { date, visits: 0, users: 0, deposits: 0, purchases: 0 };
            }

            if (activity.event_type === 'page_view') {
              groupedByDate[date].visits += 1;
            } else if (activity.event_type === 'deposit') {
              groupedByDate[date].deposits += activity.event_data?.amount || 0;
            } else if (activity.event_type === 'purchase') {
              groupedByDate[date].purchases += activity.event_data?.amount || 0;
            }
          });

          setActivityData(Object.values(groupedByDate));

          const pageViews = activityRaw.filter((a: any) => a.event_type === 'page_view');
          const pageCount: Record<string, number> = {};

          pageViews.forEach((view: any) => {
            const page = view.event_data?.page_url || 'Unknown';
            pageCount[page] = (pageCount[page] || 0) + 1;
          });

          const totalViews = Object.values(pageCount).reduce((sum: number, count) => sum + count, 0);
          const topPages = Object.entries(pageCount)
            .map(([page, views]) => ({
              page: page.replace('/', '').replace('-', ' ') || 'Home',
              views,
              percentage: Math.round((views / totalViews) * 100)
            }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

          setPageStats(topPages);

          const eventCount: Record<string, number> = {};
          activityRaw.forEach((a: any) => {
            eventCount[a.event_type] = (eventCount[a.event_type] || 0) + 1;
          });

          setEventStats(
            Object.entries(eventCount).map(([name, value]) => ({
              name: name.replace('_', ' ').toUpperCase(),
              value
            }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Activity className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            Analytics Dashboard
          </h2>
          <p className="text-ink-muted text-sm mt-1">Monitor user activity and platform metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-subtle text-ink px-4 py-2 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-ink rounded-lg transition"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-blue-500/30 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-8 h-8 text-sky-600 dark:text-sky-400" />
            <span className="text-2xl font-bold text-ink">{todayStats?.total_visits || 0}</span>
          </div>
          <div className="text-ink-muted font-medium">Total Visits Today</div>
          <div className="text-xs text-ink-muted mt-1">{todayStats?.unique_visitors || 0} unique visitors</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface border border-line rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold text-ink">{todayStats?.new_registrations || 0}</span>
          </div>
          <div className="text-ink-muted font-medium">New Registrations</div>
          <div className="text-xs text-ink-muted mt-1">Today's sign-ups</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface border border-green-500/30 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            <span className="text-2xl font-bold text-ink">
              {todayStats?.deposits_today?.toLocaleString() || 0} Kč
            </span>
          </div>
          <div className="text-ink-muted font-medium">Deposits Today</div>
          <div className="text-xs text-ink-muted mt-1">Total deposited</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface border border-orange-500/30 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <span className="text-2xl font-bold text-ink">
              {todayStats?.purchases_today?.toLocaleString() || 0} Kč
            </span>
          </div>
          <div className="text-ink-muted font-medium">Purchases Today</div>
          <div className="text-xs text-ink-muted mt-1">Total revenue</div>
        </motion.div>
      </div>

      <div className="bg-surface border border-line rounded-xl p-6">
        <h3 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          Activity Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Area type="monotone" dataKey="visits" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Visits" />
            <Area type="monotone" dataKey="deposits" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Deposits (Kč)" />
            <Area type="monotone" dataKey="purchases" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} name="Purchases (Kč)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-line rounded-xl p-6">
          <h3 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
            <MousePointerClick className="w-5 h-5 text-accent" />
            Event Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={eventStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {eventStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface border border-line rounded-xl p-6">
          <h3 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Top Pages
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pageStats} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" />
              <YAxis dataKey="page" type="category" width={100} stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Bar dataKey="views" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-xl p-6">
        <h3 className="text-xl font-bold text-ink mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-subtle rounded-lg">
            <div className="text-3xl font-bold text-sky-600 dark:text-sky-400">{todayStats?.page_views || 0}</div>
            <div className="text-ink-muted text-sm mt-1">Page Views Today</div>
          </div>
          <div className="text-center p-4 bg-subtle rounded-lg">
            <div className="text-3xl font-bold text-accent">{todayStats?.clicks || 0}</div>
            <div className="text-ink-muted text-sm mt-1">Clicks Today</div>
          </div>
          <div className="text-center p-4 bg-subtle rounded-lg">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{todayStats?.unique_visitors || 0}</div>
            <div className="text-ink-muted text-sm mt-1">Unique Visitors</div>
          </div>
          <div className="text-center p-4 bg-subtle rounded-lg">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {((todayStats?.page_views || 0) / (todayStats?.unique_visitors || 1)).toFixed(1)}
            </div>
            <div className="text-ink-muted text-sm mt-1">Avg Pages/Visitor</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const SupportTab: React.FC<{ addToast: any; user: any }> = ({ addToast, user }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      if (supabase) {
        let query = supabase
          .from('support_tickets')
          .select('*, users!support_tickets_user_id_fkey(display_name, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(100);

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;
        if (error) throw error;
        setTickets(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      addToast({ type: 'error', title: 'Error', message: 'Failed to fetch tickets' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('support_ticket_messages')
          .select('*, users:user_id(display_name, avatar_url)')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      if (supabase) {
        const updateData: any = { status: newStatus };
        if (newStatus === 'resolved' || newStatus === 'closed') {
          updateData.resolved_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from('support_tickets')
          .update(updateData)
          .eq('id', ticketId);

        if (error) throw error;
        addToast({ type: 'success', title: 'Success', message: 'Ticket status updated' });
        fetchTickets();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const sendReply = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      if (supabase && user?.id) {
        const { error } = await supabase
          .from('support_ticket_messages')
          .insert([
            {
              ticket_id: selectedTicket.id,
              user_id: user.id,
              message: newMessage.trim(),
              is_staff_reply: true
            }
          ]);

        if (error) throw error;

        if (selectedTicket.status === 'open') {
          await updateTicketStatus(selectedTicket.id, 'in_progress');
        }

        setNewMessage('');
        fetchMessages(selectedTicket.id);
        addToast({ type: 'success', title: 'Success', message: 'Reply sent' });
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-blue-500/30';
      case 'in_progress': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-yellow-500/30';
      case 'resolved': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-green-500/30';
      case 'closed': return 'bg-gray-500/20 text-ink-muted border-gray-500/30';
      default: return 'bg-gray-500/20 text-ink-muted border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-rose-600 dark:text-rose-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-amber-600 dark:text-amber-400';
      case 'low': return 'text-emerald-600 dark:text-emerald-400';
      default: return 'text-ink-muted';
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-accent" />
        Support Tickets Management
      </h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface rounded-lg p-4 border border-blue-500/30">
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{tickets.filter(t => t.status === 'open').length}</div>
          <div className="text-ink-muted text-sm">Open</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-yellow-500/30">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{tickets.filter(t => t.status === 'in_progress').length}</div>
          <div className="text-ink-muted text-sm">In Progress</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-green-500/30">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{tickets.filter(t => t.status === 'resolved').length}</div>
          <div className="text-ink-muted text-sm">Resolved</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-gray-500/30">
          <div className="text-2xl font-bold text-ink">{tickets.length}</div>
          <div className="text-ink-muted text-sm">Total</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === status
                ? 'bg-accent text-on-accent'
                : 'bg-surface text-ink-muted hover:bg-subtle'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-line/50 p-6 overflow-y-auto max-h-[600px]">
          <h3 className="text-lg font-semibold text-ink mb-4">Tickets List</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-ink-muted">No tickets found</div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    fetchMessages(ticket.id);
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedTicket?.id === ticket.id
                      ? 'border-purple-500 bg-accent-soft'
                      : 'border-line hover:border-line bg-bg/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-ink text-sm">{ticket.subject}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-ink-muted text-xs mb-2 line-clamp-1">{ticket.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-dim">{ticket.users?.display_name || 'Unknown'}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>{ticket.priority.toUpperCase()}</span>
                      <span className="text-ink-dim">{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-xl border border-line/50 p-6 flex flex-col">
          {selectedTicket ? (
            <>
              <div className="border-b border-line pb-4 mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-ink">{selectedTicket.subject}</h3>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                    className="bg-bg border border-line rounded px-3 py-1 text-sm text-ink"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <p className="text-ink-muted text-sm mb-3">{selectedTicket.description}</p>
                <div className="flex items-center gap-4 text-xs text-ink-dim">
                  <span>Category: {selectedTicket.category}</span>
                  <span className={`font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                    Priority: {selectedTicket.priority.toUpperCase()}
                  </span>
                  <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 space-y-3 max-h-[350px]">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.is_staff_reply ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      msg.is_staff_reply
                        ? 'bg-accent-soft border border-line text-ink'
                        : 'bg-surface border border-line text-ink-muted'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {msg.is_staff_reply ? 'Support (You)' : msg.users?.display_name}
                        </span>
                        <span className="text-xs text-ink-dim">{new Date(msg.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTicket.status !== 'closed' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                    placeholder="Type your reply..."
                    className="flex-1 bg-bg border border-line rounded-lg px-4 py-2 text-ink placeholder:text-ink-dim focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!newMessage.trim()}
                    className="bg-accent hover:opacity-90 text-on-accent disabled:opacity-50 disabled:cursor-not-allowed text-ink px-4 py-2 rounded-lg transition-colors"
                  >
                    Send
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-ink-muted">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a ticket to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const SettingsTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<any>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.from('system_settings').select('*');
        if (error) throw error;
        setSettings(data || []);
      }
    } catch (error: any) {
      console.error('Error:', error);
      addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (setting: any) => {
    setEditModal(setting);
    setEditValue(JSON.stringify(setting.value, null, 2));
  };

  const handleSave = async () => {
    try {
      if (!supabase || !editModal) return;

      const parsedValue = JSON.parse(editValue);

      const { error } = await supabase
        .from('system_settings')
        .update({ value: parsedValue, updated_at: new Date().toISOString() })
        .eq('id', editModal.id);

      if (error) throw error;

      addToast({ type: 'success', title: 'Success', message: 'Setting updated successfully' });
      setEditModal(null);
      fetchSettings();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to update setting' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Settings className="w-6 h-6 text-ink-muted" />
            System Settings
          </h2>
          <p className="text-ink-muted text-sm">Configure platform settings and parameters</p>
        </div>
        <button
          onClick={fetchSettings}
          className="bg-subtle hover:bg-bg px-4 py-2 rounded-lg text-ink flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : settings.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-ink-muted">
            No settings found. Please run the database setup script.
          </div>
        ) : (
          settings.map((setting) => (
            <div key={setting.id} className="bg-surface rounded-xl border border-line/50 p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-ink">{setting.key}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  setting.category === 'finance' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  setting.category === 'security' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                  setting.category === 'system' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' :
                  'bg-gray-500/20 text-ink-muted'
                }`}>
                  {setting.category}
                </span>
              </div>
              <p className="text-ink-muted text-sm mb-4">{setting.description}</p>
              <div className="bg-subtle rounded px-3 py-2 text-ink font-mono text-sm mb-4 overflow-x-auto">
                {JSON.stringify(setting.value)}
              </div>
              <button
                onClick={() => openEditModal(setting)}
                className="w-full bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-ink text-sm transition flex items-center justify-center gap-2"
              >
                <Edit size={16} />
                Edit Setting
              </button>
            </div>
          ))
        )}
      </div>

      {editModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-line p-6 max-w-2xl w-full">
            <h3 className="text-xl font-bold text-ink mb-4">Edit Setting: {editModal.key}</h3>
            <p className="text-ink-muted text-sm mb-4">{editModal.description}</p>

            <div className="mb-4">
              <label className="block text-ink-muted mb-2">Value (JSON format)</label>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-subtle border border-line rounded-lg px-4 py-2 text-ink font-mono focus:outline-none focus:border-blue-500"
                rows={6}
              />
              <p className="text-ink-dim text-xs mt-2">Make sure to use valid JSON format</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 bg-subtle hover:bg-bg text-ink rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-ink rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export const DeveloperTab: React.FC<{ addToast: any }> = ({ addToast }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
      <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
      Developer & Maintenance Tools
    </h2>
    <div className="grid grid-cols-3 gap-4">
      {[
        { icon: Code, label: 'Feature Flags', color: 'blue' },
        { icon: TestTube, label: 'A/B Testing', color: 'green' },
        { icon: Database, label: 'Database Tools', color: 'purple' },
        { icon: FileText, label: 'Audit Trail', color: 'yellow' },
        { icon: Activity, label: 'System Health', color: 'red' },
        { icon: Bell, label: 'Alerts Config', color: 'orange' }
      ].map((tool, i) => (
        <button
          key={i}
          className={`bg-${tool.color}-500/10 border border-${tool.color}-500/30 rounded-lg p-6 hover:bg-${tool.color}-500/20 transition cursor-pointer`}
        >
          <tool.icon className={`w-8 h-8 text-${tool.color}-400 mb-3`} />
          <div className={`text-${tool.color}-300 font-medium`}>{tool.label}</div>
        </button>
      ))}
    </div>
  </motion.div>
);

export const WithdrawalsTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  /* Import stores lazily so this file doesn't need a new top-level import. */
  const [adminSteamId, setAdminSteamId] = useState<string | null>(null);

  useEffect(() => {
    /* Pull the admin's steam id from authStore for the review call. */
    import('../../store/authStore').then(({ useAuthStore }) => {
      setAdminSteamId(useAuthStore.getState().user?.steamId || null);
    });
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('withdraw_requests')
        .select('*, users(display_name, steam_id)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows(data || []);
    } catch (err: any) {
      console.error('[admin/withdrawals] fetch failed:', err);
      addToast({
        type: 'error',
        title: 'Load failed',
        message: err?.message || 'Could not fetch withdrawal requests.',
      });
    } finally {
      setLoading(false);
    }
  };

  const review = async (id: number, action: 'approve' | 'reject', reason?: string) => {
    if (processing) return;
    if (!adminSteamId) {
      addToast({ type: 'error', title: 'Not signed in as admin' });
      return;
    }
    setProcessing(id);
    try {
      const { getSupabaseCredentials } = await import('../../utils/supabaseHelpers');
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/withdraw-review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'Content-Type': 'application/json',
          'x-admin-steam-id': adminSteamId,
        },
        body: JSON.stringify({ request_id: id, action, reason: reason || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.message || `Server error (${res.status})`);
      }
      addToast({
        type: 'success',
        title: action === 'approve' ? 'Approved' : 'Rejected',
        message: `Request #${id} ${action}d.`,
      });
      /* Refresh the list from the server so status counters update. */
      await fetchRequests();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Review failed',
        message: err?.message || 'Unknown error.',
      });
    } finally {
      setProcessing(null);
    }
  };

  const promptReject = (id: number) => {
    const reason = window.prompt('Reason for rejection (shown to the user):');
    if (!reason || !reason.trim()) return;
    review(id, 'reject', reason.trim());
  };

  const pending = rows.filter((r) => r.status === 'pending');
  const approved = rows.filter((r) => r.status === 'approved');
  const rejected = rows.filter((r) => r.status === 'rejected');
  const pendingAmount = pending.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
          <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          Withdrawal requests
        </h2>
        <button
          onClick={fetchRequests}
          className="text-sm text-ink-muted hover:text-ink flex items-center gap-1.5"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{pending.length}</div>
          <div className="text-ink-muted text-sm">Pending review</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{approved.length}</div>
          <div className="text-ink-muted text-sm">Approved</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">{rejected.length}</div>
          <div className="text-ink-muted text-sm">Rejected</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-ink tabular-nums">
            {pendingAmount.toLocaleString('cs-CZ')} Kč
          </div>
          <div className="text-ink-muted text-sm">Pending amount</div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-line/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line bg-surface/70">
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">User</th>
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Amount</th>
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Net</th>
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Method</th>
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Payout details</th>
              <th className="text-left py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Status</th>
              <th className="text-right py-3 px-4 text-ink-muted text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-ink-muted">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-ink-muted">
                  No withdrawal requests yet.
                </td>
              </tr>
            ) : (
              rows.map((w) => (
                <tr key={w.id} className="border-b border-line/50 hover:bg-subtle/20">
                  <td className="py-3 px-4">
                    <div className="text-ink text-sm">{w.users?.display_name || 'Unknown'}</div>
                    <div className="text-ink-dim text-xs font-mono">{w.user_steam_id}</div>
                  </td>
                  <td className="py-3 px-4 text-ink font-semibold tabular-nums">
                    {Number(w.amount || 0).toLocaleString('cs-CZ')} Kč
                  </td>
                  <td className="py-3 px-4 text-ink-muted tabular-nums">
                    {Number(w.net_amount || 0).toLocaleString('cs-CZ')} Kč
                  </td>
                  <td className="py-3 px-4 text-ink-muted text-sm">{w.method}</td>
                  <td className="py-3 px-4 text-ink-muted text-xs">
                    <code className="text-[10px] whitespace-pre-wrap">
                      {JSON.stringify(w.payout_details || {})}
                    </code>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        w.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : w.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {w.status}
                    </span>
                    {w.reason && (
                      <div className="text-xs text-ink-dim mt-1 max-w-[200px] truncate" title={w.reason}>
                        {w.reason}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {w.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => review(w.id, 'approve')}
                          disabled={processing === w.id}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-green-300 px-3 py-1 rounded bg-green-500/10 hover:bg-emerald-500/10 text-sm disabled:opacity-50"
                        >
                          {processing === w.id ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => promptReject(w.id)}
                          disabled={processing === w.id}
                          className="text-rose-600 dark:text-rose-400 hover:text-red-300 px-3 py-1 rounded bg-red-500/10 hover:bg-rose-500/10 text-sm disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export const MonitoringTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [activeUsers, setActiveUsers] = useState(0);
  const [transactionsPerMin, setTransactionsPerMin] = useState(0);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    try {
      if (supabase) {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

        const [usersData, transactionsData] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login', fiveMinAgo.toISOString()),
          supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('created_at', fiveMinAgo.toISOString())
        ]);

        setActiveUsers(usersData.count || 0);
        setTransactionsPerMin(((transactionsData.count || 0) / 5).toFixed(1) as any);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
        <Activity className="w-6 h-6 text-sky-600 dark:text-sky-400" />
        Real-time Monitoring
      </h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-line/50 p-6">
          <h3 className="text-xl font-bold mb-4">Active Users</h3>
          <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{activeUsers}</div>
          <div className="text-sm text-ink-muted">Online in last 5 minutes</div>
        </div>
        <div className="bg-surface rounded-xl border border-line/50 p-6">
          <h3 className="text-xl font-bold mb-4">Transactions/min</h3>
          <div className="text-4xl font-bold text-sky-600 dark:text-sky-400">{transactionsPerMin}</div>
          <div className="text-sm text-ink-muted">Average rate (last 5 min)</div>
        </div>
      </div>
    </motion.div>
  );
};
