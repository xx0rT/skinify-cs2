import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, ShieldCheck, X } from 'lucide-react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useCurrencyStore } from '../store/currencyStore';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { useBalanceStore } from '../store/balanceStore';
import { tap } from '../lib/motion';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { useSiteFlags } from '../utils/siteFlags';
import { supabase } from '../lib/supabaseClient';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useT } from '../lib/useT';

/**
 * DepositModal — full-screen, two-step "add funds" dialog on Stripe.
 *
 * Step 1 (amount): amount + presets + promo + method overview.
 * Step 2 (checkout): custom-coded Stripe Payment Element embedded in the
 *   modal (no redirect to a hosted page). The stripe-payment edge function
 *   creates the PaymentIntent server-side; after confirmation the same
 *   function verifies the intent's status with Stripe's API (never
 *   trusting the client) and credits the wallet exactly once.
 *
 * Redirect-based methods (3DS challenges, wallets) come back to
 * /profile?tab=balance with Stripe's payment_intent params — the
 * always-mounted modal watches for those on load and finalises the
 * credit the same way.
 */

let _openSetter: ((open: boolean) => void) | null = null;
export const openDepositModal = () => _openSetter?.(true);
export const closeDepositModal = () => _openSetter?.(false);

/* Publishable key — public by design; env var lets prod override the
   sandbox default without a code change. */
const STRIPE_PK =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ||
  'pk_test_51TuYRwPjKgwZqolxKAOIrnfQhXJryOxxyZS9q0eJQwkRVpcYBlBeQiNDLAJ5sjg83B6SA9lMXDQFFsdZofZOsOQn00JW7S3W9r';

let _stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!_stripePromise) _stripePromise = loadStripe(STRIPE_PK);
  return _stripePromise;
};

const QUICK_AMOUNTS = [200, 500, 1000, 2500, 5000, 10000];
const MIN_AMOUNT = 50;

const PROMO = {
  enabled: true,
  code: 'WELCOME10',
  copy: '+10% bonus on your first deposit · auto-applied',
};

async function callStripeFn(body: Record<string, unknown>) {
  const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
  const res = await fetch(`${supabaseUrl}/functions/v1/stripe-payment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Payment service error ${res.status}`);
  }
  return data;
}

export const DepositModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'amount' | 'checkout'>('amount');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const siteFlags = useSiteFlags();
  const [promoActive, setPromoActive] = useState(PROMO.enabled);
  /* Sitewide kill-switch (Admin → Developer): hides the deposit-bonus
     banner + disables the bonus when promo_banner is off. */
  const promoOn = promoActive && (siteFlags.promo_banner ?? true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const { fetchBalance } = useBalanceStore();
  const t = useT();

  useEffect(() => {
    _openSetter = setOpen;
    return () => {
      if (_openSetter === setOpen) _openSetter = null;
    };
  }, []);

  useBodyScrollLock(open);
  useEffect(() => {
    if (open && step === 'amount') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, step]);

  /* Reset back to the amount step whenever the modal is (re)opened. */
  useEffect(() => {
    if (open) {
      setStep('amount');
      setClientSecret(null);
      setPaymentIntentId(null);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitting]);

  const finalizeCredit = useCallback(
    async (piId: string) => {
      const data = await callStripeFn({ action: 'confirm', paymentIntentId: piId });
      if (data?.credited) {
        addToast({
          type: 'success',
          title: t('deposit.success.title', 'Deposit successful'),
          message: t('deposit.success.msg', 'Your balance has been credited.'),
        });
        if (user?.steamId) fetchBalance(user.steamId);
        return true;
      }
      throw new Error(
        data?.status && data.status !== 'succeeded'
          ? `Payment status: ${data.status}`
          : 'Payment could not be verified.',
      );
    },
    [addToast, fetchBalance, t, user?.steamId],
  );

  /* Redirect-return watcher — 3DS / wallet flows leave the page and come
     back with ?payment_intent=pi_…&redirect_status=…; finish the credit
     server-side and scrub the params from the URL. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const piId = params.get('payment_intent');
    const status = params.get('redirect_status');
    if (!piId || !/^pi_[A-Za-z0-9]+$/.test(piId)) return;

    ['payment_intent', 'payment_intent_client_secret', 'redirect_status'].forEach((k) =>
      params.delete(k),
    );
    const qs = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`,
    );

    if (status === 'succeeded' || status === 'processing') {
      finalizeCredit(piId).catch((err) => {
        addToast({
          type: 'error',
          title: 'Deposit verification failed',
          message: err instanceof Error ? err.message : 'Please contact support.',
          duration: 8000,
        });
      });
    } else if (status) {
      addToast({
        type: 'warning',
        title: 'Payment not completed',
        message: 'Your payment was cancelled or declined. No funds were taken.',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const bonus = promoOn ? safeAmount * 0.1 : 0;
  const credited = Math.max(0, safeAmount + bonus);

  const belowMin = safeAmount > 0 && safeAmount < MIN_AMOUNT;
  const canSubmit = safeAmount >= MIN_AMOUNT && !submitting;

  /* Track whether the last change came from a preset click vs raw typing,
     so we only run the rolling-digit animation on the big jumps (preset
     swap) and let typed input update instantly. */
  const [animatedAmount, setAnimatedAmount] = useState<number>(amount);
  const lastSourceRef = useRef<'preset' | 'input'>('input');
  useEffect(() => {
    setAnimatedAmount(amount);
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

  /* Step 1 → 2: create the PaymentIntent and mount the Payment Element. */
  const handleContinue = async () => {
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
      /* The edge function requires the public.users row id — not the
         steam id. authStore caches it but if it's missing (older
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

      const data = await callStripeFn({
        action: 'create_intent',
        amount: safeAmount,
        userId,
        steamId: user.steamId,
      });
      if (!data?.clientSecret) {
        throw new Error('Payment service did not return a checkout session.');
      }
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setStep('checkout');
    } catch (err) {
      console.error('Stripe deposit failed:', err);
      addToast({
        type: 'error',
        title: 'Deposit failed',
        message: err instanceof Error ? err.message : 'Could not start checkout.',
        duration: 6000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* Payment Element theme — pulled from the site's CSS variables at mount
     so the iframe form matches light/dark mode. */
  const elementsOptions = useMemo(() => {
    if (!clientSecret) return null;
    const css = getComputedStyle(document.documentElement);
    const rgb = (name: string, fallback: string) => {
      const v = css.getPropertyValue(name).trim();
      return v ? `rgb(${v.split(' ').join(',')})` : fallback;
    };
    return {
      clientSecret,
      appearance: {
        theme: 'flat' as const,
        variables: {
          colorPrimary: rgb('--accent', '#6d4aff'),
          colorBackground: rgb('--subtle', '#1b1b22'),
          colorText: rgb('--ink', '#f4f4f5'),
          colorTextSecondary: rgb('--ink-muted', '#a1a1aa'),
          colorDanger: '#f43f5e',
          borderRadius: '14px',
          fontFamily: css.getPropertyValue('font-family') || 'inherit',
          spacingUnit: '4px',
        },
      },
    };
  }, [clientSecret]);

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
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36, mass: 0.9 }}
            role="dialog"
            aria-modal="true"
            aria-label="Add funds"
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
            className="deposit-modal-root fixed inset-x-0 bottom-0 z-[90] bg-bg text-ink flex flex-col overflow-hidden rounded-t-[28px] shadow-[0_-24px_60px_-12px_rgba(0,0,0,0.5)] lg:inset-0 lg:m-auto lg:w-[min(1080px,94vw)] lg:rounded-[24px] lg:shadow-2xl"
          >
            <style>{`
              .deposit-modal-root { height: 92dvh; }
              @media (min-width: 1024px) {
                .deposit-modal-root { height: min(680px, 92dvh); }
              }
            `}</style>

            {/* Drag handle — mobile only. */}
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
              <div className="min-w-0 flex items-center gap-3">
                {step === 'checkout' && (
                  <button
                    onClick={() => !submitting && setStep('amount')}
                    aria-label="Back"
                    className="h-9 w-9 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors shrink-0"
                  >
                    <ArrowLeft size={15} strokeWidth={2.4} />
                  </button>
                )}
                <div className="min-w-0">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                    {t('wallet', 'Wallet')}
                  </div>
                  <div className="text-[14px] sm:text-[16px] font-bold tracking-tight text-ink leading-none mt-0.5 truncate">
                    {step === 'checkout'
                      ? t('deposit.checkout.title', 'Complete your payment')
                      : t('deposit.title', 'Add funds to your Skinify balance')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => !submitting && setOpen(false)}
                aria-label={t('common.close', 'Close')}
                className="hidden lg:grid h-10 w-10 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink place-items-center transition-colors"
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            </header>

            {step === 'checkout' && clientSecret && elementsOptions ? (
              /* ══════════ STEP 2 — embedded Stripe checkout ══════════ */
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-5">
                <div className="max-w-[480px] mx-auto">
                  <div className="rounded-3xl bg-subtle p-4 mb-4 space-y-2">
                    <Row
                      label={t('deposit.summary.youPay', 'You pay')}
                      value={formatPrice(safeAmount)}
                    />
                    {promoOn && (
                      <Row
                        label={`${t('deposit.summary.bonus', 'Bonus')} · ${PROMO.code}`}
                        value={`+ ${formatPrice(bonus)}`}
                        tone="accent"
                      />
                    )}
                    <div className="h-px my-1" style={{ background: 'rgb(var(--accent) / 0.30)' }} />
                    <Row
                      label={t('deposit.summary.credited', 'Credited')}
                      value={formatPrice(credited)}
                      bold
                    />
                  </div>

                  <Elements stripe={getStripe()} options={elementsOptions as any}>
                    <StripeCheckoutForm
                      amountLabel={formatPrice(safeAmount)}
                      paymentIntentId={paymentIntentId!}
                      onSuccess={async (piId) => {
                        try {
                          await finalizeCredit(piId);
                          setOpen(false);
                        } catch (err) {
                          addToast({
                            type: 'error',
                            title: 'Deposit verification failed',
                            message:
                              err instanceof Error ? err.message : 'Please contact support.',
                            duration: 8000,
                          });
                        }
                      }}
                    />
                  </Elements>

                  <p className="text-[10.5px] text-ink-dim font-medium leading-relaxed text-center mt-4 flex items-center justify-center gap-1.5">
                    <ShieldCheck size={12} strokeWidth={2.4} className="shrink-0" />
                    {t(
                      'deposit.disclaimer.stripe',
                      'Card details go directly to Stripe — Skinify never sees them.',
                    )}
                  </p>
                </div>
              </div>
            ) : (
              /* ══════════ STEP 1 — amount + method overview ══════════ */
              <>
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
                  {/* LEFT — method overview (the only scroll surface) */}
                  <section
                    className="min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-5 lg:border-r"
                    style={{ borderColor: 'rgb(var(--line))' }}
                  >
                    <div className="max-w-[640px] mx-auto lg:mx-0">
                      {/* Mobile-only top section — amount first. */}
                      <div className="lg:hidden space-y-4 mb-5">
                        {promoOn && <PromoBanner onDismiss={() => setPromoActive(false)} />}
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
                        {t('deposit.method.stripe', 'Pay securely with Stripe')}
                      </h2>

                      {/* Deposit artwork — fills the otherwise empty left
                          column under the method heading. */}
                      <motion.img
                        src="/skinify_graphics/karambit.png"
                        alt=""
                        aria-hidden
                        initial={{ opacity: 0, y: 14, rotate: -2 }}
                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.1 }}
                        className="mt-5 w-full max-w-[420px] mx-auto rounded-3xl object-cover select-none pointer-events-none"
                        draggable={false}
                      />

                      <p className="text-[11px] text-ink-dim font-medium mt-4 leading-relaxed">
                        {t(
                          'deposit.method.note',
                          'You choose the exact method on the next step. Payments are processed by Stripe with 3D Secure where your bank requires it.',
                        )}
                      </p>

                      {/* Mobile breakdown above the sticky CTA. */}
                      <div className="lg:hidden mt-5 rounded-3xl bg-subtle p-4 space-y-2">
                        <Row
                          label={t('deposit.summary.youPay', 'You pay')}
                          value={formatPrice(safeAmount)}
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
                        <Row
                          label={t('deposit.summary.credited', 'Credited')}
                          value={formatPrice(credited)}
                          bold
                        />
                      </div>
                      <div className="lg:hidden h-20" aria-hidden />
                    </div>
                  </section>

                  {/* RIGHT — rigid action surface, never scrolls. */}
                  <aside className="hidden lg:flex flex-col bg-surface/40 px-8 py-6 overflow-hidden">
                    <div className="max-w-[480px] mx-auto w-full flex-1 flex flex-col gap-4">
                      <div>
                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                          {t('deposit.method', 'Payment method')}
                        </div>
                        <h2 className="text-[24px] font-bold tracking-tight text-ink leading-tight mt-1">
                          {t('deposit.title.card', 'Deposit with card or wallet')}
                        </h2>
                      </div>

                      {promoOn && <PromoBanner onDismiss={() => setPromoActive(false)} />}

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

                      <div className="mt-auto rounded-3xl bg-subtle p-4 space-y-2">
                        <Row
                          label={t('deposit.summary.youPay', 'You pay')}
                          value={formatPrice(safeAmount)}
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
                        <Row
                          label={t('deposit.summary.credited', 'Credited')}
                          value={formatPrice(credited)}
                          bold
                        />
                      </div>

                      <motion.button
                        whileTap={tap}
                        whileHover={canSubmit ? { scale: 1.005 } : undefined}
                        onClick={handleContinue}
                        disabled={!canSubmit}
                        className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={15} strokeWidth={2.4} className="animate-spin" />
                            {t('deposit.cta.processing', 'Processing…')}
                          </>
                        ) : safeAmount > 0 ? (
                          `${t('deposit.cta.continue', 'Continue to payment')} · ${formatPrice(safeAmount)}`
                        ) : (
                          t('deposit.cta.enterAmount', 'Enter an amount')
                        )}
                      </motion.button>

                      <p className="text-[10.5px] text-ink-dim font-medium leading-relaxed text-center">
                        {t(
                          'deposit.disclaimer.stripe',
                          'Card details go directly to Stripe — Skinify never sees them.',
                        )}
                      </p>
                    </div>
                  </aside>
                </div>

                {/* Mobile-only sticky CTA. */}
                <div
                  className="lg:hidden shrink-0 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] bg-bg/95 backdrop-blur-md border-t"
                  style={{ borderColor: 'rgb(var(--line))' }}
                >
                  <motion.button
                    whileTap={tap}
                    onClick={handleContinue}
                    disabled={!canSubmit}
                    className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
                    style={{ boxShadow: '0 10px 24px -12px rgb(var(--accent) / 0.65)' }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={15} strokeWidth={2.4} className="animate-spin" />
                        Processing…
                      </>
                    ) : safeAmount > 0 ? (
                      `Continue to payment · ${formatPrice(safeAmount)}`
                    ) : (
                      'Enter an amount'
                    )}
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   StripeCheckoutForm — the embedded Payment Element + Pay button.
   Lives inside <Elements>, so it can use the stripe/elements hooks.
   confirmPayment uses redirect: 'if_required' — card payments settle
   in-modal; bank redirects / wallet sheets bounce through return_url and
   are finalised by the redirect watcher in DepositModal.
   ───────────────────────────────────────────────────────────────────────── */
const StripeCheckoutForm: React.FC<{
  amountLabel: string;
  paymentIntentId: string;
  onSuccess: (paymentIntentId: string) => Promise<void>;
}> = ({ amountLabel, paymentIntentId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const pay = async () => {
    if (!stripe || !elements || paying) return;
    setPaying(true);
    setErrorMsg(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/profile?tab=balance`,
      },
      redirect: 'if_required',
    });
    if (error) {
      setErrorMsg(error.message || 'Payment failed. Please try again.');
      setPaying(false);
      return;
    }
    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      await onSuccess(paymentIntent.id || paymentIntentId);
      setPaying(false);
    } else {
      setErrorMsg('Payment was not completed. No funds were taken.');
      setPaying(false);
    }
  };

  return (
    <div>
      {!ready && (
        <div className="h-40 grid place-items-center text-ink-muted">
          <Loader2 size={20} strokeWidth={2.2} className="animate-spin" />
        </div>
      )}
      <div className={ready ? '' : 'invisible h-0 overflow-hidden'}>
        {/* wallets: 'auto' surfaces Apple Pay (Safari + registered payment
            method domain) and Google Pay (Chrome) as one-tap options at
            the top of the element. */}
        <PaymentElement
          onReady={() => setReady(true)}
          options={{
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>

      {errorMsg && (
        <div className="mt-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 px-4 py-3 text-[12.5px] font-semibold">
          {errorMsg}
        </div>
      )}

      <motion.button
        whileTap={tap}
        onClick={pay}
        disabled={!stripe || !elements || paying || !ready}
        className="mt-4 w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
      >
        {paying ? (
          <>
            <Loader2 size={15} strokeWidth={2.4} className="animate-spin" />
            Processing…
          </>
        ) : (
          `Pay ${amountLabel}`
        )}
      </motion.button>
    </div>
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
