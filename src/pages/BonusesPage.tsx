import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { ChevronLeft } from 'lucide-react';
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
}

const OFFERS: BonusOffer[] = [
  { id: 'daily',   cadence: 'daily',   title: 'Daily login',       subtitle: 'Reward for opening Skinify each day', reward: '+50 Kč credit',  cooldownH: 24 },
  { id: 'weekly',  cadence: 'weekly',  title: 'Weekly trade',      subtitle: 'Complete one trade this week',        reward: '+1.5% bonus',    cooldownH: 168 },
  { id: 'monthly', cadence: 'monthly', title: 'Monthly milestone', subtitle: 'Spend 1,500 Kč this month',           reward: 'Loot crate',     cooldownH: 720 },
  { id: 'streak',  cadence: 'daily',   title: '7-day streak',      subtitle: 'Login 7 days in a row',               reward: 'Premium crate',  cooldownH: 24 },
  { id: 'spend',   cadence: 'weekly',  title: 'Spend bonus',       subtitle: 'Spend 500 Kč this week',              reward: '+5% credit',     cooldownH: 168 },
  { id: 'social',  cadence: 'monthly', title: 'Share & earn',      subtitle: 'Share a trade on social media',       reward: '100 Kč credit',  cooldownH: 720 },
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
  const [claimed, setClaimed] = useState<Set<string>>(new Set());

  const visible = OFFERS.filter((o) => filter === 'all' || o.cadence === filter);

  const claim = (o: BonusOffer) => {
    if (!user) {
      addToast({ type: 'warning', title: 'Sign in', message: 'Sign in with Steam to claim bonuses.' });
      return;
    }
    if (claimed.has(o.id)) return;
    setClaimed((p) => new Set([...p, o.id]));
    addToast({ type: 'success', title: 'Bonus claimed', message: `${o.title} · ${o.reward}` });
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
              const isClaimed = claimed.has(o.id);
              return (
                <motion.div
                  layout
                  key={o.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ ...spring, delay: i * 0.04 }}
                  whileHover={{ y: -2 }}
                  className="panel p-5"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="label-meta">
                      {tr(`bonuses.cadence.${o.cadence}`, o.cadence)}
                    </span>
                    <span className="text-[11px] text-ink-dim font-semibold tabular-nums">
                      {o.cooldownH}h
                    </span>
                  </div>
                  <h3 className="text-[15px] font-bold text-ink tracking-tight leading-tight">{tr(`bonuses.offer.${o.id}.title`, o.title)}</h3>
                  <p className="text-[12.5px] text-ink-muted font-medium mt-1.5 leading-relaxed">{tr(`bonuses.offer.${o.id}.subtitle`, o.subtitle)}</p>

                  <div className="mt-4 pt-4 border-t border-line/60 flex items-center justify-between">
                    <div className="text-[14px] font-bold text-ink tracking-tight">
                      {tr(`bonuses.offer.${o.id}.reward`, o.reward)}
                    </div>
                    <motion.button
                      whileTap={tap}
                      onClick={() => claim(o)}
                      disabled={isClaimed}
                      className={`h-9 px-4 rounded-full text-[12.5px] font-bold transition-colors ${
                        isClaimed
                          ? 'bg-subtle text-ink-muted cursor-default'
                          : 'bg-accent text-on-accent hover:opacity-95'
                      }`}
                    >
                      {isClaimed ? tr('bonuses.claimed', 'Claimed') : tr('bonuses.claim', 'Claim')}
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
