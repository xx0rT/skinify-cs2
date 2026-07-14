import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../store/authStore';
import { useOrderStore } from '../../../store/orderStore';
import { useCurrencyStore } from '../../../store/currencyStore';
import { spring, tap } from '../../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   TradingPerformanceTab
   - Period selector (7d / 30d / 90d) → drives Supabase query
   - 3 KPI cards (Total Profit / Total Volume / Total Trades)
   - SVG line+area chart for the selected metric
   - 4 secondary stats (Avg/day, Peak day, Trades/day, Success rate)
   - Theme-tokenized: works in light + dark
   ───────────────────────────────────────────────────────────────────────── */

type Period = '7d' | '30d' | '90d';
type Metric = 'profit' | 'volume' | 'trades';

interface DailyPoint {
  date: string;
  profit: number;
  volume: number;
  trades: number;
}

const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: '7d',  label: 'Posledních 7 dní',  days: 7 },
  { id: '30d', label: 'Posledních 30 dní', days: 30 },
  { id: '90d', label: 'Posledních 90 dní', days: 90 },
];

const METRICS: { id: Metric; label: string; fmt: 'currency' | 'count' }[] = [
  { id: 'profit', label: 'Celkový zisk', fmt: 'currency' },
  { id: 'volume', label: 'Celkový objem', fmt: 'currency' },
  { id: 'trades', label: 'Počet obchodů', fmt: 'count' },
];

const TradingPerformanceTab: React.FC = () => {
  const { user } = useAuthStore();
  const { orders, fetchOrders } = useOrderStore();
  const { formatPrice } = useCurrencyStore();
  const [period, setPeriod] = useState<Period>('30d');
  const [metric, setMetric] = useState<Metric>('profit');
  const [data, setData] = useState<DailyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, completed: 0 });

  /* Orders come from the orders edge function (service role) via the
     store — a direct table read is blocked by RLS under the anon key,
     which is why this tab used to render only dashes. */
  useEffect(() => {
    if (user?.steamId) fetchOrders(user.steamId);
  }, [user?.steamId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.steamId) return;
      setLoading(true);
      try {
        const days = PERIODS.find((p) => p.id === period)!.days;
        const from = new Date();
        from.setDate(from.getDate() - days);

        const inRange = (orders || []).filter(
          (o: any) => new Date(o.created_at || 0) >= from,
        );
        const allOrders = orders || [];

        if (cancelled) return;

        // Seed every day in range with zero so the chart never has gaps
        const points = new Map<string, DailyPoint>();
        for (let i = 0; i < days; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          points.set(key, { date: key, profit: 0, volume: 0, trades: 0 });
        }

        inRange.forEach((o: any) => {
          const key = new Date(o.created_at).toISOString().split('T')[0];
          const p = points.get(key);
          if (!p) return;
          const amount = Number(o.total_amount || 0);
          const isSeller = o.seller_steam_id === user.steamId;
          p.volume += amount;
          p.trades += 1;
          /* Profit = money in minus money out: sales earn (minus the
             2% marketplace fee), purchases cost. */
          if (o.status !== 'cancelled' && o.status !== 'refunded') {
            p.profit += isSeller ? amount * 0.98 : -amount;
          }
        });

        const arr = Array.from(points.values()).sort((a, b) =>
          a.date.localeCompare(b.date),
        );
        setData(arr);

        const total = (allOrders || []).length;
        const completed = (allOrders || []).filter((o: any) => o.status === 'completed').length;
        setStats({ totalOrders: total, completed });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.steamId, period, orders]);

  const totals = useMemo(() => {
    const profit = data.reduce((s, p) => s + p.profit, 0);
    const volume = data.reduce((s, p) => s + p.volume, 0);
    const trades = data.reduce((s, p) => s + p.trades, 0);
    const dailyAvgProfit = data.length > 0 ? profit / data.length : 0;
    const peak = data.reduce((m, p) => Math.max(m, p[metric]), 0);
    const peakDay = data.find((p) => p[metric] === peak);
    const successRate = stats.totalOrders > 0 ? (stats.completed / stats.totalOrders) * 100 : 0;
    return { profit, volume, trades, dailyAvgProfit, peak, peakDay, successRate };
  }, [data, metric, stats]);

  const fmt = (value: number, kind: 'currency' | 'count') =>
    kind === 'currency' ? formatPrice(Math.round(value)) : Math.round(value).toLocaleString();

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="card p-2 inline-flex gap-1">
        {PERIODS.map((p) => {
          const active = period === p.id;
          return (
            <motion.button
              whileTap={tap}
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`relative h-10 px-4 rounded-full text-[13px] font-semibold transition-colors ${
                active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="perf-period-pill"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={spring}
                />
              )}
              <span className="relative">{p.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* KPI cards — clicking one switches the chart metric */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {METRICS.map((m) => {
          const active = metric === m.id;
          const value =
            m.id === 'profit' ? totals.profit : m.id === 'volume' ? totals.volume : totals.trades;
          return (
            <motion.button
              whileTap={tap}
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={`card p-4 text-left transition-all relative overflow-hidden ${
                active ? 'ring-2 ring-accent' : 'hover:ring-1 hover:ring-line'
              }`}
            >
              <div className="mb-3">
                <span className="label-meta">{m.label}</span>
              </div>
              <div className="text-[26px] font-bold tracking-tight tabular-nums text-ink leading-none">
                {loading ? '—' : fmt(value, m.fmt)}
              </div>
              <div className="text-[11.5px] text-ink-dim font-medium mt-1.5">
                {PERIODS.find((p) => p.id === period)!.label.toLowerCase()}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="card p-5 md:p-6">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
          <div>
            <span className="label-eyebrow">Denní přehled</span>
            <h3 className="text-[17px] font-bold tracking-tight text-ink mt-1.5 leading-none">
              {fmt(metric === 'profit' ? totals.profit : metric === 'volume' ? totals.volume : totals.trades, METRICS.find((m) => m.id === metric)!.fmt)}
            </h3>
          </div>
          <span className="pill bg-accent-soft text-ink">Živá data</span>
        </div>

        {loading ? (
          <div className="h-64 skel" />
        ) : data.every((p) => p[metric] === 0) ? (
          <div className="h-64 grid place-items-center text-center">
            <div>
              <p className="text-[14px] text-ink-muted font-medium">
                No {metric} in this period yet.
              </p>
            </div>
          </div>
        ) : (
          <LineChart data={data} metric={metric} fmt={(v) => fmt(v, METRICS.find((m) => m.id === metric)!.fmt)} />
        )}
      </div>

      {/* Secondary stats — one quiet text line, no boxes. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-[12px] font-medium text-ink-muted">
        <span>
          Avg daily{' '}
          <span className="font-bold text-ink tabular-nums">
            {loading ? '—' : formatPrice(Math.round(totals.dailyAvgProfit))}
          </span>
        </span>
        <span>
          Peak day{' '}
          <span className="font-bold text-ink tabular-nums">
            {loading ? '—' : fmt(totals.peak, METRICS.find((m) => m.id === metric)!.fmt)}
          </span>
          {totals.peakDay ? (
            <span className="text-ink-dim"> · {new Date(totals.peakDay.date).toLocaleDateString()}</span>
          ) : null}
        </span>
        <span>
          Trades / day{' '}
          <span className="font-bold text-ink tabular-nums">
            {loading ? '—' : (totals.trades / Math.max(1, data.length)).toFixed(1)}
          </span>
        </span>
        <span>
          Success rate{' '}
          <span className="font-bold text-ink tabular-nums">
            {loading ? '—' : `${totals.successRate.toFixed(0)}%`}
          </span>
          <span className="text-ink-dim"> · {stats.completed} of {stats.totalOrders}</span>
        </span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   LineChart — pure SVG, theme-aware (uses --accent), responsive width via
   100% + viewBox. Hover crosshair + tooltip for the active point.
   ───────────────────────────────────────────────────────────────────────── */

const LineChart: React.FC<{
  data: DailyPoint[];
  metric: Metric;
  fmt: (v: number) => string;
}> = ({ data, metric, fmt }) => {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = 200;
  const PAD = { top: 16, right: 8, bottom: 24, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d[metric]);
  const max = Math.max(...values, 1);

  const xAt = (i: number) =>
    PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const yAt = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(d[metric])}`).join(' ');
  const areaPath = `${linePath} L ${xAt(data.length - 1)} ${PAD.top + innerH} L ${xAt(0)} ${PAD.top + innerH} Z`;

  // Show ~5 x-axis ticks so the chart isn't cluttered
  const tickIdx = (() => {
    if (data.length <= 5) return data.map((_, i) => i);
    const step = Math.floor(data.length / 4);
    return [0, step, step * 2, step * 3, data.length - 1];
  })();

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((x - PAD.left) / innerW) * (data.length - 1));
    if (i >= 0 && i < data.length) setHover(i);
  };

  // Re-key on metric+period (passed as prop in `data` change). Use the last
  // point's value as a poor-man's signature to retrigger draw on data swap.
  const drawKey = `${metric}-${data.length}-${values[values.length - 1] || 0}`;

  // Pick a few "spike" indices to pulse after draw — the largest 3 values
  const pulseIdx = useMemo(() => {
    const indexed = values.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => b.v - a.v);
    return indexed.slice(0, 3).map((x) => x.i).filter((i) => values[i] > 0);
  }, [values]);

  const endX = xAt(data.length - 1);
  const endY = yAt(data[data.length - 1]?.[metric] || 0);

  /* The animated chart body only depends on the drawn data — memoize
     it so hover mousemoves (which change state up to ~60×/s) re-render
     ONLY the tiny crosshair overlay below, not every gradient, path,
     and motion element. This is what made the page crawl. */
  const chartBody = useMemo(() => (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-64"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="perf-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.38" />
            <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="perf-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="1" />
          </linearGradient>
          <clipPath id="perf-clip">
            <motion.rect
              key={`clip-${drawKey}`}
              x={PAD.left}
              y={PAD.top - 4}
              height={innerH + 8}
              initial={{ width: 0 }}
              animate={{ width: innerW }}
              transition={{ duration: 1.3, ease: [0.6, 0.05, 0.2, 1] }}
            />
          </clipPath>
        </defs>

        {/* Horizontal gridlines — draw from left → right */}
        {[0.25, 0.5, 0.75].map((g, gi) => (
          <motion.line
            key={`grid-${gi}-${drawKey}`}
            x1={PAD.left}
            x2={PAD.left}
            y1={PAD.top + innerH * g}
            y2={PAD.top + innerH * g}
            stroke="rgb(var(--line))"
            strokeDasharray="2 4"
            initial={{ x2: PAD.left, opacity: 0 }}
            animate={{ x2: W - PAD.right, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.05 + gi * 0.08, ease: 'easeOut' }}
          />
        ))}

        {/* Baseline — runs the full width along the bottom */}
        <motion.line
          key={`baseline-${drawKey}`}
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top + innerH}
          y2={PAD.top + innerH}
          stroke="rgb(var(--accent))"
          strokeOpacity="0.18"
          strokeWidth="1"
          initial={{ x2: PAD.left }}
          animate={{ x2: W - PAD.right }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
        />

        {/* Area — revealed via the left→right clip mask */}
        <g clipPath="url(#perf-clip)">
          <motion.path
            key={`area-${drawKey}`}
            d={areaPath}
            fill="url(#perf-area)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          />
        </g>

        {/* Line — both pathLength stroke draw + clip reveal */}
        <motion.path
          key={`line-${drawKey}`}
          d={linePath}
          stroke="url(#perf-line)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0.6 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.3, ease: [0.6, 0.05, 0.2, 1] }}
        />

        {/* Pulse rings on the highest points — fade in after the line lands */}
        {pulseIdx.map((i, k) => (
          <motion.circle
            key={`pulse-${i}-${drawKey}`}
            cx={xAt(i)}
            cy={yAt(values[i])}
            fill="rgb(var(--accent))"
            initial={{ r: 0, opacity: 0 }}
            animate={{ r: [0, 3.5, 3], opacity: [0, 1, 1] }}
            transition={{
              duration: 0.55,
              delay: 1.25 + k * 0.12,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Trailing dot on the end of the line — appears once the draw finishes */}
        {data.length > 0 && (
          <>
            <motion.circle
              key={`end-glow-${drawKey}`}
              cx={endX}
              cy={endY}
              fill="rgb(var(--accent))"
              opacity="0.25"
              initial={{ r: 0 }}
              animate={{ r: [0, 14, 9] }}
              transition={{ duration: 0.7, delay: 1.3, ease: 'easeOut' }}
            />
            <motion.circle
              key={`end-dot-${drawKey}`}
              cx={endX}
              cy={endY}
              r="4"
              fill="rgb(var(--accent))"
              stroke="rgb(var(--surface))"
              strokeWidth="2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 1.3, ease: [0.2, 1.4, 0.4, 1] }}
              style={{ transformOrigin: `${endX}px ${endY}px` }}
            />
          </>
        )}

        {/* X-axis ticks — fade in last */}
        {tickIdx.map((i, k) => (
          <motion.text
            key={`tick-${i}-${drawKey}`}
            x={xAt(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="rgb(var(--ink-dim))"
            initial={{ opacity: 0, y: H }}
            animate={{ opacity: 1, y: H - 6 }}
            transition={{ duration: 0.35, delay: 0.9 + k * 0.05 }}
          >
            {new Date(data[i].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </motion.text>
        ))}
      </svg>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [drawKey]);

  return (
    <div
      className="relative"
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      {chartBody}

      {/* Hover crosshair — its own overlay svg, cheap to re-render */}
      {hover !== null && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-64 pointer-events-none"
        >
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={PAD.top}
            y2={PAD.top + innerH}
            stroke="rgb(var(--ink-dim))"
            strokeWidth="1"
          />
          <circle
            cx={xAt(hover)}
            cy={yAt(data[hover][metric])}
            r="5"
            fill="rgb(var(--accent))"
            stroke="rgb(var(--surface))"
            strokeWidth="2"
          />
        </svg>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {hover !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-2 px-3 py-2 rounded-2xl bg-elevated pointer-events-none"
            style={{
              left: `${(xAt(hover) / W) * 100}%`,
              transform: 'translateX(-50%)',
              boxShadow: 'inset 0 0 0 1px rgb(var(--line)), 0 8px 20px -8px rgba(20,16,40,0.18)',
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-dim">
              {new Date(data[hover].date).toLocaleDateString()}
            </div>
            <div className="text-[14px] font-bold text-ink tabular-nums tracking-tight">
              {fmt(data[hover][metric])}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradingPerformanceTab;
