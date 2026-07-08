import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeftRight, Trash2, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useOrderStore } from '../../store/orderStore';
import { useAuthStore } from '../../store/authStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { CachedImage } from '../ui/CachedImage';
import { tap } from '../../lib/motion';
import { rarityColor } from '../ui/SkinCard';

/* ─────────────────────────────────────────────────────────────────────────
   MarketCartPanel — the right-hand rail on the marketplace.

   Two tabs:
     Cart   — live cart contents with per-row remove + running total + a
              Buy button that goes to checkout.
     Trades — the user's active purchases with a live status badge
              (pending / in escrow / completed …). Mirrors the reference
              CSFloat-style layout.
   ───────────────────────────────────────────────────────────────────────── */

const STATUS_META: Record<
  string,
  { label: string; cls: string; Icon: React.ComponentType<any> }
> = {
  pending: { label: 'Awaiting delivery', cls: 'bg-amber-500/12 text-amber-600 dark:text-amber-400', Icon: Clock },
  escrow: { label: 'In escrow', cls: 'bg-accent/12 text-accent', Icon: ShieldCheck },
  completed: { label: 'Completed', cls: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400', Icon: CheckCircle2 },
  disputed: { label: 'Disputed', cls: 'bg-rose-500/12 text-rose-600 dark:text-rose-400', Icon: Clock },
  cancelled: { label: 'Cancelled', cls: 'bg-ink/10 text-ink-muted', Icon: Clock },
  refunded: { label: 'Refunded', cls: 'bg-ink/10 text-ink-muted', Icon: Clock },
};

const MarketCartPanel: React.FC = () => {
  const navigate = useNavigate();
  const { items, removeItem, getTotalPrice } = useCartStore();
  const { orders, fetchOrders, loading } = useOrderStore();
  const { user } = useAuthStore();
  const { formatPrice } = useCurrencyStore();
  const [tab, setTab] = useState<'cart' | 'trades'>('cart');

  /* Active purchases = orders the user bought that aren't finished. */
  const activePurchases = orders.filter(
    (o) => o.buyer_steam_id === user?.steamId && !['cancelled', 'refunded'].includes(o.status),
  );

  useEffect(() => {
    if (user?.steamId) fetchOrders(user.steamId, 'purchases');
  }, [user?.steamId]);

  const total = getTotalPrice();

  return (
    <aside className="hidden xl:flex flex-col card p-0 overflow-hidden sticky top-24 h-[calc(100vh-7rem)]">
      {/* Tabs */}
      <div className="flex items-center border-b border-line shrink-0">
        {(
          [
            { id: 'cart' as const, label: 'Cart', Icon: ShoppingBag, count: items.length },
            { id: 'trades' as const, label: 'Trades', Icon: ArrowLeftRight, count: activePurchases.length },
          ]
        ).map(({ id, label, Icon, count }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex-1 h-12 flex items-center justify-center gap-2 text-[13px] font-bold transition-colors ${
                active ? 'text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon size={15} strokeWidth={2.2} />
              {label}
              <span
                className={`min-w-5 h-5 px-1.5 rounded-full grid place-items-center text-[11px] font-bold tabular-nums ${
                  active ? 'bg-accent text-on-accent' : 'bg-subtle text-ink-muted'
                }`}
              >
                {count}
              </span>
              {active && (
                <motion.span
                  layoutId="market-cart-tab"
                  className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-accent"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === 'cart' ? (
            <motion.div
              key="cart"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="p-3 space-y-2"
            >
              {items.length === 0 ? (
                <EmptyState
                  Icon={ShoppingBag}
                  title="Your cart is empty"
                  sub="Add skins from the grid to line up a purchase."
                />
              ) : (
                items.map((it) => (
                  <div
                    key={it.id}
                    className="group flex items-center gap-3 rounded-2xl bg-subtle/50 p-2.5 hover:bg-subtle transition-colors"
                  >
                    <div
                      className="w-14 h-14 rounded-xl bg-bg grid place-items-center overflow-hidden shrink-0"
                      style={{ boxShadow: `inset 0 -2px 0 0 ${rarityColor(it.rarity)}` }}
                    >
                      <CachedImage src={it.image} alt={it.name} className="w-[86%] h-[86%] object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-ink truncate leading-tight">
                        {it.name}
                      </div>
                      <div className="text-[11px] text-ink-muted font-medium truncate mt-0.5">
                        {it.condition}
                      </div>
                      <div className="text-[13px] font-bold text-ink tabular-nums mt-0.5">
                        {formatPrice(it.price)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(it.id)}
                      className="w-8 h-8 rounded-full grid place-items-center text-ink-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} strokeWidth={2.2} />
                    </button>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="trades"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="p-3 space-y-2"
            >
              {loading && activePurchases.length === 0 ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skel h-20 rounded-2xl" />
                  ))}
                </div>
              ) : activePurchases.length === 0 ? (
                <EmptyState
                  Icon={ArrowLeftRight}
                  title="No active purchases"
                  sub="Your in-progress orders and their delivery status show up here."
                />
              ) : (
                activePurchases.map((o) => {
                  const meta = STATUS_META[o.status] || STATUS_META.pending;
                  const first = o.items?.[0];
                  const extra = (o.items?.length || 0) - 1;
                  return (
                    <button
                      key={o.id}
                      onClick={() => navigate(`/profile?tab=trades&transaction=${o.transaction_id}`)}
                      className="w-full text-left rounded-2xl bg-subtle/50 p-2.5 hover:bg-subtle transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-bg grid place-items-center overflow-hidden shrink-0">
                          {first?.image ? (
                            <CachedImage src={first.image} alt={first.name} className="w-[86%] h-[86%] object-contain" />
                          ) : (
                            <ShoppingBag size={16} className="text-ink-muted" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-bold text-ink truncate leading-tight">
                            {first?.name || `Order ${o.transaction_id?.slice(0, 8)}`}
                            {extra > 0 && <span className="text-ink-muted"> +{extra}</span>}
                          </div>
                          <div className="text-[12px] font-bold text-ink tabular-nums mt-0.5">
                            {formatPrice(o.total_amount)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-full ${meta.cls}`}
                        >
                          <meta.Icon size={11} strokeWidth={2.4} />
                          {meta.label}
                        </span>
                        <span className="text-[10.5px] text-ink-dim font-semibold tabular-nums">
                          {new Date(o.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer — cart total + checkout (cart tab only) */}
      {tab === 'cart' && items.length > 0 && (
        <div className="border-t border-line p-3 shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <span className="label-eyebrow">Total value</span>
            <span className="text-[18px] font-bold text-ink tabular-nums">{formatPrice(total)}</span>
          </div>
          <motion.button
            whileTap={tap}
            onClick={() => navigate('/cart')}
            className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center justify-center gap-2"
            style={{ boxShadow: '0 10px 24px -12px rgb(var(--accent) / 0.7)' }}
          >
            <ShoppingBag size={16} strokeWidth={2.4} />
            Checkout · {items.length} {items.length === 1 ? 'item' : 'items'}
          </motion.button>
        </div>
      )}
    </aside>
  );
};

const EmptyState: React.FC<{ Icon: React.ComponentType<any>; title: string; sub: string }> = ({
  Icon,
  title,
  sub,
}) => (
  <div className="py-12 px-4 text-center">
    <div className="w-12 h-12 rounded-2xl bg-subtle grid place-items-center mx-auto mb-3">
      <Icon size={20} className="text-ink-muted" strokeWidth={2} />
    </div>
    <p className="text-[13.5px] font-bold text-ink">{title}</p>
    <p className="text-[12px] text-ink-muted font-medium mt-1 leading-relaxed">{sub}</p>
  </div>
);

export default MarketCartPanel;
