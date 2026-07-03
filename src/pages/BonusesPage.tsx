import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useDocumentMeta from '../hooks/useDocumentMeta';
import {
  Gift,
  Crown,
  Calendar,
  Sparkles,
  Coins,
  Percent,
  CheckCircle2,
  ArrowRight,
  Clock,
  Target,
  Zap,
  Star,
  ChevronLeft,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useT } from '../lib/useT';
import SteamLogin from '../components/auth/SteamLogin';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   BonusesPage — fresh landing-theme design
   - Hero with progress to next milestone
   - Daily / Weekly / Monthly claimable tiles
   - Deposit-bonus tiers strip
   - "How it works" 3-step
   ───────────────────────────────────────────────────────────────────────── */

type Cadence = 'daily' | 'weekly' | 'monthly';

interface BonusOffer {
  id: string;
  cadence: Cadence;
  title: string;
  subtitle: string;
  reward: string;
  Icon: React.ComponentType<any>;
  cooldownH: number;
  /** primary tint for the icon orb */
  tint: string;
}

const OFFERS: BonusOffer[] = [
  { id: 'daily',   cadence: 'daily',   title: 'Daily login',       subtitle: 'Reward for opening Skinify each day', reward: '+50 Kč credit',  Icon: Calendar,  cooldownH: 24,  tint: '#10b981' },
  { id: 'weekly',  cadence: 'weekly',  title: 'Weekly trade',      subtitle: 'Complete one trade this week',        reward: '+1.5% bonus',    Icon: Target,    cooldownH: 168, tint: '#f59e0b' },
  { id: 'monthly', cadence: 'monthly', title: 'Monthly milestone', subtitle: 'Spend 1,500 Kč this month',           reward: 'Loot crate',     Icon: Crown,     cooldownH: 720, tint: '#a855f7' },
  { id: 'streak',  cadence: 'daily',   title: '7-day streak',      subtitle: 'Login 7 days in a row',               reward: 'Premium crate',  Icon: Zap,       cooldownH: 24,  tint: '#ef4444' },
  { id: 'spend',   cadence: 'weekly',  title: 'Spend bonus',       subtitle: 'Spend 500 Kč this week',              reward: '+5% credit',     Icon: Coins,     cooldownH: 168, tint: '#0ea5e9' },
  { id: 'social',  cadence: 'monthly', title: 'Share & earn',      subtitle: 'Share a trade on social media',       reward: '100 Kč credit',  Icon: Sparkles,  cooldownH: 720, tint: '#ec4899' },
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

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          /* Right-to-left purple gradient: solid on the RIGHT (behind
             the artwork), fading to nearly transparent through the
             middle, then back to a faint tint on the LEFT. The border
             uses the SAME gradient but at a brighter alpha so it
             reads as a hairline that's a shade lighter than the fill.
             Implemented with `background-image` for the fill and a
             matching `border-image` for the border. `rounded-3xl`
             keeps the corner radius consistent with .card. */
          className="relative rounded-3xl p-7 sm:p-10 overflow-hidden"
          style={{
            background:
              'linear-gradient(to left, rgba(168, 85, 247, 0.55) 0%, rgba(168, 85, 247, 0.10) 50%, rgba(168, 85, 247, 0.20) 100%), rgb(var(--surface))',
            border: '1px solid transparent',
            backgroundClip: 'padding-box',
            boxShadow:
              /* Border-as-shadow trick: an inset 1px ring whose color
                 is the same gradient at a brighter alpha. We use a
                 stacked outline because CSS doesn't allow gradient
                 borders on rounded boxes natively. */
              `inset 0 0 0 1px transparent,
               0 12px 30px -18px rgba(168, 85, 247, 0.35)`,
            position: 'relative',
          }}
        >
          {/* Brighter gradient border — drawn with an absolutely
              positioned overlay using `border-image`. */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              padding: '1px',
              background:
                'linear-gradient(to left, rgba(192, 132, 252, 0.85) 0%, rgba(168, 85, 247, 0.25) 50%, rgba(192, 132, 252, 0.55) 100%)',
              WebkitMask:
                'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-end">
            <div>
              <div className="icon-chip-lg bg-accent-soft mb-5">
                <Gift size={22} className="text-accent" />
              </div>
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
            {/* Premium crate artwork — pushed further LEFT into the
                text column, 30 % bigger and 30 % further DOWN past
                the card edge. */}
            <motion.img
              src="/a5a6c232-eee7-4779-91f0-cc6323b69e80.png"
              alt="Premium crate with coins and knives"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.2 }}
              className="select-none pointer-events-none self-end relative"
              style={{
                /* 340 → 442 (≈ +30 %) */
                height: '442px',
                width: 'auto',
                maxWidth: 'none',
                /* Aggressive left bleed and downward push so the
                   figure ends well below the card edge. The hero
                   card's own purple gradient handles ambient light;
                   no external drop-shadow on the image so the glow
                   doesn't leak past the card boundary. */
                marginRight: '-40px',
                marginBottom: '-118px',
                marginLeft: '-176px',
                transform: 'translateY(80px)',
                zIndex: 1,
              }}
            />
          </div>
        </motion.section>

        {/* Filter pills */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="card p-2 flex items-center gap-1 overflow-x-auto"
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
                <span className="relative">{labels[f]}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Offers grid */}
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
                  whileHover={{ y: -3 }}
                  className="card p-5 relative overflow-hidden group"
                >
                  {/* Soft tint wash that follows the icon color */}
                  <motion.div
                    aria-hidden
                    className="absolute -top-20 -right-12 w-[220px] h-[220px] rounded-full pointer-events-none opacity-50 group-hover:opacity-80 transition-opacity"
                    style={{ background: `radial-gradient(closest-side, ${o.tint}33, transparent 70%)` }}
                  />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      {/* Big iconic orb with depth */}
                      <div
                        className="relative w-14 h-14 rounded-2xl grid place-items-center shrink-0"
                        style={{
                          background: `linear-gradient(140deg, ${o.tint}, ${o.tint}dd 60%, ${o.tint}88)`,
                          boxShadow: `0 12px 24px -8px ${o.tint}66, inset 0 1px 0 rgba(255,255,255,0.25)`,
                        }}
                      >
                        <o.Icon size={24} strokeWidth={2.2} className="text-white relative z-10 drop-shadow" />
                        {/* Soft highlight */}
                        <span
                          className="absolute inset-1 rounded-[14px] pointer-events-none"
                          style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.28), transparent 45%)' }}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className="pill"
                          style={{
                            background: `${o.tint}1f`,
                            color: o.tint,
                          }}
                        >
                          {o.cadence.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-ink-dim font-semibold inline-flex items-center gap-1 tabular-nums">
                          <Clock size={10} strokeWidth={2.4} />
                          {o.cooldownH}h
                        </span>
                      </div>
                    </div>
                    <h3 className="text-[15px] font-bold text-ink tracking-tight leading-tight">{o.title}</h3>
                    <p className="text-[12.5px] text-ink-muted font-medium mt-1.5 leading-relaxed">{o.subtitle}</p>

                    <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
                      <div>
                        <div className="label-meta">Reward</div>
                        <div className="text-[14px] font-bold text-ink tracking-tight">{o.reward}</div>
                      </div>
                      <motion.button
                        whileTap={tap}
                        whileHover={isClaimed ? {} : { scale: 1.04 }}
                        onClick={() => claim(o)}
                        disabled={isClaimed}
                        className={`h-9 px-4 rounded-full text-[12.5px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                          isClaimed
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 cursor-default'
                            : 'bg-accent text-on-accent hover:opacity-95'
                        }`}
                      >
                        {isClaimed ? (
                          <>
                            <CheckCircle2 size={12} strokeWidth={2.6} />
                            Claimed
                          </>
                        ) : (
                          <>
                            Claim
                            <ArrowRight size={12} strokeWidth={2.6} />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Deposit tiers */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="card p-6 md:p-8"
        >
          <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
            <div>
              <span className="label-eyebrow">{tr('bonuses.deposit.eyebrow', 'Deposit bonuses')}</span>
              <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-none">
                Top up, get more
              </h2>
            </div>
            <motion.button
              whileTap={tap}
              onClick={() => navigate('/profile?tab=balance')}
              className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5"
              style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
            >
              Refill now <ArrowRight size={13} strokeWidth={2.4} />
            </motion.button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DEPOSIT_TIERS.map((t, i) => (
              <motion.div
                key={t.label}
                whileHover={{ y: -3 }}
                transition={spring}
                className="card-flat p-4 relative overflow-hidden"
              >
                <div className="absolute top-3 right-3 pill bg-accent-soft text-accent inline-flex items-center gap-1">
                  <Percent size={10} strokeWidth={2.4} />
                  {t.bonus}
                </div>
                <div className="label-meta">{t.label}</div>
                <div className="mt-2 text-[20px] font-bold tracking-tight tabular-nums text-ink leading-none">
                  {t.min.toLocaleString()} Kč+
                </div>
                <div className="text-[11.5px] text-ink-dim font-medium mt-2">{t.sub}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How it works */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="card p-6 md:p-8"
        >
          <span className="label-eyebrow">{tr('bonuses.how.eyebrow', 'How it works')}</span>
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-none mb-5">
            Three steps to your bonus
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: '01', t: 'Sign in', s: 'Connect your Steam account so we can attribute bonuses to you.' },
              { n: '02', t: 'Trade or top up', s: 'Bonuses unlock automatically as you hit milestones.' },
              { n: '03', t: 'Claim instantly', s: 'Credits and crates land in your account the moment you claim.' },
            ].map((step) => (
              <div key={step.n} className="card-flat p-5">
                <div className="text-[26px] font-bold tracking-tight tabular-nums text-accent leading-none">
                  {step.n}
                </div>
                <div className="text-[15px] font-bold text-ink tracking-tight mt-3 leading-tight">{step.t}</div>
                <p className="text-[12.5px] text-ink-muted font-medium mt-2 leading-relaxed">{step.s}</p>
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
