import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Gift, TrendingUp, Users } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import { spring, tap } from '../../../lib/motion';

/**
 * ReferralTab — mirrors the standalone /referral page but sized for
 * the profile column. Same referral-link generator + KPI tiles + how-
 * it-works walkthrough, minus the marketing chrome.
 *
 * The referral code is derived deterministically from steamId
 * (`SKIN-<last6>`) so the tab renders instantly without a DB round-
 * trip; when the backend ships proper referral rows, replace the
 * derivation with a fetched value from the users table.
 */

const ReferralTab: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [copied, setCopied] = useState(false);

  const referralCode = useMemo(() => {
    if (user?.steamId) return `SKIN-${user.steamId.slice(-6)}`;
    return 'SKIN-XXXXXX';
  }, [user?.steamId]);

  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${referralCode}`
      : `https://skinify.gg/?ref=${referralCode}`;

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      addToast({ type: 'success', title: 'Referral link copied' });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      addToast({ type: 'error', title: 'Copy failed' });
    }
  };

  const kpis = [
    { label: 'Friends invited', value: '0', Icon: Users, sub: 'Sign-ups via your link' },
    { label: 'Commission earned', value: '0 Kč', Icon: TrendingUp, sub: '25 % of their seller fees' },
    { label: 'Active referrals', value: '0', Icon: Gift, sub: 'Currently trading' },
  ];

  return (
    <div className="space-y-4">
      {/* Referral link card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="card p-5 sm:p-6 relative overflow-hidden"
      >
        <div
          aria-hidden
          className="absolute -top-16 -right-16 w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 65%)',
          }}
        />
        <div className="relative">
          <div className="label-eyebrow mb-2">Your referral link</div>
          <h2 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-ink leading-tight">
            Earn <span className="text-accent">25 %</span> of every friend&apos;s
            seller fee, forever
          </h2>
          <p className="text-[13px] text-ink-muted font-medium mt-2 leading-relaxed">
            Share the link below. When a friend signs up, sells a skin, or
            deposits, you earn a cut of the fee automatically. Payouts land in
            your Skinify balance.
          </p>

          {/* Link + copy */}
          <div className="mt-4 flex items-stretch gap-2">
            <div className="flex-1 min-w-0 rounded-full bg-subtle px-4 h-11 flex items-center">
              <code className="text-[12.5px] font-mono text-ink truncate select-all">
                {referralLink}
              </code>
            </div>
            <motion.button
              whileTap={tap}
              onClick={doCopy}
              className="h-11 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5 shrink-0"
              style={{ boxShadow: '0 10px 22px -10px rgb(var(--accent) / 0.55)' }}
            >
              {copied ? (
                <>
                  <Check size={13} strokeWidth={2.6} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={13} strokeWidth={2.4} />
                  Copy
                </>
              )}
            </motion.button>
          </div>

          <div className="mt-3 text-[11.5px] text-ink-dim font-medium">
            Code: <code className="font-mono text-ink">{referralCode}</code>
          </div>
        </div>
      </motion.div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 + i * 0.04 }}
            className="card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-2xl bg-accent-soft text-accent grid place-items-center">
                <k.Icon size={14} strokeWidth={2.2} />
              </div>
              <span className="label-meta">{k.label}</span>
            </div>
            <div className="text-[22px] font-bold text-ink tracking-tight tabular-nums leading-none">
              {k.value}
            </div>
            <div className="text-[11.5px] text-ink-muted font-medium mt-1.5 leading-snug">
              {k.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.15 }}
        className="card p-5 sm:p-6"
      >
        <div className="label-eyebrow mb-3">How it works</div>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              n: '01',
              t: 'Share your link',
              s: 'Send your referral link to friends or post it on socials.',
            },
            {
              n: '02',
              t: 'Friend signs up',
              s: 'They register and start trading. Your commission auto-applies.',
            },
            {
              n: '03',
              t: 'You earn forever',
              s: '25 % of every seller fee they pay, credited to your balance.',
            },
          ].map((step) => (
            <li key={step.n} className="card-flat p-4">
              <div className="text-[11px] font-bold text-accent tracking-wider">
                {step.n}
              </div>
              <div className="text-[14px] font-bold text-ink tracking-tight mt-1.5">
                {step.t}
              </div>
              <div className="text-[12px] text-ink-muted font-medium mt-1 leading-relaxed">
                {step.s}
              </div>
            </li>
          ))}
        </ol>
      </motion.div>
    </div>
  );
};

export default ReferralTab;
