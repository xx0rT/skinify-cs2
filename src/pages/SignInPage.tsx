import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import LandingNav from '../components/LandingNav';
import SteamLogin from '../components/auth/SteamLogin';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { signInWithPassword } from '../utils/credentialAuth';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   SignInPage

   Two sign-in paths side-by-side:
     1. Email + password (Supabase Auth) — primary, top of the form
     2. Steam OpenID — secondary, "Or continue with"

   Users created via email/password do NOT have a Steam linkage yet, so
   they can browse and buy, but listing items is gated behind a "Link
   your Steam account" flow on the profile page.
   ───────────────────────────────────────────────────────────────────────── */
const SignInPage: React.FC = () => {
  useDocumentMeta({
    title: 'Sign in · Skinify',
    description: 'Sign in to your Skinify account to buy and sell CS2 skins.',
    noindex: true,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToastStore();
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = (location.state as any)?.from || '/marketplace';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter both an email address and a password.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await signInWithPassword(email.trim(), password);
      if (!result.ok) {
        setError(result.error || 'Sign in failed.');
        return;
      }
      setUser(result.user);
      addToast({
        type: 'success',
        title: 'Welcome back',
        message: result.user.displayName || result.user.email || '',
      });
      navigate(redirectTo, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />
      <main className="max-w-[440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-7 sm:p-8"
        >
          <span className="label-eyebrow">Sign in</span>
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-ink leading-tight mt-1.5">
            Welcome back to Skinify
          </h1>
          <p className="text-[13.5px] text-ink-muted font-medium mt-2 leading-relaxed">
            Use the email and password you signed up with, or continue with
            Steam.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[12.5px] font-semibold">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
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
              autoComplete="current-password"
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

            <motion.button
              whileTap={tap}
              whileHover={!submitting ? { scale: 1.005 } : undefined}
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.55)' }}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
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
            New to Skinify?{' '}
            <Link to="/auth/signup" className="text-accent font-bold hover:opacity-80">
              Create an account
            </Link>
          </p>
        </motion.div>
      </main>
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
