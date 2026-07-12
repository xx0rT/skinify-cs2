import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Gift,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import SteamLogin from '../components/auth/SteamLogin';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { signInWithPassword, signUpWithPassword, requestPasswordReset, checkEmailConfirmed, resendConfirmation } from '../utils/credentialAuth';
import { checkDevice, recordLogin } from '../utils/twoFactor';
import TwoFactorChallenge from '../components/auth/TwoFactorChallenge';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   SignInPage — full-screen split layout

   Left:  brand artwork (Skinify banner) with promo copy overlay
   Right: sign-in form — email/password + Steam + optional referral/promo
          codes captured during sign-in and persisted to localStorage so
          the post-onboarding flow can credit them.

   No LandingNav. The only nav is a small "Back to home" chip top-left
   over the artwork so the page stays a single-purpose surface.
   ───────────────────────────────────────────────────────────────────────── */
const SignInPage: React.FC<{ initialMode?: 'signin' | 'signup' }> = ({ initialMode = 'signin' }) => {
  useDocumentMeta({
    title: 'Sign in · Skinify',
    description: 'Sign in to your Skinify account to buy and sell CS2 skins.',
    noindex: true,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToastStore();
  const setUser = useAuthStore((s) => s.setUser);

  /* One window, two modes — the bottom link flips between sign-in and
     sign-up in place instead of navigating to a separate page. */
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  /* Post-signup verification hold: instead of bouncing back to the login
     form, we park here, poll for the email being confirmed, and finish the
     login automatically the moment the user clicks the link. */
  const [awaiting, setAwaiting] = useState<{ email: string; password: string; name: string } | null>(null);
  const [resending, setResending] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [agree, setAgree] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  /* Holds the authenticated user while we wait for a 2FA code. Null when
     no challenge is pending. */
  const [pending2fa, setPending2fa] = useState<any | null>(null);

  const redirectTo = (location.state as any)?.from || '/marketplace';

  /* Finish the login: stash codes, set the user, log the session, go. */
  const finishLogin = (loggedUser: any) => {
    try {
      if (promoCode.trim()) localStorage.setItem('skinify_promo_code', promoCode.trim());
      if (referralCode.trim()) localStorage.setItem('skinify_referral_code', referralCode.trim());
    } catch {
      /* private mode */
    }
    setUser(loggedUser);
    recordLogin(); // best-effort session log
    addToast({
      type: 'success',
      title: 'Welcome back',
      message: loggedUser.displayName || loggedUser.email || '',
    });
    navigate(redirectTo, { replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter both an email address and a password.');
      return;
    }

    /* ── Sign-up branch — same window, same form. ── */
    if (mode === 'signup') {
      if (!displayName.trim()) {
        setError('Pick a display name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (!agree) {
        setError('You need to agree to the Terms of Service.');
        return;
      }
      setSubmitting(true);
      try {
        const result = await signUpWithPassword(email.trim(), password, displayName.trim());
        if (!result.ok) {
          if ((result as any).needsConfirm) {
            setAwaiting({ email: email.trim(), password, name: displayName.trim() });
            return;
          }
          setError(result.error || 'Sign up failed.');
          return;
        }
        setUser(result.user);
        addToast({
          type: 'success',
          title: 'Account created',
          message: 'Link your Steam account from your profile to start listing items.',
          duration: 6000,
        });
        navigate('/profile?tab=settings', { replace: true });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const result = await signInWithPassword(email.trim(), password);
      if (!result.ok) {
        setError(result.error || 'Sign in failed.');
        return;
      }
      /* 2FA gate: the Supabase session now exists, so we can ask the
         two-factor function whether this account requires a code AND
         whether this device is already trusted. If a code is needed,
         defer completion until the challenge passes. */
      const check = await checkDevice();
      if (check.needsCode) {
        setPending2fa(result.user);
        return;
      }
      finishLogin(result.user);
    } finally {
      setSubmitting(false);
    }
  };

  /* While the verification hold is up, poll every 4s. The moment the
     address is confirmed we sign the user in with the credentials they
     just typed and continue — no manual re-login. */
  useEffect(() => {
    if (!awaiting) return;
    let stopped = false;
    const tick = async () => {
      const confirmed = await checkEmailConfirmed(awaiting.email);
      if (stopped || !confirmed) return;
      const result = await signInWithPassword(awaiting.email, awaiting.password);
      if (stopped) return;
      if (result.ok) {
        setAwaiting(null);
        addToast({ type: 'success', title: 'E-mail potvrzen', message: 'Účet je aktivní — vítejte!' });
        setUser(result.user);
        recordLogin();
        navigate('/', { replace: true });
      } else {
        setAwaiting(null);
        setMode('signin');
        addToast({ type: 'success', title: 'E-mail potvrzen', message: 'Přihlaste se svými údaji.' });
      }
    };
    const id = window.setInterval(tick, 4000);
    tick();
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [awaiting]);

  /* Password reset — sends a Brevo email via the account-email function.
     We never reveal whether the address exists. */
  const handleForgot = async () => {
    if (!email.trim()) {
      setError('Enter your email above, then tap “Forgot password?” to get a reset link.');
      return;
    }
    setError(null);
    await requestPasswordReset(email.trim());
    addToast({
      type: 'success',
      title: 'Check your inbox',
      message: 'If an account exists for that email, a reset link is on its way.',
    });
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex">
      {/* ─── LEFT — artwork + overlay copy ─── */}
      <aside
        className="relative hidden lg:block lg:w-1/2 overflow-hidden"
        style={{ background: '#08020e' }}
      >
        <img
          src="/3586ae5d-05bb-4fcb-8a4e-9948fd62b17b.png"
          alt="Skinify — Upgrade your CS2 skins"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(140deg, rgba(8,2,14,0.85) 0%, rgba(8,2,14,0.55) 35%, rgba(8,2,14,0.20) 65%, rgba(8,2,14,0.0) 100%)',
          }}
          aria-hidden
        />

        <motion.button
          whileTap={tap}
          whileHover={{ x: -2 }}
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 z-10 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-white/90 hover:text-white px-3 h-9 rounded-full bg-black/30 backdrop-blur-sm ring-1 ring-white/15 transition-colors"
        >
          <ArrowLeft size={13} strokeWidth={2.4} />
          Back to home
        </motion.button>

        <div className="relative h-full flex flex-col justify-end px-10 lg:px-14 py-14 max-w-[600px]">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.08 }}
            className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.22em] text-purple-300/90 mb-4"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
            CS2 Marketplace
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.14 }}
            className="text-[32px] lg:text-[40px] font-bold text-white leading-[1.05] tracking-tight"
          >
            Upgrade your skins.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-fuchsia-300 to-purple-400">
              0% buyer fees, every trade.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="text-[14px] text-zinc-200/90 font-medium mt-3 leading-relaxed max-w-[440px]"
          >
            Sign in to track your inventory, list skins for sale, and unlock
            a 10% bonus on your first deposit.
          </motion.p>

          {/* Brag bar — three small stats */}
          <div className="mt-7 grid grid-cols-3 gap-3 max-w-[440px]">
            {[
              { v: '0%', l: 'Buyer fees' },
              { v: '8 days', l: 'Escrow window' },
              { v: '<1 min', l: 'Avg delivery' },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm px-3 py-2.5 text-center"
              >
                <div className="text-[16px] font-bold text-white tabular-nums tracking-tight leading-none">
                  {s.v}
                </div>
                <div className="text-[10.5px] text-zinc-300/80 font-semibold mt-1.5 truncate">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ─── RIGHT — form column ─── */}
      <main className="flex-1 flex items-center justify-center px-5 sm:px-8 py-10 sm:py-14 min-h-screen overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="w-full max-w-[420px]"
        >
          {/* Mobile back link — only on screens where the left aside is hidden */}
          <motion.button
            whileTap={tap}
            onClick={() => navigate('/')}
            className="lg:hidden inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted hover:text-ink mb-4"
          >
            <ArrowLeft size={13} strokeWidth={2.4} />
            Back to home
          </motion.button>

          {awaiting ? (
            /* ── Verification hold — parked here until the email link is
                  clicked; the poll above finishes the login automatically. ── */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-3xl bg-accent/12 grid place-items-center mx-auto mb-5">
                <Mail size={26} strokeWidth={2} className="text-accent" />
              </div>
              <span className="label-eyebrow">Ověření e-mailu</span>
              <h1 className="text-[24px] font-bold tracking-tight text-ink leading-tight mt-1.5">
                Potvrďte svůj e-mail
              </h1>
              <p className="text-[13.5px] text-ink-muted font-medium mt-3 leading-relaxed">
                Poslali jsme odkaz na{' '}
                <span className="font-bold text-ink">{awaiting.email}</span>.
                Otevřete ho — jakmile adresu potvrdíte, přihlášení tady proběhne automaticky.
              </p>

              <div className="mt-6 flex items-center justify-center gap-2.5 text-[13px] font-semibold text-ink-muted">
                <span className="w-4 h-4 rounded-full border-2 border-line border-t-accent animate-spin" />
                Čekáme na potvrzení…
              </div>

              <div className="mt-7 space-y-2">
                <motion.button
                  whileTap={tap}
                  disabled={resending}
                  onClick={async () => {
                    setResending(true);
                    const res = await resendConfirmation(awaiting.email, awaiting.name);
                    setResending(false);
                    addToast(
                      res.ok
                        ? { type: 'success', title: 'E-mail odeslán znovu', message: `Zkontrolujte ${awaiting.email}.` }
                        : { type: 'error', title: 'E-mail se nepodařilo odeslat', message: res.error, duration: 8000 },
                    );
                  }}
                  className="w-full h-11 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[13px] font-bold transition-colors disabled:opacity-60"
                >
                  {resending ? 'Odesílám…' : 'Znovu odeslat e-mail'}
                </motion.button>
                <button
                  onClick={() => {
                    setAwaiting(null);
                    setMode('signin');
                  }}
                  className="w-full text-[12.5px] font-semibold text-ink-muted hover:text-ink transition-colors py-2"
                >
                  Zpět na přihlášení
                </button>
              </div>
            </div>
          ) : (
            <>
          <span className="label-eyebrow">{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
          <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-ink leading-tight mt-1.5">
            {mode === 'signin' ? 'Welcome back' : 'Join Skinify'}
          </h1>
          <p className="text-[13.5px] text-ink-muted font-medium mt-2 leading-relaxed">
            {mode === 'signin'
              ? 'Use the email and password you signed up with, or continue with Steam.'
              : 'Create an account with email, or continue with Steam — it takes under a minute.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[12.5px] font-semibold">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {mode === 'signup' && (
              <Field
                Icon={Sparkles}
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={setDisplayName}
                autoComplete="nickname"
                required
              />
            )}
            <Field
              Icon={Mail}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <Field
              Icon={Lock}
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="text-ink-muted hover:text-ink"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />

            {mode === 'signin' ? (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={handleForgot}
                  className="text-[12px] font-semibold text-accent hover:opacity-80 transition-opacity"
                >
                  Forgot password?
                </button>
              </div>
            ) : (
              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={agree}
                  onClick={() => setAgree((v) => !v)}
                  className={`w-5 h-5 rounded-md grid place-items-center shrink-0 transition-colors ${
                    agree ? 'bg-accent text-on-accent' : 'bg-subtle'
                  }`}
                >
                  {agree && <Sparkles size={11} strokeWidth={3} />}
                </button>
                <span className="text-[12px] text-ink-muted font-medium leading-relaxed" onClick={() => setAgree((v) => !v)}>
                  I agree to the{' '}
                  <Link to="/terms" className="text-accent font-semibold" onClick={(e) => e.stopPropagation()}>
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-accent font-semibold" onClick={(e) => e.stopPropagation()}>
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            )}

            {/* Promo / referral expander — collapsed by default so the
                primary form stays compact for returning users. */}
            <button
              type="button"
              onClick={() => setExtrasOpen((v) => !v)}
              className="text-[12px] font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1.5 transition-colors"
            >
              <Gift size={12} strokeWidth={2.4} />
              {extrasOpen ? 'Hide promo / referral' : 'Have a promo or referral code?'}
            </button>

            {extrasOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                transition={spring}
                className="space-y-2 pt-1 overflow-hidden"
              >
                <Field
                  Icon={Sparkles}
                  type="text"
                  placeholder="Promo code (optional)"
                  value={promoCode}
                  onChange={setPromoCode}
                />
                <Field
                  Icon={Gift}
                  type="text"
                  placeholder="Referral code (optional)"
                  value={referralCode}
                  onChange={setReferralCode}
                />
                <p className="text-[10.5px] text-ink-dim font-medium leading-relaxed">
                  Promo codes apply credits to your next deposit. Referral
                  codes link you to the trader who invited you.
                </p>
              </motion.div>
            )}

            <motion.button
              whileTap={tap}
              whileHover={!submitting ? { scale: 1.005 } : undefined}
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.55)' }}
            >
              {submitting ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : mode === 'signin' ? 'Sign in' : 'Create account'}
            </motion.button>
          </form>

          <div className="flex items-center gap-2 my-5">
            <span className="flex-1 h-px bg-line" />
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
              Or continue with
            </span>
            <span className="flex-1 h-px bg-line" />
          </div>

          <div className="grid place-items-center">
            <SteamLogin />
          </div>

          <p className="text-[12.5px] text-ink-muted font-medium mt-6 text-center">
            {mode === 'signin' ? 'New to Skinify?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                setError(null);
              }}
              className="text-accent font-bold hover:opacity-80"
            >
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
            </>
          )}
        </motion.div>
      </main>

      <TwoFactorChallenge
        open={!!pending2fa}
        onSuccess={() => {
          const u = pending2fa;
          setPending2fa(null);
          if (u) finishLogin(u);
        }}
        onCancel={() => {
          setPending2fa(null);
          setError('Two-factor verification is required to sign in.');
        }}
      />
    </div>
  );
};

const Field: React.FC<{
  Icon: React.ComponentType<any>;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  trailing?: React.ReactNode;
}> = ({ Icon, type, placeholder, value, onChange, autoComplete, required, trailing }) => (
  <div className="flex items-center gap-2 px-3.5 h-12 rounded-2xl bg-subtle focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
    <Icon size={14} strokeWidth={2.2} className="text-ink-muted shrink-0" />
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      required={required}
      className="flex-1 bg-transparent outline-none text-[13.5px] font-medium text-ink placeholder:text-ink-dim min-w-0"
    />
    {trailing}
  </div>
);

export default SignInPage;
