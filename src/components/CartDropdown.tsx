import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useT } from '../lib/useT';
import { spring, tap } from '../lib/motion';

/**
 * CartDropdown — hover / click-triggered mini-cart on the desktop
 * navbar. Amazon / Steam pattern: thumbnail list of the first few
 * items, subtotal line, and a big "Open cart" CTA.
 *
 * Trigger: pass any button/icon as `children`; the wrapper handles the
 * click-to-toggle + click-outside-to-close behaviour.
 *
 * Empty state is short and pushes the user to /marketplace.
 */

const MAX_PREVIEW_ITEMS = 4;

const CartDropdown: React.FC<{
  children: React.ReactNode;
  onNavigate?: () => void;
}> = ({ children, onNavigate }) => {
  const navigate = useNavigate();
  const t = useT();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const getTotalPrice = useCartStore((s) => s.getTotalPrice);
  const { formatPrice } = useCurrencyStore();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  /* Close on click outside + Escape. */
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const total = getTotalPrice();
  const previewItems = items.slice(0, MAX_PREVIEW_ITEMS);
  const hiddenCount = Math.max(0, items.length - MAX_PREVIEW_ITEMS);

  const goToCart = () => {
    setOpen(false);
    onNavigate?.();
    navigate('/cart');
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger — we clone the child so the parent doesn't have to
          spell out onClick. Any button / icon works. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('cart.title', 'Your cart')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center"
      >
        {children}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ ...spring, mass: 0.6 }}
            style={{ transformOrigin: 'top right' }}
            className="card-elevated absolute right-0 mt-2 w-[340px] sm:w-[380px] p-0 z-[70] overflow-hidden"
            role="menu"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <div className="inline-flex items-center gap-2">
                <ShoppingBag size={14} className="text-accent" strokeWidth={2.4} />
                <span className="text-[13px] font-bold text-ink tracking-tight">
                  {t('cart.title', 'Your cart')}
                </span>
                {items.length > 0 && (
                  <span className="text-[11px] font-semibold text-ink-muted tabular-nums">
                    · {items.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-ink-muted hover:text-ink transition-colors"
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>

            {items.length === 0 ? (
              /* ─── Empty state ─── */
              <div className="px-6 py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-subtle grid place-items-center text-ink-muted mb-3">
                  <ShoppingBag size={18} strokeWidth={2} />
                </div>
                <p className="text-[13px] font-bold text-ink tracking-tight">
                  {t('cart.empty.title', 'Your cart is empty')}
                </p>
                <p className="text-[12px] text-ink-muted font-medium mt-1 leading-relaxed">
                  {t('cart.empty.lead', 'Browse the marketplace and add items you want to buy.')}
                </p>
                <motion.button
                  whileTap={tap}
                  onClick={() => {
                    setOpen(false);
                    navigate('/marketplace');
                  }}
                  className="mt-4 h-9 px-4 rounded-full bg-accent text-on-accent text-[12.5px] font-bold inline-flex items-center gap-1.5"
                >
                  {t('cart.empty.cta', 'Browse marketplace')}
                  <ArrowRight size={12} strokeWidth={2.6} />
                </motion.button>
              </div>
            ) : (
              <>
                {/* ─── Item preview list ─── */}
                <ul className="max-h-[320px] overflow-y-auto scrollbar-thin py-1">
                  {previewItems.map((item) => (
                    <li
                      key={item.id}
                      className="group flex items-center gap-2.5 px-3 py-2 hover:bg-subtle/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-subtle grid place-items-center overflow-hidden shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-[88%] h-[88%] object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-bold text-ink tracking-tight truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-ink-muted font-medium tabular-nums mt-0.5">
                          {formatPrice(item.price)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        aria-label={t('cart.removeItem', 'Remove')}
                        className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-rose-500 transition-all shrink-0"
                      >
                        <Trash2 size={13} strokeWidth={2.2} />
                      </button>
                    </li>
                  ))}
                  {hiddenCount > 0 && (
                    <li className="px-3 py-1.5 text-[11px] font-semibold text-ink-dim text-center">
                      + {hiddenCount} {hiddenCount === 1 ? 'more item' : 'more items'}
                    </li>
                  )}
                </ul>

                {/* ─── Subtotal + CTA ─── */}
                <div className="px-3 py-3 border-t border-line bg-subtle/30">
                  <div className="flex items-baseline justify-between mb-2.5">
                    <span className="text-[11.5px] font-bold uppercase tracking-wider text-ink-muted">
                      {t('cart.summary.subtotal', 'Subtotal')}
                    </span>
                    <span className="text-[15px] font-bold text-ink tabular-nums tracking-tight">
                      {formatPrice(total)}
                    </span>
                  </div>
                  <motion.button
                    whileTap={tap}
                    whileHover={{ scale: 1.02 }}
                    onClick={goToCart}
                    className="w-full h-10 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center justify-center gap-1.5"
                    style={{ boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.55)' }}
                  >
                    {t('cart.openCart', 'Open cart')}
                    <ArrowRight size={13} strokeWidth={2.6} />
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CartDropdown;
