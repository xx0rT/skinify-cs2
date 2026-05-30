import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Share2,
  Check,
  Users,
  TrendingUp,
  Coins,
  Clock,
  Link as LinkIcon,
  ArrowRight,
  Gift,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCurrencyStore } from '../store/currencyStore';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import SteamLogin from '../components/auth/SteamLogin';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   ReferralPage
   Single-screen referral hub: link card, stats, history, how-it-works.
   Data flow: ?steam_id → users.referral_code, then referrals + referral_rewards.
   ───────────────────────────────────────────────────────────────────────── */

interface Stats {
  totalReferrals: number;
  completedReferrals: number;
  totalEarnings: number;
  pendingRewards: number;
  clickCount: number;
  conversionRate: number;
}
interface HistoryRow {
  id: string;
  user: string;
  status: 'clicked' | 'registered' | 'qualified' | 'completed';
  reward: number;
  date: string;
}

const STATUS_COPY: Record<HistoryRow['status'], { label: string; hue: string }> = {
  clicked:    { label: 'Visited',     hue: 'stone' },
  registered: { label: 'Signed up',   hue: 'sky' },
  qualified:  { label: 'Qualified',   hue: 'lemon' },
  completed:  { label: 'Completed',   hue: 'mint' },
};

const staggerParent = { hidden: {}, shown: { transition: { staggerChildren: 0.06 } } };
const staggerChild = {
  hidden: { opacity: 0, y: 12 },
  shown:  { opacity: 1, y: 0, transition: spring },
};

const ReferralPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();

  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState<Stats>({
    totalReferrals: 0,
    completedReferrals: 0,
    totalEarnings: 0,
    pendingRewards: 0,
    clickCount: 0,
    conversionRate: 0,
  });
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralLink = useMemo(
    () => (referralCode ? `${window.location.origin}/?ref=${referralCode}` : ''),
    [referralCode],
  );

  /* Bootstrap the user's referral code. The DB has a trigger that auto-mints
     a code on first user write — if the code is missing we nudge the row to
     trigger the mint, then re-fetch. */
  useEffect(() => {
    if (!user?.steamId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data: u } = await supabase
          .from('users')
          .select('id, referral_code')
          .eq('steam_id', user.steamId)
          .maybeSingle();

        if (cancelled || !u) return;

        let code = u.referral_code as string | null;
        if (!code) {
          // Nudge the trigger to mint a code, then re-read.
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('steam_id', user.steamId);
          const { data: u2 } = await supabase
            .from('users')
            .select('referral_code')
            .eq('steam_id', user.steamId)
            .maybeSingle();
          code = u2?.referral_code ?? null;
        }
        if (code) setReferralCode(code);

        const [{ data: refs }, { data: rewards }] = await Promise.all([
          supabase.from('referrals').select('*').eq('referrer_id', u.id),
          supabase.from('referral_rewards').select('*').eq('user_id', u.id),
        ]);
        const referrals = refs || [];
        const rw = rewards || [];

        const totalReferrals = referrals.length;
        const completedReferrals = referrals.filter((r) => r.status === 'completed').length;
        const totalEarnings = rw
          .filter((r) => r.status === 'paid')
          .reduce((s, r) => s + Number(r.reward_value || 0), 0);
        const pendingRewards = rw
          .filter((r) => r.status === 'pending')
          .reduce((s, r) => s + Number(r.reward_value || 0), 0);
        const clickCount = referrals.filter((r) => r.status === 'clicked').length;
        const conversionRate =
          totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;

        if (cancelled) return;
        setStats({
          totalReferrals,
          completedReferrals,
          totalEarnings: Math.round(totalEarnings),
          pendingRewards: Math.round(pendingRewards),
          clickCount,
          conversionRate: Math.round(conversionRate * 10) / 10,
        });

        const rows: HistoryRow[] = await Promise.all(
          referrals.slice(0, 12).map(async (r) => {
            let displayName = 'Anonymous';
            if (r.referred_id) {
              const { data: ru } = await supabase
                .from('users')
                .select('display_name')
                .eq('id', r.referred_id)
                .maybeSingle();
              if (ru?.display_name) displayName = ru.display_name;
            }
            const reward = rw.find((x) => x.referral_id === r.id);
            return {
              id: String(r.id),
              user: displayName,
              status: r.status as HistoryRow['status'],
              reward: reward ? Number(reward.reward_value) : 0,
              date: new Date(r.created_at).toLocaleDateString(),
            };
          }),
        );
        if (!cancelled) setHistory(rows);
      } catch (err) {
        console.error('[referral] load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.steamId]);

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      addToast({ type: 'success', title: 'Link copied' });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      addToast({ type: 'error', title: 'Copy failed' });
    }
  };

  const shareLink = async () => {
    if (!referralLink) return;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'Join me on Skinify',
          text: 'Trade CS2 skins with 0% fees and escrow protection.',
          url: referralLink,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink();
    }
  };

  /* ───── Logged-out state ───── */
  if (!user) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="card p-10 md:p-14 text-center max-w-[640px] mx-auto mt-12"
          >
            <div className="icon-chip-lg chip-lilac mx-auto mb-5">
              <Gift size={22} strokeWidth={2.2} style={{ color: 'rgb(var(--hue-lilac))' }} />
            </div>
            <span className="label-eyebrow">Referrals</span>
            <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight mt-2 leading-none">
              Invite friends, earn together
            </h1>
            <p className="text-[14px] text-ink-muted font-medium mt-3 max-w-md mx-auto">
              Get a unique link, share it, and earn a cut of every trade your invites make.
            </p>
            <div className="mt-7 flex justify-center">
              <SteamLogin />
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ───── Logged-in state ───── */
  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-6"
        >
          <span className="label-eyebrow">Referrals</span>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight leading-none mt-2">
            Invite friends, earn together
          </h1>
          <p className="text-[13px] sm:text-[14px] text-ink-muted font-medium mt-1.5">
            Share your link and earn from every trade your invites complete.
          </p>
        </motion.div>

        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr] mb-3">
          {/* ── Link card (hero) ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.06 }}
            className="card p-7 md:p-9 relative overflow-hidden"
          >
            <motion.div
              aria-hidden
              className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 65%)',
              }}
              animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />

            <span className="relative label-eyebrow">Your referral link</span>

            <div className="relative mt-4 flex items-stretch gap-2 max-w-full">
              <div className="flex-1 min-w-0 h-14 rounded-2xl bg-subtle px-4 flex items-center gap-3">
                <LinkIcon size={16} strokeWidth={2.2} className="text-ink-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-ink-dim font-semibold uppercase tracking-wider">
                    Code
                  </div>
                  <div className="text-[14px] font-bold text-ink truncate select-text">
                    {loading ? '—' : referralCode || 'Generating…'}
                  </div>
                </div>
                <code className="hidden md:block text-[12px] text-ink-muted truncate max-w-[260px] select-text font-medium">
                  {referralLink || ''}
                </code>
              </div>

              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={copyLink}
                disabled={!referralLink}
                className="h-14 px-5 rounded-2xl bg-accent text-on-accent font-bold text-[13.5px] flex items-center gap-2 disabled:opacity-50"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
              >
                {copied ? <Check size={16} strokeWidth={2.4} /> : <Copy size={16} strokeWidth={2.4} />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </motion.button>

              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={shareLink}
                disabled={!referralLink}
                className="h-14 px-5 rounded-2xl bg-subtle hover:bg-bg text-ink font-semibold text-[13.5px] flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <Share2 size={16} strokeWidth={2.2} />
                <span className="hidden sm:inline">Share</span>
              </motion.button>
            </div>

            <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Step n={1} text="Share your link" />
              <Step n={2} text="Friend signs in with Steam" />
              <Step n={3} text="You earn from their trades" />
            </div>
          </motion.div>

          {/* ── Earnings summary ───────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.12 }}
            className="card p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="label-eyebrow">Total earned</span>
              <span className="pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                {stats.conversionRate}% conv
              </span>
            </div>
            <div className="text-[34px] font-bold tracking-tight leading-none text-ink mt-1 tabular-nums">
              {loading ? '—' : formatPrice(stats.totalEarnings)}
            </div>
            <div className="text-[12.5px] text-ink-muted font-medium mt-1.5">
              {stats.pendingRewards > 0
                ? `${formatPrice(stats.pendingRewards)} pending release`
                : 'No pending rewards yet'}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="card-flat px-3 py-2.5">
                <div className="label-meta">Invites</div>
                <div className="text-[18px] font-bold tracking-tight text-ink mt-1 tabular-nums leading-none">
                  {stats.totalReferrals}
                </div>
              </div>
              <div className="card-flat px-3 py-2.5">
                <div className="label-meta">Active</div>
                <div className="text-[18px] font-bold tracking-tight text-ink mt-1 tabular-nums leading-none">
                  {stats.completedReferrals}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Stats strip ───────────────────────────────────── */}
        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3"
        >
          <StatTile
            label="Clicks"
            value={stats.clickCount.toLocaleString()}
            Icon={TrendingUp}
            hue="sky"
            sub="Total visits"
          />
          <StatTile
            label="Sign-ups"
            value={stats.totalReferrals.toLocaleString()}
            Icon={Users}
            hue="lilac"
            sub="People you invited"
          />
          <StatTile
            label="Completed"
            value={stats.completedReferrals.toLocaleString()}
            Icon={Check}
            hue="mint"
            sub="Made a first trade"
          />
          <StatTile
            label="Earned"
            value={loading ? '—' : formatPrice(stats.totalEarnings)}
            Icon={Coins}
            hue="lemon"
            sub="Total reward payouts"
          />
        </motion.div>

        {/* ── History ───────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -80px 0px' }}
          transition={spring}
          className="card p-5 md:p-7"
        >
          <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
            <div>
              <span className="label-eyebrow">Recent activity</span>
              <h2 className="text-[17px] font-bold tracking-tight text-ink mt-1.5 leading-none">
                Referral history
              </h2>
            </div>
            <button
              onClick={() => navigate('/profile?tab=transactions')}
              className="text-[13px] text-ink-muted hover:text-ink font-semibold flex items-center gap-1 transition-colors"
            >
              All transactions <ArrowRight size={13} strokeWidth={2.2} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skel h-14" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center">
              <Clock className="mx-auto text-ink-muted mb-2" size={22} />
              <p className="text-[13.5px] text-ink-muted font-medium">
                No referrals yet — share your link to get started.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {history.map((row) => {
                const meta = STATUS_COPY[row.status] ?? STATUS_COPY.clicked;
                return (
                  <li key={row.id} className="py-3 flex items-center gap-3">
                    <div className={`icon-chip chip-${meta.hue}`}>
                      <Users
                        size={16}
                        strokeWidth={2.2}
                        style={{ color: `rgb(var(--hue-${meta.hue}))` }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-ink truncate tracking-tight">
                        {row.user}
                      </div>
                      <div className="text-[11px] text-ink-dim font-medium mt-0.5">
                        {row.date}
                      </div>
                    </div>
                    <span className="pill bg-subtle text-ink-muted">{meta.label}</span>
                    <div className="text-right shrink-0 min-w-[80px]">
                      <div className="text-[14px] font-bold text-ink tabular-nums tracking-tight">
                        {row.reward > 0 ? `+${formatPrice(row.reward)}` : '—'}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

const Step: React.FC<{ n: number; text: string }> = ({ n, text }) => (
  <div className="card-flat p-3 flex items-center gap-3 min-w-0">
    <div className="w-8 h-8 rounded-full bg-accent-soft grid place-items-center shrink-0">
      <span className="text-[12px] font-bold text-accent">{n}</span>
    </div>
    <span className="text-[12.5px] text-ink font-semibold leading-tight">{text}</span>
  </div>
);

const StatTile: React.FC<{
  label: string;
  value: string;
  Icon: React.ComponentType<any>;
  hue: string;
  sub?: string;
}> = ({ label, value, Icon, hue, sub }) => (
  <motion.div variants={staggerChild} whileHover={{ y: -2 }} transition={spring} className="card p-4">
    <div className="flex items-start justify-between mb-3">
      <span className="label-meta">{label}</span>
      <div className={`icon-chip-sm chip-${hue}`}>
        <Icon size={14} strokeWidth={2.2} style={{ color: `rgb(var(--hue-${hue}))` }} />
      </div>
    </div>
    <div className="text-[22px] sm:text-[26px] font-bold text-ink tracking-tight leading-none tabular-nums">
      {value}
    </div>
    {sub && <div className="text-[11.5px] text-ink-dim font-medium mt-1.5">{sub}</div>}
  </motion.div>
);

export default ReferralPage;
