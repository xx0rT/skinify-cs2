import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X } from 'lucide-react';
import { verifyLoginCode } from '../../utils/twoFactor';
import { tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   TwoFactorChallenge — login-time 2FA prompt.

   Shown after a correct password when the account has 2FA on and this
   device isn't already trusted. On success, calls onSuccess so the login
   flow can finish (set the user, navigate). "Remember this device" trusts
   the browser so it won't prompt again from the same device/IP.
   ───────────────────────────────────────────────────────────────────────── */

const TwoFactorChallenge: React.FC<{
  open: boolean;
  /** Steam ID for Steam-OpenID logins (email users use their session). */
  steamId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ open, steamId, onSuccess, onCancel }) => {
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const c = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(c) && c.length < 8) {
      setError('Enter your 6-digit code or a backup code.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await verifyLoginCode(c, remember, steamId);
    setBusy(false);
    if (res.ok) onSuccess();
    else setError(res.error || 'Invalid code. Try again.');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="w-full sm:max-w-sm bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-start justify-between p-5 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-accent/12 grid place-items-center">
                  <ShieldCheck size={18} strokeWidth={2.2} className="text-accent" />
                </div>
                <div>
                  <div className="label-eyebrow">Security</div>
                  <h2 className="text-[18px] font-bold text-ink tracking-tight leading-none mt-0.5">
                    Two-factor code
                  </h2>
                </div>
              </div>
              <button onClick={onCancel} className="icon-chip-sm hover:bg-subtle -mr-1" aria-label="Cancel">
                <X size={16} strokeWidth={2.2} className="text-ink-muted" />
              </button>
            </div>

            <p className="px-5 text-[13px] text-ink-muted font-medium leading-relaxed">
              Enter the 6-digit code from your authenticator app to finish signing in on this device.
            </p>

            <div className="p-5 pt-4 space-y-3">
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\dA-Za-z-]/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder="123456"
                className="w-full h-14 px-4 rounded-2xl bg-subtle text-ink text-[20px] font-bold tabular-nums tracking-[0.3em] text-center outline-none focus:bg-bg focus:ring-2 ring-accent/30 transition-all"
              />

              <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                <button
                  type="button"
                  onClick={() => setRemember((v) => !v)}
                  className={`relative h-6 w-10 rounded-full transition-colors shrink-0 ${
                    remember ? 'bg-accent' : 'bg-subtle'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow-sm transition-transform ${
                      remember ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
                <span className="text-[13px] font-semibold text-ink">Remember this device</span>
              </label>

              {error && (
                <div className="text-[12.5px] font-semibold text-rose-600 dark:text-rose-400">{error}</div>
              )}

              <motion.button
                whileTap={tap}
                onClick={submit}
                disabled={busy}
                className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] disabled:opacity-60"
              >
                {busy ? 'Verifying…' : 'Verify & continue'}
              </motion.button>
              <p className="text-[11.5px] text-ink-dim font-medium text-center">
                Lost your device? Enter one of your backup codes instead.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TwoFactorChallenge;
