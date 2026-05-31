import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronDown,
  BookOpen,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
  Search,
  Wallet,
  Package,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Target,
  Crown,
  Layers,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { useAuthStore } from '../store/authStore';
import SteamLogin from '../components/auth/SteamLogin';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   TradingGuidePage — fresh design
   - Hero
   - 5-step "How a trade works" timeline
   - Pricing strategy section (collapsibles)
   - Pro tips grid
   - Glossary
   ───────────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: '01',
    title: 'Connect your Steam',
    body: 'Sign in with Steam (we use the official OpenID flow — never your password). Enable Steam Guard Mobile if you haven\'t; without it Steam holds every trade for 15 days.',
    Icon: ShieldCheck,
    tint: '#10b981',
  },
  {
    n: '02',
    title: 'Set your trade URL',
    body: 'Open Profile → Settings and paste your Steam Trade URL. This is the receive endpoint sellers use to send you items. Without it, you can\'t receive bought skins.',
    Icon: Wallet,
    tint: '#0ea5e9',
  },
  {
    n: '03',
    title: 'Browse and add to cart',
    body: 'Use weapon, rarity, float and sticker filters to narrow down listings. Add items to your cart and review them all before paying — checkout fees are 0%.',
    Icon: Search,
    tint: '#a855f7',
  },
  {
    n: '04',
    title: 'Pay and wait for the offer',
    body: 'Card, PayPal, SEPA and crypto are accepted. After payment, sellers are notified and have 60 minutes to send you a Steam trade offer. Median time is under 60 seconds.',
    Icon: ShoppingBag,
    tint: '#f59e0b',
  },
  {
    n: '05',
    title: 'Confirm receipt — escrow releases',
    body: 'Accept the Steam offer in your mobile app. Funds stay in escrow for 8 days to cover Steam\'s trade-back window. After that, the seller is paid.',
    Icon: TrendingUp,
    tint: '#ec4899',
  },
];

const PRICING_TIPS = [
  {
    title: 'Use the slider, not guesswork',
    body: 'The listing modal seeds the price from the live Steam median. Drag the slider ±20% to undercut competitors or hold for a premium. A sub-2% deviation gets a "Recommended" tag and sells fastest.',
  },
  {
    title: 'Account for float and pattern',
    body: 'Within a wear bucket, lower floats command 10-40% premiums. Famous patterns (Case Hardened blue, Fade 100%) can sell at 3-5x median. Use the marketplace\'s float and pattern filters before pricing.',
  },
  {
    title: 'Watch sticker valuations',
    body: 'Capsule stickers from majors (especially Katowice 2014 holos) often exceed the gun\'s base value. Don\'t auto-list — check sticker prices on the Steam community market first.',
  },
  {
    title: 'Time your listings',
    body: 'Volume peaks Thursday-Sunday evenings (CET). Major tournaments push covert prices up; cases trend after weekly drops. List rare items just before a major for maximum exposure.',
  },
  {
    title: 'Don\'t race to the bottom',
    body: 'Undercutting by 1 Kč is rarely worth it; the next seller will undercut you, then nobody profits. Match the median or hold above it if the listing is rare — patient sellers earn more.',
  },
];

const TIPS = [
  { Icon: Lightbulb, t: 'Always check float values', s: 'A low-float Factory New can be worth multiples of the median.', tint: '#f59e0b' },
  { Icon: ShieldCheck, t: 'Enable Steam Mobile Guard', s: 'Required for instant trades. Without it, you wait 15 days.', tint: '#10b981' },
  { Icon: Target, t: 'Use wishlists strategically', s: 'Get notified when a target item drops below your price.', tint: '#0ea5e9' },
  { Icon: Crown, t: 'Climb VIP for lower fees', s: 'Gold and above drops your selling fee by up to 50%.', tint: '#a855f7' },
  { Icon: Layers, t: 'Buy collections, sell singles', s: 'Collectors pay premiums for completing a set.', tint: '#ec4899' },
  { Icon: AlertTriangle, t: 'Never trade outside platform', s: 'Off-platform trades have zero escrow protection.', tint: '#ef4444' },
];

const GLOSSARY = [
  { term: 'Float', def: 'Wear value of a skin from 0.00 (pristine) to 1.00 (battle-scarred).' },
  { term: 'Pattern', def: 'Random seed (0-1000) that determines visual layout of the skin.' },
  { term: 'StatTrak™', def: 'Counts player kills with the weapon. Premium of 10-30% over base.' },
  { term: 'Souvenir', def: 'Dropped during pro matches; includes player and team stickers.' },
  { term: 'Escrow', def: 'Funds held by Skinify until you confirm trade receipt.' },
  { term: 'Trade hold', def: 'Steam\'s 7-day reversal window after every trade.' },
  { term: 'Fade %', def: 'Visual gradient quality (50-100%); higher = more colorful surface.' },
  { term: 'Tier 1 sticker', def: 'Highest-grade tournament sticker (e.g. Katowice 2014 holo).' },
];

const TradingGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [openTipIdx, setOpenTipIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-4 pb-16 space-y-4">
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
            className="absolute -top-32 -right-24 w-[460px] h-[460px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 65%)' }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="icon-chip-lg bg-accent-soft mb-5">
                <BookOpen size={22} className="text-accent" />
              </div>
              <span className="label-eyebrow">Trading guide</span>
              <h1 className="text-[28px] sm:text-[40px] font-bold tracking-tight mt-2 leading-tight">
                Trade smarter,<br className="hidden sm:block" /> sell faster.
              </h1>
              <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-3 max-w-[520px] leading-relaxed">
                Everything you need to start trading CS2 skins on Skinify — from your first Steam connection to
                pricing rare patterns like a pro.
              </p>
              {!user && (
                <div className="mt-5">
                  <SteamLogin />
                </div>
              )}
            </div>
            <div className="card-flat p-5 min-w-[260px]">
              <div className="label-meta">You'll learn</div>
              <ul className="mt-2 space-y-2 text-[13px] text-ink font-semibold">
                {[
                  'How a trade works end-to-end',
                  'How to price using the live market',
                  'How to spot premium floats and patterns',
                  'Common pitfalls to avoid',
                ].map((l) => (
                  <li key={l} className="flex items-start gap-2">
                    <Sparkles size={12} className="text-accent shrink-0 mt-1" />
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Timeline */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="card p-6 md:p-8"
        >
          <span className="label-eyebrow">How a trade works</span>
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-tight mb-6">
            Five steps from listing to release
          </h2>
          <ol className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-line" aria-hidden />
            {STEPS.map((s, i) => (
              <motion.li
                key={s.n}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                transition={{ ...spring, delay: i * 0.06 }}
                className="relative pl-14 pb-6 last:pb-0"
              >
                <div
                  className="absolute left-0 top-0 w-10 h-10 rounded-2xl grid place-items-center"
                  style={{
                    background: `linear-gradient(140deg, ${s.tint}, ${s.tint}cc 55%, ${s.tint}88)`,
                    boxShadow: `0 10px 22px -8px ${s.tint}55, inset 0 1px 0 rgba(255,255,255,0.28)`,
                  }}
                >
                  <s.Icon size={16} strokeWidth={2.4} className="text-white drop-shadow" />
                </div>
                <div className="text-[10.5px] uppercase tracking-wider font-bold text-ink-dim tabular-nums">
                  Step {s.n}
                </div>
                <div className="text-[15.5px] sm:text-[17px] font-bold text-ink tracking-tight leading-tight mt-1">
                  {s.title}
                </div>
                <p className="text-[13px] sm:text-[13.5px] text-ink-muted font-medium mt-2 leading-relaxed max-w-[640px]">
                  {s.body}
                </p>
              </motion.li>
            ))}
          </ol>
        </motion.section>

        {/* Pricing strategy */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="card p-6 md:p-8"
        >
          <span className="label-eyebrow">Pricing strategy</span>
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-tight mb-5">
            Price like the market makers
          </h2>
          <ul className="divide-y divide-line">
            {PRICING_TIPS.map((t, i) => {
              const open = openTipIdx === i;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setOpenTipIdx(open ? null : i)}
                    aria-expanded={open}
                    className="w-full py-4 flex items-start gap-4 text-left group"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-full bg-subtle text-ink-muted text-[12px] font-bold grid place-items-center tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <span className="flex-1 text-[14.5px] sm:text-[15px] font-bold text-ink leading-snug tracking-tight pt-1">
                      {t.title}
                    </span>
                    <span
                      className={`shrink-0 mt-0.5 w-8 h-8 rounded-full grid place-items-center transition-all duration-200 ${
                        open ? 'bg-accent text-on-accent rotate-180' : 'bg-subtle text-ink-muted group-hover:bg-accent-soft group-hover:text-ink'
                      }`}
                    >
                      <ChevronDown size={13} strokeWidth={2.4} />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="text-[13.5px] text-ink-muted leading-relaxed font-medium pb-5 pl-12 pr-12 max-w-[720px]">
                          {t.body}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </motion.section>

        {/* Tip grid */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
        >
          <div className="px-1 mb-3">
            <span className="label-eyebrow">Pro tips</span>
            <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight mt-1.5 leading-none">
              Quick wins
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TIPS.map((t, i) => (
              <motion.div
                key={t.t}
                whileHover={{ y: -3 }}
                transition={spring}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                className="card p-5 relative overflow-hidden group"
              >
                <motion.div
                  aria-hidden
                  className="absolute -top-16 -right-10 w-[200px] h-[200px] rounded-full pointer-events-none opacity-50 group-hover:opacity-90 transition-opacity"
                  style={{ background: `radial-gradient(closest-side, ${t.tint}33, transparent 70%)` }}
                />
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-2xl grid place-items-center mb-4"
                    style={{
                      background: `linear-gradient(140deg, ${t.tint}, ${t.tint}cc 55%, ${t.tint}88)`,
                      boxShadow: `0 10px 22px -8px ${t.tint}55, inset 0 1px 0 rgba(255,255,255,0.28)`,
                    }}
                  >
                    <t.Icon size={18} strokeWidth={2.2} className="text-white drop-shadow" />
                  </div>
                  <div className="text-[14.5px] font-bold text-ink tracking-tight leading-tight">{t.t}</div>
                  <p className="text-[12.5px] text-ink-muted font-medium mt-2 leading-relaxed">{t.s}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Glossary */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.2 }}
          className="card p-6 md:p-8"
        >
          <span className="label-eyebrow">Glossary</span>
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-tight mb-5">
            CS2 trading terms
          </h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="flex items-start gap-3">
                <Package size={14} strokeWidth={2.2} className="text-accent shrink-0 mt-1" />
                <div>
                  <dt className="text-[14px] font-bold text-ink tracking-tight">{g.term}</dt>
                  <dd className="text-[13px] text-ink-muted font-medium mt-0.5 leading-relaxed">{g.def}</dd>
                </div>
              </div>
            ))}
          </dl>
        </motion.section>

        {/* Bottom CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.25 }}
          className="grid sm:grid-cols-2 gap-3"
        >
          <button
            onClick={() => navigate('/marketplace')}
            className="card p-5 flex items-center justify-between hover:ring-2 hover:ring-accent/40 transition-all text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="icon-chip bg-accent-soft shrink-0">
                <ShoppingBag size={16} strokeWidth={2.2} className="text-accent" />
              </div>
              <div className="min-w-0">
                <div className="text-[14.5px] font-bold text-ink tracking-tight">Browse the market</div>
                <div className="text-[12px] text-ink-muted font-medium">Filters by weapon, rarity, float and stickers.</div>
              </div>
            </div>
            <ArrowRight size={16} strokeWidth={2.2} className="text-ink-muted shrink-0" />
          </button>
          <button
            onClick={() => navigate('/faq')}
            className="card p-5 flex items-center justify-between hover:ring-2 hover:ring-accent/40 transition-all text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="icon-chip bg-accent-soft shrink-0">
                <BookOpen size={16} strokeWidth={2.2} className="text-accent" />
              </div>
              <div className="min-w-0">
                <div className="text-[14.5px] font-bold text-ink tracking-tight">Read the FAQ</div>
                <div className="text-[12px] text-ink-muted font-medium">24 articles covering fees, security, payments.</div>
              </div>
            </div>
            <ArrowRight size={16} strokeWidth={2.2} className="text-ink-muted shrink-0" />
          </button>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default TradingGuidePage;
