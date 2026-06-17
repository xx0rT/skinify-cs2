import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ExternalLink,
  Link2,
  ShieldCheck,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { spring, tap } from '../lib/motion';
import { startSteamLink } from '../utils/credentialAuth';
import useDocumentMeta from '../hooks/useDocumentMeta';

/* ─────────────────────────────────────────────────────────────────────────
   OnboardingPage — required setup gate, not a tour.

   The user lands here in two situations:
     1. Brand-new account, regardless of provider.
     2. They have an account but `tradeLink` is still empty (or Steam is
        unlinked, for credential signups). The OnboardingGate in App.tsx
        force-routes them here.

   Steps adapt to provider:
     - Steam OpenID user (steamLinked, no tradeLink): one step — set
       trade URL.
     - Credentialed user (no steamId): two steps — link Steam, then
       set trade URL.
     - All set: redirect home. The gate also prevents reaching this
       page when there's nothing to do.

   When all required fields are filled, we flip
   `localStorage.skinify_onboarded` and route to /marketplace.
   ───────────────────────────────────────────────────────────────────────── */

const TRADE_URL_PATTERN =
  /^https?:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=\w+/i;

const OnboardingPage: React.FC = () => {
  useDocumentMeta({
    title: 'Set up · Skinify',
    description: 'Finish setting up your Skinify account.',
    noindex: true,
  });

  const navigate = useNavigate();
  const { user, updateTradeLink } = useAuthStore();
  const { addToast } = useToastStore();

  /* Required steps depend on provider:
     - credentialed (no steamId)  →  ['link-steam', 'trade-url']
     - steam-linked, no tradeLink →  ['trade-url']
     - all set                    →  []  (gate should have skipped this page) */
  const stepIds = useMemo<Array<'link-steam' | 'trade-url'>>(() => {
    if (!user) return [];
    const out: Array<'link-steam' | 'trade-url'> = [];
    if (!user.steamLinked) out.push('link-steam');
    if (!user.tradeLink) out.push('trade-url');
    return out;
  }, [user?.steamLinked, user?.tradeLink]);

  const [stepIndex, setStepIndex] = useState(0);
  const [tradeLink, setTradeLink] = useState('');
  const [saving, setSaving] = useState(false);

  /* If a returning user already finished onboarding, kick them out. */
  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
    if (stepIds.length === 0) {
      try {
        localStorage.setItem('skinify_onboarded', '1');
      } catch {
        /* ignore */
      }
      navigate('/marketplace', { replace: true });
    }
  }, [user, stepIds, navigate]);

  /* Clamp the active step in case the user finishes one mid-page (e.g.
     comes back from Steam link, the array shrinks, but stepIndex still
     points at the old position). */
  useEffect(() => {
    if (stepIndex >= stepIds.length) setStepIndex(Math.max(0, stepIds.length - 1));
  }, [stepIds.length, stepIndex]);

  if (!user || stepIds.length === 0) return null;

  const currentStep = stepIds[stepIndex];
  const isLast = stepIndex === stepIds.length - 1;

  const finishGate = () => {
    try {
      localStorage.setItem('skinify_onboarded', '1');
    } catch {
      /* ignore */
    }
    addToast({
      type: 'success',
      title: 'You\'re ready to trade',
      message: 'Your Skinify account is fully set up.',
    });
    navigate('/marketplace', { replace: true });
  };

  const handleLinkSteam = () => {
    /* This redirects out to Steam OpenID. AuthCallback handles the
       return and patches the user record. When the user lands back
       here after, `user.steamLinked` will be true and this step
       disappears from `stepIds`. */
    startSteamLink();
  };

  const handleSaveTradeUrl = async () => {
    const trimmed = tradeLink.trim();
    if (!TRADE_URL_PATTERN.test(trimmed)) {
      addToast({
        type: 'error',
        title: 'Invalid trade URL',
        message:
          'Paste the link from steamcommunity.com/id/<you>/tradeoffers/privacy. It should contain partner= and token= parameters.',
      });
      return;
    }
    setSaving(true);
    try {
      const ok = await updateTradeLink(trimmed);
      if (!ok) {
        addToast({
          type: 'error',
          title: 'Could not save',
          message: 'Try again, or update from Profile → Settings.',
        });
        return;
      }
      if (isLast) {
        finishGate();
      } else {
        setStepIndex((s) => s + 1);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[700px] mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-5">
        {/* Header + progress */}
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-bold uppercase tracking-wider text-ink-dim tabular-nums">
            Step {stepIndex + 1} of {stepIds.length}
          </div>
          {/* No "skip" — these are required to use the platform. We
              instead surface a quick exit to Settings for users who
              prefer to set things up there. */}
          <button
            onClick={() => navigate('/profile?tab=settings', { replace: true })}
            className="text-[12.5px] font-semibold text-ink-muted hover:text-ink transition-colors"
          >
            Go to settings
          </button>
        </div>

        <div className="flex items-center gap-2">
          {stepIds.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full overflow-hidden bg-subtle"
            >
              <motion.div
                className="h-full bg-accent rounded-full"
                animate={{ width: i <= stepIndex ? '100%' : '0%' }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          ))}
        </div>

        <div className="card p-8 sm:p-10 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ ...spring, mass: 0.6 }}
            >
              {currentStep === 'link-steam' ? (
                <LinkSteamStep onLink={handleLinkSteam} />
              ) : (
                <TradeUrlStep
                  value={tradeLink}
                  onChange={setTradeLink}
                  saving={saving}
                  onSave={handleSaveTradeUrl}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav — only "Back" matters; "Continue" lives inside
            each step so it can run a custom action. */}
        <div className="flex items-center justify-between gap-3">
          <motion.button
            whileTap={tap}
            onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
            disabled={stepIndex === 0}
            className="h-11 px-4 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2.4} />
            Back
          </motion.button>
          <div className="text-[11.5px] text-ink-dim font-medium">
            Required to start trading on Skinify
          </div>
        </div>
      </main>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   LinkSteamStep — only shown to credentialed users without a steam_id.
   ───────────────────────────────────────────────────────────────────────── */
const LinkSteamStep: React.FC<{ onLink: () => void }> = ({ onLink }) => (
  <>
    <div
      className="relative w-16 h-16 rounded-3xl grid place-items-center mb-6"
      style={{
        background: 'linear-gradient(140deg, #1b2838, #2a475ecc 55%, #66c0f488)',
        boxShadow: '0 16px 30px -10px rgba(102,192,244,0.4), inset 0 1px 0 rgba(255,255,255,0.18)',
      }}
    >
      <Link2 size={26} strokeWidth={2.2} className="text-white relative z-10 drop-shadow" />
    </div>

    <span className="label-eyebrow">Link Steam</span>
    <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight mt-2 leading-tight">
      Connect your Steam account
    </h1>
    <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-4 leading-relaxed">
      Trades happen through Steam's escrow, so every Skinify account needs
      a linked Steam ID. We only read your public profile and inventory —
      we never see your password.
    </p>

    <ul className="mt-5 space-y-2.5">
      {[
        'You\'re redirected to Steam to sign in (OpenID).',
        'Steam returns your public ID — that\'s it.',
        'You come back here to finish setup.',
      ].map((line, i) => (
        <li key={line} className="flex items-start gap-3 text-[13px] text-ink font-semibold">
          <span className="shrink-0 w-6 h-6 rounded-full bg-accent-soft text-accent text-[11px] font-bold grid place-items-center tabular-nums mt-0.5">
            {i + 1}
          </span>
          {line}
        </li>
      ))}
    </ul>

    <motion.button
      whileTap={tap}
      whileHover={{ scale: 1.02 }}
      onClick={onLink}
      className="mt-7 h-12 px-5 rounded-full bg-[#1b2838] hover:bg-[#2a475e] text-white font-bold text-[13.5px] inline-flex items-center gap-2 transition-colors"
      style={{ boxShadow: '0 12px 26px -12px rgba(27,40,56,0.6)' }}
    >
      <Link2 size={15} strokeWidth={2.4} />
      Sign in through Steam
    </motion.button>
  </>
);

/* ─────────────────────────────────────────────────────────────────────────
   TradeUrlStep — required for both providers. We validate the URL with
   the same regex SettingsTab uses so existing helper / dashboard flows
   accept the value we save here.
   ───────────────────────────────────────────────────────────────────────── */
const TradeUrlStep: React.FC<{
  value: string;
  onChange: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}> = ({ value, onChange, saving, onSave }) => {
  const looksValid = TRADE_URL_PATTERN.test(value.trim());
  return (
    <>
      <div
        className="relative w-16 h-16 rounded-3xl grid place-items-center mb-6"
        style={{
          background: 'linear-gradient(140deg, #10b981, #10b981cc 55%, #6ee7b788)',
          boxShadow: '0 16px 30px -10px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.28)',
        }}
      >
        <ShieldCheck size={26} strokeWidth={2.2} className="text-white relative z-10 drop-shadow" />
      </div>

      <span className="label-eyebrow">Trade URL</span>
      <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight mt-2 leading-tight">
        Set your Steam trade URL
      </h1>
      <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-4 leading-relaxed">
        Sellers send your items to this URL when an escrow releases. Without
        it we can't deliver trades to you. Paste the URL from your Steam
        trade-offer privacy page.
      </p>

      <a
        href="https://steamcommunity.com/my/tradeoffers/privacy"
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-accent hover:underline"
      >
        Open Steam trade-URL settings
        <ExternalLink size={12} strokeWidth={2.4} />
      </a>

      <div className="mt-5">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim mb-1.5">
          Your trade URL
        </div>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…"
          className="w-full h-12 px-4 rounded-2xl bg-subtle text-ink text-[13.5px] font-medium outline-none focus:bg-bg focus:ring-2 focus:ring-accent/40 transition-all"
        />
        {value.trim() && (
          <div
            className={`mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${
              looksValid
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {looksValid ? (
              <>
                <Check size={12} strokeWidth={2.6} />
                Looks good
              </>
            ) : (
              <>Should start with steamcommunity.com/tradeoffer/new/?partner=…&token=…</>
            )}
          </div>
        )}
      </div>

      <motion.button
        whileTap={tap}
        whileHover={!saving && looksValid ? { scale: 1.02 } : undefined}
        onClick={onSave}
        disabled={saving || !looksValid}
        className="mt-7 h-12 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.6)' }}
      >
        {saving ? 'Saving…' : 'Save & continue'}
        <ArrowRight size={14} strokeWidth={2.4} />
      </motion.button>
    </>
  );
};

export default OnboardingPage;
