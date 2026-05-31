import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Search,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useOrderStore } from '../../../store/orderStore';
import { useCurrencyStore } from '../../../store/currencyStore';
import { spring, tap } from '../../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   TradesTab
   - Header with 3 KPIs (bought, sold, in-escrow)
   - Filter: All / Purchases / Sales
   - Status pills (pending / completed / escrow / cancelled / disputed)
   - Search by transaction_id
   - Inline expand for items in each order
   ───────────────────────────────────────────────────────────────────────── */

type View = 'all' | 'purchases' | 'sales';

const STATUS_STYLES: Record<string, { label: string; bg: string; fg: string }> = {
  pending:   { label: 'Pending',   bg: 'bg-amber-500/10',   fg: 'text-amber-700 dark:text-amber-300' },
  escrow:    { label: 'In escrow', bg: 'bg-amber-500/10',   fg: 'text-amber-700 dark:text-amber-300' },
  completed: { label: 'Completed', bg: 'bg-emerald-500/10', fg: 'text-emerald-700 dark:text-emerald-300' },
  cancelled: { label: 'Cancelled', bg: 'bg-subtle',         fg: 'text-ink-muted' },
  refunded:  { label: 'Refunded',  bg: 'bg-subtle',         fg: 'text-ink-muted' },
  disputed:  { label: 'Disputed',  bg: 'bg-rose-500/10',    fg: 'text-rose-700 dark:text-rose-300' },
};

const TradesTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { orders, fetchOrders } = useOrderStore();
  const { formatPrice } = useCurrencyStore();
  const [view, setView] = useState<View>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.steamId) fetchOrders(user.steamId);
  }, [user?.steamId]);

  const annotated = useMemo(() => {
    if (!user?.steamId || !orders) return [];
    return orders.map((o) => ({
      ...o,
      role: o.buyer_steam_id === user.steamId ? 'buyer' : 'seller',
    }));
  }, [orders, user?.steamId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return annotated
      .filter((o) => {
        if (view === 'purchases' && o.role !== 'buyer') return false;
        if (view === 'sales' && o.role !== 'seller') return false;
        if (!q) return true;
        return (
          String(o.id).toLowerCase().includes(q) ||
          String(o.transaction_id || '').toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime(),
      );
  }, [annotated, view, query]);

  const kpis = useMemo(() => {
    const bought = annotated.filter((o) => o.role === 'buyer');
    const sold = annotated.filter((o) => o.role === 'seller');
    const escrow = annotated.filter((o) => o.status === 'escrow' || o.status === 'pending');
    return {
      boughtN: bought.length,
      boughtVal: bought.reduce((s, o) => s + Number(o.total_amount || 0), 0),
      soldN: sold.length,
      soldVal: sold.reduce((s, o) => s + Number(o.total_amount || 0), 0),
      escrowN: escrow.length,
      escrowVal: escrow.reduce((s, o) => s + Number(o.total_amount || 0), 0),
    };
  }, [annotated]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Purchased"
          value={formatPrice(kpis.boughtVal)}
          sub={`${kpis.boughtN} order${kpis.boughtN === 1 ? '' : 's'}`}
          Icon={ArrowDownLeft}
        />
        <KpiCard
          label="Sold"
          value={formatPrice(kpis.soldVal)}
          sub={`${kpis.soldN} sale${kpis.soldN === 1 ? '' : 's'}`}
          Icon={ArrowUpRight}
        />
        <KpiCard
          label="In escrow"
          value={formatPrice(kpis.escrowVal)}
          sub={`${kpis.escrowN} order${kpis.escrowN === 1 ? '' : 's'}`}
          Icon={TrendingUp}
        />
      </div>

      {/* Toolbar */}
      <div className="card p-2 flex items-center gap-2 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-1">
          {(
            [
              { id: 'all',       label: 'All' },
              { id: 'purchases', label: 'Purchases' },
              { id: 'sales',     label: 'Sales' },
            ] as const
          ).map((v) => {
            const active = view === v.id;
            return (
              <motion.button
                whileTap={tap}
                key={v.id}
                onClick={() => setView(v.id as View)}
                className={`relative h-9 px-3.5 rounded-full text-[12.5px] font-semibold transition-colors ${
                  active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="trades-tab-pill"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={spring}
                  />
                )}
                <span className="relative">{v.label}</span>
              </motion.button>
            );
          })}
        </div>
        {/* Search */}
        <div className="flex-1 min-w-[160px] flex items-center gap-2 h-9 px-3 rounded-full bg-subtle">
          <Search size={14} strokeWidth={2} className="text-ink-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by order ID…"
            className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[12.5px] font-medium"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingBag size={28} className="mx-auto text-ink-muted mb-3" />
          <p className="text-[15px] font-bold text-ink tracking-tight">
            No trades to show
          </p>
          <p className="text-[13px] text-ink-muted font-medium mt-1">
            {view === 'all'
              ? 'Buy or sell your first item to get started.'
              : `You don't have any ${view} yet.`}
          </p>
          <motion.button
            whileTap={tap}
            onClick={() => navigate('/marketplace')}
            className="mt-5 h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px]"
            style={{ boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.6)' }}
          >
            Browse marketplace
          </motion.button>
        </div>
      ) : (
        <div className="card p-2">
          <ul className="divide-y divide-line">
            {filtered.map((o) => {
              const s = STATUS_STYLES[o.status] || STATUS_STYLES.pending;
              const expanded = openId === o.id;
              const isBuyer = o.role === 'buyer';
              return (
                <li key={o.id}>
                  <motion.button
                    whileTap={tap}
                    onClick={() => setOpenId(expanded ? null : o.id)}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-subtle rounded-2xl transition-colors"
                  >
                    <div
                      className={`icon-chip ${
                        isBuyer ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {isBuyer ? (
                        <ArrowDownLeft size={16} strokeWidth={2.4} />
                      ) : (
                        <ArrowUpRight size={16} strokeWidth={2.4} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-ink tracking-tight">
                          #{String(o.id).slice(-6).toUpperCase()}
                        </span>
                        <span className={`pill ${s.bg} ${s.fg}`}>{s.label}</span>
                        <span className="text-[11px] text-ink-dim font-semibold">
                          {isBuyer ? 'PURCHASE' : 'SALE'}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-ink-dim font-medium mt-0.5 truncate">
                        {o.created_at ? new Date(o.created_at).toLocaleString() : '—'} ·{' '}
                        {(o.items || []).length} item{(o.items || []).length === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-[15px] font-bold tabular-nums tracking-tight ${
                          isBuyer ? 'text-ink' : 'text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {isBuyer ? '−' : '+'}
                        {formatPrice(Number(o.total_amount || 0))}
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`text-ink-muted shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                    />
                  </motion.button>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-1 space-y-2">
                          {(o.items || []).map((it: any, i: number) => (
                            <div
                              key={i}
                              className="card-flat p-3 flex items-center gap-3"
                            >
                              {it.image && (
                                <div className="w-11 h-11 rounded-xl bg-subtle grid place-items-center overflow-hidden shrink-0">
                                  <img
                                    src={it.image}
                                    alt=""
                                    className="w-[85%] h-[85%] object-contain"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-bold text-ink truncate tracking-tight">
                                  {it.name || it.market_name}
                                </div>
                                <div className="text-[11px] text-ink-dim font-medium truncate">
                                  {it.condition || ''}
                                </div>
                              </div>
                              <div className="text-[13px] font-bold text-ink tabular-nums shrink-0">
                                {formatPrice(Number(it.price || 0))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

const KpiCard: React.FC<{
  label: string;
  value: string;
  sub: string;
  Icon: React.ComponentType<any>;
}> = ({ label, value, sub, Icon }) => (
  <motion.div whileHover={{ y: -2 }} transition={spring} className="card p-4">
    <div className="flex items-start justify-between mb-3">
      <span className="label-meta">{label}</span>
      <div className="icon-chip-sm bg-accent-soft">
        <Icon size={14} strokeWidth={2.2} className="text-accent" />
      </div>
    </div>
    <div className="text-[22px] font-bold tracking-tight tabular-nums text-ink leading-none">
      {value}
    </div>
    <div className="text-[11.5px] text-ink-dim font-medium mt-1.5">{sub}</div>
  </motion.div>
);

export default TradesTab;
