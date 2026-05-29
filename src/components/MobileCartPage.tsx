import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, ShoppingCart, Tag, Lock, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useBalanceStore } from '../store/balanceStore';
import { CachedImage } from './ui/CachedImage';
import ConfirmationModal from './ui/ConfirmationModal';
import { rarityColor } from './ui/SkinCard';

const MobileCartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, removeItem, clearCart, getTotalPrice } = useCartStore();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();
  const { balance, fetchBalance } = useBalanceStore();

  const [promo, setPromo] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; pct: number } | null>(null);
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
      addToast({ type: 'success', title: 'Promo applied' });
    } else {
      addToast({ type: 'error', title: 'Invalid code' });
    }
  };

  const handleCheckout = () => {
    if (!user) {
      addToast({ type: 'warning', title: 'Login required' });
      return;
    }
    if (!canAfford) {
      addToast({
        type: 'error',
        title: 'Insufficient balance',
        message: `Need ${formatPrice(total - (balance || 0))} more.`,
      });
      return;
    }
    setConfirmCheckoutOpen(true);
  };

  const finalize = async () => {
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      clearCart();
      addToast({ type: 'success', title: 'Order placed' });
      setConfirmCheckoutOpen(false);
      navigate('/profile?tab=trades');
    } finally {
      setProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen text-white">
        <header className="px-4 pt-4 pb-3 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-2xl bg-white/[0.05] grid place-items-center"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-[18px] font-display font-bold text-white tracking-tight">Cart</h1>
        </header>
        <main className="px-4 mt-6">
          <div className="glass rounded-3xl2 p-10 text-center">
            <div className="w-14 h-14 rounded-3xl bg-white/[0.05] grid place-items-center mx-auto mb-4">
              <ShoppingCart size={22} className="text-zinc-400" />
            </div>
            <h2 className="text-[18px] font-display font-bold text-white tracking-tight">
              Your cart is empty
            </h2>
            <p className="text-[13px] text-zinc-400 mt-1">
              Browse the marketplace to add skins.
            </p>
            <button
              onClick={() => navigate('/marketplace')}
              className="mt-5 h-12 px-5 rounded-2xl bg-accent-500 text-white font-semibold inline-flex items-center gap-2 shadow-accent-glow"
            >
              Browse <ArrowRight size={15} />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white pb-32">
      <header className="sticky top-0 z-30 px-4 pt-4 pb-3 bg-ink-900/80 backdrop-blur-xl flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-2xl bg-white/[0.05] grid place-items-center"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-[18px] font-display font-bold text-white tracking-tight flex-1">
          Cart · {items.length}
        </h1>
        <button
          onClick={() => {
            clearCart();
            addToast({ type: 'info', title: 'Cart cleared' });
          }}
          className="text-[13px] text-zinc-400"
        >
          Clear
        </button>
      </header>

      <main className="px-4 space-y-2">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const color = rarityColor(item.rarity);
            return (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="relative glass rounded-3xl2 p-3 flex items-center gap-3 overflow-hidden"
              >
                <div
                  className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                  style={{ background: color }}
                />
                <div
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="w-16 h-16 shrink-0 rounded-2xl bg-white/[0.03] grid place-items-center overflow-hidden"
                >
                  <CachedImage
                    src={item.image}
                    alt={item.name}
                    className="w-[88%] h-[88%] object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[10.5px] uppercase tracking-wider font-semibold truncate"
                    style={{ color }}
                  >
                    {item.rarity || 'Standard'}
                  </div>
                  <div className="text-[13px] font-semibold text-white truncate">{item.name}</div>
                  <div className="text-[12px] text-zinc-500 truncate">{item.condition}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[14px] font-display font-bold text-white">
                    {formatPrice(item.price)}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="mt-1 text-[11px] text-rose-400"
                  >
                    Remove
                  </button>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>

        <section className="glass rounded-3xl2 p-4 mt-4">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex items-center gap-2 h-11 px-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
              <Tag size={13} className="text-zinc-500" />
              <input
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="Promo code"
                className="flex-1 bg-transparent outline-none text-white placeholder-zinc-500 text-[13px] uppercase"
              />
            </div>
            <button
              onClick={applyPromo}
              className="h-11 px-3 rounded-2xl bg-white/[0.06] text-white text-[12.5px] font-medium"
            >
              Apply
            </button>
          </div>

          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span className="text-white">{formatPrice(subtotal)}</span>
            </div>
            {appliedPromo && (
              <div className="flex justify-between text-zinc-400">
                <span>Discount</span>
                <span className="text-emerald-400">-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-400">
              <span>Fee</span>
              <span className="text-emerald-400">0%</span>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed left-0 right-0 bottom-0 z-30 p-4 bg-gradient-to-t from-ink-950 via-ink-950/95 to-transparent">
        <div className="glass-strong rounded-3xl2 p-3">
          <div className="flex items-baseline justify-between mb-2 px-1">
            <span className="text-[12px] uppercase tracking-wide text-zinc-500 font-semibold">
              Total
            </span>
            <span className="text-[22px] font-display font-bold text-white">
              {formatPrice(total)}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={processing}
            className="w-full h-12 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-semibold shadow-accent-glow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock size={14} />
            Checkout
          </button>
          {!canAfford && user && (
            <button
              onClick={() => navigate('/profile?tab=balance')}
              className="w-full mt-2 text-[12.5px] text-accent-400 font-medium"
            >
              Refill balance
            </button>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmCheckoutOpen}
        onClose={() => setConfirmCheckoutOpen(false)}
        onConfirm={finalize}
        title="Confirm checkout"
        message={`Place an order for ${items.length} item${items.length === 1 ? '' : 's'} totalling ${formatPrice(total)}?`}
        confirmText="Place order"
        cancelText="Cancel"
        variant="info"
        isProcessing={processing}
      />
    </div>
  );
};

export default MobileCartPage;
