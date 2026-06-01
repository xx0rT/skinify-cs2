import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Gift,
  Check,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   OnboardingPage — 3-step welcome tour shown once after a new user
   signs in for the first time. Tracked via `localStorage.skinify_onboarded`.

   Step 1 · Welcome — greets by display name
   Step 2 · How it works — escrow + 0% fees explainer
   Step 3 · Pick up your sign-up bonus — CTA to deposit
   ───────────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    Icon: Sparkles,
    tint: '#a855f7',
    eyebrow: 'Welcome',
    titleFn: (name: string) => `Welcome to Skinify, ${name}.`,
    body: 'You\'re all set up. Browse the market, list your inventory, and trade CS2 skins with full escrow protection — buyer fees are zero on every order.',
  },
  {
    Icon: ShieldCheck,
    tint: '#10b981',
    eyebrow: 'How it works',
    titleFn: () => 'Every trade is protected.',
    body: 'You pay → funds sit in escrow → the seller sends a Steam trade offer → you confirm receipt → escrow releases after 8 days (matching CS2\'s trade-back window). If anything goes wrong, you\'re refunded.',
  },
  {
    Icon: Gift,
    tint: '#f59e0b',
    eyebrow: 'Sign-up bonus',
    titleFn: () => 'Top up to unlock buying.',
    body: 'New accounts get a 10% deposit bonus on their first top-up. Add funds from the Balance tab and the bonus credits instantly — no promo code needed.',
  },
] as const;

import useDocumentMeta from '../hooks/useDocumentMeta';

const OnboardingPage: React.FC = () => {
  useDocumentMeta({
    title: 'Welcome · Skinify',
    description: 'Get started on Skinify.',
    noindex: true,
  });
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [step, setStep] = useState(0);

  /* Redirect unauthenticated users back home — onboarding only makes sense
     once Steam OpenID has returned. */
  useEffect(() => {
    if (!user) navigate('/', { replace: true });
  }, [user, navigate]);

  const markDone = () => {
    try {
      localStorage.setItem('skinify_onboarded', '1');
    } catch {
      /* private window, ignore */
    }
  };

  const finish = () => {
    markDone();
    addToast({
      type: 'success',
      title: 'You\'re ready to trade',
      message: 'Tour saved. You can revisit it from /onboarding anytime.',
    });
    navigate('/profile?tab=balance', { replace: true });
  };

  const skip = () => {
    markDone();
    navigate('/marketplace', { replace: true });
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  const back = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  if (!user) return null;

  const current = STEPS[step];
  const Icon = current.Icon;
  const displayName = user.displayName || 'trader';

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[700px] mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-5">
        {/* Progress dots + step counter */}
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-bold uppercase tracking-wider text-ink-dim tabular-nums">
            Step {step + 1} of {STEPS.length}
          </div>
          <button
            onClick={skip}
            className="text-[12.5px] font-semibold text-ink-muted hover:text-ink transition-colors"
          >
            Skip tour
          </button>
        </div>

        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 h-1.5 rounded-full overflow-hidden bg-subtle"
              initial={false}
            >
              <motion.div
                className="h-full bg-accent rounded-full"
                animate={{ width: i <= step ? '100%' : '0%' }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              />
            </motion.div>
          ))}
        </div>

        {/* Card */}
        <div className="card p-8 sm:p-10 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ ...spring, mass: 0.6 }}
            >
              {/* Medallion */}
              <div
                className="relative w-16 h-16 rounded-3xl grid place-items-center mb-6"
                style={{
                  background: `linear-gradient(140deg, ${current.tint}, ${current.tint}cc 55%, ${current.tint}88)`,
                  boxShadow: `0 16px 30px -10px ${current.tint}66, inset 0 1px 0 rgba(255,255,255,0.28)`,
                }}
              >
                <Icon size={26} strokeWidth={2.2} className="text-white relative z-10 drop-shadow" />
                <span
                  className="absolute inset-1 rounded-[20px] pointer-events-none"
                  style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.32), transparent 45%)' }}
                />
              </div>

              <span className="label-eyebrow">{current.eyebrow}</span>
              <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight mt-2 leading-tight">
                {current.titleFn(displayName)}
              </h1>
              <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-4 leading-relaxed">
                {current.body}
              </p>

              {/* Step-specific extras */}
              {step === 0 && (
                <ul className="mt-5 grid sm:grid-cols-2 gap-2">
                  {[
                    'Browse 10,000+ live listings',
                    '0% buyer fees, ever',
                    'Sticker, float, pattern filters',
                    'Wishlist + price-drop alerts',
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2 text-[12.5px] text-ink-muted font-medium">
                      <Check size={13} strokeWidth={2.6} className="text-accent shrink-0 mt-0.5" />
                      {line}
                    </li>
                  ))}
                </ul>
              )}

              {step === 1 && (
                <ol className="mt-5 space-y-2.5">
                  {[
                    'You pay — funds held in escrow',
                    'Seller sends Steam trade offer',
                    'You confirm receipt in Steam',
                    'Escrow auto-releases after 8 days',
                  ].map((line, i) => (
                    <li
                      key={line}
                      className="flex items-start gap-3 text-[13px] text-ink font-semibold"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-accent-soft text-accent text-[11px] font-bold grid place-items-center tabular-nums mt-0.5">
                        {i + 1}
                      </span>
                      {line}
                    </li>
                  ))}
                </ol>
              )}

              {step === 2 && (
                <div className="mt-6 card-flat p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="label-meta">Deposit bonus</div>
                    <div className="text-[22px] font-bold text-ink tracking-tight tabular-nums leading-none mt-1">
                      +10%
                    </div>
                  </div>
                  <div className="text-[12px] text-ink-muted font-medium text-right max-w-[200px]">
                    on your first top-up, credited instantly.
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between gap-3">
          <motion.button
            whileTap={tap}
            onClick={back}
            disabled={step === 0}
            className="h-11 px-4 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2.4} />
            Back
          </motion.button>

          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.02 }}
            onClick={next}
            className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center gap-2"
            style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
          >
            {step === STEPS.length - 1 ? 'Top up & start trading' : 'Next'}
            <ArrowRight size={14} strokeWidth={2.4} />
          </motion.button>
        </div>
      </main>
    </div>
  );
};

export default OnboardingPage;
