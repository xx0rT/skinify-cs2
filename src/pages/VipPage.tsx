import React, { useState } from 'react';
import { useT } from '../lib/useT';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Sparkles,
  ShieldCheck,
  Headphones,
  Zap,
  Coins,
  TrendingUp,
  Check,
  ChevronLeft,
  ArrowRight,
  Star,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import SteamLogin from '../components/auth/SteamLogin';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   VipPage — fresh design
   - Hero: progress bar to next tier
   - 4 tiers (Silver / Gold / Platinum / Diamond) with monthly fee + perks
   - Perk matrix table
   - FAQ
   ───────────────────────────────────────────────────────────────────────── */

type Tier = 'silver' | 'gold' | 'platinum' | 'diamond';

interface TierDef {
  id: Tier;
  name: string;
  price: string;
  tagline: string;
  perks: string[];
  accentClass: string;
  iconColor: string;
}

const TIERS: TierDef[] = [
  {
    id: 'silver',
    name: 'Silver',
    price: 'Free',
    tagline: 'Default level — unlocks core perks for every Skinify trader.',
    perks: ['Standard 2% trade fee', 'Daily login bonus', 'Standard support response (24h)', 'Access to basic rewards'],
    accentClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
    iconColor: '#94a3b8',
  },
  {
    id: 'gold',
    name: 'Gold',
    price: '199 Kč / mo',
    tagline: 'For regular traders who want lower fees and faster support.',
    perks: ['1.5% trade fee', '+5% deposit bonus', 'Priority support (8h)', 'Early access to drops', 'Custom profile badge'],
    accentClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    iconColor: '#f59e0b',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: '499 Kč / mo',
    tagline: 'Power-user tier with bigger bonuses and a dedicated rep.',
    perks: ['1.0% trade fee', '+10% deposit bonus', '4h priority support', 'Personal account manager', 'Auto-snipe for wishlist drops'],
    accentClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    iconColor: '#0ea5e9',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    price: 'Invite only',
    tagline: 'For top traders — concierge service, zero fees, private events.',
    perks: ['0% trade fee', '+20% deposit bonus', '1h concierge support', 'Private auctions & rare drops', 'Direct line to operations'],
    accentClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
    iconColor: '#a855f7',
  },
];

const VipPage: React.FC = () => {
  const tr = useT();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [selected, setSelected] = useState<Tier>('gold');

  const upgrade = (t: TierDef) => {
    if (!user) {
      addToast({ type: 'warning', title: 'Sign in', message: 'Sign in with Steam to upgrade.' });
      return;
    }
    if (t.id === 'diamond') {
      addToast({ type: 'info', title: 'Invite only', message: 'Diamond is currently invite-only — we\'ll reach out when you qualify.' });
      return;
    }
    addToast({ type: 'success', title: `${t.name} pending`, message: 'Billing setup will open in a future release.' });
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
          className="card p-7 sm:p-10 relative overflow-hidden"
        >
          <motion.div
            aria-hidden
            className="absolute -top-40 -right-24 w-[520px] h-[520px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(closest-side, rgb(var(--accent) / 0.2), transparent 65%)' }}
            animate={{ scale: [1, 1.07, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="icon-chip-lg bg-accent-soft mb-5">
                <Crown size={22} className="text-accent" />
              </div>
              <span className="label-eyebrow">{tr('vip.hero.eyebrow', 'VIP membership')}</span>
              <h1 className="text-[28px] sm:text-[40px] font-bold tracking-tight mt-2 leading-tight">
                {tr('vip.hero.title', 'Trade more, pay less.')}
              </h1>
              <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-3 max-w-[520px] leading-relaxed">
                {tr('vip.hero.lead', 'Skinify VIP rewards loyal traders with lower fees, faster support, and exclusive perks across the marketplace.')}
              </p>
              {!user && (
                <div className="mt-5">
                  <SteamLogin />
                </div>
              )}
            </div>
            <div className="card-flat p-5 md:p-6 min-w-[280px]">
              <div className="label-meta">Current tier</div>
              <div className="mt-1.5 text-[22px] font-bold tracking-tight text-ink leading-none">
                Silver
              </div>
              <div className="mt-3 h-2 rounded-full bg-subtle overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '28%' }}
                  transition={{ duration: 1.2, ease: [0.6, 0.05, 0.2, 1], delay: 0.3 }}
                  className="h-full bg-accent rounded-full"
                />
              </div>
              <div className="mt-3 text-[12px] text-ink-muted font-medium">
                <span className="text-ink font-bold">2,150 Kč</span> more to unlock Gold.
              </div>
            </div>
          </div>
        </motion.section>

        {/* Tier cards */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          {TIERS.map((t, i) => {
            const active = selected === t.id;
            const isPopular = t.id === 'gold';
            return (
              <motion.div
                layout
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: i * 0.05 }}
                whileHover={{ y: -6 }}
                onClick={() => setSelected(t.id)}
                className={`group cursor-pointer relative card overflow-hidden flex flex-col transition-all ${
                  active ? 'ring-2 ring-accent shadow-lg' : ''
                } ${isPopular ? 'sm:scale-[1.02]' : ''}`}
                style={
                  isPopular
                    ? {
                        background: `linear-gradient(180deg, ${t.iconColor}10, rgb(var(--surface)) 60%)`,
                      }
                    : undefined
                }
              >
                {/* Tier color top stripe */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: `linear-gradient(90deg, ${t.iconColor}, ${t.iconColor}88)` }}
                />

                {/* Soft tint wash */}
                <motion.div
                  aria-hidden
                  className="absolute -top-24 -right-12 w-[280px] h-[280px] rounded-full pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ background: `radial-gradient(closest-side, ${t.iconColor}24, transparent 70%)` }}
                />

                {isPopular && (
                  <span
                    className="absolute top-4 right-4 pill text-on-accent z-10"
                    style={{ background: t.iconColor }}
                  >
                    <Star size={10} strokeWidth={2.6} className="inline mr-1" />
                    Most popular
                  </span>
                )}

                <div className="relative p-6 flex flex-col flex-1">
                  {/* Big icon medallion */}
                  <div
                    className="relative w-16 h-16 rounded-3xl grid place-items-center shrink-0 mb-5"
                    style={{
                      background: `linear-gradient(140deg, ${t.iconColor}, ${t.iconColor}cc 55%, ${t.iconColor}88)`,
                      boxShadow: `0 16px 30px -10px ${t.iconColor}66, inset 0 1px 0 rgba(255,255,255,0.28)`,
                    }}
                  >
                    <Crown size={26} strokeWidth={2.2} className="text-white relative z-10 drop-shadow" />
                    <span
                      className="absolute inset-1 rounded-[20px] pointer-events-none"
                      style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.32), transparent 45%)' }}
                    />
                  </div>

                  <div className="text-[10.5px] uppercase tracking-wider font-bold mb-1" style={{ color: t.iconColor }}>
                    {t.name}
                  </div>
                  <div className="text-[24px] font-bold tracking-tight text-ink leading-none">
                    {t.price}
                  </div>
                  <p className="text-[12.5px] text-ink-muted font-medium mt-2.5 leading-relaxed">
                    {t.tagline}
                  </p>

                  <ul className="mt-5 space-y-2.5 flex-1">
                    {t.perks.map((p, pi) => (
                      <li key={p} className="flex items-start gap-2.5 text-[12.5px] font-medium">
                        <div
                          className="w-4 h-4 rounded-full grid place-items-center shrink-0 mt-0.5"
                          style={{ background: `${t.iconColor}26` }}
                        >
                          <Check size={10} strokeWidth={3} style={{ color: t.iconColor }} />
                        </div>
                        <span className={pi < 3 ? 'text-ink' : 'text-ink-muted'}>{p}</span>
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    whileTap={tap}
                    whileHover={{ scale: 1.02 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      upgrade(t);
                    }}
                    className={`mt-6 h-11 rounded-full flex items-center justify-center gap-1.5 text-[13px] font-bold transition-colors ${
                      t.id === 'silver'
                        ? 'bg-subtle text-ink-muted cursor-default'
                        : isPopular
                        ? 'text-white'
                        : active
                        ? 'text-white'
                        : 'bg-subtle text-ink hover:bg-bg'
                    }`}
                    style={
                      t.id === 'silver'
                        ? undefined
                        : isPopular || active
                        ? {
                            background: `linear-gradient(140deg, ${t.iconColor}, ${t.iconColor}d4)`,
                            boxShadow: `0 10px 24px -10px ${t.iconColor}88`,
                          }
                        : undefined
                    }
                  >
                    {t.id === 'silver' ? 'Current tier' : t.id === 'diamond' ? 'Request invite' : 'Upgrade'}
                    {t.id !== 'silver' && <ArrowRight size={12} strokeWidth={2.6} />}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Perks highlight */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {[
            { Icon: TrendingUp, t: 'Lower fees', s: 'From 2% down to 0% as you climb tiers.' },
            { Icon: Coins, t: 'Bigger bonuses', s: 'Deposit bonuses scale up to +20%.' },
            { Icon: Headphones, t: 'Priority support', s: 'Faster queues, dedicated reps.' },
            { Icon: Sparkles, t: 'Exclusive drops', s: 'Early access and private auctions.' },
          ].map((p) => (
            <motion.div key={p.t} whileHover={{ y: -2 }} transition={spring} className="card p-4">
              <div className="icon-chip bg-accent-soft mb-3">
                <p.Icon size={16} strokeWidth={2.2} className="text-accent" />
              </div>
              <div className="text-[14.5px] font-bold text-ink tracking-tight">{p.t}</div>
              <p className="text-[12.5px] text-ink-muted font-medium mt-1.5 leading-relaxed">{p.s}</p>
            </motion.div>
          ))}
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default VipPage;
