import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Loader2, X, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { tap } from '../../lib/motion';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

/* ─────────────────────────────────────────────────────────────────────────
   WithdrawModal — same full-screen/bottom-sheet shell as DepositModal
   (drag handle, two-column desktop layout, rolling-digit amount input,
   mobile sticky CTA), mirrored for the withdraw direction.

   Two paths, chosen automatically based on whether the user has
   completed Stripe Connect onboarding (Settings → Payouts):

     - Connect-onboarded: a single-step "Payout to your bank" flow —
       amount + one confirm, no method picker, no free-text IBAN/card/
       PayPal entry (Stripe already has their bank details). Calls
       stripe-connect's `payout` action, which creates a real Stripe
       Payout immediately — no admin review queue.

     - Everyone else (the original, still-default flow): two steps —
       amount, then a method + details form. Submit calls
       withdraw-submit (hold + pending request reviewed in the admin
       panel) exactly as before. Nothing changes here for users who
       haven't set up Connect.
   ───────────────────────────────────────────────────────────────────────── */

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
  /** Skip the Stripe Connect auto-detection and always render the
   *  manual 3-step flow (amount → method → admin-review submit).
   *  Used for the "Legacy balance" withdraw button — pre-Connect DB
   *  funds are only ever claimable through the original flow, even for
   *  a seller who has since onboarded to Connect for new sales. */
  forceLegacy?: boolean;
}

const MIN_WITHDRAW = 100;
const FEE_RATE = 0.015; // 1.5%

const METHODS = [
  { id: 'bank', label: 'Bank transfer', sub: '1–3 business days', field: 'iban', inputLabel: 'Bank account / IBAN', placeholder: 'CZ12 3456 7890 1234 5678 9012' },
  { id: 'card', label: 'Debit card', sub: '1–5 business days', field: 'cardNumber', inputLabel: 'Card number', placeholder: '1234 5678 9012 3456' },
  { id: 'paypal', label: 'PayPal', sub: 'Up to 24 hours', field: 'email', inputLabel: 'PayPal email', placeholder: 'you@example.com' },
] as const;

type MethodId = (typeof METHODS)[number]['id'];

const fmtKc = (n: number) =>
  `${n.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} Kč`;

const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentBalance,
  forceLegacy,
}) => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<MethodId>('bank');
  const [details, setDetails] = useState({ iban: '', cardNumber: '', email: '' });
  const [step, setStep] = useState<'amount' | 'method' | 'success'>('amount');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* Stripe Connect status — drives which flow renders. */
  const [connectPayoutsEnabled, setConnectPayoutsEnabled] = useState(false);
  const [connectPayoutId, setConnectPayoutId] = useState<string | null>(null);
  const [connectBalance, setConnectBalance] = useState<number | null>(null);
  const [connectBalanceLoading, setConnectBalanceLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.steamId || forceLegacy) return;
    let cancelled = false;
    (async () => {
      try {
        const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
        const res = await fetch(`${supabaseUrl}/functions/v1/stripe-connect`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            'Content-Type': 'application/json',
            'x-steam-id': user.steamId,
          },
          body: JSON.stringify({ action: 'get_status' }),
        });
        const body = await res.json().catch(() => ({}));
        const enabled = !!body?.data?.payouts_enabled;
        if (cancelled) return;
        setConnectPayoutsEnabled(enabled);

        /* Only Connect-onboarded sellers have a real Stripe balance to
           show — everyone else keeps reading the DB's currentBalance
           prop exactly as before. */
        if (enabled) {
          setConnectBalanceLoading(true);
          try {
            const balRes = await fetch(`${supabaseUrl}/functions/v1/stripe-connect`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${supabaseKey}`,
                apikey: supabaseKey,
                'Content-Type': 'application/json',
                'x-steam-id': user.steamId,
              },
              body: JSON.stringify({ action: 'get_balance' }),
            });
            const balBody = await balRes.json().catch(() => ({}));
            if (!cancelled) setConnectBalance(Number(balBody?.data?.available_czk) || 0);
          } catch {
            /* leave connectBalance null — amount input falls back to
               server-side-only validation (min amount client-side). */
          } finally {
            if (!cancelled) setConnectBalanceLoading(false);
          }
        }
      } catch {
        /* best-effort — falls back to the legacy withdraw flow */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.steamId, forceLegacy]);

  useBodyScrollLock(isOpen);
  useEffect(() => {
    if (isOpen && step === 'amount') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen) {
      setStep('amount');
      setAmount(0);
      setSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitting, onClose]);

  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const fee = Math.round(safeAmount * FEE_RATE * 100) / 100;
  const net = Math.round((safeAmount - fee) * 100) / 100;
  const amountValid = safeAmount >= MIN_WITHDRAW && safeAmount <= currentBalance;
  const belowMin = safeAmount > 0 && safeAmount < MIN_WITHDRAW;
  const amountError =
    safeAmount === 0
      ? null
      : safeAmount < MIN_WITHDRAW
        ? `Minimum withdrawal is ${fmtKc(MIN_WITHDRAW)}.`
        : safeAmount > currentBalance
          ? 'Amount exceeds your available balance.'
          : null;

  const activeMethod = useMemo(
    () => METHODS.find((m) => m.id === method)!,
    [method],
  );
  const detailValue = details[activeMethod.field];
  const detailValid = detailValue.trim().length >= 5;

  const reset = () => {
    setAmount(0);
    setMethod('bank');
    setDetails({ iban: '', cardNumber: '', email: '' });
    setStep('amount');
    setSubmitting(false);
    setConnectPayoutId(null);
  };

  /* Connect payout: no platform fee (Stripe's own payout fee applies on
     their side, invisible to us). The amount is capped against
     `connectBalance` — the seller's REAL Stripe Connect balance, fetched
     live above — not the `currentBalance` prop, which is the legacy DB
     balance and is a DIFFERENT, frozen number for a Connect-onboarded
     seller (their sale proceeds move to Stripe via Transfer, never into
     current_balance, once they're onboarded). The server re-verifies
     against Stripe directly regardless, so this is a UX cap, not the
     source of truth. Falls back to a min-only check if the balance
     fetch failed (connectBalance stays null). */
  const connectAmountValid =
    safeAmount >= MIN_WITHDRAW && (connectBalance === null || safeAmount <= connectBalance);

  const submitConnectPayout = async () => {
    if (!user?.steamId || !connectAmountValid || submitting) return;
    setSubmitting(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/stripe-connect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'Content-Type': 'application/json',
          'x-steam-id': user.steamId,
        },
        body: JSON.stringify({ action: 'payout', amount: safeAmount }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Payout failed');
      setConnectPayoutId(body?.data?.payoutId || null);
      setStep('success');
      addToast({
        type: 'success',
        title: 'Payout sent',
        message: `${fmtKc(safeAmount)} is on its way to your bank.`,
        duration: 5000,
      });
      setTimeout(() => {
        onSuccess();
        reset();
      }, 2400);
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Payout failed',
        message: e instanceof Error ? e.message : 'Please try again later.',
      });
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
    reset();
  };

  const submit = async () => {
    if (!user || !amountValid || !detailValid || submitting) return;
    setSubmitting(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const methodMap: Record<MethodId, string> = {
        bank: 'bank_transfer',
        card: 'card',
        paypal: 'paypal',
      };
      const payoutDetails =
        method === 'bank'
          ? { iban: details.iban.trim() }
          : method === 'card'
            ? { card_number: details.cardNumber.trim() }
            : { email: details.email.trim() };

      const res = await fetch(`${supabaseUrl}/functions/v1/withdraw-submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'Content-Type': 'application/json',
          'x-steam-id': user.steamId,
        },
        body: JSON.stringify({
          amount: safeAmount,
          method: methodMap[method],
          payout_details: payoutDetails,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body?.error?.message || body?.error || 'Withdrawal request failed',
        );
      }
      setStep('success');
      addToast({
        type: 'success',
        title: 'Withdrawal requested',
        message: `${fmtKc(net)} pending admin review.`,
        duration: 5000,
      });
      setTimeout(() => {
        onSuccess();
        reset();
      }, 2400);
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Withdrawal failed',
        message: e instanceof Error ? e.message : 'Please try again later.',
      });
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full h-12 bg-subtle rounded-2xl px-4 text-[14px] text-ink font-medium outline-none focus:ring-2 focus:ring-accent/40 transition-shadow placeholder:text-ink-dim';

  const typeAmount = (raw: string) => {
    const v = raw === '' ? 0 : Number(raw);
    setAmount(v);
  };

  const headerTitle =
    step === 'method'
      ? 'Choose payout method'
      : step === 'success'
        ? 'All done'
        : 'Withdraw your Skinify balance';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile-only dimmed backdrop. On lg+ the modal is full-screen
              so a backdrop would be invisible — we skip rendering it. */}
          <motion.div
            key="withdraw-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-[89] bg-black/55 lg:backdrop-blur-sm"
            aria-hidden
          />

          <motion.div
            key="withdraw-root"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36, mass: 0.9 }}
            role="dialog"
            aria-modal="true"
            aria-label="Withdraw funds"
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (submitting) return;
              const isMobile = window.matchMedia('(max-width: 1023px)').matches;
              if (!isMobile) return;
              if (info.offset.y > 120 || info.velocity.y > 600) {
                handleClose();
              }
            }}
            className="withdraw-modal-root fixed inset-x-0 bottom-0 z-[90] bg-bg text-ink flex flex-col overflow-hidden rounded-t-[28px] shadow-[0_-24px_60px_-12px_rgba(0,0,0,0.5)] lg:inset-0 lg:m-auto lg:w-[min(1080px,94vw)] lg:rounded-[24px] lg:shadow-2xl"
          >
            <style>{`
              .withdraw-modal-root { height: 92dvh; }
              @media (min-width: 1024px) {
                .withdraw-modal-root { height: min(680px, 92dvh); }
              }
            `}</style>

            {/* Drag handle — mobile only. */}
            <div className="lg:hidden shrink-0 pt-2.5 pb-1 grid place-items-center">
              <button
                type="button"
                onClick={handleClose}
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
                {step === 'method' && (
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
                    Wallet
                  </div>
                  <div className="text-[14px] sm:text-[16px] font-bold tracking-tight text-ink leading-none mt-0.5 truncate">
                    {headerTitle}
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                className="hidden lg:grid h-10 w-10 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink place-items-center transition-colors"
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            </header>

            {connectPayoutsEnabled ? (
              /* ══════════ Stripe Connect flow: one step, no method picker ══════════ */
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-5">
                <AnimatePresence mode="wait">
                  {step !== 'success' ? (
                    <motion.div
                      key="connect-amount"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.18 }}
                      className="max-w-[480px] mx-auto space-y-4"
                    >
                      <div className="rounded-2xl bg-accent-soft px-4 py-3 flex items-center gap-2.5">
                        <Zap size={15} strokeWidth={2.4} className="text-accent shrink-0" />
                        <p className="text-[12px] text-ink font-semibold leading-snug">
                          Instant payout via Stripe — no review queue, no fee from Skinify.
                        </p>
                      </div>

                      <div className="rounded-3xl bg-subtle p-4 flex items-center justify-between">
                        <span className="text-[12.5px] text-ink-muted font-medium">Your Stripe balance</span>
                        {connectBalanceLoading ? (
                          <Loader2 size={14} className="animate-spin text-ink-dim" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => connectBalance !== null && setAmount(connectBalance)}
                            disabled={!connectBalance}
                            className="text-[15px] font-bold tabular-nums text-ink disabled:opacity-60 hover:text-accent transition-colors"
                          >
                            {connectBalance !== null ? fmtKc(connectBalance) : '—'}
                          </button>
                        )}
                      </div>

                      <AmountField
                        amount={amount}
                        belowMin={belowMin || (connectBalance !== null && safeAmount > connectBalance)}
                        errorText={
                          connectBalance !== null && safeAmount > connectBalance
                            ? 'Amount exceeds your Stripe balance.'
                            : belowMin
                              ? `Minimum withdrawal is ${fmtKc(MIN_WITHDRAW)}.`
                              : null
                        }
                        inputRef={inputRef}
                        onChange={typeAmount}
                      />

                      <p className="text-[11px] text-ink-dim font-medium">
                        Minimum {fmtKc(MIN_WITHDRAW)} · paid straight to your bank via Stripe
                      </p>

                      <motion.button
                        whileTap={tap}
                        whileHover={connectAmountValid ? { scale: 1.005 } : undefined}
                        onClick={submitConnectPayout}
                        disabled={!connectAmountValid || submitting}
                        className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={15} strokeWidth={2.4} className="animate-spin" />
                            Sending…
                          </>
                        ) : safeAmount > 0 ? (
                          `Payout ${fmtKc(safeAmount)}`
                        ) : (
                          'Enter an amount'
                        )}
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="connect-success"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="max-w-[420px] mx-auto py-10 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                        className="w-16 h-16 rounded-full bg-emerald-500/15 grid place-items-center mx-auto mb-4"
                      >
                        <Check size={26} strokeWidth={2.6} className="text-emerald-600 dark:text-emerald-400" />
                      </motion.div>
                      <h3 className="text-[19px] font-bold text-ink tracking-tight">Payout sent</h3>
                      <p className="text-[13px] text-ink-muted font-medium mt-1.5 max-w-[320px] mx-auto leading-relaxed">
                        {fmtKc(safeAmount)} is on its way to your bank via Stripe.
                        {connectPayoutId && (
                          <span className="block mt-1.5 text-[11px] text-ink-dim font-mono">{connectPayoutId}</span>
                        )}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* ══════════ Legacy flow: amount → method → success ══════════ */
              <>
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
                  {/* LEFT — context / summary (the only scroll surface) */}
                  <section
                    className="min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-5 lg:border-r"
                    style={{ borderColor: 'rgb(var(--line))' }}
                  >
                    <div className="max-w-[640px] mx-auto lg:mx-0">
                      {/* Mobile-only top section — amount first. */}
                      <div className="lg:hidden space-y-4 mb-5">
                        {step === 'amount' && (
                          <>
                            <div className="kv-row !py-2.5 rounded-2xl bg-subtle px-4">
                              <span className="kv-label">Available balance</span>
                              <span className="kv-value tabular-nums">{fmtKc(currentBalance)}</span>
                            </div>
                            <AmountField
                              amount={amount}
                              belowMin={belowMin}
                              errorText={amountError}
                              inputRef={inputRef}
                              onChange={typeAmount}
                            />
                            <div className="flex gap-1.5">
                              {[0.25, 0.5, 0.75, 1].map((f) => (
                                <button
                                  key={f}
                                  onClick={() =>
                                    setAmount(Math.floor(currentBalance * f * 100) / 100)
                                  }
                                  className="flex-1 h-9 rounded-full bg-subtle hover:bg-accent-soft text-ink-muted hover:text-ink text-[12px] font-bold transition-colors"
                                >
                                  {f === 1 ? 'Max' : `${f * 100}%`}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                        {step === 'method' && (
                          <MethodPicker
                            method={method}
                            setMethod={setMethod}
                            activeMethod={activeMethod}
                            detailValue={detailValue}
                            setDetails={setDetails}
                            inputCls={inputCls}
                          />
                        )}
                      </div>

                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                        {step === 'method' ? 'Payout details' : 'Withdraw'}
                      </div>
                      <h2 className="text-[16px] sm:text-[20px] font-bold tracking-tight text-ink leading-tight mt-1">
                        {step === 'method'
                          ? `Send to your ${activeMethod.label.toLowerCase()}`
                          : 'Cash out your balance'}
                      </h2>

                      {/* Withdraw artwork — fills the otherwise empty left
                          column, mirrors DepositModal's layout. */}
                      <motion.img
                        src="/skinify_graphics/2d6d1099-d6d0-46ad-9462-bca2246e2160-removebg-preview_upscaled.png"
                        alt=""
                        aria-hidden
                        initial={{ opacity: 0, y: 14, rotate: 2 }}
                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.1 }}
                        className="mt-5 w-full max-w-[420px] mx-auto object-contain select-none pointer-events-none drop-shadow-[0_24px_40px_rgba(0,0,0,0.35)] scale-x-[-1]"
                        draggable={false}
                      />

                      <p className="text-[11px] text-ink-dim font-medium mt-4 leading-relaxed">
                        Requests are reviewed by our team — funds leave your balance now
                        and are returned automatically if the request is declined.
                      </p>

                      {/* Mobile breakdown above the sticky CTA. */}
                      <div className="lg:hidden mt-5 rounded-3xl bg-subtle p-4 space-y-2">
                        <Row label="Withdrawal" value={fmtKc(safeAmount)} />
                        <Row label="Fee (1.5%)" value={`− ${fmtKc(fee)}`} />
                        <div className="h-px my-1" style={{ background: 'rgb(var(--accent) / 0.30)' }} />
                        <Row label="You'll receive" value={fmtKc(net)} tone="positive" bold />
                      </div>
                      <div className="lg:hidden h-24" aria-hidden />
                    </div>
                  </section>

                  {/* RIGHT — rigid action surface, never scrolls. */}
                  <aside className="hidden lg:flex flex-col bg-surface/40 px-8 py-6 overflow-hidden">
                    <div className="max-w-[480px] mx-auto w-full flex-1 flex flex-col gap-4">
                      <AnimatePresence mode="wait">
                        {step === 'amount' && (
                          <motion.div
                            key="d-amount"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.16 }}
                            className="flex-1 flex flex-col gap-4"
                          >
                            <div>
                              <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                                Available balance
                              </div>
                              <h2 className="text-[24px] font-bold tracking-tight text-ink leading-tight mt-1">
                                {fmtKc(currentBalance)}
                              </h2>
                            </div>

                            <AmountField
                              amount={amount}
                              belowMin={belowMin}
                              errorText={amountError}
                              inputRef={inputRef}
                              onChange={typeAmount}
                            />

                            <div className="flex gap-1.5">
                              {[0.25, 0.5, 0.75, 1].map((f) => (
                                <button
                                  key={f}
                                  onClick={() =>
                                    setAmount(Math.floor(currentBalance * f * 100) / 100)
                                  }
                                  className="flex-1 h-9 rounded-full bg-subtle hover:bg-accent-soft text-ink-muted hover:text-ink text-[12px] font-bold transition-colors"
                                >
                                  {f === 1 ? 'Max' : `${f * 100}%`}
                                </button>
                              ))}
                            </div>

                            <div className="mt-auto rounded-3xl bg-subtle p-4 space-y-2">
                              <Row label="Withdrawal" value={fmtKc(safeAmount)} />
                              <Row label="Fee (1.5%)" value={`− ${fmtKc(fee)}`} />
                              <div className="h-px my-1" style={{ background: 'rgb(var(--accent) / 0.30)' }} />
                              <Row label="You'll receive" value={fmtKc(net)} tone="positive" bold />
                            </div>

                            <motion.button
                              whileTap={tap}
                              whileHover={amountValid ? { scale: 1.005 } : undefined}
                              onClick={() => amountValid && setStep('method')}
                              disabled={!amountValid}
                              className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
                            >
                              Continue
                            </motion.button>
                          </motion.div>
                        )}

                        {step === 'method' && (
                          <motion.div
                            key="d-method"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.16 }}
                            className="flex-1 flex flex-col gap-4"
                          >
                            <div>
                              <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                                Payout method
                              </div>
                              <h2 className="text-[24px] font-bold tracking-tight text-ink leading-tight mt-1">
                                Where should it go?
                              </h2>
                            </div>

                            <MethodPicker
                              method={method}
                              setMethod={setMethod}
                              activeMethod={activeMethod}
                              detailValue={detailValue}
                              setDetails={setDetails}
                              inputCls={inputCls}
                            />

                            <div className="mt-auto rounded-3xl bg-subtle p-4 space-y-2">
                              <Row label="Withdrawal" value={fmtKc(safeAmount)} />
                              <Row label="Fee (1.5%)" value={`− ${fmtKc(fee)}`} />
                              <div className="h-px my-1" style={{ background: 'rgb(var(--accent) / 0.30)' }} />
                              <Row label="You'll receive" value={fmtKc(net)} tone="positive" bold />
                            </div>

                            <motion.button
                              whileTap={tap}
                              whileHover={detailValid ? { scale: 1.005 } : undefined}
                              onClick={submit}
                              disabled={!detailValid || submitting}
                              className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 size={15} strokeWidth={2.4} className="animate-spin" />
                                  Submitting…
                                </>
                              ) : (
                                `Withdraw ${fmtKc(net)}`
                              )}
                            </motion.button>
                          </motion.div>
                        )}

                        {step === 'success' && (
                          <motion.div
                            key="d-success"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 flex flex-col items-center justify-center text-center py-10"
                          >
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                              className="w-16 h-16 rounded-full bg-emerald-500/15 grid place-items-center mb-4"
                            >
                              <Check size={26} strokeWidth={2.6} className="text-emerald-600 dark:text-emerald-400" />
                            </motion.div>
                            <h3 className="text-[19px] font-bold text-ink tracking-tight">
                              Request submitted
                            </h3>
                            <p className="text-[13px] text-ink-muted font-medium mt-1.5 max-w-[320px] leading-relaxed">
                              {fmtKc(net)} via {activeMethod.label.toLowerCase()} is pending
                              review — you'll get a notification once it's processed.
                            </p>
                            <div className="mt-4 rounded-2xl bg-subtle px-4 py-1 text-left w-full max-w-[320px]">
                              <Row label="Amount" value={fmtKc(net)} />
                              <Row label="Processing time" value={activeMethod.sub} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </aside>
                </div>

                {/* Mobile-only sticky CTA. */}
                {step !== 'success' && (
                  <div
                    className="lg:hidden shrink-0 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] bg-bg/95 backdrop-blur-md border-t"
                    style={{ borderColor: 'rgb(var(--line))' }}
                  >
                    <motion.button
                      whileTap={tap}
                      onClick={() => (step === 'amount' ? amountValid && setStep('method') : submit())}
                      disabled={step === 'amount' ? !amountValid : !detailValid || submitting}
                      className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
                      style={{ boxShadow: '0 10px 24px -12px rgb(var(--accent) / 0.65)' }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={15} strokeWidth={2.4} className="animate-spin" />
                          Submitting…
                        </>
                      ) : step === 'amount' ? (
                        'Continue'
                      ) : (
                        `Withdraw ${fmtKc(net)}`
                      )}
                    </motion.button>
                  </div>
                )}

                {step === 'success' && (
                  <div className="lg:hidden shrink-0 px-4 py-4">
                    <div className="max-w-[420px] mx-auto text-center py-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                        className="w-14 h-14 rounded-full bg-emerald-500/15 grid place-items-center mx-auto mb-4"
                      >
                        <Check size={24} strokeWidth={2.6} className="text-emerald-600 dark:text-emerald-400" />
                      </motion.div>
                      <h3 className="text-[17px] font-bold text-ink tracking-tight">
                        Request submitted
                      </h3>
                      <p className="text-[12.5px] text-ink-muted font-medium mt-1 max-w-[300px] mx-auto">
                        {fmtKc(net)} via {activeMethod.label.toLowerCase()} is pending
                        review — you'll get a notification once it's processed.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   MethodPicker — payout method radio list + the active method's detail
   input. Shared between the mobile inline slot and the desktop aside.
   ───────────────────────────────────────────────────────────────────────── */
const MethodPicker: React.FC<{
  method: MethodId;
  setMethod: (m: MethodId) => void;
  activeMethod: (typeof METHODS)[number];
  detailValue: string;
  setDetails: React.Dispatch<React.SetStateAction<{ iban: string; cardNumber: string; email: string }>>;
  inputCls: string;
}> = ({ method, setMethod, activeMethod, detailValue, setDetails, inputCls }) => (
  <div className="space-y-4">
    <div>
      <label className="label-meta block mb-1.5">Payout method</label>
      <div className="space-y-1.5">
        {METHODS.map((m) => {
          const active = method === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${
                active ? 'bg-accent-soft ring-1 ring-accent/40' : 'bg-subtle hover:bg-accent-soft/50'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full grid place-items-center shrink-0 ${
                  active ? 'bg-accent' : 'border-2 border-line'
                }`}
              >
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-1.5 h-1.5 rounded-full bg-on-accent"
                  />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-bold text-ink tracking-tight">{m.label}</span>
                <span className="block text-[11.5px] text-ink-muted font-medium">{m.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>

    <div>
      <label className="label-meta block mb-1.5">{activeMethod.inputLabel}</label>
      <input
        type={method === 'paypal' ? 'email' : 'text'}
        value={detailValue}
        onChange={(e) =>
          setDetails((prev) => ({ ...prev, [activeMethod.field]: e.target.value }))
        }
        placeholder={activeMethod.placeholder}
        className={inputCls}
      />
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   AmountField — plain numeric input in the deposit-style card. (No
   rolling-digit reel here — withdrawals are usually typed exactly or
   set via the 25/50/75/Max buttons, which don't need the odometer
   flourish DepositModal uses for its fixed preset amounts.)
   ───────────────────────────────────────────────────────────────────────── */
const AmountField: React.FC<{
  amount: number;
  belowMin: boolean;
  errorText: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (raw: string) => void;
}> = ({ amount, belowMin, errorText, inputRef, onChange }) => (
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
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={MIN_WITHDRAW}
          value={Number.isFinite(amount) && amount > 0 ? amount : ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[34px] sm:text-[38px] font-bold tracking-tight tabular-nums w-full min-w-0 caret-accent text-ink"
          placeholder="0"
          aria-label="Withdrawal amount"
        />
        <span className="text-[14px] font-bold text-ink-muted shrink-0">Kč</span>
      </div>
      {errorText && (
        <div className="text-[11.5px] font-semibold text-rose-500 mt-1.5">{errorText}</div>
      )}
    </div>
  </div>
);

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

export default WithdrawModal;
