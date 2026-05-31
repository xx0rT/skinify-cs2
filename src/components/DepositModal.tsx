import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Coins,
  Building2,
  Wallet,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useCurrencyStore } from '../store/currencyStore';
import { useToastStore } from '../store/toastStore';
import { spring, tap } from '../lib/motion';

/**
 * DepositModal — global "add funds" dialog.
 *
 * Mount once at the App level and open via the exported `openDepositModal()`.
 * Header refill button, balance tab, profile dropdown can all trigger it
 * without prop-drilling.
 *
 * Currently a polished UI shell — when Revolut/PayU secrets are configured
 * (see BACKEND_STATUS.md) the "Continue" button should call the corresponding
 * Edge Function and redirect to checkout. Until then we toast a clear message
 * so users know payments aren't live yet.
 */

let _openSetter: ((open: boolean) => void) | null = null;
export const openDepositModal = () => _openSetter?.(true);
export const closeDepositModal = () => _openSetter?.(false);

type Method = 'card' | 'bank' | 'crypto';

interface MethodDef {
  id: Method;
  label: string;
  sub: string;
  Icon: React.ComponentType<any>;
  hue: string;
  fee: string;
  available: boolean;
}

const METHODS: MethodDef[] = [
  {
    id: 'card',
    label: 'Card',
    sub: 'Visa, MasterCard, Apple Pay',
    Icon: CreditCard,
    hue: 'lilac',
    fee: 'No fee',
    available: true,
  },
  {
    id: 'bank',
    label: 'Bank transfer',
    sub: 'SEPA — settles in 1 business day',
    Icon: Building2,
    hue: 'sky',
    fee: 'No fee',
    available: true,
  },
  {
    id: 'crypto',
    label: 'Crypto',
    sub: 'BTC, ETH, USDT',
    Icon: Coins,
    hue: 'lemon',
    fee: '1%',
    available: true,
  },
];

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

export const DepositModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [method, setMethod] = useState<Method>('card');
  const [submitting, setSubmitting] = useState(false);
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
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSubmit = async () => {
    if (!amount || amount <= 0) {
      addToast({ type: 'warning', title: 'Enter an amount', message: 'Pick or type the amount you want to deposit.' });
      return;
    }
    setSubmitting(true);
    try {
      // Real provider integration goes here. Both Revolut and PayU Edge
      // Functions are deployed; they need their secrets configured before
      // we can call them. Until then we surface the gap clearly instead of
      // pretending it worked.
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
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !submitting && setOpen(false)}
            className="fixed inset-0 z-[90] bg-ink/45 backdrop-blur-sm"
          />
          {/*
            Centering layer — Tailwind's -translate-x-1/2 -translate-y-1/2
            CANNOT live on the motion.div because framer-motion's animate prop
            sets `transform: translateY(0) scale(1)` inline, overriding the
            tailwind translate and slamming the modal to (left:50%, top:50%)
            which renders bottom-right of center. Outer flex layer owns
            position; inner motion.div only animates.
          */}
          <div className="fixed inset-0 z-[91] flex items-center justify-center px-4 py-4 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Add funds to your balance"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={spring}
              className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto scrollbar-thin pointer-events-auto"
            >
              <div className="card-elevated overflow-hidden">
              {/* Header */}
              <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3 relative overflow-hidden">
                <motion.div
                  aria-hidden
                  className="absolute -top-24 -right-20 w-[280px] h-[280px] rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 65%)',
                  }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative">
                  <span className="label-eyebrow">Wallet</span>
                  <h2 className="text-[22px] font-bold tracking-tight text-ink mt-1.5 leading-none">
                    Add funds
                  </h2>
                  <p className="text-[13px] text-ink-muted font-medium mt-1.5">
                    Top up your Skinify balance — no fee on card or bank.
                  </p>
                </div>
                <button
                  onClick={() => !submitting && setOpen(false)}
                  aria-label="Close"
                  className="relative shrink-0 icon-chip hover:bg-bg transition-colors"
                >
                  <X size={16} className="text-ink-muted" />
                </button>
              </div>

              {/* Amount */}
              <div className="px-6 pb-4">
                <div className="label-eyebrow mb-2.5">Amount</div>
                <div className="rounded-2xl bg-subtle px-4 py-3 flex items-baseline gap-3">
                  <input
                    ref={inputRef}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={Number.isFinite(amount) ? amount : ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? NaN : Number(e.target.value);
                      setAmount(v);
                    }}
                    className="flex-1 bg-transparent outline-none text-[28px] font-bold text-ink tracking-tight tabular-nums w-full"
                    placeholder="0"
                  />
                  <span className="text-[15px] font-bold text-ink-muted">CZK</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_AMOUNTS.map((v) => {
                    const active = amount === v;
                    return (
                      <motion.button
                        whileTap={tap}
                        key={v}
                        onClick={() => setAmount(v)}
                        className={`h-9 px-3 rounded-full text-[12.5px] font-semibold transition-colors ${
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

              {/* Method */}
              <div className="px-6 pb-4">
                <div className="label-eyebrow mb-2.5">Payment method</div>
                <div className="space-y-2">
                  {METHODS.map((m) => {
                    const active = method === m.id;
                    return (
                      <motion.button
                        whileTap={tap}
                        key={m.id}
                        onClick={() => setMethod(m.id)}
                        disabled={!m.available}
                        className={`relative w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors text-left ${
                          active
                            ? 'border-transparent bg-accent-soft'
                            : 'border-line bg-surface hover:bg-subtle'
                        } ${m.available ? '' : 'opacity-50 cursor-not-allowed'}`}
                      >
                        <div className={`icon-chip chip-${m.hue}`}>
                          <m.Icon
                            size={18}
                            strokeWidth={2.2}
                            style={{ color: `rgb(var(--hue-${m.hue}))` }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-bold text-ink tracking-tight">
                            {m.label}
                          </div>
                          <div className="text-[11.5px] text-ink-muted font-medium mt-0.5 truncate">
                            {m.sub}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <span className="pill bg-subtle text-ink-muted">{m.fee}</span>
                          <span
                            className={`w-5 h-5 rounded-full grid place-items-center transition-colors ${
                              active ? 'bg-accent text-on-accent' : 'bg-surface ring-1 ring-line'
                            }`}
                          >
                            {active && <Check size={11} strokeWidth={3} />}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="px-6 pb-4">
                <div className="card-flat px-4 py-3 space-y-2">
                  <Row label="You pay"           value={formatPrice(amount || 0)} />
                  <Row label="Fee"               value={method === 'crypto' ? formatPrice((amount || 0) * 0.01) : formatPrice(0)} />
                  <div className="h-px bg-line my-1" />
                  <Row
                    label="Credited to balance"
                    value={formatPrice(method === 'crypto' ? (amount || 0) * 0.99 : amount || 0)}
                    bold
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6">
                <motion.button
                  whileTap={tap}
                  whileHover={{ scale: 1.01 }}
                  onClick={handleSubmit}
                  disabled={submitting || !amount || amount <= 0}
                  className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
                >
                  <Wallet size={15} strokeWidth={2.4} />
                  {submitting ? 'Processing…' : `Continue · ${formatPrice(amount || 0)}`}
                </motion.button>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-dim font-semibold">
                  <ShieldCheck size={12} strokeWidth={2.2} />
                  Encrypted payment via your provider — Skinify never sees your card.
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({
  label,
  value,
  bold,
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className={`text-[13px] font-medium ${bold ? 'text-ink font-bold' : 'text-ink-muted'}`}>
      {label}
    </span>
    <span className={`text-[13.5px] tabular-nums ${bold ? 'text-ink font-bold tracking-tight' : 'text-ink font-semibold'}`}>
      {value}
    </span>
  </div>
);

export default DepositModal;
