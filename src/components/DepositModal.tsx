import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useCurrencyStore } from '../store/currencyStore';
import { useToastStore } from '../store/toastStore';
import { spring, tap } from '../lib/motion';

/**
 * DepositModal — full-screen, two-pane "add funds" dialog.
 *
 * Layout rules:
 *   - Outer is fixed-height (100vh / 100dvh).
 *   - Right pane (amount + summary + CTA) NEVER scrolls — it's the action
 *     surface; the user must always see the total and the Continue button.
 *   - Left pane (method list) is the only scrollable region. We keep the
 *     viewport in one screen by capping its height and letting the long
 *     method list scroll internally.
 *   - On <lg the panes stack; the page itself takes over scrolling.
 *
 * Visual rules:
 *   - No method-specific logos or rainbow icon chips. Methods are typed
 *     rows with a small fee tag — typography does the work.
 */

let _openSetter: ((open: boolean) => void) | null = null;
export const openDepositModal = () => _openSetter?.(true);
export const closeDepositModal = () => _openSetter?.(false);

type MethodId =
  | 'cards-eu'
  | 'crypto'
  | 'cards-us'
  | 'skins'
  | 'kinguin'
  | 'eneba'
  | 'vouchers'
  | 'giftcards'
  | 'premium';

interface MethodTile {
  id: MethodId;
  label: string;
  /** Single-line caption rendered under the label. */
  caption: string;
  /** Corner badge — TOP, +16%, NEW, etc. */
  badge?: { text: string; tone: 'top' | 'bonus' | 'neutral' };
  /** Stack of brand chips rendered inside the tile body. */
  chips: { kind: 'text' | 'mono'; label: string }[];
  /** Optional fee tag shown in the footer (free if omitted). */
  fee?: string;
}

/* 3x3 grid — order matches the reference layout: VISA · CRYPTO · VISA / SKINS
   · KINGUIN · ENEBA / VOUCHERS · GIFTCARDS · PREMIUM. Single neutral
   surface for every tile; selection state is the only color. */
const METHOD_TILES: MethodTile[] = [
  {
    id: 'cards-eu',
    label: 'Cards · V1',
    caption: '100+ more',
    badge: { text: 'TOP', tone: 'top' },
    chips: [
      { kind: 'text', label: 'VISA' },
      { kind: 'text', label: 'Mastercard' },
      { kind: 'text', label: 'AMEX' },
    ],
  },
  {
    id: 'crypto',
    label: 'Crypto',
    caption: 'BTC · ETH · USDT · LTC',
    badge: { text: '+16%', tone: 'bonus' },
    chips: [
      { kind: 'mono', label: '₿' },
      { kind: 'mono', label: 'Ξ' },
      { kind: 'mono', label: '◎' },
      { kind: 'mono', label: '₮' },
    ],
    fee: '1%',
  },
  {
    id: 'cards-us',
    label: 'Cards · V2',
    caption: 'US issuers',
    chips: [
      { kind: 'text', label: 'VISA' },
      { kind: 'text', label: 'Discover' },
      { kind: 'text', label: 'JCB' },
    ],
  },
  {
    id: 'skins',
    label: 'Pay by skins',
    caption: 'From your Steam inventory',
    chips: [
      { kind: 'text', label: 'CS2 inventory' },
      { kind: 'text', label: 'Instant quote' },
    ],
  },
  {
    id: 'kinguin',
    label: 'Kinguin',
    caption: 'Wallet card',
    chips: [
      { kind: 'text', label: 'KINGUIN' },
      { kind: 'text', label: 'Prepaid' },
    ],
    fee: '3%',
  },
  {
    id: 'eneba',
    label: 'eneba',
    caption: 'Wallet card',
    chips: [
      { kind: 'text', label: 'eneba' },
      { kind: 'text', label: 'Prepaid' },
    ],
    fee: '3%',
  },
  {
    id: 'vouchers',
    label: 'Vouchers',
    caption: '30+ more',
    chips: [
      { kind: 'text', label: 'paysafecard' },
      { kind: 'text', label: 'Revolut' },
      { kind: 'text', label: 'Papara' },
      { kind: 'text', label: 'Havale' },
    ],
    fee: '4%',
  },
  {
    id: 'giftcards',
    label: 'Gift cards',
    caption: 'Digital codes',
    chips: [
      { kind: 'text', label: 'PayPal' },
      { kind: 'text', label: 'Apple' },
      { kind: 'text', label: 'Google' },
    ],
    fee: '2%',
  },
  {
    id: 'premium',
    label: 'Premium',
    caption: 'Priority support',
    badge: { text: 'VIP', tone: 'neutral' },
    chips: [
      { kind: 'mono', label: '◆' },
      { kind: 'text', label: 'White-glove' },
    ],
  },
];

const QUICK_AMOUNTS = [200, 500, 1000, 2500, 5000, 10000];
const MIN_AMOUNT = 100;

const PROMO = {
  enabled: true,
  code: 'WELCOME10',
  copy: '+10% bonus on your first deposit · auto-applied',
};

const calcFeeRate = (id: MethodId): number => {
  if (id === 'crypto') return 0.01;
  if (id === 'vouchers') return 0.04;
  if (id === 'giftcards') return 0.02;
  if (id === 'kinguin' || id === 'eneba') return 0.03;
  return 0;
};

export const DepositModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [method, setMethod] = useState<MethodId>('cards-eu');
  const [submitting, setSubmitting] = useState(false);
  const [promoActive, setPromoActive] = useState(PROMO.enabled);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    _openSetter = setOpen;
    return () => {
      if (_openSetter === setOpen) _openSetter = null;
    };
  }, []);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitting]);

  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const feeRate = calcFeeRate(method);
  const fee = safeAmount * feeRate;
  const bonus = promoActive ? safeAmount * 0.1 : 0;
  const credited = Math.max(0, safeAmount - fee + bonus);

  const belowMin = safeAmount > 0 && safeAmount < MIN_AMOUNT;
  const canSubmit = safeAmount >= MIN_AMOUNT && !submitting;

  const selectedMethod = useMemo(
    () => METHOD_TILES.find((x) => x.id === method),
    [method],
  );

  /* Track whether the last change came from a preset click vs raw typing,
     so we only run the rolling-digit animation on the big jumps (preset
     swap) and let typed input update instantly. */
  const [animatedAmount, setAnimatedAmount] = useState<number>(amount);
  const lastSourceRef = useRef<'preset' | 'input'>('input');
  useEffect(() => {
    if (lastSourceRef.current === 'preset') {
      setAnimatedAmount(amount);
    } else {
      setAnimatedAmount(amount);
    }
  }, [amount]);

  const pickPreset = (v: number) => {
    lastSourceRef.current = 'preset';
    setAmount(v);
  };
  const typeAmount = (raw: string) => {
    lastSourceRef.current = 'input';
    const v = raw === '' ? NaN : Number(raw);
    setAmount(v);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      addToast({
        type: 'info',
        title: 'Payments not configured',
        message:
          'Set REVOLUT_API_KEY or PAYU_MERCHANT_KEY in your Supabase secrets to enable deposits.',
        duration: 6000,
      });
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="deposit-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Add funds"
          /* Use dvh on supporting browsers so iOS Safari's URL bar doesn't
             push the bottom CTA off-screen. */
          className="fixed inset-0 z-[90] bg-bg text-ink flex flex-col overflow-hidden"
          style={{ height: '100dvh' }}
        >
          {/* Top bar */}
          <header
            className="shrink-0 flex items-center justify-between px-5 sm:px-8 h-14 sm:h-16 border-b"
            style={{ borderColor: 'rgb(var(--accent) / 0.35)' }}
          >
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                Wallet
              </div>
              <div className="text-[14px] sm:text-[16px] font-bold tracking-tight text-ink leading-none mt-0.5">
                Add funds to your Skinify balance
              </div>
            </div>
            <button
              onClick={() => !submitting && setOpen(false)}
              aria-label="Close"
              className="h-10 w-10 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </header>

          {/* Split pane — fills remaining height; only the left pane scrolls. */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
            {/* LEFT — method list (the only scroll surface) */}
            <section
              className="min-h-0 overflow-y-auto px-5 sm:px-8 py-5 lg:border-r"
              style={{ borderColor: 'rgb(var(--accent) / 0.35)' }}
            >
              <div className="max-w-[640px] mx-auto lg:mx-0">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                  Payment method
                </div>
                <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-ink leading-tight mt-1">
                  Pick how you want to pay
                </h2>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {METHOD_TILES.map((tile) => (
                    <MethodCard
                      key={tile.id}
                      tile={tile}
                      active={method === tile.id}
                      onSelect={() => setMethod(tile.id)}
                    />
                  ))}
                </div>

                <p className="text-[11px] text-ink-dim font-medium mt-4 leading-relaxed">
                  Cards flow through our acquirer; crypto deposits confirm
                  on-chain; vouchers and gift cards settle instantly.
                </p>
              </div>
            </section>

            {/* RIGHT — rigid action surface, never scrolls. */}
            <aside className="hidden lg:flex flex-col bg-surface/30 px-8 py-5 overflow-hidden">
              <div className="max-w-[480px] mx-auto w-full flex-1 flex flex-col gap-4">
                {/* Promo banner */}
                {promoActive && (
                  <PromoBanner onDismiss={() => setPromoActive(false)} />
                )}

                {/* Amount */}
                <AmountField
                  amount={amount}
                  animatedAmount={animatedAmount}
                  belowMin={belowMin}
                  inputRef={inputRef}
                  onChange={typeAmount}
                  source={lastSourceRef.current}
                />

                {/* Quick amounts */}
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((v) => {
                    const active = amount === v;
                    return (
                      <motion.button
                        whileTap={tap}
                        key={v}
                        onClick={() => pickPreset(v)}
                        className={`h-10 rounded-2xl text-[13px] font-bold tabular-nums transition-colors ${
                          active
                            ? 'bg-accent text-on-accent'
                            : 'bg-subtle text-ink-muted hover:bg-bg hover:text-ink'
                        }`}
                      >
                        {formatPrice(v)}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="rounded-3xl bg-subtle p-4 space-y-2">
                  <Row label="You pay" value={formatPrice(safeAmount)} />
                  <Row
                    label={`${selectedMethod?.label || 'Method'} fee`}
                    value={fee > 0 ? `− ${formatPrice(fee)}` : 'No fee'}
                    tone={fee > 0 ? 'muted' : 'positive'}
                  />
                  {promoActive && (
                    <Row
                      label={`Bonus · ${PROMO.code}`}
                      value={`+ ${formatPrice(bonus)}`}
                      tone="accent"
                    />
                  )}
                  <div
                    className="h-px my-1"
                    style={{ background: 'rgb(var(--accent) / 0.30)' }}
                  />
                  <Row label="Credited" value={formatPrice(credited)} bold />
                </div>

                {/* CTA */}
                <motion.button
                  whileTap={tap}
                  whileHover={canSubmit ? { scale: 1.005 } : undefined}
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
                >
                  {submitting
                    ? 'Processing…'
                    : safeAmount > 0
                    ? `Continue · ${formatPrice(safeAmount)}`
                    : 'Enter an amount'}
                </motion.button>

                <p className="text-[10.5px] text-ink-dim font-medium leading-relaxed text-center mt-auto">
                  Skinify never sees your card details. Payments are encrypted
                  and processed by your provider.
                </p>
              </div>
            </aside>

            {/* MOBILE right pane — stacks below methods in the natural
                scroll flow. We render this in addition to the desktop one
                because the desktop version uses flex/overflow rules that
                only make sense on large screens. */}
            <aside className="lg:hidden bg-surface/30 px-5 py-5">
              <div className="space-y-4">
                {promoActive && (
                  <PromoBanner onDismiss={() => setPromoActive(false)} />
                )}
                <AmountField
                  amount={amount}
                  animatedAmount={animatedAmount}
                  belowMin={belowMin}
                  inputRef={inputRef}
                  onChange={typeAmount}
                  source={lastSourceRef.current}
                />
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((v) => {
                    const active = amount === v;
                    return (
                      <motion.button
                        whileTap={tap}
                        key={v}
                        onClick={() => pickPreset(v)}
                        className={`h-11 rounded-2xl text-[13px] font-bold tabular-nums transition-colors ${
                          active
                            ? 'bg-accent text-on-accent'
                            : 'bg-subtle text-ink-muted hover:bg-bg hover:text-ink'
                        }`}
                      >
                        {formatPrice(v)}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="rounded-3xl bg-subtle p-4 space-y-2">
                  <Row label="You pay" value={formatPrice(safeAmount)} />
                  <Row
                    label={`${selectedMethod?.label || 'Method'} fee`}
                    value={fee > 0 ? `− ${formatPrice(fee)}` : 'No fee'}
                    tone={fee > 0 ? 'muted' : 'positive'}
                  />
                  {promoActive && (
                    <Row
                      label={`Bonus · ${PROMO.code}`}
                      value={`+ ${formatPrice(bonus)}`}
                      tone="accent"
                    />
                  )}
                  <div
                    className="h-px my-1"
                    style={{ background: 'rgb(var(--accent) / 0.30)' }}
                  />
                  <Row label="Credited" value={formatPrice(credited)} bold />
                </div>
                <motion.button
                  whileTap={tap}
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
                >
                  {submitting
                    ? 'Processing…'
                    : safeAmount > 0
                    ? `Continue · ${formatPrice(safeAmount)}`
                    : 'Enter an amount'}
                </motion.button>
              </div>
            </aside>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   MethodCard — one of nine large tiles in the payment-method grid.

   Visually a solid brand-colored card (no flashy gradients or emoji-style
   icons). Brand chips inside the body do the work — three or four wordmark-
   style pills + a small corner badge for promotions. The footer carries
   the wallet name and fee tag. Selecting a card swaps the outer ring to
   the accent color and lifts it slightly.
   ───────────────────────────────────────────────────────────────────────── */
const MethodCard: React.FC<{
  tile: MethodTile;
  active: boolean;
  onSelect: () => void;
}> = ({ tile, active, onSelect }) => {
  /* Badge tone — accent-tinted by default, kept restrained so the
     selection state is the strongest signal on the card. */
  const badgeTone =
    tile.badge?.tone === 'top'
      ? 'bg-accent text-on-accent'
      : tile.badge?.tone === 'bonus'
      ? 'bg-accent-soft text-accent'
      : 'bg-subtle text-ink-muted';

  return (
    <motion.button
      whileTap={tap}
      whileHover={{ y: -2 }}
      onClick={onSelect}
      aria-pressed={active}
      className="group relative text-left rounded-2xl overflow-hidden bg-surface focus:outline-none transition-shadow"
      style={
        !active
          ? {
              boxShadow:
                'inset 0 0 0 1px rgb(var(--accent) / 0.35)',
            }
          : undefined
      }
    >
      {/* Accent overlay — slides up from the bottom when this tile becomes
          the selected one. Animated via layoutId so the highlight
          smoothly transitions between cards instead of flashing. */}
      <AnimatePresence>
        {active && (
          <motion.span
            layoutId="method-card-active"
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgb(var(--accent) / 0.10) 0%, rgb(var(--accent) / 0.18) 100%)',
              boxShadow:
                '0 0 0 2px rgb(var(--accent)), 0 16px 32px -16px rgb(var(--accent) / 0.55)',
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
          />
        )}
      </AnimatePresence>

      {/* Body — chips area */}
      <div className="relative px-3 pt-3 pb-2 min-h-[112px] flex flex-col justify-between">
        {tile.badge && (
          <span
            className={`absolute top-2 right-2 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${badgeTone}`}
          >
            {tile.badge.text}
          </span>
        )}

        {/* Check chip — scales/fades in. Absolutely positioned so its
            entry doesn't push the chip row. */}
        <AnimatePresence>
          {active && (
            <motion.span
              key="check"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 28 }}
              className="absolute top-2 left-2 w-5 h-5 rounded-full bg-accent text-on-accent grid place-items-center shadow-[0_4px_10px_-2px_rgb(var(--accent)/0.6)] z-10"
            >
              <Check size={11} strokeWidth={3.2} />
            </motion.span>
          )}
        </AnimatePresence>

        <div className="relative flex flex-wrap items-start gap-1.5 mt-5">
          {tile.chips.map((chip, i) => (
            <span
              key={`${chip.label}-${i}`}
              className={`inline-flex items-center justify-center text-[10.5px] font-bold tracking-tight px-1.5 py-0.5 rounded-[6px] bg-subtle text-ink ${
                chip.kind === 'mono'
                  ? 'font-mono text-[14px] leading-none w-7 h-7'
                  : ''
              }`}
              style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--accent) / 0.25)' }}
            >
              {chip.label}
            </span>
          ))}
        </div>

        <div className="relative">
          <div className="text-[13px] font-bold tracking-tight leading-tight mt-3 text-ink">
            {tile.label}
          </div>
          <div className="text-[10.5px] font-semibold mt-0.5 leading-tight truncate text-ink-muted">
            {tile.caption}
          </div>
        </div>
      </div>

      {/* Footer — fee + state label */}
      <div
        className="relative px-3 py-1.5 border-t text-[10px] font-bold uppercase tracking-wider flex items-center justify-between text-ink-dim bg-subtle/40"
        style={{ borderColor: 'rgb(var(--accent) / 0.30)' }}
      >
        <span>{tile.fee ? `${tile.fee} fee` : 'No fee'}</span>
        <motion.span
          key={active ? 'selected' : 'select'}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className={active ? 'text-accent' : 'text-ink-muted'}
        >
          {active ? 'Selected' : 'Select'}
        </motion.span>
      </div>
    </motion.button>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   PromoBanner — sits above the amount field on the right pane.
   ───────────────────────────────────────────────────────────────────────── */
const PromoBanner: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <div className="rounded-2xl bg-accent-soft p-3 sm:p-3.5 flex items-start gap-3">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
          Active
        </span>
        <span className="text-[10.5px] font-mono font-bold text-accent">
          {PROMO.code}
        </span>
      </div>
      <p className="text-[12.5px] font-semibold text-ink leading-snug">
        {PROMO.copy}
      </p>
    </div>
    <button
      onClick={onDismiss}
      aria-label="Remove promo"
      className="shrink-0 h-6 w-6 rounded-full bg-bg/60 hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
    >
      <X size={11} strokeWidth={2.4} />
    </button>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   AmountField — input + rolling-digits overlay.

   We render a transparent <input> that drives the actual numeric state,
   and overlay it with an animated digit reel that shows the *displayed*
   value. While the user types, the overlay is hidden so caret + native
   keyboard behaviour is preserved. While the value is set from a preset
   click, the overlay shows and animates each digit independently — digits
   that go UP roll upward, digits that go DOWN roll downward, frozen
   digits don't move.
   ───────────────────────────────────────────────────────────────────────── */

const AmountField: React.FC<{
  amount: number;
  animatedAmount: number;
  belowMin: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (raw: string) => void;
  source: 'preset' | 'input';
}> = ({ amount, belowMin, inputRef, onChange, source }) => {
  const [focused, setFocused] = useState(false);
  /* Show the reel when the user isn't typing AND the value isn't NaN.
     Hiding it on focus keeps the input usable for raw typing. */
  const showReel = !focused && Number.isFinite(amount) && amount > 0 && source === 'preset';

  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim mb-1.5">
        Amount
      </div>
      <div
        className={`relative rounded-3xl bg-subtle px-5 py-3.5 transition-shadow ${
          belowMin ? 'ring-2 ring-rose-500/60' : ''
        }`}
      >
        <div className="flex items-baseline gap-3">
          {/* The input is always present and owns state. When the reel is
              showing it's visually masked (text-transparent caret-color
              still works) so the user can refocus and type seamlessly. */}
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min={MIN_AMOUNT}
            value={Number.isFinite(amount) ? amount : ''}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => onChange(e.target.value)}
            className={`flex-1 bg-transparent outline-none text-[34px] sm:text-[38px] font-bold tracking-tight tabular-nums w-full min-w-0 caret-accent ${
              showReel ? 'text-transparent' : 'text-ink'
            }`}
            placeholder="0"
            aria-label="Deposit amount"
          />
          <span className="text-[14px] font-bold text-ink-muted shrink-0">CZK</span>
        </div>

        {/* Reel overlay — sits over the input. pointer-events-none so the
            user can click to focus the input underneath. */}
        {showReel && (
          <div
            className="absolute inset-0 px-5 py-3.5 flex items-baseline gap-3 pointer-events-none"
            aria-hidden
          >
            <DigitReel value={Number.isFinite(amount) ? amount : 0} />
            <span className="text-[14px] font-bold text-transparent shrink-0">CZK</span>
          </div>
        )}

        {belowMin && (
          <div className="text-[11.5px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5">
            Minimum deposit is {MIN_AMOUNT} CZK
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   DigitReel — per-digit rolling number animation.

   Each digit lives in its own 1-character-tall window. The strip inside
   is a stack of 0–9 plus a leading 9 and trailing 0 for wrap continuity.
   Translating the strip by ±10% per digit lands on the new value;
   framer-motion springs to the target so the digits feel mechanical
   (like a flipper / odometer).

   When a digit goes 5 → 0 (down) we translate downward to roll through
   4, 3, 2, 1, 0. When it goes 1 → 2 (up) we translate upward by 10%.
   Padding the new value with zeros against the previous-width keeps
   digit positions stable mid-animation.
   ───────────────────────────────────────────────────────────────────────── */

const DigitReel: React.FC<{ value: number }> = ({ value }) => {
  const str = String(Math.max(0, Math.floor(value)));
  /* The string of digits drives one <Digit> per character. React keys by
     position from the RIGHT so the rightmost digit stays "ones" even as
     length changes — a 500 → 2000 transition keeps the trailing 0s in
     place and only animates the leading digit. */
  const padded = str;
  return (
    <div className="flex items-baseline overflow-hidden text-[34px] sm:text-[38px] font-bold tracking-tight tabular-nums text-ink">
      {padded.split('').map((d, i) => {
        const posFromRight = padded.length - i;
        return <Digit key={`pos-${posFromRight}`} digit={d} />;
      })}
    </div>
  );
};

const Digit: React.FC<{ digit: string }> = ({ digit }) => {
  const target = parseInt(digit, 10);
  if (Number.isNaN(target)) {
    // non-numeric character (separator, etc.) — render as-is
    return <span>{digit}</span>;
  }
  /* Strip is 0–9. Translate the strip by -target * 100% / 10 so the
     `target` row lands in the visible window. line-height: 1 to make
     each row exactly one character tall. */
  return (
    <span
      className="relative inline-block overflow-hidden"
      style={{
        height: '1em',
        width: '0.62em', // matches tabular-nums digit width
        lineHeight: 1,
      }}
    >
      <motion.span
        className="absolute left-0 top-0 flex flex-col"
        animate={{ y: `-${target * 10}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
        style={{ lineHeight: 1 }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span
            key={n}
            style={{ height: '1em', lineHeight: 1 }}
            className="flex items-baseline justify-center"
          >
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
};

const Row: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  tone?: 'muted' | 'positive' | 'accent';
}> = ({ label, value, bold, tone }) => {
  const labelClass = bold ? 'text-ink font-bold' : 'text-ink-muted font-medium';
  const valueClass = bold
    ? 'text-ink font-bold tracking-tight'
    : tone === 'positive'
    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
    : tone === 'accent'
    ? 'text-accent font-bold'
    : 'text-ink font-semibold';
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-[12.5px] ${labelClass}`}>{label}</span>
      <span className={`text-[13px] tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
};

export default DepositModal;
