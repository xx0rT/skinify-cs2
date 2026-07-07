import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { spring, tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   WithdrawModal — flat redesign in the site's design language.

   Two steps on one surface:
     1. Amount — big centered input, quick 25/50/75/Max chips, live
        fee/net breakdown as kv-rows.
     2. Payout — segmented method pills + one details input.
   Submit calls withdraw-submit (hold + pending request reviewed in the
   admin panel). Success state confirms the request is queued.
   ───────────────────────────────────────────────────────────────────────── */

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
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
}) => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<MethodId>('bank');
  const [details, setDetails] = useState({ iban: '', cardNumber: '', email: '' });
  const [step, setStep] = useState<'amount' | 'method' | 'success'>('amount');
  const [submitting, setSubmitting] = useState(false);

  /* Lock background scroll while open. */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const parsed = parseFloat(amount) || 0;
  const fee = Math.round(parsed * FEE_RATE * 100) / 100;
  const net = Math.round((parsed - fee) * 100) / 100;
  const amountValid = parsed >= MIN_WITHDRAW && parsed <= currentBalance;
  const amountError =
    amount === ''
      ? null
      : parsed < MIN_WITHDRAW
        ? `Minimum withdrawal is ${fmtKc(MIN_WITHDRAW)}.`
        : parsed > currentBalance
          ? 'Amount exceeds your available balance.'
          : null;

  const activeMethod = useMemo(
    () => METHODS.find((m) => m.id === method)!,
    [method],
  );
  const detailValue = details[activeMethod.field];
  const detailValid = detailValue.trim().length >= 5;

  const reset = () => {
    setAmount('');
    setMethod('bank');
    setDetails({ iban: '', cardNumber: '', email: '' });
    setStep('amount');
    setSubmitting(false);
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
          amount: parsed,
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[90] p-0 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
            className="panel w-full sm:max-w-md p-6 rounded-b-none sm:rounded-b-[20px] max-h-[92dvh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <span className="label-eyebrow">Balance</span>
                <h2 className="text-[19px] font-bold text-ink tracking-tight leading-none mt-1">
                  Withdraw funds
                </h2>
              </div>
              <button
                onClick={handleClose}
                disabled={submitting}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-subtle grid place-items-center text-ink-muted hover:text-ink transition-colors disabled:opacity-40"
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* ── Step 1: amount ── */}
              {step === 'amount' && (
                <motion.div
                  key="amount"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <div className="kv-row !py-2.5 rounded-2xl bg-subtle px-4">
                    <span className="kv-label">Available balance</span>
                    <span className="kv-value tabular-nums">{fmtKc(currentBalance)}</span>
                  </div>

                  <div>
                    <label className="label-meta block mb-1.5">Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={MIN_WITHDRAW}
                        max={currentBalance}
                        placeholder="0"
                        autoFocus
                        className="w-full h-16 bg-subtle rounded-2xl px-5 pr-14 text-[26px] font-bold tracking-tight tabular-nums text-ink outline-none focus:ring-2 focus:ring-accent/40 transition-shadow placeholder:text-ink-dim"
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-ink-muted">
                        Kč
                      </span>
                    </div>
                    {amountError ? (
                      <p className="text-[11.5px] text-rose-500 font-semibold mt-1.5">
                        {amountError}
                      </p>
                    ) : (
                      <p className="text-[11px] text-ink-dim font-medium mt-1.5">
                        Minimum {fmtKc(MIN_WITHDRAW)} · 1.5% processing fee
                      </p>
                    )}
                  </div>

                  {/* Quick fractions of the balance */}
                  <div className="flex gap-1.5">
                    {[0.25, 0.5, 0.75, 1].map((f) => (
                      <button
                        key={f}
                        onClick={() =>
                          setAmount(String(Math.floor(currentBalance * f * 100) / 100))
                        }
                        className="flex-1 h-9 rounded-full bg-subtle hover:bg-accent-soft text-ink-muted hover:text-ink text-[12px] font-bold transition-colors"
                      >
                        {f === 1 ? 'Max' : `${f * 100}%`}
                      </button>
                    ))}
                  </div>

                  {amountValid && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-0 px-1"
                    >
                      <div className="kv-row">
                        <span className="kv-label">Fee (1.5%)</span>
                        <span className="kv-value tabular-nums">−{fmtKc(fee)}</span>
                      </div>
                      <div className="kv-row">
                        <span className="kv-label">You'll receive</span>
                        <span className="kv-value tabular-nums text-emerald-600 dark:text-emerald-400">
                          {fmtKc(net)}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <motion.button
                    whileTap={tap}
                    onClick={() => amountValid && setStep('method')}
                    disabled={!amountValid}
                    className="w-full h-12 rounded-full bg-accent text-on-accent text-[14px] font-bold disabled:opacity-40 transition-opacity"
                  >
                    Continue
                  </motion.button>
                </motion.div>
              )}

              {/* ── Step 2: payout method ── */}
              {step === 'method' && (
                <motion.div
                  key="method"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  {/* Summary */}
                  <div className="rounded-2xl bg-subtle px-4 py-1">
                    <div className="kv-row">
                      <span className="kv-label">Withdrawal</span>
                      <span className="kv-value tabular-nums">{fmtKc(parsed)}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">Fee (1.5%)</span>
                      <span className="kv-value tabular-nums">−{fmtKc(fee)}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">You'll receive</span>
                      <span className="kv-value tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmtKc(net)}
                      </span>
                    </div>
                  </div>

                  {/* Method picker */}
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
                              active
                                ? 'bg-accent-soft ring-1 ring-accent/40'
                                : 'bg-subtle hover:bg-accent-soft/50'
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
                              <span className="block text-[13.5px] font-bold text-ink tracking-tight">
                                {m.label}
                              </span>
                              <span className="block text-[11.5px] text-ink-muted font-medium">
                                {m.sub}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payout details */}
                  <div>
                    <label className="label-meta block mb-1.5">
                      {activeMethod.inputLabel}
                    </label>
                    <input
                      type={method === 'paypal' ? 'email' : 'text'}
                      value={detailValue}
                      onChange={(e) =>
                        setDetails((prev) => ({
                          ...prev,
                          [activeMethod.field]: e.target.value,
                        }))
                      }
                      placeholder={activeMethod.placeholder}
                      className={inputCls}
                    />
                  </div>

                  <p className="text-[11px] text-ink-dim font-medium">
                    Requests are reviewed by our team — funds leave your balance
                    now and are returned automatically if the request is declined.
                  </p>

                  <div className="flex gap-2">
                    <motion.button
                      whileTap={tap}
                      onClick={() => setStep('amount')}
                      disabled={submitting}
                      className="h-12 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13.5px] font-bold transition-colors disabled:opacity-40"
                    >
                      Back
                    </motion.button>
                    <motion.button
                      whileTap={tap}
                      onClick={submit}
                      disabled={!detailValid || submitting}
                      className="flex-1 h-12 rounded-full bg-accent text-on-accent text-[14px] font-bold disabled:opacity-40 transition-opacity inline-flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        `Withdraw ${fmtKc(net)}`
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── Success ── */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-6 text-center"
                >
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
                  <div className="mt-4 rounded-2xl bg-subtle px-4 py-1 text-left max-w-[300px] mx-auto">
                    <div className="kv-row">
                      <span className="kv-label">Amount</span>
                      <span className="kv-value tabular-nums">{fmtKc(net)}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">Processing time</span>
                      <span className="kv-value">{activeMethod.sub}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WithdrawModal;
