import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Trash2,
  ShoppingCart,
  ChevronLeft,
  Tag,
  Shield,
  CheckCircle2,
  Lock,
  ArrowRight,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useBalanceStore } from '../store/balanceStore';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { CachedImage } from '../components/ui/CachedImage';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { rarityColor } from '../components/ui/SkinCard';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   CartPage — redesigned to the landing/profile theme
   - Hero header with item count + total
   - Item rows with rarity bar, image, seller, price, remove
   - Sticky summary: promo code, breakdown, secure checkout CTA
   - Balance row with quick "Refill" deep-link if insufficient
   - Empty-state with marketplace CTA
   ───────────────────────────────────────────────────────────────────────── */

import useDocumentMeta from '../hooks/useDocumentMeta';

const CartPage: React.FC = () => {
  useDocumentMeta({
    title: 'Cart · Skinify',
    description: 'Review and check out the CS2 skins in your cart.',
    noindex: true,
  });
  const navigate = useNavigate();
  const { items, removeItem, clearCart, getTotalPrice } = useCartStore();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();
  const { balance, fetchBalance } = useBalanceStore();

  const [promo, setPromo] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; pct: number } | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmCheckoutOpen, setConfirmCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user?.steamId) fetchBalance(user.steamId);
  }, [user?.steamId]);

  const subtotal = getTotalPrice();
  const discount = appliedPromo ? (subtotal * appliedPromo.pct) / 100 : 0;
  const total = Math.max(0, subtotal - discount);
  const canAfford = (balance || 0) >= total;

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    if (code === 'SKIN10') {
      setAppliedPromo({ code, pct: 10 });
      addToast({ type: 'success', title: 'Promo applied', message: '10% off your order.' });
    } else {
      addToast({ type: 'error', title: 'Invalid code', message: 'Try SKIN10 for 10% off.' });
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (!user) {
      addToast({ type: 'warning', title: 'Login required', message: 'Sign in to check out.' });
      return;
    }
    if (!canAfford) {
      addToast({
        type: 'error',
        title: 'Insufficient balance',
        message: `Need ${formatPrice(total - (balance || 0))} more to check out.`,
      });
      return;
    }
    setConfirmCheckoutOpen(true);
  };

  const finalizeCheckout = async () => {
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      clearCart();
      addToast({
        type: 'success',
        title: 'Order placed',
        message: 'Sellers will be notified to send trade offers.',
      });
      setConfirmCheckoutOpen(false);
      navigate('/profile?tab=trades');
    } finally {
      setProcessing(false);
    }
  };

  /* ─── Empty state ─── */
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16">
          <BackButton onClick={() => navigate(-1)} />
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="card p-12 sm:p-16 text-center relative overflow-hidden mt-2"
          >
            <motion.div
              aria-hidden
              className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 65%)',
              }}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative">
              <div className="icon-chip-lg mx-auto mb-5 bg-accent-soft">
                <ShoppingCart size={24} className="text-accent" />
              </div>
              <span className="label-eyebrow">Cart</span>
              <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight mt-2 leading-none">
                Your cart is empty
              </h1>
              <p className="text-[14px] text-ink-muted font-medium mt-3 max-w-md mx-auto">
                Browse the marketplace, add the skins you want, and check out in one go.
              </p>
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.03 }}
                onClick={() => navigate('/marketplace')}
                className="mt-7 h-12 px-6 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center gap-2"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
              >
                Browse marketplace <ArrowRight size={15} strokeWidth={2.4} />
              </motion.button>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16">
        <BackButton onClick={() => navigate(-1)} />

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-5 sm:p-6 mb-4 relative overflow-hidden"
        >
          <motion.div
            aria-hidden
            className="absolute -top-32 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(closest-side, rgb(var(--accent) / 0.14), transparent 65%)',
            }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex items-end justify-between flex-wrap gap-3">
            <div>
              <span className="label-eyebrow">Checkout</span>
              <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight mt-1.5 leading-none">
                Your cart
              </h1>
              <p className="text-[13px] text-ink-muted font-medium mt-2">
                {items.length} {items.length === 1 ? 'item' : 'items'} · {formatPrice(subtotal)}
              </p>
            </div>
            <motion.button
              whileTap={tap}
              onClick={() => setConfirmClearOpen(true)}
              className="h-10 px-4 rounded-full bg-subtle hover:bg-bg flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink font-semibold transition-colors"
            >
              <Trash2 size={13} strokeWidth={2.2} />
              Clear cart
            </motion.button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-4">
          {/* Items column */}
          <section className="space-y-2 min-w-0">
            <AnimatePresence initial={false}>
              {items.map((item, idx) => {
                const color = rarityColor(item.rarity);
                return (
                  <motion.article
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ ...spring, delay: Math.min(idx * 0.04, 0.2) }}
                    whileHover={{ y: -2 }}
                    className="relative card p-3 pr-3 sm:pr-4 flex items-center gap-3 sm:gap-4 overflow-hidden"
                  >
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                      style={{ background: color || 'rgb(var(--accent))' }}
                    />
                    <motion.button
                      whileTap={tap}
                      onClick={() => navigate(`/item/${item.id}`)}
                      className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl bg-subtle/60 grid place-items-center overflow-hidden hover:bg-subtle transition-colors relative"
                    >
                      <motion.div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at 50% 50%, ${color || 'rgb(var(--accent))'}22, transparent 65%)`,
                        }}
                      />
                      <CachedImage
                        src={item.image}
                        alt={item.name}
                        className="relative w-[85%] h-[85%] object-contain"
                      />
                    </motion.button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                        <span
                          className="text-[10.5px] uppercase tracking-wider font-bold"
                          style={{ color: color || 'rgb(var(--accent))' }}
                        >
                          {item.rarity || 'Standard'}
                        </span>
                        {item.condition && (
                          <span className="text-[10.5px] text-ink-dim font-semibold uppercase tracking-wider">
                            {item.condition}
                          </span>
                        )}
                      </div>
                      <h3
                        className="text-[14px] sm:text-[15px] font-bold text-ink truncate cursor-pointer hover:underline tracking-tight leading-tight"
                        onClick={() => navigate(`/item/${item.id}`)}
                      >
                        {item.name}
                      </h3>
                      {item.seller?.name && (
                        <p className="text-[12px] text-ink-muted font-medium mt-1 truncate">
                          Seller · {item.seller.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[15px] sm:text-[17px] font-bold tabular-nums text-ink tracking-tight leading-none">
                        {formatPrice(item.price)}
                      </div>
                    </div>
                    <motion.button
                      whileTap={tap}
                      onClick={() => removeItem(item.id)}
                      className="h-10 w-10 shrink-0 rounded-full bg-subtle hover:bg-rose-500/15 text-ink-muted hover:text-rose-500 grid place-items-center transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={14} strokeWidth={2.2} />
                    </motion.button>
                  </motion.article>
                );
              })}
            </AnimatePresence>

            <motion.button
              whileTap={tap}
              whileHover={{ y: -1 }}
              onClick={() => navigate('/marketplace')}
              className="w-full h-12 mt-3 rounded-3xl bg-subtle hover:bg-bg text-ink text-[13.5px] font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <ShoppingCart size={14} strokeWidth={2.2} />
              Continue browsing
            </motion.button>
          </section>

          {/* Summary column */}
          <aside className="lg:sticky lg:top-24 self-start space-y-3">
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.08 }}
              className="card p-6"
            >
              <span className="label-eyebrow">Summary</span>
              <h2 className="text-[17px] font-bold tracking-tight mt-1.5 leading-none mb-5">
                Order details
              </h2>

              <div className="space-y-2.5 text-[13.5px]">
                <Row label={`Subtotal (${items.length})`} value={formatPrice(subtotal)} />
                <AnimatePresence>
                  {appliedPromo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <Row
                        label={`Discount · ${appliedPromo.code}`}
                        value={`−${formatPrice(discount)}`}
                        valueClass="text-emerald-600 dark:text-emerald-400"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Row label="Marketplace fee" value="0%" valueClass="text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="my-4 border-t border-line" />

              <div className="flex items-baseline justify-between mb-5">
                <span className="label-eyebrow">Total</span>
                <motion.span
                  key={total}
                  initial={{ scale: 0.94, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={spring}
                  className="text-[26px] sm:text-[30px] font-bold tracking-tight tabular-nums text-ink leading-none"
                >
                  {formatPrice(total)}
                </motion.span>
              </div>

              {/* Promo */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 flex items-center gap-2 h-11 px-3.5 rounded-full bg-subtle">
                  <Tag size={14} strokeWidth={2.2} className="text-ink-muted shrink-0" />
                  <input
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                    placeholder="Promo code"
                    className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[13px] font-bold uppercase tracking-wider"
                  />
                </div>
                <motion.button
                  whileTap={tap}
                  onClick={applyPromo}
                  className="h-11 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[12.5px] font-bold transition-colors"
                >
                  Apply
                </motion.button>
              </div>

              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={handleCheckout}
                disabled={processing}
                className="w-full h-12 rounded-full bg-accent hover:bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
              >
                <Lock size={14} strokeWidth={2.4} />
                Secure checkout
              </motion.button>

              {user && (
                <div className="mt-3.5 flex items-center justify-between text-[12.5px] font-medium">
                  <span className="text-ink-muted">Balance after</span>
                  <span
                    className={
                      canAfford ? 'text-ink-muted font-semibold tabular-nums' : 'text-rose-500 font-bold tabular-nums'
                    }
                  >
                    {formatPrice(Math.max(0, (balance || 0) - total))}
                    {!canAfford && (
                      <button
                        onClick={() => navigate('/profile?tab=balance')}
                        className="ml-2 text-accent hover:underline font-bold"
                      >
                        Refill
                      </button>
                    )}
                  </span>
                </div>
              )}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.12 }}
              className="card p-5"
            >
              <span className="label-eyebrow">Why you're protected</span>
              <ul className="mt-3 space-y-2.5">
                {[
                  { Icon: Shield, label: 'Escrow until you confirm receipt' },
                  { Icon: CheckCircle2, label: 'Refunded if any seller fails' },
                  { Icon: Sparkles, label: 'Items remain tradable on Steam' },
                ].map(({ Icon, label }) => (
                  <li key={label} className="flex items-center gap-2.5 text-[13px] text-ink-muted font-medium">
                    <div className="icon-chip-sm bg-accent-soft shrink-0">
                      <Icon size={13} strokeWidth={2.2} className="text-accent" />
                    </div>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </motion.section>
          </aside>
        </div>
      </main>

      <Footer />

      <ConfirmationModal
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          clearCart();
          setConfirmClearOpen(false);
          addToast({ type: 'info', title: 'Cart cleared' });
        }}
        title="Clear cart?"
        message="This will remove all items from your cart."
        confirmText="Clear"
        cancelText="Keep"
        variant="warning"
      />

      <ConfirmationModal
        isOpen={confirmCheckoutOpen}
        onClose={() => setConfirmCheckoutOpen(false)}
        onConfirm={finalizeCheckout}
        title="Confirm checkout"
        message={`Place an order for ${items.length} ${items.length === 1 ? 'item' : 'items'} totalling ${formatPrice(total)}?`}
        confirmText="Place order"
        cancelText="Cancel"
        variant="info"
        isProcessing={processing}
      />
    </div>
  );
};

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <motion.button
    whileTap={tap}
    whileHover={{ x: -2 }}
    onClick={onClick}
    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink text-[13px] font-semibold transition-colors mb-3"
  >
    <ChevronLeft size={14} strokeWidth={2.4} />
    Back
  </motion.button>
);

const Row: React.FC<{ label: string; value: string; valueClass?: string }> = ({
  label,
  value,
  valueClass = 'text-ink',
}) => (
  <div className="flex items-center justify-between">
    <span className="text-ink-muted font-medium">{label}</span>
    <span className={`font-bold tabular-nums ${valueClass}`}>{value}</span>
  </div>
);

export default CartPage;
