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
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useBalanceStore } from '../store/balanceStore';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CachedImage } from '../components/ui/CachedImage';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { rarityColor } from '../components/ui/SkinCard';

const CartPage: React.FC = () => {
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

  if (items.length === 0) {
    return (
      <div className="min-h-screen text-white">
        <Header activeSection="Cart" />
        <main className="md:pl-[100px] pl-4 pr-4 pt-24 pb-16 max-w-[1480px] mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 hover:text-white text-[13px] font-medium transition-colors mb-5"
          >
            <ChevronLeft size={15} />
            Back
          </button>

          <div className="glass rounded-3xl2 p-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.05] grid place-items-center mx-auto mb-5">
              <ShoppingCart size={26} className="text-zinc-400" />
            </div>
            <h1 className="text-[22px] font-display font-bold text-white tracking-tight">
              Your cart is empty
            </h1>
            <p className="text-[14px] text-zinc-400 mt-1.5 max-w-md mx-auto">
              Browse the marketplace, add skins you want, and check out in one go.
            </p>
            <button
              onClick={() => navigate('/marketplace')}
              className="mt-6 h-12 px-6 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-semibold shadow-accent-glow transition-colors inline-flex items-center gap-2"
            >
              Browse marketplace <ArrowRight size={15} />
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <Header activeSection="Cart" />

      <main className="md:pl-[100px] pl-4 pr-4 pt-24 pb-16 max-w-[1480px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-[34px] font-display font-bold text-white tracking-tight leading-tight">
              Cart
            </h1>
            <p className="text-[14px] text-zinc-400 mt-1">
              {items.length} {items.length === 1 ? 'item' : 'items'} · {formatPrice(subtotal)}
            </p>
          </div>
          <button
            onClick={() => setConfirmClearOpen(true)}
            className="h-11 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.06] text-[13px] text-zinc-300 hover:text-white font-medium flex items-center gap-2 transition-colors"
          >
            <Trash2 size={14} />
            Clear cart
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-4">
          {/* Items */}
          <section className="space-y-2 min-w-0">
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const color = rarityColor(item.rarity);
                return (
                  <motion.article
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="relative glass rounded-3xl2 p-3 pr-4 flex items-center gap-4 overflow-hidden"
                  >
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                      style={{ background: color }}
                    />
                    <button
                      onClick={() => navigate(`/item/${item.id}`)}
                      className="w-24 h-24 shrink-0 rounded-2xl bg-white/[0.03] grid place-items-center overflow-hidden hover:bg-white/[0.06] transition-colors"
                    >
                      <CachedImage
                        src={item.image}
                        alt={item.name}
                        className="w-[88%] h-[88%] object-contain"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <span
                          className="text-[11px] uppercase tracking-wider font-semibold"
                          style={{ color }}
                        >
                          {item.rarity || 'Standard'}
                        </span>
                        <span className="text-[11px] text-zinc-500">{item.condition || ''}</span>
                      </div>
                      <h3
                        className="text-[14px] font-semibold text-white truncate cursor-pointer hover:underline"
                        onClick={() => navigate(`/item/${item.id}`)}
                      >
                        {item.name}
                      </h3>
                      {item.seller?.name && (
                        <p className="text-[12px] text-zinc-500 mt-0.5 truncate">
                          Seller {item.seller.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[16px] font-display font-bold text-white tracking-tight leading-none">
                        {formatPrice(item.price)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-10 h-10 rounded-2xl bg-white/[0.05] hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 grid place-items-center transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </motion.article>
                );
              })}
            </AnimatePresence>

            <button
              onClick={() => navigate('/marketplace')}
              className="w-full h-12 mt-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[13.5px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <ShoppingCart size={14} />
              Continue browsing
            </button>
          </section>

          {/* Summary */}
          <aside className="lg:sticky lg:top-24 self-start space-y-4">
            <section className="glass rounded-3xl2 p-6">
              <h2 className="text-[16px] font-display font-semibold text-white tracking-tight mb-4">
                Order summary
              </h2>

              <div className="space-y-2.5 text-[13.5px]">
                <Row label={`Subtotal (${items.length})`} value={formatPrice(subtotal)} />
                {appliedPromo && (
                  <Row
                    label={`Discount · ${appliedPromo.code}`}
                    value={`-${formatPrice(discount)}`}
                    valueClass="text-emerald-400"
                  />
                )}
                <Row label="Marketplace fee" value="0%" valueClass="text-emerald-400" />
              </div>

              <div className="my-4 border-t border-white/[0.06]" />

              <div className="flex items-baseline justify-between mb-5">
                <span className="text-[13px] uppercase tracking-wide text-zinc-500 font-semibold">
                  Total
                </span>
                <span className="text-[26px] font-display font-bold text-white tracking-tight">
                  {formatPrice(total)}
                </span>
              </div>

              {/* Promo */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 flex items-center gap-2 h-11 px-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <Tag size={14} className="text-zinc-500 shrink-0" />
                  <input
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                    placeholder="Promo code"
                    className="flex-1 bg-transparent outline-none text-white placeholder-zinc-500 text-[13.5px] uppercase tracking-wide"
                  />
                </div>
                <button
                  onClick={applyPromo}
                  className="h-11 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-[13px] font-medium transition-colors"
                >
                  Apply
                </button>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full h-12 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-semibold shadow-accent-glow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Lock size={14} />
                Secure checkout
              </button>

              {user && (
                <div className="mt-3 flex items-center justify-between text-[12px]">
                  <span className="text-zinc-500">Balance after</span>
                  <span
                    className={canAfford ? 'text-zinc-300 font-medium' : 'text-rose-400 font-medium'}
                  >
                    {formatPrice(Math.max(0, (balance || 0) - total))}
                    {!canAfford && (
                      <button
                        onClick={() => navigate('/profile?tab=balance')}
                        className="ml-2 text-accent-400 hover:text-accent-300 font-semibold"
                      >
                        Refill
                      </button>
                    )}
                  </span>
                </div>
              )}
            </section>

            <section className="glass rounded-3xl2 p-5">
              <ul className="space-y-3 text-[13px]">
                {[
                  { icon: Shield, label: 'Escrow until you confirm receipt' },
                  { icon: CheckCircle2, label: 'Refunded if any seller fails' },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2.5">
                    <Icon size={14} className="text-accent-400 shrink-0" />
                    <span className="text-zinc-300">{label}</span>
                  </li>
                ))}
              </ul>
            </section>
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

const Row: React.FC<{ label: string; value: string; valueClass?: string }> = ({
  label,
  value,
  valueClass = 'text-white',
}) => (
  <div className="flex items-center justify-between">
    <span className="text-zinc-400">{label}</span>
    <span className={`font-medium ${valueClass}`}>{value}</span>
  </div>
);

export default CartPage;
