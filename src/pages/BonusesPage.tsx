import React, { useEffect, useState, useCallback } from 'react';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { ChevronLeft, ChevronDown, CheckCircle2 } from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useT } from '../lib/useT';
import SteamLogin from '../components/auth/SteamLogin';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   BonusesPage — flat, quiet layout. No icon orbs, no per-offer tints:
   the page reads as text-first panels in the site's base palette, with
   the crate artwork in the hero as the single visual.
   ───────────────────────────────────────────────────────────────────────── */

type Cadence = 'daily' | 'weekly' | 'monthly';

interface BonusOffer {
  id: string;
  cadence: Cadence;
  title: string;
  subtitle: string;
  reward: string;
  cooldownH: number;
  /** Longer explanation shown when the card is expanded. */
  details: string;
}

interface BonusStatus {
  id: string;
  progress: number;
  target: number;
  unit: 'login' | 'trades' | 'czk' | 'share';
  eligible: boolean;
  claimed: boolean;
  completed: boolean;
  onCooldown: boolean;
  cooldownEndsAt: string | null;
  rewardKind: 'credit' | 'crate';
  rewardCzk: number;
}

/* How a bonus's progress reads, per unit. */
function progressLabel(st: BonusStatus): string {
  const { progress, target, unit } = st;
  if (unit === 'czk') return `${Math.round(progress).toLocaleString('cs-CZ')} / ${target.toLocaleString('cs-CZ')} Kč`;
  if (unit === 'trades') return `${progress} / ${target} trade${target === 1 ? '' : 's'}`;
  if (unit === 'login') return progress >= target ? 'Ready today' : 'Come back tomorrow';
  return progress >= target ? 'Ready' : 'Not yet';
}

function cooldownLabel(iso: string | null): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3_600_000);
  if (h >= 24) return `${Math.ceil(h / 24)}d`;
  if (h >= 1) return `${h}h`;
  return `${Math.ceil(ms / 60_000)}m`;
}

const OFFERS: BonusOffer[] = [
  { id: 'daily',   cadence: 'daily',   title: 'Daily login',       subtitle: 'Reward for opening Skinify each day', reward: '+50 Kč credit',  cooldownH: 24,  details: 'Simply visit Skinify once a day. The credit lands in your balance instantly and the bonus refreshes every 24 hours.' },
  { id: 'weekly',  cadence: 'weekly',  title: 'Weekly trade',      subtitle: 'Complete one trade this week',        reward: '+30 Kč credit',  cooldownH: 168, details: 'Complete at least one purchase during the current week (resets Monday). Escrow-completed orders count.' },
  { id: 'monthly', cadence: 'monthly', title: 'Monthly milestone', subtitle: 'Spend 1,500 Kč this month',           reward: 'Loot crate',     cooldownH: 720, details: 'Spend a total of 1,500 Kč across your purchases this calendar month to unlock a loot crate.' },
  { id: 'streak',  cadence: 'daily',   title: 'Trade veteran',     subtitle: 'Complete 7 trades total',             reward: 'Premium crate',  cooldownH: 24,  details: 'A one-time milestone: once you have 7 completed trades on your account, claim a premium crate. This bonus does not repeat.' },
  { id: 'spend',   cadence: 'weekly',  title: 'Spend bonus',       subtitle: 'Spend 500 Kč this week',              reward: '+25 Kč credit',  cooldownH: 168, details: 'Reach 500 Kč in purchases within the current week to earn extra credit. Resets every Monday.' },
  { id: 'social',  cadence: 'monthly', title: 'Share & earn',      subtitle: 'Share Skinify on social media',       reward: '100 Kč credit',  cooldownH: 720, details: 'Share Skinify with your friends, then self-attest by claiming. Available once every 30 days.' },
];

const DEPOSIT_TIERS = [
  { min: 200,   bonus: 5,  label: 'Starter',   sub: 'Get 5% extra on top-up' },
  { min: 1000,  bonus: 10, label: 'Trader',    sub: '10% bonus credit' },
  { min: 5000,  bonus: 15, label: 'Collector', sub: '15% bonus credit' },
  { min: 20000, bonus: 25, label: 'Whale',     sub: '25% bonus credit · VIP perks' },
];

const BonusesPage: React.FC = () => {
  useDocumentMeta({
    title: 'Bonuses & Sign-up Promo · Skinify',
    description:
      'Get a 10% bonus on your first Skinify deposit, plus daily login rewards, referral payouts, and VIP perks. Live promo offers on every top-up.',
    canonical: 'https://skinify.gg/bonuses',
  });
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const tr = useT();
  const [filter, setFilter] = useState<Cadence | 'all'>('all');

  /* Live per-bonus status from the `bonuses` edge function:
     { id, progress, target, unit, eligible, claimed, completed,
       onCooldown, cooldownEndsAt }. Keyed by bonus id. */
  const [status, setStatus] = useState<Record<string, BonusStatus>>({});
  const [statusLoading, setStatusLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!user?.steamId) {
      setStatusLoading(false);
      return;
    }
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/bonuses`, {
        headers: { Authorization: `Bearer ${supabaseKey}`, 'X-Steam-Id': user.steamId },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(body.bonuses)) {
        const map: Record<string, BonusStatus> = {};
        for (const b of body.bonuses) map[b.id] = b;
        setStatus(map);
      }
    } catch {
      /* leave status empty → cards show "sign in / not ready" */
    } finally {
      setStatusLoading(false);
    }
  }, [user?.steamId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const visible = OFFERS.filter((o) => filter === 'all' || o.cadence === filter);

  const claim = async (o: BonusOffer) => {
    if (!user?.steamId) {
      addToast({ type: 'warning', title: 'Sign in', message: 'Sign in with Steam to claim bonuses.' });
      return;
    }
    const st = status[o.id];
    if (!st?.eligible || claiming) return;
    setClaiming(o.id);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/bonuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          'X-Steam-Id': user.steamId,
        },
        body: JSON.stringify({ action: 'claim', bonus_id: o.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast({ type: 'error', title: 'Could not claim', message: body?.error || 'Try again.' });
        return;
      }
      addToast({ type: 'success', title: 'Bonus claimed', message: `${o.title} · ${body.reward}` });
      await loadStatus(); // refresh eligibility / cooldown so it flips to claimed
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-4 pb-16 space-y-4">
        <motion.button
          whileTap={tap}
          whileHover={{ x: -2 }}
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink text-[13px] font-semibold transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={2.4} />
          Back
        </motion.button>

        {/* Hero — flat panel; the crate artwork is the page's single
            visual element. */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="panel p-7 sm:p-10 relative overflow-hidden"
        >
          <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-end">
            <div className="relative z-10">
              <span className="label-eyebrow">{tr('bonuses.hero.eyebrow', 'Rewards')}</span>
              <h1 className="text-[28px] sm:text-[40px] font-bold tracking-tight mt-2 leading-tight">
                {tr('bonuses.hero.title', 'Earn bonuses every time you trade')}
              </h1>
              <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-3 max-w-[520px] leading-relaxed">
                {tr('bonuses.hero.lead', "Daily login rewards, deposit bonuses, and seasonal milestones — all in one place. Claim them whenever you're online.")}
              </p>
              {!user && (
                <div className="mt-5">
                  <SteamLogin />
                </div>
              )}
            </div>
            <motion.img
              src="/a5a6c232-eee7-4779-91f0-cc6323b69e80.png"
              alt="Premium crate with coins and knives"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.2 }}
              className="hidden md:block select-none pointer-events-none self-end relative"
              style={{
                height: '340px',
                width: 'auto',
                maxWidth: 'none',
                marginRight: '-24px',
                marginBottom: '-64px',
              }}
            />
          </div>
        </motion.section>

        {/* Filter pills — plain row, no wrapping card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="flex items-center gap-1 overflow-x-auto px-1"
        >
          {(['all', 'daily', 'weekly', 'monthly'] as const).map((f) => {
            const active = filter === f;
            const labels: Record<typeof f, string> = { all: 'All bonuses', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
            return (
              <motion.button
                whileTap={tap}
                key={f}
                onClick={() => setFilter(f)}
                className={`relative h-9 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
                  active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span layoutId="bonus-filter" className="absolute inset-0 rounded-full bg-accent" transition={spring} />
                )}
                <span className="relative">{tr(`bonuses.filter.${f}`, labels[f])}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Offers grid — flat panels, text-first */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {visible.map((o, i) => {
              const st = status[o.id];
              const pct = st ? Math.min(100, (st.progress / st.target) * 100) : 0;
              const isOpen = expanded === o.id;
              const isClaiming = claiming === o.id;

              /* Button state machine driven by the live status. */
              let btnLabel = tr('bonuses.claim', 'Claim');
              let btnDisabled = true;
              let btnClass = 'bg-subtle text-ink-muted cursor-default';
              if (!user) {
                btnLabel = tr('bonuses.signin', 'Sign in');
                btnDisabled = false;
                btnClass = 'bg-accent text-on-accent hover:opacity-95';
              } else if (st?.completed) {
                btnLabel = tr('bonuses.completed', 'Completed');
              } else if (st?.eligible) {
                btnLabel = isClaiming ? '…' : tr('bonuses.claim', 'Claim');
                btnDisabled = isClaiming;
                btnClass = 'bg-accent text-on-accent hover:opacity-95';
              } else if (st?.onCooldown) {
                btnLabel = `${tr('bonuses.ready_in', 'Ready in')} ${cooldownLabel(st.cooldownEndsAt)}`;
              } else {
                btnLabel = tr('bonuses.locked', 'In progress');
              }

              return (
                <motion.div
                  layout
                  key={o.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ ...spring, delay: i * 0.04 }}
                  className={`panel p-5 flex flex-col ${
                    st?.eligible ? 'ring-1 ring-accent/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="label-meta">
                      {tr(`bonuses.cadence.${o.cadence}`, o.cadence)}
                    </span>
                    {st?.completed ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={11} strokeWidth={2.6} /> Done
                      </span>
                    ) : st?.eligible ? (
                      <span className="text-[10.5px] font-bold text-accent">Ready to claim</span>
                    ) : (
                      <span className="text-[11px] text-ink-dim font-semibold tabular-nums">
                        {o.cooldownH}h
                      </span>
                    )}
                  </div>

                  <h3 className="text-[15px] font-bold text-ink tracking-tight leading-tight">
                    {tr(`bonuses.offer.${o.id}.title`, o.title)}
                  </h3>
                  <p className="text-[12.5px] text-ink-muted font-medium mt-1.5 leading-relaxed">
                    {tr(`bonuses.offer.${o.id}.subtitle`, o.subtitle)}
                  </p>

                  {/* Progress bar + label — only meaningful once signed in */}
                  {user && st && !st.completed && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                        <span className="text-ink-muted">{progressLabel(st)}</span>
                        <span className="text-ink-dim tabular-nums">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-subtle overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-accent"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ ...spring, delay: 0.1 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expand for more info */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : o.id)}
                    className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold text-accent hover:opacity-80 transition-opacity self-start"
                  >
                    {isOpen ? tr('bonuses.less', 'Less info') : tr('bonuses.more', 'More info')}
                    <ChevronDown size={13} strokeWidth={2.6} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-[12px] text-ink-muted font-medium leading-relaxed overflow-hidden"
                      >
                        <span className="block pt-2">{tr(`bonuses.offer.${o.id}.details`, o.details)}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="mt-4 pt-4 border-t border-line/60 flex items-center justify-between">
                    <div className="text-[14px] font-bold text-ink tracking-tight">
                      {tr(`bonuses.offer.${o.id}.reward`, o.reward)}
                    </div>
                    <motion.button
                      whileTap={tap}
                      onClick={() => claim(o)}
                      disabled={btnDisabled}
                      className={`h-9 px-4 rounded-full text-[12.5px] font-bold transition-colors ${btnClass}`}
                    >
                      {btnLabel}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Deposit tiers — one panel, rows instead of boxes */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="panel p-6 md:p-8"
        >
          <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
            <div>
              <span className="label-eyebrow">{tr('bonuses.deposit.eyebrow', 'Deposit bonuses')}</span>
              <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-none">
                {tr('bonuses.deposit.title', 'Top up, get more')}
              </h2>
            </div>
            <motion.button
              whileTap={tap}
              onClick={() => navigate('/profile?tab=balance')}
              className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold"
            >
              {tr('bonuses.deposit.cta', 'Refill now')}
            </motion.button>
          </div>
          <div>
            {DEPOSIT_TIERS.map((t) => (
              <div key={t.label} className="kv-row">
                <div className="min-w-0">
                  <span className="text-[13.5px] font-bold text-ink tracking-tight">
                    {tr(`bonuses.tier.${t.label}.label`, t.label)}
                  </span>
                  <span className="text-[12px] text-ink-muted font-medium ml-2">
                    {tr(`bonuses.tier.${t.label}.sub`, t.sub)}
                  </span>
                </div>
                <div className="flex items-baseline gap-3 shrink-0">
                  <span className="text-[13px] font-bold text-ink tabular-nums">
                    {t.min.toLocaleString()} Kč+
                  </span>
                  <span className="text-[13px] font-bold text-accent tabular-nums w-10 text-right">
                    +{t.bonus}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* How it works — one panel, numbered rows */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="panel p-6 md:p-8"
        >
          <span className="label-eyebrow">{tr('bonuses.how.eyebrow', 'How it works')}</span>
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-none mb-4">
            {tr('bonuses.how.title', 'Three steps to your bonus')}
          </h2>
          <div className="space-y-0">
            {[
              { n: '1', t: tr('bonuses.how.step1.title', 'Sign in'), s: tr('bonuses.how.step1.sub', 'Connect your Steam account so we can attribute bonuses to you.') },
              { n: '2', t: tr('bonuses.how.step2.title', 'Trade or top up'), s: tr('bonuses.how.step2.sub', 'Bonuses unlock automatically as you hit milestones.') },
              { n: '3', t: tr('bonuses.how.step3.title', 'Claim instantly'), s: tr('bonuses.how.step3.sub', 'Credits and crates land in your account the moment you claim.') },
            ].map((step) => (
              <div key={step.n} className="kv-row items-start">
                <span className="text-[13px] font-bold text-ink-dim tabular-nums w-6 shrink-0 pt-0.5">
                  {step.n}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-ink tracking-tight">{step.t}</div>
                  <p className="text-[12.5px] text-ink-muted font-medium mt-0.5 leading-relaxed">{step.s}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default BonusesPage;
