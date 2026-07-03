import React, { useMemo, useState } from 'react';
import { useT } from '../lib/useT';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Users,
  Coins,
  Share2,
  Trophy,
  TrendingUp,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Twitter,
  MessageCircle,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import SteamLogin from '../components/auth/SteamLogin';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   ReferralPage — fresh design
   - Big shareable link card with copy + social buttons
   - 3 KPI tiles
   - "How it works" 3 steps with animated underline
   - Tier rewards strip
   ───────────────────────────────────────────────────────────────────────── */

const ReferralPage: React.FC = () => {
  const tr = useT();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [copied, setCopied] = useState(false);

  const refCode = useMemo(() => {
    if (user?.steamId) return `SKIN-${user.steamId.slice(-6)}`;
    return 'SKIN-CONNECT';
  }, [user?.steamId]);

  const refLink = `https://skinify.cs2/r/${refCode}`;

  const copy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    addToast({ type: 'success', title: 'Link copied', message: 'Share with friends to earn rewards.' });
    setTimeout(() => setCopied(false), 1800);
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

        {/* Hero + share */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-7 sm:p-10 relative overflow-hidden"
        >
          <motion.div
            aria-hidden
            className="absolute -top-32 -right-24 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 65%)' }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative">
            <div className="icon-chip-lg bg-accent-soft mb-5">
              <Share2 size={22} className="text-accent" />
            </div>
            <span className="label-eyebrow">{tr('referral.hero.eyebrow', 'Refer & earn')}</span>
            <h1 className="text-[28px] sm:text-[40px] font-bold tracking-tight mt-2 leading-tight">
              {tr('referral.hero.title', 'Invite friends. Get paid for every trade they make.')}
            </h1>
            <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-3 max-w-[640px] leading-relaxed">
              {tr('referral.hero.lead', 'You and your friend both get a bonus when they sign up. Earn ongoing commission from every trade they complete — for life.')}
            </p>

            {/* Link */}
            <div className="mt-6 max-w-[700px] flex flex-wrap gap-2">
              <div className="flex-1 min-w-[260px] flex items-center gap-3 h-14 px-4 rounded-3xl bg-subtle">
                <Sparkles size={16} className="text-accent shrink-0" />
                <input
                  readOnly
                  value={refLink}
                  className="flex-1 bg-transparent outline-none text-ink font-bold text-[14px] tracking-tight"
                />
              </div>
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.03 }}
                onClick={copy}
                className="h-14 px-6 rounded-3xl bg-accent text-on-accent font-bold text-[14px] inline-flex items-center gap-2"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.span
                      key="ok"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Check size={15} strokeWidth={2.6} /> Copied
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Copy size={15} strokeWidth={2.4} /> Copy link
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Socials */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[12.5px] text-ink-muted font-semibold">Share via</span>
              {[
                { Icon: Twitter, label: 'Twitter', href: `https://twitter.com/intent/tweet?text=Join%20Skinify&url=${encodeURIComponent(refLink)}` },
                { Icon: MessageCircle, label: 'Discord', href: '#' },
              ].map(({ Icon, label, href }) => (
                <motion.a
                  whileTap={tap}
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 px-3 rounded-full bg-subtle hover:bg-bg text-ink text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Icon size={12} strokeWidth={2.2} />
                  {label}
                </motion.a>
              ))}
            </div>

            {!user && (
              <div className="mt-5">
                <SteamLogin />
              </div>
            )}
          </div>
        </motion.section>

        {/* KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {[
            { label: 'Friends invited', value: '0', Icon: Users, sub: 'Sign-ups via your link' },
            { label: 'Total earned', value: '0 Kč', Icon: Coins, sub: 'Lifetime commission' },
            { label: 'Pending', value: '0 Kč', Icon: Trophy, sub: 'Awaiting trade completion' },
          ].map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.08 + i * 0.04 }}
              whileHover={{ y: -2 }}
              className="card p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="label-meta">{k.label}</span>
                <div className="icon-chip-sm bg-accent-soft">
                  <k.Icon size={14} strokeWidth={2.2} className="text-accent" />
                </div>
              </div>
              <div className="text-[22px] font-bold tracking-tight tabular-nums text-ink leading-none">
                {k.value}
              </div>
              <div className="text-[11.5px] text-ink-dim font-medium mt-1.5">{k.sub}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* How it works */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.12 }}
          className="card p-6 md:p-8"
        >
          <span className="label-eyebrow">{tr('referral.how.eyebrow', 'How it works')}</span>
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-none mb-5">
            Three steps to start earning
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: '01', t: 'Share your link', s: 'Send your unique referral link to friends or post on socials.' },
              { n: '02', t: 'They sign up & trade', s: 'Your friend signs in via Steam and completes their first trade.' },
              { n: '03', t: 'You earn forever', s: 'Get 0.5% commission from every trade they make on Skinify.' },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.2 + i * 0.06 }}
                className="card-flat p-5 relative"
              >
                <div className="text-[26px] font-bold tracking-tight tabular-nums text-accent leading-none">
                  {step.n}
                </div>
                <div className="text-[15px] font-bold text-ink tracking-tight mt-3 leading-tight">{step.t}</div>
                <p className="text-[12.5px] text-ink-muted font-medium mt-2 leading-relaxed">{step.s}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Tier rewards */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.18 }}
          className="card p-6 md:p-8"
        >
          <span className="label-eyebrow">{tr('referral.tiers.eyebrow', 'Affiliate tiers')}</span>
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-none mb-5">
            More referrals, bigger cut
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: 'Starter',  refs: '1+',  cut: '0.5%', sub: 'Up to 5 active referrals' },
              { name: 'Pro',      refs: '10+', cut: '1.0%', sub: '10+ active referrals' },
              { name: 'Ambassador', refs: '50+', cut: '1.5%', sub: 'Custom landing page + perks' },
              { name: 'Partner',  refs: '200+', cut: '2.0%', sub: 'Direct partnerships & sponsored streams' },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.25 + i * 0.04 }}
                whileHover={{ y: -3 }}
                className="card-flat p-4 relative"
              >
                <div className="absolute top-3 right-3 pill bg-accent-soft text-accent">{t.cut}</div>
                <div className="label-meta">{t.name}</div>
                <div className="mt-2 text-[20px] font-bold tracking-tight tabular-nums text-ink leading-none">
                  {t.refs}
                </div>
                <div className="text-[11.5px] text-ink-dim font-medium mt-2">{t.sub}</div>
              </motion.div>
            ))}
          </div>
          <motion.button
            whileTap={tap}
            onClick={() => navigate('/profile')}
            className="mt-5 h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5"
            style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
          >
            View your dashboard <ArrowRight size={13} strokeWidth={2.4} />
          </motion.button>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default ReferralPage;
