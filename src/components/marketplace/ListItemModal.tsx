import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Globe,
  Link as LinkIcon,
  Minus,
  Plus,
  Tag,
  Timer,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { fetchSteamMarketPrice } from '../../utils/steamMarketApi';
import { useCurrencyStore } from '../../store/currencyStore';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { initializeWebPush, checkPushSubscription } from '../../utils/webPushNotifications';
import { spring, tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   ListItemModal — clean rewrite

   Top-level layout:
     1. Sticky header (title + close)
     2. Item list (one tall card per stack of identical items)
        Per card:
          - Image · name · type/wear
          - PRICE row: custom-tag input + Steam market hint + ±20%/+50% slider
          - QUANTITY stepper (only when stack > 1)
          - OPTIONS (visibility · listing type/duration · short description)
          - Remove from listing
     3. Sticky footer with totals + Sell items CTA

   No nested sub-modals — every option lives inline so the user never
   loses context. Custom price tag is its own dedicated input that
   syncs both ways with the slider.
   ───────────────────────────────────────────────────────────────────────── */

interface InventoryItem {
  id: string;
  name: string;
  image: string;
  rarity?: string;
  type?: string;
  wear?: string;
  statTrak?: boolean;
}

interface ListItemModalProps {
  items: InventoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmListing: (listings: ListingData[]) => Promise<void>;
}

export interface ListingData {
  itemId: string;
  price: number;
  marketPrice: number;
  description?: string;
  listingType?: 'buy_now' | 'auction';
  visibility?: 'public' | 'private';
  auctionDuration?: 1 | 3 | 7 | 14;
  privateBuyerSteamId?: string;
}

interface GroupedItem {
  key: string;
  name: string;
  image: string;
  rarity?: string;
  type?: string;
  wear?: string;
  items: InventoryItem[];
  quantity: number;
  selectedQuantity: number;
  price: number;
  marketPrice: number;
  isLoadingPrice: boolean;
  description: string;
  visibility: 'public' | 'private';
  listingType: 'buy_now' | 'auction';
  auctionDuration?: 1 | 3 | 7 | 14;
}

const SALE_FEE_PERCENTAGE = 2;
const MIN_PERCENTAGE = -20;
const MAX_PERCENTAGE = 50;

const calcPriceFromPct = (market: number, pct: number) =>
  Math.max(0, market * (1 + pct / 100));

const calcPctFromPrice = (market: number, price: number) =>
  market > 0
    ? Math.min(MAX_PERCENTAGE, Math.max(MIN_PERCENTAGE, ((price - market) / market) * 100))
    : 0;

export const ListItemModal: React.FC<ListItemModalProps> = ({
  items,
  isOpen,
  onClose,
  onConfirmListing,
}) => {
  const { selectedCurrency, formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();
  const [groupedItems, setGroupedItems] = useState<GroupedItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  /* Lock body scroll while modal is open. */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  /* Group items by name+wear, fetch Steam median, seed price=market. */
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    const map = new Map<string, GroupedItem>();
    items.forEach((it) => {
      const key = `${it.name}-${it.wear || ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(it);
        existing.quantity += 1;
        existing.selectedQuantity += 1;
      } else {
        map.set(key, {
          key,
          name: it.name,
          image: it.image,
          rarity: it.rarity,
          type: it.type,
          wear: it.wear,
          items: [it],
          quantity: 1,
          selectedQuantity: 1,
          price: 0,
          marketPrice: 0,
          isLoadingPrice: true,
          description: '',
          visibility: 'public',
          listingType: 'buy_now',
        });
      }
    });
    const initial = Array.from(map.values());
    setGroupedItems(initial);

    initial.forEach(async (group, i) => {
      const data = await fetchSteamMarketPrice(group.name, 'USD');
      setGroupedItems((prev) => {
        const next = [...prev];
        if (!next[i]) return prev;
        const rec = data?.recommendedPrice
          ? data.recommendedPrice * 23.46 * selectedCurrency.rate
          : 10;
        next[i] = {
          ...next[i],
          marketPrice: rec,
          price: rec,
          isLoadingPrice: false,
        };
        return next;
      });
    });
  }, [isOpen, items, selectedCurrency.rate]);

  /* ─── Mutators ────────────────────────────────────────────────── */
  const patchGroup = (i: number, patch: Partial<GroupedItem>) =>
    setGroupedItems((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));

  const setPriceFromSlider = (i: number, pct: number) => {
    const g = groupedItems[i];
    patchGroup(i, { price: calcPriceFromPct(g.marketPrice, pct) });
  };
  const setPriceFromInput = (i: number, raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    patchGroup(i, { price: parsed });
  };
  const stepQuantity = (i: number, delta: number) => {
    const g = groupedItems[i];
    const next = Math.max(1, Math.min(g.quantity, g.selectedQuantity + delta));
    patchGroup(i, { selectedQuantity: next });
  };
  const removeGroup = (i: number) =>
    setGroupedItems((prev) => prev.filter((_, idx) => idx !== i));

  /* ─── Totals ──────────────────────────────────────────────────── */
  const totals = useMemo(() => {
    const subtotal = groupedItems.reduce((s, g) => s + g.price * g.selectedQuantity, 0);
    const fee = subtotal * (SALE_FEE_PERCENTAGE / 100);
    const earnings = subtotal - fee;
    const count = groupedItems.reduce((s, g) => s + g.selectedQuantity, 0);
    return { subtotal, fee, earnings, count };
  }, [groupedItems]);

  /* ─── Submit ──────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (groupedItems.length === 0) {
      addToast({ type: 'error', title: 'Nothing to list' });
      return;
    }
    const { user } = useAuthStore.getState();
    if (!user?.steamId) {
      addToast({ type: 'error', title: 'Sign in first' });
      return;
    }
    checkPushSubscription()
      .then((sub) => !sub && initializeWebPush(user.steamId))
      .catch(() => {});
    setIsSubmitting(true);
    try {
      const payload: ListingData[] = [];
      groupedItems.forEach((g) => {
        for (let i = 0; i < g.selectedQuantity; i++) {
          const item = g.items[i];
          if (!item) continue;
          payload.push({
            itemId: item.id,
            price: g.price,
            marketPrice: g.marketPrice,
            description: g.description,
            listingType: g.listingType,
            visibility: g.visibility,
            auctionDuration: g.auctionDuration,
          });
        }
      });
      await onConfirmListing(payload);
      addToast({
        type: 'success',
        title: `${payload.length} item${payload.length === 1 ? '' : 's'} listed`,
      });
      onClose();
    } catch (e: any) {
      addToast({ type: 'error', title: 'Listing failed', message: e?.message || 'Try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center bg-black/40 dark:bg-black/65 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
          onClick={(e) => e.stopPropagation()}
          className="card w-full flex flex-col overflow-hidden"
          style={{ maxWidth: 760, maxHeight: '90vh' }}
        >
          {/* ─── Header ─── */}
          <div className="shrink-0 px-5 sm:px-6 py-5 border-b border-line flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="icon-chip bg-accent-soft shrink-0">
                <Tag size={16} strokeWidth={2.4} className="text-accent" />
              </div>
              <div className="min-w-0">
                <span className="label-eyebrow">Sell on Skinify</span>
                <h2 className="text-[18px] sm:text-[20px] font-bold text-ink tracking-tight mt-1 leading-none truncate">
                  {totals.count} {totals.count === 1 ? 'item' : 'items'} ready to list
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-9 w-9 shrink-0 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
            >
              <X size={15} strokeWidth={2.4} />
            </button>
          </div>

          {/* ─── Item list ─── */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3">
            {groupedItems.length === 0 ? (
              <div className="py-16 text-center text-ink-muted text-[13.5px] font-medium">
                No items left to list. Add items to your cart from Inventory and try again.
              </div>
            ) : (
              groupedItems.map((g, i) => (
                <ItemCard
                  key={g.key}
                  group={g}
                  index={i}
                  expanded={expandedIdx === i}
                  onToggleExpand={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  patchGroup={(p) => patchGroup(i, p)}
                  setPriceFromSlider={(pct) => setPriceFromSlider(i, pct)}
                  setPriceFromInput={(raw) => setPriceFromInput(i, raw)}
                  stepQuantity={(d) => stepQuantity(i, d)}
                  remove={() => removeGroup(i)}
                  formatPrice={formatPrice}
                  currencySymbol={selectedCurrency.symbol}
                />
              ))
            )}
          </div>

          {/* ─── Footer ─── */}
          <div className="shrink-0 px-5 sm:px-6 py-5 border-t border-line bg-surface/40">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Stat label="Subtotal" value={formatPrice(totals.subtotal)} />
              <Stat
                label={`Fee · ${SALE_FEE_PERCENTAGE}%`}
                value={`− ${formatPrice(totals.fee)}`}
                tone="rose"
              />
              <Stat label="Earnings" value={formatPrice(totals.earnings)} tone="accent" />
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => setShowConfirmation(true)}
              disabled={isSubmitting || groupedItems.length === 0}
              className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
            >
              {isSubmitting
                ? 'Listing items…'
                : `List ${totals.count} ${totals.count === 1 ? 'item' : 'items'}`}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      <ConfirmListingDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleSubmit}
        isProcessing={isSubmitting}
        items={groupedItems}
        totals={totals}
        feePct={SALE_FEE_PERCENTAGE}
        formatPrice={formatPrice}
      />
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   ConfirmListingDialog — preview of what's about to publish.

   Replaces the generic ConfirmationModal. Shows:
     - The first few item thumbnails with a "+N more" chip
     - Subtotal · fee · earnings breakdown
     - A short reassurance line (escrow-protected, instant Steam delivery)
     - A small "anything wrong? go back" hint linking to Cancel
   ───────────────────────────────────────────────────────────────────────── */
const ConfirmListingDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  items: GroupedItem[];
  totals: { subtotal: number; fee: number; earnings: number; count: number };
  feePct: number;
  formatPrice: (n: number) => string;
}> = ({ isOpen, onClose, onConfirm, isProcessing, items, totals, feePct, formatPrice }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const preview = items.slice(0, 4);
  const remaining = Math.max(0, items.length - preview.length);

  return (
    <motion.div
      key="confirm-listing-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-md flex items-end sm:items-center justify-center p-3"
      onClick={() => !isProcessing && onClose()}
    >
      <motion.div
        key="confirm-listing-card"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md relative overflow-hidden"
      >
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{
            background:
              'linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent) / 0.55) 60%, transparent)',
          }}
          aria-hidden
        />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <span className="label-eyebrow">Confirm listing</span>
              <h2 className="text-[20px] font-bold text-ink tracking-tight leading-tight mt-1">
                Publish {totals.count} {totals.count === 1 ? 'item' : 'items'} to the marketplace?
              </h2>
            </div>
            <button
              onClick={() => !isProcessing && onClose()}
              aria-label="Close"
              className="h-9 w-9 shrink-0 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
            >
              <X size={15} strokeWidth={2.4} />
            </button>
          </div>

          {/* Item preview row */}
          <div className="flex items-center gap-2 mb-5">
            {preview.map((g) => (
              <div
                key={g.key}
                className="relative w-14 h-14 rounded-2xl bg-subtle grid place-items-center overflow-hidden shrink-0"
                title={g.name}
              >
                <img
                  src={g.image}
                  alt={g.name}
                  className="w-[88%] h-[88%] object-contain"
                />
                {g.selectedQuantity > 1 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-on-accent text-[10px] font-bold rounded-full px-1.5 py-0.5 tabular-nums">
                    ×{g.selectedQuantity}
                  </span>
                )}
              </div>
            ))}
            {remaining > 0 && (
              <div className="w-14 h-14 rounded-2xl bg-subtle grid place-items-center text-[12px] font-bold text-ink-muted tabular-nums shrink-0">
                +{remaining}
              </div>
            )}
          </div>

          {/* Money breakdown */}
          <div className="rounded-3xl bg-subtle p-4 space-y-2">
            <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
            <Row
              label={`Skinify fee · ${feePct}%`}
              value={`− ${formatPrice(totals.fee)}`}
              tone="muted"
            />
            <div className="h-px bg-line my-1" />
            <Row label="You receive" value={formatPrice(totals.earnings)} tone="accent" bold />
          </div>

          {/* Reassurance bullets */}
          <ul className="mt-5 space-y-2">
            {[
              'Items stay in your Steam inventory until they sell',
              'Escrow-protected — funds release 8 days after delivery',
              'Cancel any listing anytime from the Listings tab',
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-[12.5px] text-ink-muted font-medium"
              >
                <Check
                  size={12}
                  strokeWidth={2.6}
                  className="text-accent shrink-0 mt-0.5"
                />
                {line}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
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
              whileHover={!isProcessing ? { scale: 1.01 } : undefined}
              onClick={onConfirm}
              disabled={isProcessing}
              className="sm:flex-[1.4] h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
              style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.55)' }}
            >
              {isProcessing
                ? 'Listing…'
                : `Publish ${totals.count} ${totals.count === 1 ? 'item' : 'items'}`}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Row: React.FC<{
  label: string;
  value: string;
  tone?: 'muted' | 'accent';
  bold?: boolean;
}> = ({ label, value, tone, bold }) => (
  <div className="flex items-center justify-between gap-3">
    <span
      className={`text-[12.5px] ${
        bold ? 'text-ink font-bold' : 'text-ink-muted font-medium'
      }`}
    >
      {label}
    </span>
    <span
      className={`text-[13px] tabular-nums ${
        tone === 'accent'
          ? 'text-accent font-bold'
          : bold
          ? 'text-ink font-bold tracking-tight'
          : 'text-ink font-semibold'
      }`}
    >
      {value}
    </span>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   ItemCard — one card per stack of identical items.
   ───────────────────────────────────────────────────────────────────────── */

const ItemCard: React.FC<{
  group: GroupedItem;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
  patchGroup: (p: Partial<GroupedItem>) => void;
  setPriceFromSlider: (pct: number) => void;
  setPriceFromInput: (raw: string) => void;
  stepQuantity: (delta: number) => void;
  remove: () => void;
  formatPrice: (n: number) => string;
  currencySymbol: string;
}> = ({
  group,
  expanded,
  onToggleExpand,
  patchGroup,
  setPriceFromSlider,
  setPriceFromInput,
  stepQuantity,
  remove,
  formatPrice,
  currencySymbol,
}) => {
  const pct = calcPctFromPrice(group.marketPrice, group.price);
  const tone =
    pct < -5
      ? { label: 'Below market', class: 'text-emerald-700 dark:text-emerald-400' }
      : pct > 5
      ? { label: 'Above market', class: 'text-rose-700 dark:text-rose-400' }
      : { label: 'Recommended', class: 'text-accent' };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="card-flat p-4"
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-subtle/60 shrink-0 grid place-items-center overflow-hidden">
          <img src={group.image} alt={group.name} className="w-[85%] h-[85%] object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-ink-dim font-semibold uppercase tracking-wider">
            {group.type || 'Item'}
          </div>
          <div className="text-[15px] font-bold text-ink tracking-tight leading-tight truncate mt-0.5">
            {group.name}
          </div>
          {group.wear && (
            <div className="text-[12px] text-ink-muted font-medium mt-0.5">{group.wear}</div>
          )}
        </div>
        <button
          onClick={remove}
          aria-label="Remove"
          className="h-9 w-9 shrink-0 rounded-full bg-subtle hover:bg-rose-500/15 text-ink-muted hover:text-rose-500 grid place-items-center transition-colors"
        >
          <Trash2 size={14} strokeWidth={2.2} />
        </button>
      </div>

      {/* PRICE — the centrepiece */}
      <div className="mt-4 card-flat p-3.5 rounded-2xl bg-subtle/40">
        <div className="flex items-baseline justify-between gap-3 mb-2.5">
          <div className="label-meta">Your price tag</div>
          {!group.isLoadingPrice && (
            <div className="text-[11.5px] text-ink-muted font-medium">
              Steam median ·{' '}
              <span className="text-ink font-bold tabular-nums">
                {formatPrice(group.marketPrice)}
              </span>
            </div>
          )}
        </div>

        {/* Custom price input — big, dedicated */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 h-12 px-4 rounded-2xl bg-surface focus-within:ring-2 focus-within:ring-accent transition-all">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={Number(group.price.toFixed(2))}
              onChange={(e) => setPriceFromInput(e.target.value)}
              disabled={group.isLoadingPrice}
              className="flex-1 min-w-0 bg-transparent outline-none text-ink text-[18px] font-bold tabular-nums disabled:opacity-40"
              aria-label="Custom price"
            />
            <span className="text-[13px] font-bold text-ink-dim uppercase tracking-wider">
              {currencySymbol}
            </span>
          </div>
          <div className={`text-[11.5px] font-bold tabular-nums whitespace-nowrap shrink-0 px-2 ${tone.class}`}>
            {pct > 0 ? '+' : ''}
            {pct.toFixed(0)}%
            <div className="text-[10px] uppercase tracking-wider text-ink-dim font-bold mt-0.5">
              {tone.label}
            </div>
          </div>
        </div>

        {/* Slider for ±20% / +50% */}
        {!group.isLoadingPrice && (
          <div className="mt-3">
            <input
              type="range"
              min={MIN_PERCENTAGE}
              max={MAX_PERCENTAGE}
              step={1}
              value={pct}
              onChange={(e) => setPriceFromSlider(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer slider-thumb-purple"
              style={{
                background: `linear-gradient(to right, rgb(var(--accent)) 0%, rgb(var(--accent)) ${
                  ((pct - MIN_PERCENTAGE) / (MAX_PERCENTAGE - MIN_PERCENTAGE)) * 100
                }%, rgb(var(--subtle)) ${
                  ((pct - MIN_PERCENTAGE) / (MAX_PERCENTAGE - MIN_PERCENTAGE)) * 100
                }%, rgb(var(--subtle)) 100%)`,
              }}
            />
            <div className="flex items-center justify-between mt-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-dim tabular-nums">
              <span>−20%</span>
              <span>Market</span>
              <span>+50%</span>
            </div>
          </div>
        )}
      </div>

      {/* Quantity — only when there's more than one to choose from */}
      {group.quantity > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
              Quantity
            </div>
            <div className="text-[12px] text-ink-muted font-medium mt-0.5">
              You own {group.quantity}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => stepQuantity(-1)}
              disabled={group.selectedQuantity <= 1}
              className="h-9 w-9 rounded-full bg-subtle hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed grid place-items-center transition-colors"
            >
              <Minus size={13} strokeWidth={2.4} className="text-ink" />
            </button>
            <div className="min-w-[60px] text-center text-[14px] font-bold text-ink tabular-nums">
              {group.selectedQuantity}
            </div>
            <button
              onClick={() => stepQuantity(1)}
              disabled={group.selectedQuantity >= group.quantity}
              className="h-9 w-9 rounded-full bg-subtle hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed grid place-items-center transition-colors"
            >
              <Plus size={13} strokeWidth={2.4} className="text-ink" />
            </button>
          </div>
        </div>
      )}

      {/* OPTIONS — collapsible footer with descriptors instead of icons */}
      <button
        onClick={onToggleExpand}
        className="w-full mt-3 h-10 px-3 rounded-2xl bg-subtle hover:bg-bg text-[12px] font-bold text-ink-muted hover:text-ink inline-flex items-center justify-between transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          {expanded ? 'Hide options' : 'More options'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-dim font-semibold">
          {group.visibility === 'private' ? 'Private' : 'Public'} ·{' '}
          {group.listingType === 'auction'
            ? `Auction ${group.auctionDuration ?? 3}d`
            : 'Buy now'}
          <ChevronDown
            size={12}
            strokeWidth={2.4}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {/* Visibility */}
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim mb-1.5">
                  Who can buy this
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Pill
                    Icon={Globe}
                    label="Public"
                    sub="Show on marketplace"
                    active={group.visibility === 'public'}
                    onClick={() => patchGroup({ visibility: 'public' })}
                  />
                  <Pill
                    Icon={LinkIcon}
                    label="Private link"
                    sub="Share via URL"
                    active={group.visibility === 'private'}
                    onClick={() => patchGroup({ visibility: 'private' })}
                  />
                </div>
              </div>

              {/* Listing type */}
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim mb-1.5">
                  How it sells
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Pill
                    Icon={Zap}
                    label="Buy now"
                    sub="Fixed price"
                    active={group.listingType === 'buy_now'}
                    onClick={() => patchGroup({ listingType: 'buy_now', auctionDuration: undefined })}
                  />
                  <Pill
                    Icon={Timer}
                    label="Auction"
                    sub="Highest bid wins"
                    active={group.listingType === 'auction'}
                    onClick={() => patchGroup({ listingType: 'auction', auctionDuration: 3 })}
                  />
                </div>
                {group.listingType === 'auction' && (
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {([1, 3, 7, 14] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => patchGroup({ auctionDuration: d })}
                        className={`h-10 rounded-2xl text-[12px] font-bold transition-colors ${
                          group.auctionDuration === d
                            ? 'bg-accent text-on-accent'
                            : 'bg-subtle text-ink hover:bg-bg'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                    Note for buyers
                  </div>
                  <span className="text-[10.5px] font-bold text-ink-dim tabular-nums">
                    {(group.description || '').length} / 32
                  </span>
                </div>
                <input
                  value={group.description}
                  onChange={(e) =>
                    patchGroup({ description: e.target.value.slice(0, 32) })
                  }
                  placeholder="e.g. low float, rare pattern…"
                  className="w-full h-10 px-3.5 rounded-full bg-subtle outline-none text-ink placeholder:text-ink-dim text-[12.5px] font-medium focus:ring-2 focus:ring-accent transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Pill: React.FC<{
  Icon: React.ComponentType<any>;
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}> = ({ Icon, label, sub, active, onClick }) => (
  <button
    onClick={onClick}
    className={`h-14 px-3 rounded-2xl text-left transition-colors flex items-center gap-2.5 ${
      active ? 'bg-accent-soft ring-1 ring-accent' : 'bg-subtle hover:bg-bg'
    }`}
  >
    <Icon
      size={14}
      strokeWidth={2.4}
      className={active ? 'text-accent shrink-0' : 'text-ink-muted shrink-0'}
    />
    <div className="min-w-0">
      <div className={`text-[12px] font-bold leading-none ${active ? 'text-ink' : 'text-ink'}`}>
        {label}
      </div>
      <div className="text-[10.5px] text-ink-muted font-medium mt-1 truncate">{sub}</div>
    </div>
  </button>
);

const Stat: React.FC<{
  label: string;
  value: string;
  tone?: 'rose' | 'accent';
}> = ({ label, value, tone }) => (
  <div>
    <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">{label}</div>
    <div
      className={`text-[15px] font-bold tracking-tight tabular-nums mt-1 ${
        tone === 'rose'
          ? 'text-rose-700 dark:text-rose-400'
          : tone === 'accent'
          ? 'text-accent'
          : 'text-ink'
      }`}
    >
      {value}
    </div>
  </div>
);

export default ListItemModal;
