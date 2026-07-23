import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Banknote, CheckCircle2, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   StripeConnectPayouts — Settings section for Stripe Connect onboarding.

   Structured the same way as KycVerification.tsx: a self-contained card
   with its own fetch lifecycle, dropped into SettingsTab.tsx. Unlike
   KYC (which uses an embedded Sumsub WebSDK modal), Connect onboarding
   is a full hosted Stripe flow — clicking "Set up payouts" navigates
   away to connect.stripe.com and the user lands back on
   /profile?tab=settings&sub=payouts when done (return_url configured
   server-side in stripe-connect's start_onboarding action).

   This is entirely opt-in: withdrawing still works the old way
   (WithdrawModal's manual IBAN/card/PayPal form) for anyone who never
   sets this up. Completing it here is what makes WithdrawModal switch
   to the one-click "Payout to your bank" flow instead.
   ───────────────────────────────────────────────────────────────────────── */

type OnboardingStatus = 'not_started' | 'pending' | 'complete' | 'restricted';

const fmtKc = (n: number) => `${n.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} Kč`;

async function stripeConnectPost(steamId: string, payload: Record<string, unknown>): Promise<any> {
  const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
  const res = await fetch(`${supabaseUrl}/functions/v1/stripe-connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
      'x-steam-id': steamId,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Server error (${res.status})`);
  return body;
}

const StripeConnectPayouts: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [status, setStatus] = useState<OnboardingStatus>('not_started');
  const [statusLoading, setStatusLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const refreshBalance = useCallback(async () => {
    if (!user?.steamId) return;
    try {
      const res = await stripeConnectPost(user.steamId, { action: 'get_balance' });
      setBalance(Number(res?.data?.available_czk) || 0);
    } catch {
      /* leave as null — the card just omits the balance line */
    }
  }, [user?.steamId]);

  const refreshStatus = useCallback(async () => {
    if (!user?.steamId) {
      setStatusLoading(false);
      return;
    }
    try {
      const res = await stripeConnectPost(user.steamId, { action: 'get_status' });
      const next = res?.data?.onboarding_status || 'not_started';
      setStatus(next);
      if (next === 'complete') refreshBalance();
    } catch {
      /* leave as-is — a failed status check shouldn't block the page */
    } finally {
      setStatusLoading(false);
    }
  }, [user?.steamId, refreshBalance]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  /* Returning from Stripe's hosted flow (return_url points back here
     with ?sub=payouts, no extra params) — re-check status against
     Stripe directly rather than trusting our possibly-stale cached row,
     in case the webhook hasn't landed yet. */
  useEffect(() => {
    if (searchParams.get('sub') !== 'payouts' || !user?.steamId) return;
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (async () => {
      try {
        const res = await stripeConnectPost(user.steamId!, { action: 'refresh_status' });
        setStatus(res?.data?.onboarding_status || 'not_started');
      } catch {
        /* keep whatever get_status already returned */
      }
    })();
  }, [searchParams, user?.steamId]);

  const startOnboarding = async () => {
    if (!user?.steamId) return;
    setStarting(true);
    try {
      const res = await stripeConnectPost(user.steamId, { action: 'start_onboarding' });
      if (!res.url) throw new Error('No onboarding link returned.');
      window.location.href = res.url;
    } catch (e: any) {
      addToast({ type: 'error', title: 'Could not start payout setup', message: e?.message });
      setStarting(false);
    }
  };

  return (
    <div ref={sectionRef} className="card p-5 md:p-6 scroll-mt-24">
      <div className="mb-4">
        <h2 className="text-[17px] font-bold tracking-tight leading-none text-ink">Payouts</h2>
        <p className="text-[12.5px] text-ink-muted font-medium mt-1.5">
          Connect a Stripe account to withdraw your sale earnings directly to your bank.
        </p>
      </div>

      {statusLoading ? (
        <div className="rounded-2xl bg-subtle/30 p-6 text-center">
          <p className="text-[12.5px] text-ink-muted font-medium">Checking status…</p>
        </div>
      ) : status === 'complete' ? (
        <div
          className="rounded-2xl p-4 bg-emerald-500/10"
          style={{ boxShadow: 'inset 0 0 0 1px rgb(16 185 129 / 0.35)' }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-[13.5px] font-bold text-ink">Payouts are set up</div>
              <p className="text-[12px] text-ink-muted font-medium mt-0.5">
                New sales pay out to your bank automatically once the 8-day escrow completes. Use
                the Withdraw button on your balance page for an on-demand payout.
              </p>
            </div>
          </div>
          {balance !== null && (
            <div className="mt-3 pt-3 flex items-center justify-between" style={{ boxShadow: 'inset 0 1px 0 0 rgb(16 185 129 / 0.2)' }}>
              <span className="text-[12px] text-ink-muted font-semibold">Available on Stripe</span>
              <span className="text-[15px] font-bold tabular-nums text-ink">{fmtKc(balance)}</span>
            </div>
          )}
        </div>
      ) : status === 'restricted' ? (
        <div
          className="rounded-2xl p-4 flex items-center gap-3 bg-amber-500/10"
          style={{ boxShadow: 'inset 0 0 0 1px rgb(245 158 11 / 0.35)' }}
        >
          <ShieldCheck size={20} strokeWidth={2.4} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-bold text-ink">Stripe needs more information</div>
            <p className="text-[12px] text-ink-muted font-medium mt-0.5">
              Your account setup is incomplete — finish it to enable payouts.
            </p>
          </div>
          <motion.button
            whileTap={tap}
            onClick={startOnboarding}
            disabled={starting}
            className="h-10 px-4 rounded-full bg-accent text-on-accent font-bold text-[12.5px] inline-flex items-center gap-2 disabled:opacity-60 shrink-0"
          >
            {starting ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} strokeWidth={2.4} />}
            Continue
          </motion.button>
        </div>
      ) : status === 'pending' ? (
        <div className="rounded-2xl bg-subtle/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-accent/12 grid place-items-center shrink-0">
            <Loader2 size={18} strokeWidth={2.2} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-bold text-ink leading-tight">Setup in progress</div>
            <p className="text-[12px] text-ink-muted font-medium mt-0.5 leading-relaxed">
              Finish the Stripe form to start receiving payouts.
            </p>
          </div>
          <motion.button
            whileTap={tap}
            onClick={startOnboarding}
            disabled={starting}
            className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center justify-center gap-2 disabled:opacity-60 shrink-0"
          >
            {starting ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} strokeWidth={2.4} />}
            {starting ? 'Opening…' : 'Resume setup'}
          </motion.button>
        </div>
      ) : (
        <div className="rounded-2xl bg-subtle/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-accent/12 grid place-items-center shrink-0">
            <Banknote size={18} strokeWidth={2.2} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-bold text-ink leading-tight">Set up payouts</div>
            <p className="text-[12px] text-ink-muted font-medium mt-0.5 leading-relaxed">
              Takes a couple of minutes with an ID and bank details. Handled entirely by Stripe —
              Skinify never sees your bank details.
            </p>
          </div>
          <motion.button
            whileTap={tap}
            onClick={startOnboarding}
            disabled={starting}
            className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center justify-center gap-2 disabled:opacity-60 shrink-0"
          >
            {starting ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} strokeWidth={2.4} />}
            {starting ? 'Opening…' : 'Set up payouts'}
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default StripeConnectPayouts;
