import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useCurrencyStore } from '../store/currencyStore';
import { useToastStore } from '../store/toastStore';
import { spring, tap } from '../lib/motion';

/**
 * DepositModal — full-screen, two-pane "add funds" dialog.
 *
 * Left pane: payment methods grouped by family.
 * Right pane: amount input + quick-amount pills + summary + CTA.
 * Top of right pane: dismissible promo banner (deposit bonus).
 *
 * The previous version was a 520px-wide card with cheap rainbow icon chips.
 * This iteration removes every decorative icon and lets typography do the
 * work — methods are listed by name, optionally with a small pill for
 * provider details (No fee, 1%, etc.).
 */

let _openSetter: ((open: boolean) => void) | null = null;
export const openDepositModal = () => _openSetter?.(true);
export const closeDepositModal = () => _openSetter?.(false);

type MethodId =
  | 'card-eu'
  | 'card-us'
  | 'apple-pay'
  | 'google-pay'
  | 'sepa'
  | 'paypal'
  | 'crypto-btc'
  | 'crypto-eth'
  | 'crypto-usdt'
  | 'paysafecard'
  | 'skinpay'
  | 'kinguin'
  | 'eneba';

interface MethodDef {
  id: MethodId;
  label: string;
  hint?: string;
  fee?: string;
  recommended?: boolean;
}

interface MethodGroup {
  title: string;
  methods: MethodDef[];
}

const METHOD_GROUPS: MethodGroup[] = [
  {
    title: 'Cards & wallets',
    methods: [
      { id: 'card-eu', label: 'Visa & MasterCard', hint: 'EU issuers', recommended: true },
      { id: 'card-us', label: 'Visa & MasterCard', hint: 'US issuers' },
      { id: 'apple-pay', label: 'Apple Pay' },
      { id: 'google-pay', label: 'Google Pay' },
      { id: 'paypal', label: 'PayPal', fee: '2.5%' },
    ],
  },
  {
    title: 'Bank',
    methods: [
      { id: 'sepa', label: 'SEPA bank transfer', hint: 'Settles in 1 business day' },
    ],
  },
  {
    title: 'Crypto',
    methods: [
      { id: 'crypto-btc', label: 'Bitcoin', fee: '1%' },
      { id: 'crypto-eth', label: 'Ethereum', fee: '1%' },
      { id: 'crypto-usdt', label: 'USDT', hint: 'ERC-20 · TRC-20', fee: '1%' },
    ],
  },
  {
    title: 'Vouchers & gift cards',
    methods: [
      { id: 'paysafecard', label: 'Paysafecard', fee: '4%' },
      { id: 'kinguin', label: 'Kinguin wallet', fee: '3%' },
      { id: 'eneba', label: 'Eneba wallet', fee: '3%' },
    ],
  },
  {
    title: 'Skins',
    methods: [
      { id: 'skinpay', label: 'Pay with CS2 skins', hint: 'From your Steam inventory' },
    ],
  },
];

const QUICK_AMOUNTS = [200, 500, 1000, 2500, 5000, 10000];
const MIN_AMOUNT = 100;

const PROMO = {
  enabled: true,
  code: 'WELCOME10',
  copy: '+10% bonus on your first deposit · auto-applied at checkout',
};

const calcFeeRate = (id: MethodId): number => {
  if (id === 'paypal') return 0.025;
  if (id.startsWith('crypto-')) return 0.01;
  if (id === 'paysafecard') return 0.04;
  if (id === 'kinguin' || id === 'eneba') return 0.03;
  return 0;
};

export const DepositModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [method, setMethod] = useState<MethodId>('card-eu');
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

  const selectedMethod = useMemo(() => {
    for (const g of METHOD_GROUPS) {
      const m = g.methods.find((x) => x.id === method);
      if (m) return m;
    }
    return undefined;
  }, [method]);

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
          className="fixed inset-0 z-[90] bg-bg text-ink overflow-hidden flex flex-col"
        >
          {/* Top bar */}
          <header className="shrink-0 flex items-center justify-between px-5 sm:px-8 h-16 border-b border-line">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
                Wallet
              </div>
              <div className="text-[15px] sm:text-[16px] font-bold tracking-tight text-ink leading-none mt-1">
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

          {/* Split pane */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] overflow-hidden">
            {/* LEFT — methods */}
            <section className="overflow-y-auto px-5 sm:px-8 py-6 lg:border-r lg:border-line">
              <div className="max-w-[640px] mx-auto lg:mx-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
                  Payment method
                </div>
                <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-ink leading-tight mt-1">
                  Pick how you want to pay
                </h2>
                <p className="text-[13px] text-ink-muted font-medium mt-2 max-w-[420px] leading-relaxed">
                  All methods deposit instantly except SEPA bank transfer, which
                  settles in one business day. Fees apply to the provider, never to Skinify.
                </p>

                <div className="mt-6 space-y-6">
                  {METHOD_GROUPS.map((group) => (
                    <div key={group.title}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim mb-2.5">
                        {group.title}
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-line">
                        {group.methods.map((m, i) => {
                          const active = method === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => setMethod(m.id)}
                              className={`w-full text-left flex items-center gap-3 px-4 py-3.5 transition-colors ${
                                i > 0 ? 'border-t border-line' : ''
                              } ${active ? 'bg-accent-soft' : 'hover:bg-subtle/60'}`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full grid place-items-center shrink-0 transition-colors ${
                                  active
                                    ? 'bg-accent text-on-accent'
                                    : 'bg-subtle ring-1 ring-line'
                                }`}
                                aria-hidden
                              >
                                {active && <Check size={11} strokeWidth={3.2} />}
                              </span>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[14px] font-bold text-ink tracking-tight">
                                    {m.label}
                                  </span>
                                  {m.recommended && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                                      Recommended
                                    </span>
                                  )}
                                </div>
                                {m.hint && (
                                  <div className="text-[12px] text-ink-muted font-medium mt-0.5 truncate">
                                    {m.hint}
                                  </div>
                                )}
                              </div>

                              <div className="shrink-0 text-right">
                                <div
                                  className={`text-[11.5px] font-bold ${
                                    m.fee ? 'text-ink-muted' : 'text-emerald-700 dark:text-emerald-400'
                                  }`}
                                >
                                  {m.fee ? `${m.fee} fee` : 'No fee'}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11.5px] text-ink-dim font-medium mt-6 leading-relaxed">
                  We never see or store your card details. Card and Apple/Google Pay flow
                  through Revolut Merchant; bank transfers settle via your bank;
                  crypto deposits confirm on-chain.
                </p>
              </div>
            </section>

            {/* RIGHT — amount + summary */}
            <aside className="overflow-y-auto bg-surface/30 px-5 sm:px-8 py-6">
              <div className="max-w-[480px] mx-auto lg:mx-0 space-y-5">
                {/* Promo banner — sits at the top of the right pane */}
                {promoActive && (
                  <div className="rounded-3xl bg-accent-soft p-4 sm:p-5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-accent">
                          Active
                        </span>
                        <span className="text-[11px] font-mono font-bold text-accent">
                          {PROMO.code}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-ink leading-snug">
                        {PROMO.copy}
                      </p>
                    </div>
                    <button
                      onClick={() => setPromoActive(false)}
                      aria-label="Remove promo"
                      className="shrink-0 h-7 w-7 rounded-full bg-bg/60 hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
                    >
                      <X size={12} strokeWidth={2.4} />
                    </button>
                  </div>
                )}

                {/* Amount input */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim mb-2.5">
                    Amount
                  </div>
                  <div
                    className={`rounded-3xl bg-subtle px-5 py-4 transition-shadow ${
                      belowMin ? 'ring-2 ring-rose-500/60' : ''
                    }`}
                  >
                    <div className="flex items-baseline gap-3">
                      <input
                        ref={inputRef}
                        type="number"
                        inputMode="numeric"
                        min={MIN_AMOUNT}
                        value={Number.isFinite(amount) ? amount : ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? NaN : Number(e.target.value);
                          setAmount(v);
                        }}
                        className="flex-1 bg-transparent outline-none text-[34px] sm:text-[40px] font-bold text-ink tracking-tight tabular-nums w-full min-w-0"
                        placeholder="0"
                      />
                      <span className="text-[16px] font-bold text-ink-muted shrink-0">
                        CZK
                      </span>
                    </div>
                    {belowMin && (
                      <div className="text-[11.5px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5">
                        Minimum deposit is {formatPrice(MIN_AMOUNT)}
                      </div>
                    )}
                  </div>

                  {/* Quick amounts */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {QUICK_AMOUNTS.map((v) => {
                      const active = amount === v;
                      return (
                        <motion.button
                          whileTap={tap}
                          key={v}
                          onClick={() => setAmount(v)}
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
                </div>

                {/* Summary */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim mb-2.5">
                    Summary
                  </div>
                  <div className="rounded-3xl bg-subtle p-5 space-y-2.5">
                    <Row label="You pay" value={formatPrice(safeAmount)} />
                    <Row
                      label={`${selectedMethod?.label || 'Method'} fee`}
                      value={
                        fee > 0
                          ? `− ${formatPrice(fee)}`
                          : 'No fee'
                      }
                      tone={fee > 0 ? 'muted' : 'positive'}
                    />
                    {promoActive && (
                      <Row
                        label={`Bonus · ${PROMO.code}`}
                        value={`+ ${formatPrice(bonus)}`}
                        tone="accent"
                      />
                    )}
                    <div className="h-px bg-line my-1.5" />
                    <Row label="Credited to balance" value={formatPrice(credited)} bold />
                  </div>
                </div>

                {/* CTA */}
                <motion.button
                  whileTap={tap}
                  whileHover={canSubmit ? { scale: 1.005 } : undefined}
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full h-14 rounded-full bg-accent text-on-accent font-bold text-[15px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-95"
                >
                  {submitting
                    ? 'Processing…'
                    : safeAmount > 0
                    ? `Continue · ${formatPrice(safeAmount)}`
                    : 'Enter an amount'}
                </motion.button>

                <p className="text-[11.5px] text-ink-dim font-medium leading-relaxed text-center">
                  Skinify never sees your card details. Payments are encrypted
                  and processed by your provider.
                </p>
              </div>
            </aside>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
      <span className={`text-[13px] ${labelClass}`}>{label}</span>
      <span className={`text-[13.5px] tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
};

export default DepositModal;
