import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ShieldCheck, Wallet, Clock, ArrowRight } from 'lucide-react';
import { CachedImage } from '../ui/CachedImage';
import { rarityColor } from '../ui/SkinCard';
import { spring, tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   BuyConfirmModal — purchase confirmation styled to match the site
   (accent palette, rounded-3xl card, label-eyebrow, rarity glow on the
   item preview). Used by ItemDetailPage instead of the generic
   ConfirmationModal so the moment of commitment matches the rest of the
   marketplace surface.
   ───────────────────────────────────────────────────────────────────────── */

interface Item {
  id: string;
  name?: string;
  market_name?: string;
  image: string;
  price: number;
  rarity?: string;
  condition?: string;
  type?: string;
  float?: string | number;
  seller?: { name?: string; displayName?: string; steamId?: string; avatarUrl?: string };
}

interface BuyConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  item: Item | null;
  balance: number;
  formatPrice: (n: number) => string;
  isProcessing?: boolean;
}

const BuyConfirmModal: React.FC<BuyConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  item,
  balance,
  formatPrice,
  isProcessing = false,
}) => {
  if (!item) return null;

  const name = item.name || item.market_name || 'CS2 Item';
  const sellerName = item.seller?.displayName || item.seller?.name || 'Seller';
  const color = rarityColor(item.rarity || '');
  const newBalance = Math.max(0, Number(balance || 0) - item.price);
  const canAfford = Number(balance || 0) >= item.price;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-ink/55 backdrop-blur-md z-[9998]"
            onClick={isProcessing ? undefined : onClose}
            aria-hidden
          />

          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto card-elevated w-full sm:max-w-[460px] rounded-t-3xl sm:rounded-3xl overflow-hidden relative"
              style={{ boxShadow: '0 30px 70px -20px rgba(20,16,40,0.45)' }}
            >
              {/* Rarity halo behind the header */}
              <motion.div
                aria-hidden
                className="absolute -top-28 left-1/2 -translate-x-1/2 w-[420px] h-[260px] rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(closest-side, ${color}33, transparent 70%)`,
                }}
                animate={{ scale: [1, 1.06, 1], opacity: [0.6, 0.95, 0.6] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />

              <div className="relative p-5 sm:p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <span className="label-eyebrow">Confirm purchase</span>
                    <h2 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-ink leading-tight mt-1.5">
                      Buy this skin?
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    disabled={isProcessing}
                    aria-label="Close"
                    className="icon-chip-sm hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <X size={14} className="text-ink-muted" />
                  </button>
                </div>

                {/* Item preview card */}
                <div
                  className="card-flat p-3 flex items-center gap-3 relative overflow-hidden"
                  style={{ borderColor: `${color}33` }}
                >
                  <div
                    aria-hidden
                    className="absolute -left-10 -top-10 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(closest-side, ${color}26, transparent 70%)` }}
                  />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-subtle grid place-items-center overflow-hidden shrink-0">
                    <CachedImage
                      src={item.image}
                      alt={name}
                      className="w-full h-full object-contain p-1.5"
                    />
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: color }}
                      />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim truncate">
                        {item.rarity || 'Item'}
                        {item.condition ? ` · ${item.condition}` : ''}
                      </span>
                    </div>
                    <div className="text-[14px] sm:text-[15px] font-bold tracking-tight text-ink leading-snug line-clamp-2">
                      {name}
                    </div>
                    <div className="text-[11.5px] text-ink-muted font-medium mt-1 truncate">
                      Seller · <span className="text-ink">{sellerName}</span>
                    </div>
                  </div>
                </div>

                {/* Cost breakdown */}
                <div className="mt-4 card-flat p-3.5 space-y-2.5">
                  <Row label="Listed price" value={formatPrice(item.price)} />
                  <Row label="Buyer fee" value="0%" valueClass="text-emerald-600 dark:text-emerald-300" />
                  <div className="h-px bg-line my-1" />
                  <Row
                    label="Total today"
                    value={formatPrice(item.price)}
                    bold
                  />
                  <div className="flex items-center justify-between gap-3 pt-1.5">
                    <div className="flex items-center gap-1.5 text-[11.5px] text-ink-muted font-medium">
                      <Wallet size={12} strokeWidth={2.2} />
                      Your balance
                    </div>
                    <div className="text-[12px] font-bold tabular-nums flex items-center gap-1.5">
                      <span className={canAfford ? 'text-ink' : 'text-rose-500'}>
                        {formatPrice(Number(balance || 0))}
                      </span>
                      <ArrowRight size={11} className="text-ink-dim" />
                      <span className={canAfford ? 'text-ink' : 'text-rose-500'}>
                        {formatPrice(newBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trust strip */}
                <div className="mt-3.5 flex items-center gap-2 px-1">
                  <Trust Icon={ShieldCheck} label="Escrow protected" />
                  <Trust Icon={Clock} label="Refund in 60 min" />
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2.5">
                  <motion.button
                    whileTap={tap}
                    onClick={onClose}
                    disabled={isProcessing}
                    className="sm:flex-1 h-12 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[13.5px] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileTap={tap}
                    whileHover={!isProcessing && canAfford ? { scale: 1.01 } : undefined}
                    onClick={() => onConfirm()}
                    disabled={isProcessing || !canAfford}
                    className="sm:flex-[1.4] h-12 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                    style={{ boxShadow: '0 14px 30px -14px rgb(var(--accent) / 0.6)' }}
                  >
                    {isProcessing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-on-accent border-t-transparent rounded-full animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Zap size={14} strokeWidth={2.6} />
                        Buy for {formatPrice(item.price)}
                      </>
                    )}
                  </motion.button>
                </div>

                <p className="text-[10.5px] text-ink-dim font-medium text-center mt-3 leading-relaxed">
                  Funds are held in escrow until you confirm receipt of the
                  Steam trade. If the seller fails to deliver, you're
                  automatically refunded.
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

const Row: React.FC<{ label: string; value: string; bold?: boolean; valueClass?: string }> = ({
  label,
  value,
  bold,
  valueClass,
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className={`text-[12.5px] font-${bold ? 'bold text-ink' : 'medium text-ink-muted'}`}>
      {label}
    </span>
    <span
      className={`tabular-nums ${
        bold ? 'text-[15px] font-bold text-ink tracking-tight' : 'text-[12.5px] font-bold text-ink'
      } ${valueClass || ''}`}
    >
      {value}
    </span>
  </div>
);

const Trust: React.FC<{ Icon: React.ComponentType<any>; label: string }> = ({ Icon, label }) => (
  <div className="flex-1 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-muted">
    <Icon size={11} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-300" />
    {label}
  </div>
);

export default BuyConfirmModal;
