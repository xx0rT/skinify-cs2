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
  X,
  Zap,
} from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useBalanceStore } from '../store/balanceStore';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { CachedImage } from '../components/ui/CachedImage';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import BuyGate, { getBuyRequirements, BuyRequirement } from '../components/checkout/BuyGate';
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
  const { balance, fetchBalance, purchaseWithBalance } = useBalanceStore();

  const [promo, setPromo] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; pct: number } | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmCheckoutOpen, setConfirmCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  /* When true, the checkout dialog shows the success state (post-order
     confetti / "order placed" frame) before routing the user away.
     The route push is deferred 1.4s so the user reads the success cue. */
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  /* Buy-gate: unmet requirements (Steam link / trade URL / KYC) that must
     be satisfied before checkout can proceed. */
  const [buyGate, setBuyGate] = useState<BuyRequirement[] | null>(null);

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
    /* Gate: email/credentials users must link Steam, add a trade URL, and
       pass KYC before buying. Steam-OpenID users clear the Steam step
       inherently but still need a trade link. */
    const reqs = getBuyRequirements(user);
    if (reqs.length > 0) {
      setBuyGate(reqs);
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
      /* Real checkout via the `orders` edge function: deducts the
         buyer's current_balance and credits each seller's
         pending_balance (8-day escrow), then deactivates the listings. */
      const purchaseItems = items.map((it) => ({
        id: it.id,
        name: it.name,
        market_name: it.market_name || it.name,
        price: it.price,
        image: it.image,
        condition: it.condition,
        rarity: it.rarity,
        type: it.type,
        seller: it.seller,
      }));

      const ok = await purchaseWithBalance(total, purchaseItems as any);
      if (!ok) {
        const err = useBalanceStore.getState().error;
        addToast({
          type: 'error',
          title: 'Checkout failed',
          message: err || 'Could not complete the checkout. Please try again.',
        });
        return;
      }

      /* Notify the marketplace strip so any of these listings still
         rendered on another tab/component drop instantly. */
      try {
        const raw = localStorage.getItem('skinify_sold_ids');
        const arr: string[] = raw ? JSON.parse(raw) : [];
        for (const it of items) {
          if (!arr.includes(String(it.id))) arr.push(String(it.id));
          window.dispatchEvent(
            new CustomEvent('skinify:item-sold', { detail: { id: String(it.id) } }),
          );
        }
        localStorage.setItem('skinify_sold_ids', JSON.stringify(arr));
      } catch {
        /* private mode — no-op */
      }

      clearCart();
      /* Flip the dialog into success mode rather than slamming the
         router. The user sees a clean "Order placed" frame for ~1.4s,
         then we route through to the trades tab. */
      setCheckoutSuccess(true);
      setTimeout(() => {
        setConfirmCheckoutOpen(false);
        setCheckoutSuccess(false);
        navigate('/profile?tab=trades');
      }, 1400);
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
              <span className="label-eyebrow">Košík</span>
              <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight mt-2 leading-none">
                Váš košík je prázdný
              </h1>
              <p className="text-[14px] text-ink-muted font-medium mt-3 max-w-md mx-auto">
                Projděte tržiště, přidejte skiny, které chcete, a zaplaťte vše najednou.
              </p>
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.03 }}
                onClick={() => navigate('/marketplace')}
                className="mt-7 h-12 px-6 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center gap-2"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
              >
                Otevřít tržiště <ArrowRight size={15} strokeWidth={2.4} />
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

      <main className="max-w-[1060px] mx-auto px-4 sm:px-6 pt-4 pb-16">
        <BackButton onClick={() => navigate(-1)} />

        {/* Compact header — title + count chip left, clear-cart right. No
            full-width banner card; the page gets its personality from the
            item cards and the summary instead. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex items-end justify-between flex-wrap gap-3 mb-5 px-1"
        >
          <div className="flex items-baseline gap-3">
            <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-none">
              Váš košík
            </h1>
            <motion.span
              key={items.length}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="h-7 min-w-7 px-2 rounded-full bg-accent text-on-accent grid place-items-center text-[13px] font-bold tabular-nums"
            >
              {items.length}
            </motion.span>
          </div>
          <motion.button
            whileTap={tap}
            onClick={() => setConfirmClearOpen(true)}
            className="h-9 px-3.5 rounded-full hover:bg-subtle flex items-center gap-1.5 text-[12.5px] text-ink-muted hover:text-rose-500 font-semibold transition-colors"
          >
            <Trash2 size={13} strokeWidth={2.2} />
            Vysypat košík
          </motion.button>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-4">
          {/* Items column */}
          <section className="space-y-2 min-w-0">
            <AnimatePresence initial={false}>
              {items.map((item, idx) => {
                const color = rarityColor(item.rarity);
                return (
                  <motion.article
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -28, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 90, scale: 0.92, transition: { duration: 0.28, ease: [0.4, 0, 0.8, 0.4] } }}
                    transition={{ type: 'spring', stiffness: 340, damping: 28, delay: Math.min(idx * 0.06, 0.3) }}
                    whileHover={{ y: -3, scale: 1.008 }}
                    className="group relative card p-3 pr-3 sm:pr-4 flex items-center gap-3 sm:gap-4 overflow-hidden"
                  >
                    {/* Rarity accent — soft edge wash instead of a hard stripe. */}
                    <div
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-28 pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `linear-gradient(90deg, ${color || 'rgb(var(--accent))'}26 0%, transparent 100%)`,
                      }}
                    />
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
                          background: `radial-gradient(circle at 50% 62%, ${color || 'rgb(var(--accent))'}33, transparent 68%)`,
                        }}
                      />
                      <motion.div
                        className="relative w-full h-full grid place-items-center"
                        whileHover={{ scale: 1.12, rotate: -2 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      >
                        <CachedImage
                          src={item.image}
                          alt={item.name}
                          className="w-[85%] h-[85%] object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.25)]"
                        />
                      </motion.div>
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
                          Prodejce · {item.seller.name}
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
                      title="Odebrat"
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
              Pokračovat v nákupu
            </motion.button>
          </section>

          {/* Summary column */}
          <aside className="lg:sticky lg:top-24 self-start space-y-3">
            <motion.section
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
              className="card p-6 relative overflow-hidden"
            >
              {/* Accent wash — gives the summary visual weight without
                  extra boxes. */}
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-28 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, rgb(var(--accent) / 0.12) 0%, transparent 100%)',
                }}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <span className="label-eyebrow">Souhrn</span>
                  <h2 className="text-[17px] font-bold tracking-tight mt-1.5 leading-none mb-5">
                    Detail objednávky
                  </h2>
                </div>
                {/* Overlapping item thumbnails */}
                <div className="flex -space-x-3 shrink-0">
                  {items.slice(0, 4).map((it) => (
                    <span
                      key={it.id}
                      className="w-10 h-10 rounded-full bg-subtle ring-2 ring-surface overflow-hidden grid place-items-center"
                    >
                      <CachedImage src={it.image} alt="" className="w-[78%] h-[78%] object-contain" />
                    </span>
                  ))}
                  {items.length > 4 && (
                    <span className="w-10 h-10 rounded-full bg-accent text-on-accent ring-2 ring-surface grid place-items-center text-[11px] font-bold tabular-nums">
                      +{items.length - 4}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 text-[13.5px]">
                <Row label={`Mezisoučet (${items.length})`} value={formatPrice(subtotal)} />
                <AnimatePresence>
                  {appliedPromo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <Row
                        label={`Sleva · ${appliedPromo.code}`}
                        value={`−${formatPrice(discount)}`}
                        valueClass="text-emerald-600 dark:text-emerald-400"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Row label="Poplatek tržiště" value="0 %" valueClass="text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="my-4 border-t border-line" />

              <div className="flex items-baseline justify-between mb-5">
                <span className="label-eyebrow">Celkem</span>
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
                    placeholder="Promo kód"
                    className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[13px] font-bold uppercase tracking-wider"
                  />
                </div>
                <motion.button
                  whileTap={tap}
                  onClick={applyPromo}
                  className="h-11 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[12.5px] font-bold transition-colors"
                >
                  Použít
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
                Bezpečně zaplatit
              </motion.button>

              {/* Trust — one quiet line instead of a whole box; details
                  live in the FAQ. */}
              <p className="mt-3.5 text-[12px] text-ink-dim font-medium text-center">
                <Shield size={11} strokeWidth={2.4} className="inline -mt-0.5 mr-1 text-accent" />
                Platba je chráněna escrow úschovou.{' '}
                <a href="/faq" className="text-accent font-semibold hover:underline">
                  Jak funguje ochrana?
                </a>
              </p>

              {user && (
                <div className="mt-3.5 flex items-center justify-between text-[12.5px] font-medium">
                  <span className="text-ink-muted">Zůstatek po nákupu</span>
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
                        Dobít
                      </button>
                    )}
                  </span>
                </div>
              )}
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
          addToast({ type: 'info', title: 'Košík vysypán' });
        }}
        title="Vysypat košík?"
        message="Z košíku se odeberou všechny položky."
        confirmText="Vysypat"
        cancelText="Ponechat"
        variant="warning"
      />

      <CheckoutConfirmDialog
        isOpen={confirmCheckoutOpen}
        onClose={() => !processing && !checkoutSuccess && setConfirmCheckoutOpen(false)}
        onConfirm={finalizeCheckout}
        items={items}
        total={total}
        processing={processing}
        success={checkoutSuccess}
        formatPrice={formatPrice}
      />

      <BuyGate
        open={!!buyGate}
        onClose={() => setBuyGate(null)}
        requirements={buyGate || []}
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

/* ─────────────────────────────────────────────────────────────────────────
   CheckoutConfirmDialog — custom dialog that replaces the generic
   ConfirmationModal for the checkout step. Goals:
     - Matches the site's design language (card-elevated, accent rail,
       same icon-chip + label-eyebrow + typography scale as the listing
       modal)
     - Shows a real preview of what's being ordered (the first few
       thumbnails with a +N chip) so the user sees what they're
       confirming
     - Has a post-order success state with a check pulse + escrow
       reassurance copy, which the page holds for ~1.4s before routing.
       The previous one slammed a toast and route-changed immediately,
       which made successful orders feel terse and underwhelming.
   ───────────────────────────────────────────────────────────────────────── */
const CheckoutConfirmDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: any[];
  total: number;
  processing: boolean;
  success: boolean;
  formatPrice: (n: number) => string;
}> = ({ isOpen, onClose, onConfirm, items, total, processing, success, formatPrice }) => {
  useBodyScrollLock(isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processing && !success) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, processing, success, onClose]);

  if (!isOpen) return null;

  const preview = items.slice(0, 4);
  const remaining = Math.max(0, items.length - preview.length);

  return (
    <AnimatePresence>
      <motion.div
        key="co-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[90] bg-ink/45 dark:bg-black/65 backdrop-blur-md flex items-end sm:items-center justify-center p-3"
        onClick={onClose}
      >
        <motion.div
          key="co-card"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={spring}
          onClick={(e) => e.stopPropagation()}
          className="card-elevated w-full max-w-md relative overflow-hidden"
          style={{
            boxShadow:
              '0 32px 64px -24px rgba(20,16,40,0.55), 0 12px 28px -10px rgba(20,16,40,0.35)',
          }}
        >
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="co-success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="p-7 text-center"
              >
                {/* Success medallion with a pulsing accent halo */}
                <div className="relative w-16 h-16 mx-auto mb-5">
                  <motion.span
                    aria-hidden
                    initial={{ scale: 0.6, opacity: 0.6 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{ duration: 1.1, ease: 'easeOut', repeat: Infinity }}
                    className="absolute inset-0 rounded-3xl bg-accent/30"
                  />
                  <motion.div
                    initial={{ scale: 0.5, rotate: -8 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                    className="relative w-16 h-16 rounded-3xl bg-accent text-on-accent grid place-items-center"
                    style={{ boxShadow: '0 16px 32px -10px rgb(var(--accent) / 0.65)' }}
                  >
                    <CheckCircle2 size={28} strokeWidth={2.4} />
                  </motion.div>
                </div>
                <span className="label-eyebrow text-accent">Order placed</span>
                <h2 className="text-[22px] font-bold text-ink tracking-tight leading-tight mt-2">
                  {items.length} {items.length === 1 ? 'item' : 'items'} on the way
                </h2>
                <p className="text-[13.5px] text-ink-muted font-medium mt-3 leading-relaxed">
                  Payment is held in escrow. Sellers have been notified and your
                  trades show up in your profile under <span className="text-ink font-semibold">Trades</span>.
                </p>
                <div className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted">
                  <Lock size={12} strokeWidth={2.4} />
                  Escrow-protected · funds release after 8 days
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="co-confirm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="p-6"
              >
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-accent-soft grid place-items-center shrink-0">
                      <Zap size={17} strokeWidth={2.4} className="text-accent" />
                    </div>
                    <div className="min-w-0">
                      <span className="label-eyebrow">Confirm checkout</span>
                      <h2 className="text-[19px] font-bold text-ink tracking-tight leading-tight mt-1 truncate">
                        Place {items.length} {items.length === 1 ? 'item' : 'items'} order
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    disabled={processing}
                    aria-label="Close"
                    className="h-9 w-9 shrink-0 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors disabled:opacity-50"
                  >
                    <X size={15} strokeWidth={2.4} />
                  </button>
                </div>

                {/* Item preview row */}
                <div className="flex items-center gap-2 mb-5">
                  {preview.map((it) => (
                    <div
                      key={it.id}
                      className="relative w-14 h-14 rounded-2xl bg-subtle grid place-items-center overflow-hidden shrink-0"
                      title={it.name}
                    >
                      <CachedImage
                        src={it.image}
                        alt={it.name}
                        className="w-[88%] h-[88%] object-contain"
                      />
                    </div>
                  ))}
                  {remaining > 0 && (
                    <div className="w-14 h-14 rounded-2xl bg-subtle grid place-items-center text-[12px] font-bold text-ink-muted tabular-nums shrink-0">
                      +{remaining}
                    </div>
                  )}
                </div>

                {/* Total + escrow line */}
                <div className="rounded-3xl bg-subtle p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] text-ink-muted font-medium">Total</span>
                    <span className="text-[18px] font-bold text-ink tabular-nums tracking-tight">
                      {formatPrice(total)}
                    </span>
                  </div>
                  <div className="h-px bg-line my-1" />
                  <div className="flex items-start gap-2 text-[11.5px] text-ink-muted font-medium">
                    <Shield size={12} strokeWidth={2.4} className="text-accent shrink-0 mt-0.5" />
                    Funds release to sellers 8 days after each Steam trade is
                    accepted. You can dispute anytime in that window.
                  </div>
                </div>

                {/* CTAs */}
                <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
                  <motion.button
                    whileTap={tap}
                    onClick={onClose}
                    disabled={processing}
                    className="sm:flex-1 h-12 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[13.5px] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileTap={tap}
                    whileHover={!processing ? { scale: 1.01 } : undefined}
                    onClick={onConfirm}
                    disabled={processing}
                    className="sm:flex-[1.4] h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                    style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.55)' }}
                  >
                    {processing ? 'Placing order…' : `Place order · ${formatPrice(total)}`}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CartPage;
