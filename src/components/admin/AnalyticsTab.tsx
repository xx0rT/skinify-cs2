import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Users,
  Wallet,
  ArrowLeftRight,
  Package,
  Eye,
  Receipt,
  CheckCircle2,
  MousePointerClick,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { spring, tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   AnalyticsTab — real data from the core tables (users,
   user_transactions, marketplace_listings), rendered as flat panels
   with animated recharts. No mock RPCs.
   ───────────────────────────────────────────────────────────────────────── */

type Range = '7d' | '30d' | '90d';
const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };

interface DayPoint {
  day: string;
  signups: number;
  transactions: number;
  revenue: number;
  pageViews: number;
  visitors: number;
}

interface TypeSlice {
  name: string;
  value: number;
}

/* Resolve theme colors once — SVG attributes can't consume CSS vars. */
function themeColor(varName: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return v ? `rgb(${v})` : fallback;
  } catch {
    return fallback;
  }
}

const parent = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const child = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: spring },
};

const AnalyticsTab: React.FC<{ addToast?: any }> = ({ addToast }) => {
  const adminSteamId = useAuthStore((s) => s.user?.steamId);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('30d');
  const [days, setDays] = useState<DayPoint[]>([]);
  const [totals, setTotals] = useState({
    users: 0,
    newUsers: 0,
    revenue: 0,
    transactions: 0,
    activeListings: 0,
  });
  const [typeSlices, setTypeSlices] = useState<TypeSlice[]>([]);
  const [topListings, setTopListings] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<TypeSlice[]>([]);
  const [traffic, setTraffic] = useState({ pageViews: 0, visitors: 0 });
  const [revStats, setRevStats] = useState({ completed: 0, failedOrPending: 0, aov: 0 });

  const accent = useMemo(() => themeColor('--accent', '#8b49f2'), []);
  const inkDim = useMemo(() => themeColor('--ink-dim', '#828094'), []);
  const surface = useMemo(() => themeColor('--surface', '#ffffff'), []);
  const PIE_COLORS = [accent, '#10b981', '#f59e0b', '#ef4444', inkDim];

  const fetchAnalytics = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const nDays = RANGE_DAYS[range];

      /* All reads go through the admin-settings edge function (service
         role). Direct anon-key queries return zeros here — Steam-OpenID
         admins hold no Supabase Auth session, so RLS blocks the tables
         and the tab used to render as if the site had no data. */
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          'X-Steam-Id': adminSteamId || '',
        },
        body: JSON.stringify({ action: 'analytics', rangeDays: nDays }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Server error (${res.status})`);

      const usersCount = { count: Number(payload.usersCount || 0) };
      const listingsCount = { count: Number(payload.listingsCount || 0) };
      const topRes = { data: payload.topListings || [] };
      const newUsers = payload.newUsers || [];
      const txs = payload.transactions || [];
      const activity = payload.activity || [];

      /* Bucket everything by calendar day so the charts always have a
         continuous axis, even for days with zero events. */
      const buckets = new Map<string, DayPoint>();
      for (let i = nDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        buckets.set(key, {
          day: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
          signups: 0,
          transactions: 0,
          revenue: 0,
          pageViews: 0,
          visitors: 0,
        });
      }

      /* Traffic: page views + unique sessions per day, top pages. */
      const daySessions = new Map<string, Set<string>>();
      const allSessions = new Set<string>();
      const pageCounts = new Map<string, number>();
      for (const ev of activity) {
        const key = String(ev.created_at).slice(0, 10);
        const b = buckets.get(key);
        if (b) {
          b.pageViews += 1;
          if (ev.session_id) {
            if (!daySessions.has(key)) daySessions.set(key, new Set());
            daySessions.get(key)!.add(ev.session_id);
          }
        }
        if (ev.session_id) allSessions.add(ev.session_id);
        if (ev.page_url) {
          let path = String(ev.page_url);
          try {
            path = new URL(path, window.location.origin).pathname;
          } catch {
            /* keep raw */
          }
          pageCounts.set(path, (pageCounts.get(path) || 0) + 1);
        }
      }
      for (const [key, sessions] of daySessions) {
        const b = buckets.get(key);
        if (b) b.visitors = sessions.size;
      }
      setTraffic({ pageViews: activity.length, visitors: allSessions.size });
      setTopPages(
        Array.from(pageCounts.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6),
      );
      for (const u of newUsers) {
        const key = String(u.created_at).slice(0, 10);
        const b = buckets.get(key);
        if (b) b.signups += 1;
      }
      const types = new Map<string, number>();
      let revenue = 0;
      for (const tx of txs) {
        const key = String(tx.created_at).slice(0, 10);
        const b = buckets.get(key);
        if (b) {
          b.transactions += 1;
          if (
            tx.status === 'completed' &&
            (tx.type === 'deposit' || tx.type === 'purchase')
          ) {
            b.revenue += Number(tx.amount || 0);
          }
        }
        if (tx.status === 'completed' && (tx.type === 'deposit' || tx.type === 'purchase')) {
          revenue += Number(tx.amount || 0);
        }
        const label = String(tx.type || 'other');
        types.set(label, (types.get(label) || 0) + 1);
      }

      let completed = 0;
      let revenueTxCount = 0;
      for (const tx of txs) {
        if (tx.status === 'completed') {
          completed += 1;
          if (tx.type === 'deposit' || tx.type === 'purchase') revenueTxCount += 1;
        }
      }
      setRevStats({
        completed,
        failedOrPending: txs.length - completed,
        aov: revenueTxCount > 0 ? revenue / revenueTxCount : 0,
      });
      setTopListings(topRes.data || []);

      setDays(Array.from(buckets.values()));
      setTypeSlices(
        Array.from(types.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
      );
      setTotals({
        users: usersCount.count || 0,
        newUsers: newUsers.length,
        revenue,
        transactions: txs.length,
        activeListings: listingsCount.count || 0,
      });
    } catch (e: any) {
      console.error('[analytics] fetch failed:', e);
      setLoadError(e?.message || 'Failed to load analytics.');
      addToast?.({ type: 'error', title: 'Analytics failed', message: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const completionRate =
    totals.transactions > 0
      ? Math.round((revStats.completed / totals.transactions) * 100)
      : 100;
  const kpis = [
    { label: 'Total users', Icon: Users, value: totals.users.toLocaleString(), sub: `+${totals.newUsers} in range` },
    { label: 'Revenue', Icon: Wallet, value: `${Math.round(totals.revenue).toLocaleString()} Kč`, sub: 'Completed deposits + purchases' },
    { label: 'Transactions', Icon: ArrowLeftRight, value: totals.transactions.toLocaleString(), sub: `Last ${RANGE_DAYS[range]} days` },
    { label: 'Active listings', Icon: Package, value: totals.activeListings.toLocaleString(), sub: 'Live right now' },
    { label: 'Page views', Icon: Eye, value: traffic.pageViews.toLocaleString(), sub: `${traffic.visitors.toLocaleString()} unique visitors` },
    { label: 'Avg order value', Icon: Receipt, value: `${Math.round(revStats.aov).toLocaleString()} Kč`, sub: 'Per completed payment' },
    { label: 'Completion rate', Icon: CheckCircle2, value: `${completionRate}%`, sub: `${revStats.failedOrPending} pending/failed` },
    { label: 'Views / visitor', Icon: MousePointerClick, value: traffic.visitors > 0 ? (traffic.pageViews / traffic.visitors).toFixed(1) : '—', sub: 'Session depth' },
  ];

  const tooltipStyle = {
    background: surface,
    border: 'none',
    borderRadius: 12,
    boxShadow: '0 12px 32px -12px rgba(0,0,0,0.25)',
    fontSize: 12,
    fontWeight: 600,
  } as React.CSSProperties;

  if (loading && days.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skel h-28 rounded-[20px]" />
          ))}
        </div>
        <div className="skel h-72 rounded-[20px]" />
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="skel h-64 rounded-[20px]" />
          <div className="skel h-64 rounded-[20px]" />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={parent} initial="hidden" animate="shown" className="space-y-4">
      {/* Range switch + refresh */}
      <motion.div variants={child} className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(['7d', '30d', '90d'] as Range[]).map((r) => {
            const active = range === r;
            return (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`relative h-10 px-4 rounded-full text-[12.5px] font-bold transition-colors ${
                  active ? 'text-on-accent' : 'bg-subtle text-ink-muted hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="analytics-range-pill"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={spring}
                  />
                )}
                <span className="relative">{r}</span>
              </button>
            );
          })}
        </div>
        <motion.button
          whileTap={tap}
          onClick={fetchAnalytics}
          className="w-10 h-10 rounded-full bg-subtle hover:bg-surface grid place-items-center text-ink-muted hover:text-ink transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={15} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
        </motion.button>
      </motion.div>

      {/* Load error — surfaced instead of silently rendering zeros. */}
      {loadError && (
        <motion.div
          variants={child}
          className="rounded-2xl ring-1 ring-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12.5px] font-semibold text-rose-600 dark:text-rose-400"
        >
          {loadError}
        </motion.div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, sub, Icon }) => (
          <motion.div
            key={label}
            variants={child}
            whileHover={{ y: -2 }}
            className="rounded-3xl ring-1 ring-line bg-surface p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="label-meta">{label}</div>
              <div className="w-8 h-8 rounded-xl bg-accent-soft grid place-items-center shrink-0">
                <Icon size={14} strokeWidth={2.4} className="text-accent" />
              </div>
            </div>
            <div className="text-[22px] font-bold tracking-tight tabular-nums text-ink leading-none">
              {value}
            </div>
            <div className="text-[11.5px] text-ink-dim font-medium mt-1.5">{sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Traffic — real page_view events from user_activity */}
      <motion.section variants={child} className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="label-eyebrow">Traffic</span>
            <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none">
              Page views & unique visitors
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink-muted">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
              Views
            </span>
            <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink-muted">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Visitors
            </span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke={inkDim} strokeOpacity={0.12} vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10.5, fill: inkDim, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10.5, fill: inkDim, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: inkDim, strokeOpacity: 0.25 }} />
              <Area
                type="monotone"
                dataKey="pageViews"
                name="Page views"
                stroke={accent}
                strokeWidth={2.5}
                fill="url(#gradViews)"
                animationDuration={1100}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                name="Visitors"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="none"
                animationDuration={1100}
                animationBegin={200}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {topPages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-line/60">
            <span className="label-meta block mb-2">Top pages</span>
            <div className="space-y-1.5">
              {topPages.map((p) => {
                const max = topPages[0]?.value || 1;
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="w-40 sm:w-56 text-[12.5px] font-semibold text-ink truncate font-mono">
                      {p.name}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-subtle overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(4, (p.value / max) * 100)}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: accent }}
                      />
                    </div>
                    <span className="w-14 text-right text-[12px] font-bold text-ink-muted tabular-nums">
                      {p.value.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.section>

      {/* Signups + transactions over time */}
      <motion.section variants={child} className="panel p-6">
        <div className="mb-4">
          <span className="label-eyebrow">Growth</span>
          <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none">
            Signups & transactions
          </h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke={inkDim} strokeOpacity={0.12} vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10.5, fill: inkDim, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10.5, fill: inkDim, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: inkDim, strokeOpacity: 0.25 }} />
              <Area
                type="monotone"
                dataKey="signups"
                name="Signups"
                stroke={accent}
                strokeWidth={2.5}
                fill="url(#gradSignups)"
                animationDuration={900}
              />
              <Area
                type="monotone"
                dataKey="transactions"
                name="Transactions"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#gradTx)"
                animationDuration={900}
                animationBegin={150}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Revenue by day */}
        <motion.section variants={child} className="panel p-6">
          <span className="label-eyebrow">Revenue</span>
          <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none mb-4">
            Daily revenue (Kč)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 6" stroke={inkDim} strokeOpacity={0.12} vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10.5, fill: inkDim, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10.5, fill: inkDim, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: inkDim, fillOpacity: 0.08 }} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill={accent}
                  radius={[6, 6, 0, 0]}
                  animationDuration={900}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* Transaction types */}
        <motion.section variants={child} className="panel p-6">
          <span className="label-eyebrow">Breakdown</span>
          <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none mb-4">
            Transaction types
          </h3>
          {typeSlices.length === 0 ? (
            <div className="h-56 grid place-items-center text-[13px] text-ink-muted font-medium">
              No transactions in this range.
            </div>
          ) : (
            <div className="h-56 flex items-center gap-4">
              <ResponsiveContainer width="55%" height="100%">
                <PieChart>
                  <Pie
                    data={typeSlices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="88%"
                    paddingAngle={3}
                    animationDuration={900}
                  >
                    {typeSlices.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {typeSlices.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-[12.5px] font-semibold text-ink capitalize flex-1 truncate">
                      {s.name}
                    </span>
                    <span className="text-[12.5px] font-bold text-ink-muted tabular-nums">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.section>
      </div>
      {/* Top listings by views */}
      {topListings.length > 0 && (
        <motion.section variants={child} className="panel p-6">
          <span className="label-eyebrow">Attention</span>
          <h3 className="text-[16px] font-bold tracking-tight mt-1 leading-none mb-4">
            Most viewed listings
          </h3>
          <div className="space-y-1">
            {topListings.map((l, i) => (
              <motion.div
                key={`${l.item_name}-${i}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring, delay: i * 0.05 }}
                className="flex items-center gap-3 py-2"
              >
                <span className="w-7 h-7 rounded-xl bg-accent-soft text-accent grid place-items-center text-[12px] font-bold shrink-0">
                  {i + 1}
                </span>
                {l.image_url && (
                  <img
                    src={l.image_url}
                    alt=""
                    className="w-9 h-9 object-contain shrink-0"
                    loading="lazy"
                  />
                )}
                <span className="flex-1 text-[13.5px] font-bold text-ink truncate tracking-tight">
                  {l.item_name}
                </span>
                <span className="text-[12.5px] font-bold text-ink tabular-nums shrink-0">
                  {Number(l.price).toLocaleString()} Kč
                </span>
                <span className="text-[11.5px] text-ink-dim font-medium tabular-nums shrink-0 w-16 text-right">
                  {Number(l.views || 0).toLocaleString()} views
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
};

export default AnalyticsTab;
