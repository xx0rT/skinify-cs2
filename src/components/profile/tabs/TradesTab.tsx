import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wallet,
  RotateCcw,
  Hourglass,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useOrderStore } from '../../../store/orderStore';
import { useBalanceStore } from '../../../store/balanceStore';
import { useCurrencyStore } from '../../../store/currencyStore';
import { useToastStore } from '../../../store/toastStore';
import { getSupabaseCredentials } from '../../../utils/supabaseHelpers';
import { spring, tap } from '../../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   TradesTab — unified transactions ledger.

   Merges every money movement (orders + raw balance transactions) into a
   single chronological feed so the user has ONE place to see every
   purchase, sale, deposit, refund, and pending-escrow credit. Each row
   has a tracking timeline that walks the state transitions for that
   transaction.

   Why the unified merge: orders live in `orders` and balance changes
   live in `user_transactions`. Showing only orders hid deposits and
   pending sale credits; showing only transactions hid the "in-escrow"
   buy state. Merging keeps both surfaces honest.
   ───────────────────────────────────────────────────────────────────────── */

type View = 'all' | 'purchases' | 'sales' | 'deposits' | 'escrow';

const STATUS_STYLES: Record<string, { label: string; bg: string; fg: string; Icon: React.ComponentType<any> }> = {
  pending:   { label: 'Pending',   bg: 'bg-amber-500/10',   fg: 'text-amber-700 dark:text-amber-300',   Icon: Clock },
  escrow:    { label: 'In escrow', bg: 'bg-amber-500/10',   fg: 'text-amber-700 dark:text-amber-300',   Icon: Hourglass },
  completed: { label: 'Completed', bg: 'bg-emerald-500/10', fg: 'text-emerald-700 dark:text-emerald-300', Icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', bg: 'bg-subtle',         fg: 'text-ink-muted',                       Icon: XCircle },
  refunded:  { label: 'Refunded',  bg: 'bg-subtle',         fg: 'text-ink-muted',                       Icon: RotateCcw },
  disputed:  { label: 'Disputed',  bg: 'bg-rose-500/10',    fg: 'text-rose-700 dark:text-rose-300',     Icon: AlertTriangle },
};

interface FeedEntry {
  /** Stable key for React. */
  key: string;
  /** Origin row — controls the timeline and per-row UI. */
  kind: 'purchase' | 'sale' | 'deposit' | 'withdrawal' | 'refund' | 'admin_adjustment' | 'pending_sale';
  /** Status: maps to STATUS_STYLES. */
  status: string;
  /** Human title shown on the row. */
  title: string;
  /** Optional secondary line (order id, payment method, etc.). */
  subtitle?: string;
  /** Absolute timestamp for sorting + display. */
  timestamp: string;
  /** Positive (credit) vs negative (debit) for amount tint + sign. */
  positive: boolean;
  amount: number;
  /** Items list (only for orders); rendered in the expand panel. */
  items?: any[];
  /** Original record so the timeline can introspect metadata. */
  raw: any;
}

const TradesTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { orders, fetchOrders } = useOrderStore();
  const { transactions, fetchTransactions, fetchBalance } = useBalanceStore();
  const { formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();
  const [view, setView] = useState<View>('all');
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null);

  /* ── Seller P2P delivery ─────────────────────────────────────────
     "Send trade" opens Steam's trade window pre-targeted at the buyer
     (their saved trade URL carries partner + token — Steam doesn't
     allow pre-filling items via URL, so the seller picks the sold
     item in the window). "Verify delivery" runs the server-side
     watcher: verify-order polls the buyer's Steam inventory for the
     sold asset IDs and, once found, marks the order complete and
     credits the seller's escrow balance. */
  const openSteamTrade = async (entry: FeedEntry) => {
    const buyerSteamId = entry.raw?.buyer_steam_id;
    if (!buyerSteamId) return;
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(
        `${supabaseUrl}/rest/v1/users?steam_id=eq.${buyerSteamId}&select=trade_url`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
      );
      const rows = await res.json().catch(() => []);
      const tradeUrl = rows?.[0]?.trade_url;
      const itemNames = (entry.items || [])
        .map((it: any) => it.name || it.market_name)
        .filter(Boolean)
        .join(', ');
      if (tradeUrl && /^https:\/\/steamcommunity\.com\/tradeoffer\//.test(tradeUrl)) {
        window.open(tradeUrl, '_blank', 'noopener');
        addToast({
          type: 'info',
          title: 'Steam trade opened',
          message: `Add ${itemNames || 'the sold item(s)'} to the trade and send it. Then come back and hit “Verify delivery”.`,
          duration: 9000,
        });
      } else {
        window.open(
          `https://steamcommunity.com/profiles/${buyerSteamId}`,
          '_blank',
          'noopener',
        );
        addToast({
          type: 'warning',
          title: 'Buyer has no trade URL saved',
          message: 'Opened their Steam profile instead — send the trade from there.',
          duration: 8000,
        });
      }
    } catch {
      addToast({ type: 'error', title: 'Could not open the trade window' });
    }
  };

  const verifyDelivery = async (entry: FeedEntry) => {
    const o = entry.raw || {};
    if (!user?.steamId || !o.transaction_id || verifyingKey) return;
    setVerifyingKey(entry.key);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-order`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: o.transaction_id,
          seller_steam_id: user.steamId,
          buyer_steam_id: o.buyer_steam_id,
          items: (entry.items || []).map((it: any) => ({
            asset_id: it.asset_id || it.assetid || '',
            item_name: it.name || it.market_name || '',
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.verification_passed) {
        addToast({
          type: 'success',
          title: 'Delivery verified',
          message: 'Items found in the buyer’s inventory — escrow credited to your balance.',
          duration: 8000,
        });
        refresh();
      } else {
        addToast({
          type: 'warning',
          title: 'Not verified yet',
          message:
            body?.error ||
            body?.message ||
            'Items weren’t found in the buyer’s inventory yet. If the buyer just accepted, wait a minute and try again.',
          duration: 9000,
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Verification failed', message: err?.message });
    } finally {
      setVerifyingKey(null);
    }
  };

  useEffect(() => {
    if (!user?.steamId) return;
    fetchOrders(user.steamId);
    fetchTransactions(user.steamId);
  }, [user?.steamId]);

  const refresh = async () => {
    if (!user?.steamId || refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        fetchOrders(user.steamId),
        fetchBalance(user.steamId),
        fetchTransactions(user.steamId),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  /* Build the unified feed: every order + every non-order-derived
     transaction (deposits, refunds, withdrawals, admin adjustments,
     "sale" credits to seller pending balance). We deliberately skip
     `purchase` transactions on the buyer side because each maps 1:1 to
     an order row that already conveys the same money flow with richer
     state (items + tracking). */
  const feed: FeedEntry[] = useMemo(() => {
    if (!user?.steamId) return [];

    const out: FeedEntry[] = [];

    /* Orders → purchase or sale entries. */
    for (const o of orders || []) {
      const isBuyer = o.buyer_steam_id === user.steamId;
      const kind: FeedEntry['kind'] = isBuyer ? 'purchase' : 'sale';

      /* Server marks the order pending → completed/cancelled/etc. We
         display a `pending` buy as "in escrow" so the wording matches
         the rest of the site. */
      const rawStatus = String(o.status || 'pending');
      const displayStatus =
        rawStatus === 'pending' || rawStatus === 'escrow' ? 'escrow' : rawStatus;

      out.push({
        key: `order_${o.id}`,
        kind,
        status: displayStatus,
        title: isBuyer
          ? `Purchase · ${o.items?.length || 0} item${(o.items?.length || 0) === 1 ? '' : 's'}`
          : `Sale · ${o.items?.length || 0} item${(o.items?.length || 0) === 1 ? '' : 's'}`,
        subtitle: o.transaction_id ? `Order ${o.transaction_id}` : undefined,
        timestamp: o.created_at || new Date().toISOString(),
        positive: !isBuyer,
        amount: Number(o.total_amount || 0),
        items: o.items,
        raw: o,
      });
    }

    /* Balance transactions → deposits, refunds, withdrawals, and
       pending-wallet sale credits. */
    for (const tx of transactions || []) {
      const type = String(tx.type || '');
      if (type === 'purchase') {
        /* Already represented by its order. Skip to avoid double counting. */
        continue;
      }

      if (type === 'sale') {
        /* Pending-wallet credits also surface as standalone entries so
           the seller can watch the escrow countdown even before the
           order completes. The matched order entry already shows the
           same money flow, so we tag this differently and let users
           filter via "escrow". */
        const isPending = tx?.metadata?.pending_wallet === true;
        out.push({
          key: `tx_${tx.id}`,
          kind: 'pending_sale',
          status: isPending ? 'escrow' : 'completed',
          title: isPending ? 'Pending sale credit' : 'Sale paid out',
          subtitle: tx.description || tx.reference_id,
          timestamp: tx.created_at || new Date().toISOString(),
          positive: true,
          amount: Number(tx.amount || 0),
          raw: tx,
        });
        continue;
      }

      if (
        type === 'deposit' ||
        type === 'withdrawal' ||
        type === 'refund' ||
        type === 'admin_adjustment'
      ) {
        out.push({
          key: `tx_${tx.id}`,
          kind: type as FeedEntry['kind'],
          status: String(tx.status || 'completed'),
          title:
            type === 'deposit'
              ? 'Deposit'
              : type === 'withdrawal'
              ? 'Withdrawal'
              : type === 'refund'
              ? 'Refund'
              : 'Account adjustment',
          subtitle: tx.description || undefined,
          timestamp: tx.created_at || new Date().toISOString(),
          positive: type === 'deposit' || type === 'refund' || type === 'admin_adjustment',
          amount: Number(tx.amount || 0),
          raw: tx,
        });
      }
    }

    return out.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [orders, transactions, user?.steamId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feed.filter((e) => {
      if (view === 'purchases' && e.kind !== 'purchase') return false;
      if (view === 'sales' && e.kind !== 'sale' && e.kind !== 'pending_sale') return false;
      if (view === 'deposits' && e.kind !== 'deposit' && e.kind !== 'withdrawal') return false;
      if (view === 'escrow' && e.status !== 'escrow' && e.status !== 'pending') return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        String(e.subtitle || '').toLowerCase().includes(q) ||
        String(e.raw?.transaction_id || '').toLowerCase().includes(q) ||
        String(e.raw?.reference_id || '').toLowerCase().includes(q)
      );
    });
  }, [feed, view, query]);

  const kpis = useMemo(() => {
    const bought = feed.filter((e) => e.kind === 'purchase');
    const sold = feed.filter((e) => e.kind === 'sale' || e.kind === 'pending_sale');
    const escrow = feed.filter((e) => e.status === 'escrow' || e.status === 'pending');
    return {
      boughtN: bought.length,
      boughtVal: bought.reduce((s, e) => s + e.amount, 0),
      soldN: sold.length,
      soldVal: sold.reduce((s, e) => s + e.amount, 0),
      escrowN: escrow.length,
      escrowVal: escrow.reduce((s, e) => s + e.amount, 0),
    };
  }, [feed]);

  return (
    <div className="space-y-4">
      {/* Summary — one quiet text line instead of boxed KPI cards. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-[12px] font-medium text-ink-muted">
        <span>
          Purchased <span className="font-bold text-ink tabular-nums">{formatPrice(kpis.boughtVal)}</span>
          <span className="text-ink-dim"> · {kpis.boughtN} order{kpis.boughtN === 1 ? '' : 's'}</span>
        </span>
        <span>
          Sold <span className="font-bold text-ink tabular-nums">{formatPrice(kpis.soldVal)}</span>
          <span className="text-ink-dim"> · {kpis.soldN} sale{kpis.soldN === 1 ? '' : 's'}</span>
        </span>
        <span>
          In escrow <span className="font-bold text-ink tabular-nums">{formatPrice(kpis.escrowVal)}</span>
          <span className="text-ink-dim"> · {kpis.escrowN} order{kpis.escrowN === 1 ? '' : 's'}</span>
        </span>
      </div>

      {/* Toolbar */}
      <div className="card p-2 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 px-1 flex-wrap">
          {(
            [
              { id: 'all',       label: 'All' },
              { id: 'purchases', label: 'Purchases' },
              { id: 'sales',     label: 'Sales' },
              { id: 'escrow',    label: 'In escrow' },
              { id: 'deposits',  label: 'Balance' },
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
        <div className="flex-1 min-w-[160px] flex items-center gap-2 h-9 px-3 rounded-full bg-subtle">
          <Search size={14} strokeWidth={2} className="text-ink-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by order ID, description…"
            className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[12.5px] font-medium"
          />
        </div>
        <motion.button
          whileTap={tap}
          onClick={refresh}
          disabled={refreshing}
          className="icon-chip-sm hover:bg-subtle disabled:opacity-40"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw size={13} strokeWidth={2.2} className={`text-ink-muted ${refreshing ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingBag size={28} className="mx-auto text-ink-muted mb-3" />
          <p className="text-[15px] font-bold text-ink tracking-tight">No transactions to show</p>
          <p className="text-[13px] text-ink-muted font-medium mt-1">
            {view === 'all'
              ? 'Buy or sell your first item, or top up your balance to get started.'
              : `Nothing matches the ${view} filter.`}
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
            {filtered.map((e) => {
              const s = STATUS_STYLES[e.status] || STATUS_STYLES.pending;
              const expanded = openKey === e.key;
              return (
                <li key={e.key}>
                  <motion.button
                    whileTap={tap}
                    onClick={() => setOpenKey(expanded ? null : e.key)}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-subtle rounded-2xl transition-colors"
                  >
                    <KindIcon kind={e.kind} positive={e.positive} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-ink tracking-tight truncate max-w-[300px]">
                          {e.title}
                        </span>
                        <span className={`pill ${s.bg} ${s.fg} inline-flex items-center gap-1`}>
                          <s.Icon size={10} strokeWidth={2.6} />
                          {s.label}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-ink-dim font-medium mt-0.5 truncate">
                        {new Date(e.timestamp).toLocaleString()}
                        {e.subtitle ? ` · ${e.subtitle}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-[15px] font-bold tabular-nums tracking-tight ${
                          e.positive ? 'text-emerald-700 dark:text-emerald-300' : 'text-ink'
                        }`}
                      >
                        {e.positive ? '+' : '−'}
                        {formatPrice(e.amount)}
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
                        <div className="px-3 pb-3 pt-1 space-y-3">
                          <Timeline entry={e} formatPrice={formatPrice} />
                          {/* Row actions: contact the counterparty, and on
                              an undelivered sale the P2P delivery flow. */}
                          {(e.kind === 'purchase' || e.kind === 'sale') && (
                            <div className="flex flex-wrap gap-2">
                              {e.kind === 'sale' &&
                                (e.status === 'escrow' || e.status === 'pending') && (
                                  <>
                                    <button
                                      onClick={() => openSteamTrade(e)}
                                      className="h-9 px-4 rounded-full bg-accent text-on-accent text-[12.5px] font-bold hover:opacity-90 transition-opacity"
                                    >
                                      Send trade
                                    </button>
                                    <button
                                      onClick={() => verifyDelivery(e)}
                                      disabled={verifyingKey === e.key}
                                      className="h-9 px-4 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[12.5px] font-bold transition-colors disabled:opacity-50"
                                    >
                                      {verifyingKey === e.key ? 'Verifying…' : 'Verify delivery'}
                                    </button>
                                  </>
                                )}
                              {(() => {
                                const peer =
                                  e.kind === 'purchase'
                                    ? e.raw?.seller_steam_id
                                    : e.raw?.buyer_steam_id;
                                if (!peer || peer === user?.steamId) return null;
                                return (
                                  <button
                                    onClick={() => navigate(`/messages?peer=${peer}`)}
                                    className="h-9 px-4 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[12.5px] font-bold transition-colors"
                                  >
                                    {e.kind === 'purchase' ? 'Message seller' : 'Message buyer'}
                                  </button>
                                );
                              })()}
                            </div>
                          )}
                          {(e.items || []).length > 0 && (
                            <div className="space-y-2">
                              {(e.items || []).map((it: any, i: number) => (
                                <div key={i} className="card-flat p-3 flex items-center gap-3">
                                  {it.image && (
                                    <div className="w-11 h-11 rounded-xl bg-subtle grid place-items-center overflow-hidden shrink-0">
                                      <img src={it.image} alt="" className="w-[85%] h-[85%] object-contain" />
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
                          )}
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

/* ─────────────────────────────────────────────────────────────────────────
   Per-entry tracking timeline. Walks the state transitions for the row:
   - purchase / sale: created → in escrow → completed (or cancelled)
   - deposit: requested → received
   - withdrawal: requested → paid out
   - refund: requested → refunded
   - pending_sale credit: credited → released (hold_until from metadata)
   Each step has an icon + a label + an optional date. The step matching
   the current status is the "active" one; earlier steps are filled.
   ───────────────────────────────────────────────────────────────────────── */

interface Step {
  label: string;
  Icon: React.ComponentType<any>;
  date?: string;
  active?: boolean;
  done?: boolean;
}

const Timeline: React.FC<{ entry: FeedEntry; formatPrice: (n: number) => string }> = ({
  entry,
  formatPrice,
}) => {
  const steps = useMemo<Step[]>(() => {
    const raw = entry.raw || {};
    const createdAt = raw.created_at || entry.timestamp;
    const completedAt = raw.completed_at || raw.payment_processed_at;

    if (entry.kind === 'purchase' || entry.kind === 'sale') {
      const status = entry.status;
      const cancelled = status === 'cancelled' || status === 'refunded';
      const completed = status === 'completed';
      return [
        { label: 'Order created',     Icon: ShoppingBag,  date: createdAt, done: true },
        { label: 'Funds in escrow',   Icon: Hourglass,    done: !cancelled, active: status === 'escrow' || status === 'pending' },
        cancelled
          ? { label: 'Cancelled',     Icon: XCircle,      date: completedAt, active: true, done: true }
          : { label: 'Trade complete', Icon: CheckCircle2, date: completedAt, active: completed, done: completed },
      ];
    }

    if (entry.kind === 'pending_sale') {
      const holdUntil = raw?.metadata?.hold_until;
      const released = entry.status === 'completed';
      return [
        { label: 'Credited to pending balance', Icon: Wallet, date: createdAt, done: true },
        { label: 'Released to main balance',    Icon: CheckCircle2, date: holdUntil, active: !released, done: released },
      ];
    }

    if (entry.kind === 'deposit') {
      return [
        { label: 'Deposit requested', Icon: Clock,        date: createdAt, done: true },
        { label: 'Funds received',    Icon: CheckCircle2, date: completedAt || createdAt, done: true, active: true },
      ];
    }

    if (entry.kind === 'withdrawal') {
      return [
        { label: 'Withdrawal requested', Icon: Clock,        date: createdAt, done: true },
        { label: 'Paid out',             Icon: CheckCircle2, date: completedAt, done: !!completedAt, active: !completedAt },
      ];
    }

    if (entry.kind === 'refund') {
      return [
        { label: 'Refund issued',  Icon: RotateCcw,    date: createdAt, done: true, active: true },
        { label: 'Back in balance', Icon: CheckCircle2, done: true },
      ];
    }

    return [
      { label: 'Recorded', Icon: CheckCircle2, date: createdAt, done: true, active: true },
    ];
  }, [entry]);

  const holdUntil = entry.raw?.metadata?.hold_until;
  const escrowReleaseDate = entry.raw?.escrow_release_date;
  const referenceId = entry.raw?.transaction_id || entry.raw?.reference_id;

  return (
    <div className="card-flat p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="label-eyebrow">Tracking</span>
        {referenceId && (
          <span className="text-[10.5px] font-mono text-ink-dim truncate max-w-[200px]">
            {referenceId}
          </span>
        )}
      </div>

      <ol className="space-y-2.5">
        {steps.map((step, i) => {
          const tone =
            step.active
              ? 'bg-accent text-on-accent'
              : step.done
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-subtle text-ink-muted';
          return (
            <li key={i} className="flex items-start gap-3 relative">
              <div className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${tone}`}>
                <step.Icon size={13} strokeWidth={2.4} />
              </div>
              {i < steps.length - 1 && (
                <span
                  className="absolute left-3.5 top-7 bottom-0 w-px bg-line"
                  style={{ transform: 'translateX(-0.5px)' }}
                  aria-hidden
                />
              )}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="text-[12.5px] font-semibold text-ink tracking-tight">
                  {step.label}
                </div>
                {step.date && (
                  <div className="text-[10.5px] text-ink-dim font-medium mt-0.5">
                    {new Date(step.date).toLocaleString()}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {(holdUntil || escrowReleaseDate) && entry.status === 'escrow' && (
        <div className="flex items-center gap-2 text-[11.5px] text-ink-muted font-medium pt-1 border-t border-line">
          <Hourglass size={11} className="text-amber-600" />
          Releases {new Date(holdUntil || escrowReleaseDate).toLocaleDateString()}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-line">
        <span className="text-[11.5px] text-ink-muted font-medium">Amount</span>
        <span className="text-[13px] font-bold text-ink tabular-nums">
          {entry.positive ? '+' : '−'}{formatPrice(entry.amount)}
        </span>
      </div>
    </div>
  );
};

const KindIcon: React.FC<{ kind: FeedEntry['kind']; positive: boolean }> = ({ kind, positive }) => {
  const className = `icon-chip ${
    positive
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
  }`;
  const Icon =
    kind === 'purchase' ? ArrowDownLeft
    : kind === 'sale' || kind === 'pending_sale' ? ArrowUpRight
    : kind === 'deposit' ? Wallet
    : kind === 'withdrawal' ? ArrowUpRight
    : kind === 'refund' ? RotateCcw
    : ShoppingBag;
  return (
    <div className={className}>
      <Icon size={16} strokeWidth={2.4} />
    </div>
  );
};

export default TradesTab;
