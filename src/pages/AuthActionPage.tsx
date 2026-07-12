import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import LandingNav from '../components/LandingNav';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { confirmEmail, completePasswordReset } from '../utils/credentialAuth';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   AuthActionPage — handles the links Brevo emails send:
     /auth/confirm?token=…   → confirms the email address
     /auth/reset?token=…     → lets the user set a new password
   The `mode` prop selects which flow. Both verify a single-use token via
   the account-email edge function.
   ───────────────────────────────────────────────────────────────────────── */

const AuthActionPage: React.FC<{ mode: 'confirm' | 'reset' }> = ({ mode }) => {
  useDocumentMeta({
    title: mode === 'confirm' ? 'Confirm your email · Skinify' : 'Reset your password · Skinify',
    noindex: true,
  });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>(
    mode === 'confirm' ? 'working' : 'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  /* Confirm runs automatically on mount. */
  useEffect(() => {
    if (mode !== 'confirm') return;
    if (!token) {
      setState('error');
      setError('This confirmation link is missing its token.');
      return;
    }
    confirmEmail(token).then((res) => {
      if (res.ok) setState('done');
      else {
        setState('error');
        setError(res.error || 'Could not confirm your email.');
      }
    });
  }, [mode, token]);

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!token) {
      setError('This reset link is missing its token.');
      return;
    }
    setState('working');
    const res = await completePasswordReset(token, password);
    if (res.ok) setState('done');
    else {
      setState('error');
      setError(res.error || 'Could not reset your password.');
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <LandingNav />
      <div className="max-w-md mx-auto px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-7"
        >
          {/* ─── Confirm flow ─── */}
          {mode === 'confirm' && (
            <>
              {state === 'working' && (
                <Centered
                  Icon={Loader2}
                  spin
                  title="Confirming your email…"
                  sub="Hang tight, this only takes a moment."
                />
              )}
              {state === 'done' && (
                <Centered
                  Icon={CheckCircle2}
                  tone="success"
                  title="E-mail potvrzen"
                  sub="Vraťte se do původního okna — přihlášení tam proběhne automaticky. Toto okno můžete zavřít."
                  action={
                    <Link
                      to="/auth/signin"
                      className="h-11 px-6 rounded-full bg-subtle hover:bg-accent-soft text-ink font-bold text-[14px] inline-flex items-center transition-colors"
                    >
                      Nebo se přihlaste zde
                    </Link>
                  }
                />
              )}
              {state === 'error' && (
                <Centered
                  Icon={AlertCircle}
                  tone="error"
                  title="Confirmation failed"
                  sub={error || 'This link may have expired or already been used.'}
                  action={
                    <Link
                      to="/auth/signup"
                      className="h-11 px-6 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[14px] inline-flex items-center transition-colors"
                    >
                      Back to sign up
                    </Link>
                  }
                />
              )}
            </>
          )}

          {/* ─── Reset flow ─── */}
          {mode === 'reset' && state === 'done' && (
            <Centered
              Icon={CheckCircle2}
              tone="success"
              title="Password updated"
              sub="You can now sign in with your new password."
              action={
                <Link
                  to="/auth/signin"
                  className="h-11 px-6 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center"
                >
                  Sign in
                </Link>
              }
            />
          )}
          {mode === 'reset' && state !== 'done' && (
            <>
              <div className="mb-5">
                <div className="label-eyebrow">Account</div>
                <h1 className="text-[22px] font-bold text-ink tracking-tight mt-1">Set a new password</h1>
                <p className="text-[13px] text-ink-muted font-medium mt-1.5">
                  Choose a strong password you don’t use anywhere else.
                </p>
              </div>
              <form onSubmit={submitReset} className="space-y-3">
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full h-12 pl-11 pr-11 rounded-2xl bg-subtle text-ink text-[14px] font-medium outline-none focus:bg-bg focus:ring-2 ring-accent/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-rose-600 dark:text-rose-400">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}
                <motion.button
                  whileTap={tap}
                  type="submit"
                  disabled={state === 'working'}
                  className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] disabled:opacity-60"
                >
                  {state === 'working' ? 'Updating…' : 'Update password'}
                </motion.button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const Centered: React.FC<{
  Icon: React.ComponentType<any>;
  title: string;
  sub: string;
  tone?: 'success' | 'error';
  spin?: boolean;
  action?: React.ReactNode;
}> = ({ Icon, title, sub, tone, spin, action }) => (
  <div className="text-center py-4">
    <div
      className={`w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4 ${
        tone === 'success'
          ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
          : tone === 'error'
          ? 'bg-rose-500/12 text-rose-600 dark:text-rose-400'
          : 'bg-subtle text-ink-muted'
      }`}
    >
      <Icon size={24} strokeWidth={2.2} className={spin ? 'animate-spin' : ''} />
    </div>
    <h1 className="text-[20px] font-bold text-ink tracking-tight">{title}</h1>
    <p className="text-[13px] text-ink-muted font-medium mt-1.5 leading-relaxed">{sub}</p>
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

export default AuthActionPage;
