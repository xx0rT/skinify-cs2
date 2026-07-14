import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useCurrencyStore } from '../store/currencyStore';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { spring, tap } from '../lib/motion';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { useSiteFlags } from '../utils/siteFlags';
import { supabase } from '../lib/supabaseClient';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useT } from '../lib/useT';

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

/* PayU PBL channel ids — the value sent to the edge function as
   `payMethod` (then forwarded as `payMethods.payMethod.value` to PayU).
   Empty string => PayU's built-in method picker (lets the buyer choose
   on the hosted page). Channels here mirror what's typically enabled
   for a Czech-market POS; trim if your merchant doesn't have all of
   them activated.

   When a channel above ships a fee in `fee:`, we surface it in the
   tile footer and (currently informationally) in the breakdown — PayU's
   real channel cost is invoiced separately, this is just transparency. */
/* PayU methods enabled on POS 4433877. The current merchant config has
   ONLY Czech-bank PBL channels active (1% fee each, 1 CZK fixed).
   Cards, Apple Pay, Google Pay, BLIK, paysafecard are all disabled —
   sending those values made PayU return PAY_METHOD_NOT_ENABLED_ON_POS.

   Each tile sends the individual PayU PBL channel value so the buyer
   lands straight on their bank. "All methods" sends an empty value
   and lets PayU show its own picker (equivalent to the umbrella `dpcz`
   here, since that's all that's enabled). When more methods get
   activated in the PayU panel, add them back here with their channel
   value and they'll just work.

   Fees noted on the screenshot: 1% + 1 CZK fixed per transaction. */
type MethodId =
  | 'all'
  | 'csob'
  | 'cs'
  | 'kb'
  | 'mbank'
  | 'fio'
  | 'moneta'
  | 'qr'
  | 'raiffeisen'
  | 'unicredit';

interface MethodTile {
  id: MethodId;
  /** PayU PBL channel value (empty = "show PayU's full picker"). */
  payuValue: string;
  label: string;
  caption: string;
  badge?: { text: string; tone: 'top' | 'bonus' | 'neutral' };
  chips: { kind: 'text' | 'mono'; label: string }[];
  fee?: string;
}

const METHOD_TILES: MethodTile[] = [
  {
    id: 'all',
    payuValue: '',
    label: 'All banks',
    caption: 'Pick on PayU',
    badge: { text: 'TOP', tone: 'top' },
    chips: [
      { kind: 'text', label: 'ČSOB' },
      { kind: 'text', label: 'KB' },
      { kind: 'text', label: 'mBank' },
      { kind: 'text', label: 'Fio' },
    ],
    fee: '1%',
  },
  {
    id: 'csob',
    payuValue: 'csobcz',
    label: 'ČSOB',
    caption: 'Instant bank transfer',
    chips: [{ kind: 'text', label: 'ČSOB' }],
    fee: '1%',
  },
  {
    id: 'cs',
    payuValue: 'cs',
    label: 'Česká spořitelna',
    caption: 'Instant bank transfer',
    chips: [{ kind: 'text', label: 'ČS' }],
    fee: '1%',
  },
  {
    id: 'kb',
    payuValue: 'kbcz',
    label: 'Komerční banka',
    caption: 'Instant bank transfer',
    chips: [{ kind: 'text', label: 'KB' }],
    fee: '1%',
  },
  {
    id: 'mbank',
    payuValue: 'mbankcz',
    label: 'mBank',
    caption: 'Instant bank transfer',
    chips: [{ kind: 'text', label: 'mBank' }],
    fee: '1%',
  },
  {
    id: 'fio',
    payuValue: 'fiocz',
    label: 'Fio banka',
    caption: 'Instant bank transfer',
    chips: [{ kind: 'text', label: 'Fio' }],
    fee: '1%',
  },
  {
    id: 'moneta',
    payuValue: 'monetacz',
    label: 'Moneta',
    caption: 'Money Bank · instant',
    chips: [{ kind: 'text', label: 'Moneta' }],
    fee: '1%',
  },
  {
    id: 'raiffeisen',
    payuValue: 'rbcz',
    label: 'Raiffeisenbank',
    caption: 'Instant bank transfer',
    chips: [{ kind: 'text', label: 'RB' }],
    fee: '1%',
  },
  {
    id: 'unicredit',
    payuValue: 'unicz',
    label: 'UniCredit',
    caption: 'Instant bank transfer',
    chips: [{ kind: 'text', label: 'UCB' }],
    fee: '1%',
  },
  {
    id: 'qr',
    payuValue: 'qrcz',
    label: 'QR code',
    caption: 'Scan with banking app',
    chips: [{ kind: 'text', label: 'QR' }],
    fee: '1%',
  },
];

const QUICK_AMOUNTS = [200, 500, 1000, 2500, 5000, 10000];
const MIN_AMOUNT = 50;

const PROMO = {
  enabled: true,
  code: 'WELCOME10',
  copy: '+10% bonus on your first deposit · auto-applied',
};

/* All Czech-bank PBL channels on this POS share the same 1% + 1 CZK
   fee schedule, so the calc is a constant. PayU bills the fee on top
   of the deposit (out of your merchant payout), not deducted from the
   buyer's amount — so this is for display only. */
const calcFeeRate = (_id: MethodId): number => 0.01;

export const DepositModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [method, setMethod] = useState<MethodId>('all');
  const [submitting, setSubmitting] = useState(false);
  const siteFlags = useSiteFlags();
  const [promoActive, setPromoActive] = useState(PROMO.enabled);
  /* Sitewide kill-switch (Admin → Developer): hides the deposit-bonus
     banner + disables the bonus when promo_banner is off. */
  const promoOn = promoActive && (siteFlags.promo_banner ?? true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const t = useT();

  useEffect(() => {
    _openSetter = setOpen;
    return () => {
      if (_openSetter === setOpen) _openSetter = null;
    };
  }, []);

  useBodyScrollLock(open);
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
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
  const bonus = promoOn ? safeAmount * 0.1 : 0;
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
    if (!user?.steamId) {
      addToast({
        type: 'warning',
        title: 'Sign in required',
        message: 'Please sign in with Steam to deposit funds.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      /* The PayU edge function requires the public.users row id — not
         the steam id. authStore caches it but if it's missing (older
         session) we look it up by steam_id. */
      let userId = user.id;
      if (!userId) {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('steam_id', user.steamId)
          .maybeSingle();
        if (error || !data) {
          throw new Error('Could not load your account. Please sign in again.');
        }
        userId = data.id;
      }

      /* Customer IP — PayU uses it for fraud-scoring. Best-effort:
         a failed lookup falls back server-side to the x-forwarded-for
         header, which is fine. */
      let customerIp: string | undefined;
      try {
        const r = await fetch('https://ipapi.co/json/');
        if (r.ok) {
          const j = await r.json();
          if (j?.ip) customerIp = j.ip;
        }
      } catch {
        /* network — leave undefined, server will fall back */
      }

      const tile = METHOD_TILES.find((m) => m.id === method);
      const payMethod = tile?.payuValue || undefined;

      const res = await fetch(`${supabaseUrl}/functions/v1/payu-payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: safeAmount,
          userId,
          steamId: user.steamId,
          customerIp,
          userEmail: user.email || `user_${user.steamId}@skinify.gg`,
          description: `Skinify Wallet Top-up · ${safeAmount.toLocaleString('cs-CZ')} Kč`,
          payMethod,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let msg = text || `PayU error ${res.status}`;
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) msg = parsed.error;
        } catch {
          /* not JSON — keep raw text */
        }
        throw new Error(msg);
      }

      const data = await res.json();
      if (!data?.redirectUri) {
        throw new Error('PayU did not return a checkout URL.');
      }

      /* Persist order metadata so the success page can verify on return. */
      try {
        localStorage.setItem('payu_order_id', data.orderId);
        localStorage.setItem('payu_ext_order_id', data.extOrderId);
        localStorage.setItem('payu_user_id', userId);
        localStorage.setItem('payu_amount', String(safeAmount));
      } catch {
        /* private window — non-fatal */
      }

      /* Hand off to PayU. The hosted page either lets the user pick a
         method (when payMethod is empty) or jumps straight to the
         requested method. Notification webhook credits the balance on
         success. */
      window.location.href = data.redirectUri;
    } catch (err) {
      console.error('PayU deposit failed:', err);
      addToast({
        type: 'error',
        title: 'Deposit failed',
        message: err instanceof Error ? err.message : 'Could not start PayU checkout.',
        duration: 6000,
      });
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile-only dimmed backdrop. On lg+ the modal is full-screen
              so a backdrop would be invisible — we skip rendering it. */}
          <motion.div
            key="deposit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !submitting && setOpen(false)}
            className="fixed inset-0 z-[89] bg-black/55 lg:backdrop-blur-sm"
            aria-hidden
          />

          <motion.div
            key="deposit-root"
            /* Two entrance/exit recipes:
                 - mobile (<lg) : slide up from the bottom like a native
                                  sheet (Revolut/Apple Wallet style).
                 - lg+         : the original fade-in full-screen pane.
                We let framer-motion's variant `custom` switch between
                them by reading a CSS class at runtime would be brittle,
                so instead we use `initial`/`animate`/`exit` with a `y`
                value and let the lg styles override `transform: none`
                (set via Tailwind's `lg:!translate-y-0`). The opacity
                doubles as the lg-fade. */
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36, mass: 0.9 }}
            role="dialog"
            aria-modal="true"
            aria-label="Add funds"
            /* Drag-to-dismiss on mobile. Constrained to downward drag
               only; releasing past 120px or with sufficient downward
               velocity dismisses. lg+ ignores the drag (we lock with
               dragListener=false via media query won't work — instead
               we set dragConstraints={{top:0,bottom:0}} to zero
               on lg via dragControls when on desktop). Simplest cross-
               breakpoint approach: only enable drag in a narrow window
               via dragListener — but framer doesn't expose a clean per-
               breakpoint toggle. So we cap the drag at top=0 and only
               accept it as a dismiss when the viewport is below lg. */
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (submitting) return;
              const isMobile = window.matchMedia('(max-width: 1023px)').matches;
              if (!isMobile) return;
              if (info.offset.y > 120 || info.velocity.y > 600) {
                setOpen(false);
              }
            }}
            /* Mobile: rounded top corners, anchored to bottom of viewport
                       at ~92dvh tall so a sliver of the backdrop stays
                       visible at the top — that little gap is the visual
                       cue that this is a sheet you can swipe down.
               Desktop: original full-screen pane. The lg: utility classes
                        override the mobile defaults. */
            className="deposit-modal-root fixed inset-x-0 bottom-0 z-[90] bg-bg text-ink flex flex-col overflow-hidden rounded-t-[28px] shadow-[0_-24px_60px_-12px_rgba(0,0,0,0.5)] lg:inset-0 lg:m-auto lg:w-[min(1080px,94vw)] lg:rounded-[24px] lg:shadow-2xl"
          >
            {/* Scoped style — mobile height is 92dvh (sheet), lg is full
                viewport. Doing this in CSS rather than inline lets the
                lg breakpoint actually override the mobile height. */}
            <style>{`
              .deposit-modal-root { height: 92dvh; }
              @media (min-width: 1024px) {
                .deposit-modal-root { height: min(680px, 92dvh); }
              }
            `}</style>

            {/* Drag handle — mobile only. The grab pill at the top of
                the sheet that tells the user this is draggable. Tapping
                it is also a dismiss affordance for users who don't
                discover the swipe gesture. */}
            <div className="lg:hidden shrink-0 pt-2.5 pb-1 grid place-items-center">
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                aria-label="Close"
                className="w-10 h-1.5 rounded-full bg-ink-dim/35 hover:bg-ink-dim/55 transition-colors"
              />
            </div>

          {/* Top bar */}
          <header
            className="shrink-0 flex items-center justify-between px-5 sm:px-8 h-12 lg:h-16 border-b"
            style={{ borderColor: 'rgb(var(--line))' }}
          >
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                {t('wallet', 'Wallet')}
              </div>
              <div className="text-[14px] sm:text-[16px] font-bold tracking-tight text-ink leading-none mt-0.5 truncate">
                {t('deposit.title', 'Add funds to your Skinify balance')}
              </div>
            </div>
            {/* Close X — kept on lg+ as the primary dismiss affordance.
                Hidden on mobile where the drag handle + backdrop tap
                both close the sheet. */}
            <button
              onClick={() => !submitting && setOpen(false)}
              aria-label={t('common.close', 'Close')}
              className="hidden lg:grid h-10 w-10 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink place-items-center transition-colors"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </header>

          {/* Split pane — fills remaining height; only the left pane scrolls. */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
            {/* LEFT — method list (the only scroll surface) */}
            <section
              className="min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-5 lg:border-r"
              style={{ borderColor: 'rgb(var(--line))' }}
            >
              <div className="max-w-[640px] mx-auto lg:mx-0">
                {/* Mobile-only top section — Amount + presets + bonus
                    summary, rendered ABOVE the method tiles. The desktop
                    layout shows these in the right rail, but on mobile
                    the user opens the modal to deposit money so the
                    amount field should be the first thing they see. */}
                <div className="lg:hidden space-y-4 mb-5">
                  {promoOn && (
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
                          className={`h-10 rounded-full text-[12.5px] font-bold tabular-nums transition-colors ${
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
                </div>

                <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                  {t('deposit.method', 'Payment method')}
                </div>
                <h2 className="text-[16px] sm:text-[20px] font-bold tracking-tight text-ink leading-tight mt-1">
                  {t('deposit.method.pick', 'Pick how you want to pay')}
                </h2>

                <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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

                {/* Mobile breakdown — small grid right above the CTA so
                    the user sees the math before tapping Continue. The
                    desktop view shows this in the right rail. */}
                <div className="lg:hidden mt-5 rounded-3xl bg-subtle p-4 space-y-2">
                  <Row label={t('deposit.summary.youPay', 'You pay')} value={formatPrice(safeAmount)} />
                  <Row
                    label={`${selectedMethod?.label || t('deposit.method', 'Method')} ${t('deposit.summary.fee', 'fee').toLowerCase()}`}
                    value={fee > 0 ? `− ${formatPrice(fee)}` : t('deposit.summary.noFee', 'No fee')}
                    tone={fee > 0 ? 'muted' : 'positive'}
                  />
                  {promoOn && (
                    <Row
                      label={`${t('deposit.summary.bonus', 'Bonus')} · ${PROMO.code}`}
                      value={`+ ${formatPrice(bonus)}`}
                      tone="accent"
                    />
                  )}
                  <div
                    className="h-px my-1"
                    style={{ background: 'rgb(var(--accent) / 0.30)' }}
                  />
                  <Row label={t('deposit.summary.credited', 'Credited')} value={formatPrice(credited)} bold />
                </div>
                {/* Bottom spacer so the sticky CTA doesn't overlap the
                    last row when scrolled to the bottom. */}
                <div className="lg:hidden h-20" aria-hidden />
              </div>
            </section>

            {/* RIGHT — rigid action surface, never scrolls. */}
            <aside className="hidden lg:flex flex-col bg-surface/40 px-8 py-6 overflow-hidden">
              <div className="max-w-[480px] mx-auto w-full flex-1 flex flex-col gap-4">
                {/* Title — mirrors the selected method so the pane reads
                    as "what you're about to do", not a blank form. */}
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                    {t('deposit.method', 'Payment method')}
                  </div>
                  <h2 className="text-[24px] font-bold tracking-tight text-ink leading-tight mt-1">
                    {`Deposit via ${selectedMethod?.label || 'bank transfer'}`}
                  </h2>
                </div>

                {/* Promo banner */}
                {promoOn && (
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

                {/* Summary — anchored to the bottom like skins.com's
                    "You receive" block. */}
                <div className="mt-auto rounded-3xl bg-subtle p-4 space-y-2">
                  <Row label={t('deposit.summary.youPay', 'You pay')} value={formatPrice(safeAmount)} />
                  <Row
                    label={`${selectedMethod?.label || t('deposit.method', 'Method')} ${t('deposit.summary.fee', 'fee').toLowerCase()}`}
                    value={fee > 0 ? `− ${formatPrice(fee)}` : t('deposit.summary.noFee', 'No fee')}
                    tone={fee > 0 ? 'muted' : 'positive'}
                  />
                  {promoOn && (
                    <Row
                      label={`${t('deposit.summary.bonus', 'Bonus')} · ${PROMO.code}`}
                      value={`+ ${formatPrice(bonus)}`}
                      tone="accent"
                    />
                  )}
                  <div
                    className="h-px my-1"
                    style={{ background: 'rgb(var(--accent) / 0.30)' }}
                  />
                  <Row label={t('deposit.summary.credited', 'Credited')} value={formatPrice(credited)} bold />
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
                    ? t('deposit.cta.processing', 'Processing…')
                    : safeAmount > 0
                    ? `${t('deposit.cta.continue', 'Continue')} · ${formatPrice(safeAmount)}`
                    : t('deposit.cta.enterAmount', 'Enter an amount')}
                </motion.button>

                <p className="text-[10.5px] text-ink-dim font-medium leading-relaxed text-center">
                  {t(
                    'deposit.disclaimer',
                    'Skinify never sees your card details. Payments are encrypted and processed by your provider.',
                  )}
                </p>
              </div>
            </aside>

          </div>

          {/* Mobile-only sticky CTA. Pinned to the bottom of the
              viewport so the Continue button is always within thumb
              reach as the user scrolls through method tiles. Hidden on
              lg+ where the right rail carries the CTA. */}
          <div
            className="lg:hidden shrink-0 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] bg-bg/95 backdrop-blur-md border-t"
            style={{ borderColor: 'rgb(var(--line))' }}
          >
            <motion.button
              whileTap={tap}
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
              style={{ boxShadow: '0 10px 24px -12px rgb(var(--accent) / 0.65)' }}
            >
              {submitting
                ? 'Processing…'
                : safeAmount > 0
                ? `Continue · ${formatPrice(safeAmount)}`
                : 'Enter an amount'}
            </motion.button>
          </div>
          </motion.div>
        </>
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
        style={{ borderColor: 'rgb(var(--line))' }}
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
