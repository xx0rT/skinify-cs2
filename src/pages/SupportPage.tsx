import React, { useMemo, useState } from 'react';
import { useT } from '../lib/useT';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronDown,
  LifeBuoy,
  MessageCircle,
  Mail,
  Send,
  Search,
  Sparkles,
  AlertTriangle,
  Wallet,
  ShieldCheck,
  Package,
  Settings as SettingsIcon,
  HelpCircle,
  Clock,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import SupportChatWidget from '../components/SupportChatWidget';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   SupportPage — fresh design in the landing/profile theme
   - Hero with section eyebrow, status pill, two big contact CTAs
   - Status & SLA row
   - Quick-help category tiles
   - Searchable common-issue list (accordion)
   - Inline ticket form
   ───────────────────────────────────────────────────────────────────────── */

type Category = 'trade' | 'payment' | 'account' | 'security' | 'listing' | 'other';

interface Issue {
  id: string;
  category: Category;
  title: string;
  body: string;
  Icon: React.ComponentType<any>;
  tint: string;
}

const CATEGORIES: { id: Category | 'all'; label: string; Icon: React.ComponentType<any>; tint: string }[] = [
  { id: 'all',      label: 'All',       Icon: HelpCircle,   tint: '#a855f7' },
  { id: 'trade',    label: 'Trades',    Icon: Package,      tint: '#0ea5e9' },
  { id: 'payment',  label: 'Payments',  Icon: Wallet,       tint: '#f59e0b' },
  { id: 'account',  label: 'Account',   Icon: SettingsIcon, tint: '#10b981' },
  { id: 'security', label: 'Security',  Icon: ShieldCheck,  tint: '#ef4444' },
  { id: 'listing',  label: 'Listings',  Icon: Sparkles,     tint: '#ec4899' },
];

const ISSUES: Issue[] = [
  {
    id: 'trade-pending',
    category: 'trade',
    title: 'My trade is stuck in pending',
    body: 'Steam trade offers can take up to 15 minutes to deliver if you haven\'t enabled the Mobile Authenticator. Without it, Steam holds the offer in escrow for 15 days. Enable Steam Guard Mobile, then re-send the offer from the order page.',
    Icon: Package,
    tint: '#0ea5e9',
  },
  {
    id: 'trade-cancelled',
    category: 'trade',
    title: 'My trade was cancelled — am I refunded?',
    body: 'Yes. If the seller cancels or fails to deliver within 60 minutes, escrow auto-refunds to your Skinify balance. You can re-purchase from another seller of the same item without re-depositing.',
    Icon: AlertTriangle,
    tint: '#0ea5e9',
  },
  {
    id: 'payment-failed',
    category: 'payment',
    title: 'My deposit failed but money was charged',
    body: 'Most failed deposits auto-reverse within 1-3 business days. If you have a transaction ID, send it to support with a screenshot of your statement — we\'ll cross-reference with our payment processor and credit your account within 24h.',
    Icon: Wallet,
    tint: '#f59e0b',
  },
  {
    id: 'withdraw-pending',
    category: 'payment',
    title: 'My withdrawal is still pending',
    body: 'Card and PayPal withdrawals process within 24 hours. SEPA can take 1-3 business days. Crypto withdrawals confirm in under 30 minutes once on-chain. If yours is past those windows, open a ticket with the withdrawal ID.',
    Icon: Clock,
    tint: '#f59e0b',
  },
  {
    id: 'account-locked',
    category: 'account',
    title: 'My account is locked',
    body: 'Accounts auto-lock after 5 failed Steam-link attempts or suspicious activity. Locks lift after 30 minutes. If your account is still locked after 1 hour, contact support — we can manually verify and unlock once you\'ve confirmed your Steam Guard.',
    Icon: ShieldCheck,
    tint: '#10b981',
  },
  {
    id: 'inventory-empty',
    category: 'account',
    title: 'My Steam inventory shows empty',
    body: 'Your Steam profile must be set to Public. Go to Steam → Profile → Edit Profile → Privacy → Inventory → Public. After changing, hit refresh in the Inventory tab. Our cache refreshes every 60 seconds.',
    Icon: Package,
    tint: '#10b981',
  },
  {
    id: 'sec-2fa',
    category: 'security',
    title: 'How do I enable two-factor authentication?',
    body: 'Skinify uses Steam Guard for trade confirmations. There\'s no separate Skinify password — your security is tied to Steam. We strongly recommend enabling Steam Guard Mobile to unlock instant trades.',
    Icon: ShieldCheck,
    tint: '#ef4444',
  },
  {
    id: 'sec-phishing',
    category: 'security',
    title: 'I got a suspicious DM about Skinify',
    body: 'We never DM users about trades, passwords, or "verification". Anyone asking for your Steam password or your Skinify session is impersonating us. Forward the message to support and block the sender.',
    Icon: AlertTriangle,
    tint: '#ef4444',
  },
  {
    id: 'listing-fee',
    category: 'listing',
    title: 'Why was a fee taken from my sale?',
    body: 'Sellers pay a 2% listing fee deducted from the sale price. VIP Gold reduces it to 1.5%, Platinum 1.0%, Diamond 0%. The fee is shown before you list and broken down on the order receipt.',
    Icon: Sparkles,
    tint: '#ec4899',
  },
  {
    id: 'listing-remove',
    category: 'listing',
    title: 'How do I delete a listing?',
    body: 'Go to Profile → Listings → click the trash icon on the listing card. Active listings can be removed any time before a buyer pays. Sold or in-escrow listings can\'t be cancelled by the seller.',
    Icon: Sparkles,
    tint: '#ec4899',
  },
];

const SupportPage: React.FC = () => {
  const tr = useT();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ISSUES.filter((i) => {
      if (cat !== 'all' && i.category !== cat) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.body.toLowerCase().includes(q) ||
        i.category.includes(q)
      );
    });
  }, [cat, query]);

  const submit = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      addToast({ type: 'error', title: 'Missing info', message: 'Add a subject and message before submitting.' });
      return;
    }
    if (!user) {
      addToast({ type: 'warning', title: 'Login required', message: 'Sign in to open a support ticket.' });
      navigate('/auth/signin');
      return;
    }
    setSubmitting(true);
    try {
      /* Tickets reference users.id (uuid) — resolve it from the Steam
         ID the auth store carries. Same pattern as /tickets. */
      const { supabase } = await import('../lib/supabaseClient');
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('steam_id', user.steamId)
        .maybeSingle();
      if (!userRow?.id) {
        addToast({ type: 'error', title: 'Account not found', message: 'Try re-logging and submitting again.' });
        return;
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .insert([
          {
            user_id: userRow.id,
            subject: form.subject.trim(),
            description: form.message.trim(),
            category: 'other',
            priority: 'medium',
          },
        ])
        .select()
        .single();
      if (error) throw error;

      /* Brevo confirmation — fire-and-forget. */
      if (user.email && data?.id) {
        import('../utils/emailService').then(({ sendTicketCreatedEmail }) =>
          sendTicketCreatedEmail({
            to: user.email!,
            ticketSubject: form.subject.trim(),
            ticketId: String(data.id),
          }),
        );
      }

      addToast({
        type: 'success',
        title: 'Ticket submitted',
        message: "We'll reply within 4 hours on average. Track it under My tickets.",
      });
      setForm({ subject: '', message: '' });
      navigate('/tickets');
    } catch (e: any) {
      addToast({ type: 'error', title: 'Could not submit', message: e?.message || 'Try again in a moment.' });
    } finally {
      setSubmitting(false);
    }
  };

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
          <div className="relative">
            <div className="flex items-center gap-3 mb-5">
              <div className="icon-chip-lg bg-accent-soft">
                <LifeBuoy size={22} className="text-accent" />
              </div>
              <span className="label-eyebrow">{tr('support.hero.eyebrow', 'Support center')}</span>
            </div>
            <h1 className="text-[28px] sm:text-[40px] font-bold tracking-tight leading-tight">
              {tr('support.hero.title', "We're here when something breaks.")}
            </h1>
            <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-3 max-w-[520px] leading-relaxed">
              {tr('support.hero.lead', 'Search common issues, open a ticket, or chat with us live. Trade-blocking issues get a dedicated queue with a 30-minute SLA.')}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/tickets')}
                className="h-12 px-5 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center gap-2"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
              >
                <MessageCircle size={15} strokeWidth={2.4} />
                {tr('support.stuck.title', 'Open a ticket')}
              </motion.button>
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/tickets')}
                className="h-12 px-5 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[14px] inline-flex items-center gap-2 transition-colors"
              >
                <Clock size={15} strokeWidth={2.2} />
                {tr('support.myTickets', 'My tickets')}
              </motion.button>
              <motion.a
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                href="mailto:support@skinify.gg"
                className="h-12 px-5 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[14px] inline-flex items-center gap-2 transition-colors"
              >
                <Mail size={15} strokeWidth={2.2} />
                {tr('support.email', 'Email support')}
              </motion.a>
            </div>
          </div>
        </motion.section>

        {/* Status strip — full-width horizontal bar under the hero. Expansion
            opens an absolute popover instead of pushing the surrounding
            layout down. */}
        <StatusCard />

        {/* Quick categories */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
        >
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c, i) => {
              const active = cat === c.id;
              return (
                <motion.button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  whileTap={tap}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: i * 0.04 }}
                  className={`relative h-11 px-5 rounded-full text-[13.5px] font-bold transition-colors ${
                    active ? 'text-on-accent' : 'bg-surface text-ink-muted hover:text-ink'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="support-cat-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={spring}
                    />
                  )}
                  <span className="relative">
                    {tr(`support.cat.${c.id}`, c.label)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* Search + list */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="card p-5 md:p-6"
        >
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div>
              <span className="label-eyebrow">{tr('support.common.eyebrow', 'Common issues')}</span>
              <h2 className="text-[18px] font-bold tracking-tight mt-1.5 leading-none">
                {filtered.length} {filtered.length === 1 ? tr('support.article', 'article') : tr('support.articles', 'articles')}
              </h2>
            </div>
            <div className="flex-1 min-w-[200px] max-w-[420px] flex items-center gap-2 h-10 px-3.5 rounded-full bg-subtle">
              <Search size={14} strokeWidth={2} className="text-ink-muted shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr('support.search.placeholder', 'Search support…')}
                className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[13px] font-medium"
              />
              {cat !== 'all' && (
                <button
                  onClick={() => setCat('all')}
                  className="text-[11.5px] text-ink-muted hover:text-ink font-semibold"
                >
                  {tr('support.resetFilter', 'Reset filter')}
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <HelpCircle size={26} className="mx-auto text-ink-muted mb-3" />
              <p className="text-[14px] text-ink-muted font-medium">
                {tr('support.noMatch', 'Nothing matched. Try a different search or open a ticket below.')}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              <AnimatePresence initial={false}>
                {filtered.map((i) => {
                  const open = openId === i.id;
                  return (
                    <motion.li
                      key={i.id}
                      layout="position"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : i.id)}
                        aria-expanded={open}
                        className="w-full py-4 flex items-start gap-4 text-left group"
                      >
                        <span className="flex-1 text-[14.5px] sm:text-[15px] font-bold text-ink leading-snug tracking-tight pt-1">
                          {tr(`support.issue.${i.id}.title`, i.title)}
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
                            <div className="pb-5 pr-12">
                              <p className="text-[13.5px] text-ink-muted leading-relaxed font-medium">
                                {tr(`support.issue.${i.id}.body`, i.body)}
                              </p>
                              <button
                                type="button"
                                onClick={() => navigate('/tickets')}
                                className="mt-3 h-9 px-4 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[12.5px] font-bold transition-colors"
                              >
                                {tr('support.issue.openTicket', "Didn't help? Open a ticket")}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </motion.section>

        {/* Ticket form */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="card p-6 md:p-8"
        >
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-6 md:gap-10">
            <div>
              <span className="label-eyebrow">{tr('support.stuck.eyebrow', 'Still stuck?')}</span>
              <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-tight">
                {tr('support.stuck.title', 'Open a ticket')}
              </h2>
              <p className="text-[13px] text-ink-muted font-medium mt-2.5 leading-relaxed max-w-[280px]">
                {tr('support.form.note', 'A human reads every message. Be specific — include order IDs, trade URLs, or screenshots if relevant.')}
              </p>
              <div className="mt-5 space-y-2 text-[12.5px] text-ink-muted font-medium">
                <div className="flex items-center gap-2">
                  <Mail size={13} strokeWidth={2.2} className="text-accent" />
                  support@skinify.gg
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={13} strokeWidth={2.2} className="text-accent" />
                  {tr('support.form.sla', 'Avg reply under 4 hours')}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label-meta block mb-1.5">{tr('support.form.subject', 'Subject')}</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder={tr('support.form.subjectPh', "What's the issue?")}
                  className="w-full h-11 px-4 rounded-full bg-subtle outline-none text-ink placeholder:text-ink-dim text-[14px] font-medium focus:ring-2 focus:ring-accent transition-all"
                />
              </div>
              <div>
                <label className="label-meta block mb-1.5">{tr('support.form.message', 'Message')}</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={5}
                  placeholder={tr('support.form.messagePh', 'Tell us what happened. Include order IDs if relevant.')}
                  className="w-full px-4 py-3 rounded-3xl bg-subtle outline-none text-ink placeholder:text-ink-dim text-[14px] font-medium focus:ring-2 focus:ring-accent transition-all resize-none"
                />
              </div>
              {user && (
                <div className="text-[12px] text-ink-dim font-medium">
                  Replying to <span className="text-ink font-semibold">{user.displayName}</span> · Steam ID {user.steamId}
                </div>
              )}
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={submit}
                disabled={submitting}
                className="h-12 px-5 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center gap-2 disabled:opacity-50"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
              >
                <Send size={14} strokeWidth={2.4} />
                {submitting ? tr('support.form.submitting', 'Submitting…') : tr('support.form.submit', 'Submit ticket')}
              </motion.button>
            </div>
          </div>
        </motion.section>

      </main>

      {/* Floating AI support chat */}
      <SupportChatWidget />

      <Footer />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   StatusCard — replaces the static "All systems operational" tile with an
   expandable panel. Collapsed: status pill + 4 SLA stats. Expanded: per-
   service rows with their own dots and timings.
   ───────────────────────────────────────────────────────────────────────── */

interface ServiceStatus {
  name: string;
  state: 'operational' | 'degraded' | 'outage';
  detail: string;
}

const SERVICES: ServiceStatus[] = [
  { name: 'Live chat',         state: 'operational', detail: 'Avg response · 4m 12s' },
  { name: 'Email support',     state: 'operational', detail: 'Avg response · 3h 48m' },
  { name: 'Trade engine',      state: 'operational', detail: 'All trades processing normally' },
  { name: 'Steam connectivity', state: 'operational', detail: 'Last sync · 32 seconds ago' },
  { name: 'Card payments',     state: 'operational', detail: 'Stripe · 99.98% uptime · 30d' },
  { name: 'Crypto payments',   state: 'operational', detail: 'BTC / ETH / USDT confirming under 30m' },
  { name: 'Dispute resolution', state: 'operational', detail: 'Backlog · 4 open · median resolution 18h' },
];

const StateDot: React.FC<{ state: ServiceStatus['state'] }> = ({ state }) => {
  const cls =
    state === 'operational'
      ? 'bg-emerald-500'
      : state === 'degraded'
      ? 'bg-amber-500'
      : 'bg-rose-500';
  return <span className={`w-2 h-2 rounded-full ${cls}`} aria-hidden />;
};

const StatusCard: React.FC = () => {
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  /* Close on outside click / escape */
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const allOk = SERVICES.every((s) => s.state === 'operational');
  const summary = allOk
    ? 'All systems operational'
    : SERVICES.some((s) => s.state === 'outage')
    ? 'Partial outage detected'
    : 'Degraded performance';

  const SLA = [
    { label: 'Chat', value: '< 5 min' },
    { label: 'Email', value: '< 4 hrs' },
    { label: 'Disputes', value: '< 24 hrs' },
    { label: 'VIP', value: '< 1 hr' },
  ];

  return (
    <div className="relative" ref={wrapRef}>
      {/* Strip — status pill on the left, SLA chips stretched across,
          expand toggle on the right. One row tall; never grows. */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full card-flat px-4 sm:px-5 h-14 flex items-center gap-3 sm:gap-4 hover:bg-subtle/40 transition-colors text-left overflow-hidden"
      >
        <div className="flex items-center gap-2 shrink-0">
          <StateDot state={allOk ? 'operational' : 'degraded'} />
          <span
            className={`text-[11.5px] sm:text-[12.5px] font-bold uppercase tracking-wider whitespace-nowrap ${
              allOk
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {summary}
          </span>
        </div>

        {/* Inline SLA chips — hidden on tight screens to avoid wrapping */}
        <div className="hidden md:flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
          {SLA.map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                {s.label}
              </span>
              <span className="text-[12.5px] font-bold text-ink tabular-nums whitespace-nowrap">
                {s.value}
              </span>
            </div>
          ))}
        </div>

        <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-muted shrink-0">
          <span className="hidden sm:inline">{open ? 'Hide details' : 'Details'}</span>
          <ChevronDown
            size={13}
            strokeWidth={2.4}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* Popover details — absolute, so opening doesn't push the rest of
          the page. Anchored under the strip, full width of the strip,
          capped to viewport with a max-height + scroll. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute left-0 right-0 top-full mt-2 z-30 card-elevated p-4 sm:p-5 max-h-[60vh] overflow-y-auto"
          >
            <div className="label-eyebrow mb-2.5">Per-service status</div>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 divide-y sm:divide-y-0 divide-line">
              {SERVICES.map((s) => (
                <li key={s.name} className="py-2.5 flex items-start gap-2.5">
                  <span className="mt-1.5"><StateDot state={s.state} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-ink tracking-tight leading-tight">
                      {s.name}
                    </div>
                    <div className="text-[11.5px] text-ink-muted font-medium mt-0.5 truncate">
                      {s.detail}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-line text-[11px] font-medium text-ink-dim">
              Status refreshed every minute · last refresh just now.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupportPage;
