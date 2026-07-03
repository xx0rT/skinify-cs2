import React, { useState } from 'react';
import { useT } from '../lib/useT';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useDocumentMeta from '../hooks/useDocumentMeta';
import {
  ChevronLeft,
  Mail,
  MessageCircle,
  Twitter,
  Github,
  MapPin,
  Phone,
  Building2,
  Send,
  Sparkles,
  Briefcase,
  Newspaper,
  Code,
  Shield,
  Clock,
  ArrowRight,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { useToastStore } from '../store/toastStore';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   ContactPage — fresh design
   - Hero with greeting + channel CTAs
   - Channel cards (live chat / email / discord / twitter)
   - Form (general inquiry)
   - Office / company info card
   ───────────────────────────────────────────────────────────────────────── */

interface ChannelTile {
  Icon: React.ComponentType<any>;
  label: string;
  value: string;
  sub: string;
  tint: string;
  href?: string;
  onClick?: () => void;
}

const REASONS = [
  { id: 'general',     label: 'General inquiry',  Icon: MessageCircle },
  { id: 'partnership', label: 'Partnership',      Icon: Briefcase },
  { id: 'press',       label: 'Press & media',    Icon: Newspaper },
  { id: 'api',         label: 'API / developer',  Icon: Code },
  { id: 'security',    label: 'Security report',  Icon: Shield },
] as const;

type Reason = typeof REASONS[number]['id'];

const ContactPage: React.FC = () => {
  const tr = useT();
  useDocumentMeta({
    title: 'Contact Skinify Support',
    description:
      'Reach the Skinify team for support, partnerships, press, or VIP enquiries. Replies usually within a few hours, every day of the week.',
    canonical: 'https://skinify.gg/contact',
  });
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [reason, setReason] = useState<Reason>('general');
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const channels: ChannelTile[] = [
    {
      Icon: MessageCircle,
      label: 'Live chat',
      value: 'Start a chat',
      sub: 'Avg reply under 5 minutes during peak hours.',
      tint: '#a855f7',
      onClick: () => addToast({ type: 'info', title: 'Live chat', message: 'Opening chat — an agent will join shortly.' }),
    },
    {
      Icon: Mail,
      label: 'Email',
      value: 'support@skinify.gg',
      sub: 'We reply within 4 hours on average.',
      tint: '#0ea5e9',
      href: 'mailto:support@skinify.gg',
    },
    {
      Icon: Sparkles,
      label: 'Discord',
      value: 'Join the community',
      sub: 'Tips, trades, and direct mod support.',
      tint: '#10b981',
      href: '#',
    },
    {
      Icon: Twitter,
      label: 'Twitter / X',
      value: '@skinify',
      sub: 'Status updates and release notes.',
      tint: '#ec4899',
      href: 'https://twitter.com',
    },
  ];

  const submit = async () => {
    if (!form.email.trim() || !form.message.trim()) {
      addToast({ type: 'error', title: 'Missing info', message: 'Add at least your email and a message.' });
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    addToast({
      type: 'success',
      title: 'Message sent',
      message: 'We\'ll get back to you within 4 hours.',
    });
    setForm({ name: '', email: '', message: '' });
    setSubmitting(false);
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
            <div className="icon-chip-lg bg-accent-soft mb-5">
              <MessageCircle size={22} className="text-accent" />
            </div>
            <span className="label-eyebrow">{tr('contact.hero.eyebrow', 'Contact')}</span>
            <h1 className="text-[28px] sm:text-[40px] font-bold tracking-tight mt-2 leading-tight">
              {tr('contact.hero.title', 'Talk to a human.')}
            </h1>
            <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-3 max-w-[600px] leading-relaxed">
              {tr('contact.hero.lead', "Pick the channel that fits. We're online around the clock — live chat is fastest for trade-blocking issues, email works best for everything else.")}
            </p>
          </div>
        </motion.section>

        {/* Channel tiles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {channels.map((c, i) => (
            <motion.a
              key={c.label}
              href={c.href}
              onClick={c.onClick}
              target={c.href?.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              whileHover={{ y: -4 }}
              whileTap={tap}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.05 }}
              className="card p-5 group relative overflow-hidden block"
            >
              <motion.div
                aria-hidden
                className="absolute -top-16 -right-10 w-[200px] h-[200px] rounded-full pointer-events-none opacity-50 group-hover:opacity-90 transition-opacity"
                style={{ background: `radial-gradient(closest-side, ${c.tint}33, transparent 70%)` }}
              />
              <div className="relative">
                <div
                  className="w-12 h-12 rounded-2xl grid place-items-center mb-4"
                  style={{
                    background: `linear-gradient(140deg, ${c.tint}, ${c.tint}cc 55%, ${c.tint}88)`,
                    boxShadow: `0 10px 22px -8px ${c.tint}66, inset 0 1px 0 rgba(255,255,255,0.28)`,
                  }}
                >
                  <c.Icon size={20} strokeWidth={2.2} className="text-white drop-shadow" />
                </div>
                <div className="text-[10.5px] uppercase tracking-wider font-bold text-ink-dim">{c.label}</div>
                <div className="text-[15px] font-bold text-ink tracking-tight leading-tight mt-1.5">{c.value}</div>
                <div className="text-[12px] text-ink-muted font-medium mt-2 leading-relaxed">{c.sub}</div>
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* Form + company */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="card p-6 md:p-8"
          >
            <span className="label-eyebrow">{tr('contact.form.eyebrow', 'Send a message')}</span>
            <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-1.5 leading-tight">
              {tr('contact.form.title', 'We read every reply')}
            </h2>

            {/* Reason pills */}
            <div className="mt-5 flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
              {REASONS.map((r) => {
                const active = reason === r.id;
                return (
                  <motion.button
                    whileTap={tap}
                    key={r.id}
                    onClick={() => setReason(r.id)}
                    className={`relative h-9 px-3.5 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                      active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="contact-reason-pill"
                        className="absolute inset-0 rounded-full bg-accent"
                        transition={spring}
                      />
                    )}
                    <span className="relative inline-flex items-center gap-1.5">
                      <r.Icon size={12} strokeWidth={2.4} />
                      {r.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-5 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label-meta block mb-1.5">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    className="w-full h-11 px-4 rounded-full bg-subtle outline-none text-ink placeholder:text-ink-dim text-[14px] font-medium focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>
                <div>
                  <label className="label-meta block mb-1.5">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full h-11 px-4 rounded-full bg-subtle outline-none text-ink placeholder:text-ink-dim text-[14px] font-medium focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="label-meta block mb-1.5">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={6}
                  placeholder={
                    reason === 'security'
                      ? 'Please include reproduction steps and impact details. We follow responsible disclosure.'
                      : reason === 'press'
                      ? 'Outlet, deadline, and what you\'d like to cover.'
                      : 'Tell us what you need.'
                  }
                  className="w-full px-4 py-3 rounded-3xl bg-subtle outline-none text-ink placeholder:text-ink-dim text-[14px] font-medium focus:ring-2 focus:ring-accent transition-all resize-none"
                />
              </div>
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={submit}
                disabled={submitting}
                className="h-12 px-5 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center gap-2 disabled:opacity-50"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
              >
                <Send size={14} strokeWidth={2.4} />
                {submitting ? 'Sending…' : 'Send message'}
              </motion.button>
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.15 }}
            className="space-y-3"
          >
            <section className="card p-6">
              <span className="label-eyebrow">Company</span>
              <h3 className="text-[16px] font-bold text-ink tracking-tight mt-1.5 leading-none">Skinify</h3>
              <dl className="mt-4 space-y-3">
                {[
                  { Icon: Building2, label: 'Entity', value: 'Skinify s.r.o.' },
                  { Icon: MapPin,    label: 'Address', value: 'Grafická 3365/1, 150 00 Praha 5' },
                  { Icon: Phone,     label: 'Phone',   value: '+420 800 800 800' },
                  { Icon: Mail,      label: 'Email',   value: 'hello@skinify.gg' },
                  { Icon: Clock,     label: 'Hours',   value: '24/7 chat · email Mo–Su' },
                ].map((r) => (
                  <div key={r.label} className="flex items-start gap-2.5">
                    <div className="icon-chip-sm bg-accent-soft shrink-0">
                      <r.Icon size={13} strokeWidth={2.2} className="text-accent" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">{r.label}</div>
                      <div className="text-[13.5px] font-semibold text-ink truncate">{r.value}</div>
                    </div>
                  </div>
                ))}
              </dl>
            </section>

            <button
              onClick={() => navigate('/support')}
              className="w-full card p-5 flex items-center justify-between hover:ring-2 hover:ring-accent/40 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0 text-left">
                <div className="icon-chip bg-accent-soft shrink-0">
                  <MessageCircle size={16} strokeWidth={2.2} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <div className="text-[14.5px] font-bold text-ink tracking-tight">Help center</div>
                  <div className="text-[12px] text-ink-muted font-medium">Search common issues first — most are answered there.</div>
                </div>
              </div>
              <ArrowRight size={16} strokeWidth={2.2} className="text-ink-muted shrink-0" />
            </button>

            <div className="card p-5 flex items-center gap-3">
              <span className="text-[11.5px] font-semibold text-ink-muted">Follow us</span>
              <div className="flex items-center gap-1.5">
                {[
                  { Icon: MessageCircle, href: '#', label: 'Discord' },
                  { Icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
                  { Icon: Github, href: 'https://github.com', label: 'Github' },
                ].map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="icon-chip-sm hover:bg-bg transition-colors"
                  >
                    <Icon size={13} className="text-ink-muted" />
                  </a>
                ))}
              </div>
            </div>
          </motion.aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;
