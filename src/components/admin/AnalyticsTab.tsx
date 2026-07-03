import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Users, Eye, MousePointerClick, DollarSign,
  ShoppingCart, TrendingUp, Calendar, RefreshCw, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

interface TodayStats {
  total_visits: number;
  unique_visitors: number;
  page_views: number;
  clicks: number;
  new_registrations: number;
  deposits_today: number;
  purchases_today: number;
}

interface PageStats {
  page: string;
  views: number;
  percentage: number;
}

interface ActivityData {
  date: string;
  visits: number;
  users: number;
  deposits: number;
  purchases: number;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const AnalyticsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [pageStats, setPageStats] = useState<PageStats[]>([]);
  const [eventStats, setEventStats] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Get today's stats
      const { data: todayData } = await supabase.rpc('get_today_stats');
      if (todayData) {
        setTodayStats(todayData);
      }

      // Get activity data for the selected time range
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: activityRaw } = await supabase
        .from('user_activity')
        .select('created_at, event_type, event_data')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (activityRaw) {
        // Group by date
        const groupedByDate: Record<string, ActivityData> = {};

        activityRaw.forEach((activity: any) => {
          const date = new Date(activity.created_at).toLocaleDateString();

          if (!groupedByDate[date]) {
            groupedByDate[date] = {
              date,
              visits: 0,
              users: 0,
              deposits: 0,
              purchases: 0
            };
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

        // Get page stats
        const pageViews = activityRaw.filter((a: any) => a.event_type === 'page_view');
        const pageCount: Record<string, number> = {};

        pageViews.forEach((view: any) => {
          const page = view.event_data?.page_url || 'Unknown';
          pageCount[page] = (pageCount[page] || 0) + 1;
        });

        const totalViews = Object.values(pageCount).reduce((sum, count) => sum + count, 0);
        const topPages = Object.entries(pageCount)
          .map(([page, views]) => ({
            page: page.replace('/', '').replace('-', ' ') || 'Home',
            views,
            percentage: Math.round((views / totalViews) * 100)
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10);

        setPageStats(topPages);

        // Get event type distribution
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
    <div className="space-y-6">
      {/* Header */}
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

      {/* Today's Stats Cards */}
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
          <div className="text-xs text-ink-muted mt-1">
            {todayStats?.unique_visitors || 0} unique visitors
          </div>
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

      {/* Activity Over Time Chart */}
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
        {/* Event Types Distribution */}
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

        {/* Top Pages */}
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

      {/* Additional Stats */}
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
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {todayStats?.unique_visitors || 0}
            </div>
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
    </div>
  );
};

export default AnalyticsTab;
