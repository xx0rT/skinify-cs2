import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Trophy,
  ChevronLeft,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  Crown,
  Award,
  Lock,
  CheckCircle2,
  ArrowRight,
  Coins,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import SteamLogin from '../components/auth/SteamLogin';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   RewardsPage — fresh design
   - Hero with XP bar to next level
   - Mission cards (Daily / Weekly / Seasonal) with claim flow
   - Achievement grid with unlocked / locked states
   - Loot crate carousel
   ───────────────────────────────────────────────────────────────────────── */

type Mission = {
  id: string;
  title: string;
  goal: string;
  progress: number;
  total: number;
  reward: string;
  Icon: React.ComponentType<any>;
  cadence: 'daily' | 'weekly' | 'seasonal';
};

const MISSIONS: Mission[] = [
  { id: 'login3',    title: 'Login 3 days',     goal: 'Open Skinify for 3 consecutive days',  progress: 2, total: 3, reward: '+100 Kč', Icon: Star,        cadence: 'daily' },
  { id: 'buyone',    title: 'Make a purchase',   goal: 'Buy any item this week',              progress: 0, total: 1, reward: '+1.5% credit', Icon: ShoppingBag, cadence: 'weekly' },
  { id: 'sell5',     title: 'Sell 5 items',      goal: 'Complete 5 sales this week',          progress: 3, total: 5, reward: 'Premium crate', Icon: TrendingUp,  cadence: 'weekly' },
  { id: 'season1',   title: 'Spend 5,000 Kč',    goal: 'Total spend across the season',       progress: 1200, total: 5000, reward: 'Diamond crate', Icon: Crown,    cadence: 'seasonal' },
  { id: 'refer1',    title: 'Refer a friend',    goal: 'Invite one friend who trades',        progress: 0, total: 1, reward: '+200 Kč', Icon: Sparkles,    cadence: 'weekly' },
  { id: 'streak7',   title: '7-day streak',      goal: 'Login 7 days in a row',                progress: 4, total: 7, reward: '+5% credit', Icon: Award,       cadence: 'daily' },
];

const ACHIEVEMENTS = [
  { id: 'first-trade', title: 'First trade',      sub: 'Complete your first trade',           unlocked: true,  Icon: CheckCircle2 },
  { id: 'top-10',      title: 'Top 10 of the day', sub: 'Be among the top 10 traders today',  unlocked: false, Icon: Trophy },
  { id: 'wallet-100',  title: 'Filled wallet',     sub: 'Hold 10,000 Kč in your balance',     unlocked: false, Icon: Coins },
  { id: 'collector',   title: 'Collector',         sub: 'Own 50 unique skins at once',         unlocked: true,  Icon: Star },
  { id: 'curator',     title: 'Curator',           sub: 'List 25 items in your shop',          unlocked: false, Icon: Award },
  { id: 'whale',       title: 'Whale',             sub: 'Spend 50,000 Kč in total',            unlocked: false, Icon: Crown },
];

const CRATES = [
  { id: 'standard', name: 'Standard crate', cost: '500 Kč',  rarity: 'Common',    color: '#94a3b8' },
  { id: 'premium',  name: 'Premium crate',  cost: '2,000 Kč', rarity: 'Rare',     color: '#0ea5e9' },
  { id: 'elite',    name: 'Elite crate',    cost: '8,000 Kč', rarity: 'Epic',     color: '#a855f7' },
  { id: 'mythic',   name: 'Mythic crate',   cost: '25,000 Kč', rarity: 'Legendary', color: '#f59e0b' },
];

const RewardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'seasonal'>('all');

  const visible = MISSIONS.filter((m) => filter === 'all' || m.cadence === filter);

  const claim = (m: Mission) => {
    if (!user) {
      addToast({ type: 'warning', title: 'Sign in', message: 'Sign in with Steam to claim missions.' });
      return;
    }
    if (m.progress < m.total) {
      addToast({ type: 'info', title: 'Not yet', message: 'Finish the mission first.' });
      return;
    }
    if (claimed.has(m.id)) return;
    setClaimed((p) => new Set([...p, m.id]));
    addToast({ type: 'success', title: 'Reward claimed', message: m.reward });
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

        {/* Hero with XP bar */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-7 sm:p-10 relative overflow-hidden"
        >
          <motion.div
            aria-hidden
            className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(closest-side, rgb(var(--accent) / 0.2), transparent 65%)' }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative">
            <div className="icon-chip-lg bg-accent-soft mb-5">
              <Trophy size={22} className="text-accent" />
            </div>
            <span className="label-eyebrow">Rewards</span>
            <h1 className="text-[28px] sm:text-[40px] font-bold tracking-tight mt-2 leading-tight">
              Missions, achievements,<br className="hidden sm:block" /> and crates.
            </h1>
            <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-3 max-w-[560px] leading-relaxed">
              Earn XP every time you trade or log in. Level up to unlock crates packed with credits, badges, and
              limited-edition items.
            </p>

            <div className="mt-6 max-w-[600px]">
              <div className="flex items-end justify-between text-[12px] text-ink-muted font-semibold mb-2">
                <span>Level 4 · Trader</span>
                <span className="text-ink"><span className="tabular-nums">1,250</span> / 3,000 XP</span>
              </div>
              <div className="h-3 rounded-full bg-subtle overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '42%' }}
                  transition={{ duration: 1.3, ease: [0.6, 0.05, 0.2, 1], delay: 0.3 }}
                  className="h-full bg-accent rounded-full"
                />
              </div>
            </div>

            {!user && (
              <div className="mt-5">
                <SteamLogin />
              </div>
            )}
          </div>
        </motion.section>

        {/* Filter pills */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="card p-2 flex items-center gap-1 overflow-x-auto"
        >
          {(['all', 'daily', 'weekly', 'seasonal'] as const).map((f) => {
            const active = filter === f;
            const labels: Record<typeof f, string> = { all: 'All missions', daily: 'Daily', weekly: 'Weekly', seasonal: 'Seasonal' };
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
                  <motion.span layoutId="reward-filter" className="absolute inset-0 rounded-full bg-accent" transition={spring} />
                )}
                <span className="relative">{labels[f]}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Missions */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {visible.map((m, i) => {
              const pct = Math.min(100, (m.progress / m.total) * 100);
              const done = m.progress >= m.total;
              const isClaimed = claimed.has(m.id);
              return (
                <motion.div
                  layout
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ ...spring, delay: i * 0.04 }}
                  whileHover={{ y: -3 }}
                  className="card p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="icon-chip bg-accent-soft">
                      <m.Icon size={18} strokeWidth={2.2} className="text-accent" />
                    </div>
                    <span className={`pill ${
                      m.cadence === 'daily' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' :
                      m.cadence === 'weekly' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' :
                                               'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                    }`}>
                      {m.cadence.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-bold text-ink tracking-tight leading-tight">{m.title}</h3>
                  <p className="text-[12.5px] text-ink-muted font-medium mt-1.5 leading-relaxed">{m.goal}</p>

                  <div className="mt-4">
                    <div className="flex items-end justify-between text-[11.5px] text-ink-dim font-semibold mb-1.5 tabular-nums">
                      <span>{m.progress.toLocaleString()} / {m.total.toLocaleString()}</span>
                      <span className="text-ink font-bold">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-subtle overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: [0.6, 0.05, 0.2, 1], delay: 0.1 + i * 0.04 }}
                        className="h-full bg-accent rounded-full"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
                    <div>
                      <div className="label-meta">Reward</div>
                      <div className="text-[14px] font-bold text-ink tracking-tight">{m.reward}</div>
                    </div>
                    <motion.button
                      whileTap={tap}
                      whileHover={isClaimed || !done ? {} : { scale: 1.04 }}
                      onClick={() => claim(m)}
                      disabled={isClaimed}
                      className={`h-9 px-4 rounded-full text-[12.5px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                        isClaimed
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 cursor-default'
                          : done
                          ? 'bg-accent text-on-accent'
                          : 'bg-subtle text-ink-muted cursor-not-allowed'
                      }`}
                    >
                      {isClaimed ? (
                        <>
                          <CheckCircle2 size={12} strokeWidth={2.6} />
                          Claimed
                        </>
                      ) : done ? (
                        <>
                          Claim
                          <ArrowRight size={12} strokeWidth={2.6} />
                        </>
                      ) : (
                        <>
                          <Lock size={11} strokeWidth={2.4} />
                          Locked
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Achievements */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="card p-6 md:p-8"
        >
          <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
            <div>
              <span className="label-eyebrow">Achievements</span>
              <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-none">
                Permanent badges
              </h2>
            </div>
            <div className="text-[12.5px] text-ink-muted font-semibold">
              {ACHIEVEMENTS.filter((a) => a.unlocked).length} / {ACHIEVEMENTS.length} unlocked
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ACHIEVEMENTS.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.15 + i * 0.03 }}
                whileHover={{ y: -2 }}
                className={`card-flat p-4 text-center relative ${a.unlocked ? '' : 'opacity-60'}`}
              >
                {!a.unlocked && (
                  <div className="absolute top-2 right-2">
                    <Lock size={11} strokeWidth={2.4} className="text-ink-dim" />
                  </div>
                )}
                <div className={`icon-chip mx-auto mb-3 ${a.unlocked ? 'bg-accent text-on-accent' : 'bg-subtle'}`}>
                  <a.Icon size={16} strokeWidth={2.4} className={a.unlocked ? 'text-on-accent' : 'text-ink-dim'} />
                </div>
                <div className="text-[13px] font-bold text-ink tracking-tight leading-tight">{a.title}</div>
                <div className="text-[11px] text-ink-dim font-medium mt-1.5 leading-relaxed">{a.sub}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Crates */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="card p-6 md:p-8"
        >
          <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
            <div>
              <span className="label-eyebrow">Loot crates</span>
              <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-none">
                Open or trade
              </h2>
            </div>
            <motion.button
              whileTap={tap}
              onClick={() => navigate('/profile?tab=balance')}
              className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5"
              style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
            >
              Top up balance <ArrowRight size={13} strokeWidth={2.4} />
            </motion.button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CRATES.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.2 + i * 0.04 }}
                whileHover={{ y: -3 }}
                className="card-flat p-5 relative overflow-hidden"
              >
                <motion.div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${c.color}28, transparent 65%)` }}
                />
                <div className="relative">
                  <div className="h-1 w-full rounded-full mb-3" style={{ background: c.color }} />
                  <div className="text-[14.5px] font-bold text-ink tracking-tight">{c.name}</div>
                  <div className="text-[11px] text-ink-dim font-semibold uppercase tracking-wider mt-1">
                    {c.rarity}
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="label-meta">Cost</div>
                      <div className="text-[15px] font-bold text-ink tracking-tight tabular-nums">{c.cost}</div>
                    </div>
                    <motion.button
                      whileTap={tap}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => addToast({ type: 'info', title: 'Coming soon', message: 'Crate opening launches with the next season.' })}
                      className="h-9 w-9 rounded-full bg-accent text-on-accent grid place-items-center"
                      title="Open crate"
                    >
                      <Sparkles size={14} strokeWidth={2.4} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default RewardsPage;
