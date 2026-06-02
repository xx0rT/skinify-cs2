import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, AlertCircle, Eye, EyeOff, Check } from 'lucide-react';
import LandingNav from '../components/LandingNav';
import SteamLogin from '../components/auth/SteamLogin';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { signUpWithPassword } from '../utils/credentialAuth';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { spring, tap } from '../lib/motion';

const SignUpPage: React.FC = () => {
  useDocumentMeta({
    title: 'Create your Skinify account',
    description:
      'Sign up to Skinify with email or Steam to buy and sell CS2 skins with 0% buyer fees.',
    noindex: true,
  });

  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const setUser = useAuthStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) {
      setError('Pick a display name.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Email and password are both required.');
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
        if (result.needsConfirm) {
          addToast({
            type: 'info',
            title: 'Confirm your email',
            message: 'We sent you a confirmation link. Open it to finish creating your account.',
            duration: 7000,
          });
          navigate('/auth/signin', { replace: true });
          return;
        }
        setError(result.error);
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
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />
      <main className="max-w-[460px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-7 sm:p-8"
        >
          <span className="label-eyebrow">Sign up</span>
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-ink leading-tight mt-1.5">
            Create your Skinify account
          </h1>
          <p className="text-[13.5px] text-ink-muted font-medium mt-2 leading-relaxed">
            Browse and buy right away. You can link Steam later to list your
            own items.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[12.5px] font-semibold">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <Field
              Icon={UserIcon}
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={setDisplayName}
              autoComplete="nickname"
              required
            />
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
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
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

            <label className="flex items-start gap-2.5 mt-2 cursor-pointer select-none">
              <span
                role="checkbox"
                aria-checked={agree}
                tabIndex={0}
                onClick={() => setAgree((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setAgree((v) => !v);
                  }
                }}
                className={`mt-0.5 w-4 h-4 rounded-md grid place-items-center shrink-0 transition-colors ${
                  agree ? 'bg-accent text-on-accent' : 'bg-subtle ring-1 ring-line'
                }`}
              >
                {agree && <Check size={11} strokeWidth={3.4} />}
              </span>
              <span className="text-[12.5px] text-ink-muted font-medium leading-snug">
                I agree to the{' '}
                <Link to="/terms" className="text-accent font-bold hover:opacity-80">
                  Terms
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-accent font-bold hover:opacity-80">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <motion.button
              whileTap={tap}
              whileHover={!submitting ? { scale: 1.005 } : undefined}
              type="submit"
              disabled={submitting}
              className="mt-2 w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.55)' }}
            >
              {submitting ? 'Creating account…' : 'Create account'}
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
            Already have an account?{' '}
            <Link to="/auth/signin" className="text-accent font-bold hover:opacity-80">
              Sign in
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

export default SignUpPage;
