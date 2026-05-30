import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Shield,
  CheckCircle2,
  Lock,
  Star,
  Headphones,
  Twitter,
  Github,
  MessageCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const paymentMethods = [
  'Visa', 'MasterCard', 'Paypal', 'Apple', 'GoogleWallet',
  'Bitcoin', 'Stripe', 'Klarna', 'Skrill', 'Amazon',
  'AmericanExpress', 'DinersClub', 'Discover', 'JCB', 'Maestro',
  'AliPay', 'Bancontact', 'GiroPay', 'Sepa', 'UnionPay',
  'Bitpay', 'Clickandbuy',
];

const trustBadges = [
  { Icon: Shield, label: 'Steam-verified', hue: 'sky' },
  { Icon: CheckCircle2, label: 'CS2 partner', hue: 'mint' },
  { Icon: Lock, label: 'Escrow protected', hue: 'lilac' },
  { Icon: Star, label: 'Trusted marketplace', hue: 'lemon' },
  { Icon: Headphones, label: '24/7 support', hue: 'peach' },
];

const faqItems = [
  {
    q: 'Can I buy real CS2 skins on Skinify?',
    a: 'Yes. Every listing is an authentic CS2 skin sourced from verified Steam inventories. Items remain tradable and marketable on Steam after purchase.',
  },
  {
    q: 'What CS2 items can I find here?',
    a: 'Knives, rifles, pistols, gloves, stickers, agents and cases — from $0.50 listings to high-tier collectibles. Use weapon and rarity filters to narrow it down.',
  },
  {
    q: 'Is Skinify a safe marketplace?',
    a: 'Trades are escrow-protected: payment is only released to the seller after you confirm the item has been delivered. Disputes are reviewed by our team within 24 hours.',
  },
  {
    q: 'Is there a welcome bonus?',
    a: 'Yes — new accounts receive a deposit bonus on their first top-up. See the Bonuses page for current offers and ramp dates.',
  },
  {
    q: 'How do trades work?',
    a: 'Browse → add to cart → pay → the seller sends a Steam trade offer → you confirm receipt → escrow releases the funds. Average completion is under 60 seconds.',
  },
  {
    q: 'How do deposits and withdrawals work?',
    a: 'Card, PayPal, bank transfer and crypto are supported. Deposits are instant. Withdrawals process within 24 hours; verified users get same-day payouts.',
  },
];

const footerColumns = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Browse market', to: '/marketplace' },
      { label: 'Sell items', to: '/profile?tab=inventory' },
      { label: 'Trades', to: '/profile?tab=trades' },
      { label: 'Rewards', to: '/rewards' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Profile', to: '/profile' },
      { label: 'Cart', to: '/cart' },
      { label: 'Bonuses', to: '/bonuses' },
      { label: 'VIP', to: '/vip' },
      { label: 'Referral', to: '/referral' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'FAQ', to: '/faq' },
      { label: 'Trading guide', to: '/trading-guide' },
      { label: 'Security tips', to: '/security-tips' },
      { label: 'Support', to: '/support' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of service', to: '/terms' },
      { label: 'Privacy policy', to: '/privacy' },
      { label: 'Refund policy', to: '/refund-policy' },
      { label: 'Dispute resolution', to: '/dispute-resolution' },
    ],
  },
];

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  return (
    <footer className="max-w-[1480px] mx-auto px-4 sm:px-6 pb-8 space-y-3">
      {/* ===== FAQ =====
          Single-column list style — Linear/Stripe/Apple-support feel. Items
          are flat with a hairline separator; only the expanded answer reveals
          on click. No per-item backgrounds or emoji icons; the eye scans
          questions vertically without color noise. */}
      <section className="card p-6 md:p-10">
        <div className="flex items-end justify-between mb-7 flex-wrap gap-3">
          <div>
            <span className="label-eyebrow">Help</span>
            <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-ink mt-1.5 leading-none">
              Frequently asked
            </h2>
          </div>
          <Link
            to="/faq"
            className="h-10 px-4 rounded-full bg-subtle text-ink text-[13px] font-semibold hover:bg-subtle/70 transition-colors flex items-center"
          >
            See all
          </Link>
        </div>

        <ul className="divide-y divide-line">
          {faqItems.map((item, i) => {
            const open = openFAQ === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setOpenFAQ(open ? null : i)}
                  aria-expanded={open}
                  className="w-full text-left py-5 flex items-start gap-4 group"
                >
                  <span className="flex-1 text-[15px] sm:text-[16px] font-bold text-ink leading-snug tracking-tight">
                    {item.q}
                  </span>
                  <span
                    className={`shrink-0 mt-0.5 w-7 h-7 rounded-full grid place-items-center transition-all duration-200 ${
                      open
                        ? 'bg-accent text-on-accent rotate-180'
                        : 'bg-subtle text-ink-muted group-hover:bg-accent-soft group-hover:text-ink'
                    }`}
                  >
                    <ChevronDown size={14} strokeWidth={2.4} />
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
                      <p className="text-[13.5px] sm:text-[14px] text-ink-muted leading-relaxed font-medium pb-5 pr-12 max-w-3xl">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ===== TRUST + PAYMENTS ===== */}
      <section className="card p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {trustBadges.map(({ Icon, label, hue }) => (
            <span
              key={label}
              className="h-9 px-3 rounded-full bg-subtle text-ink text-[12.5px] font-semibold inline-flex items-center gap-2"
            >
              <Icon
                size={14}
                strokeWidth={2.2}
                style={{ color: `rgb(var(--hue-${hue}))` }}
              />
              {label}
            </span>
          ))}
        </div>

        <div className="label-eyebrow mb-3">Accepted payments</div>
        <div className="relative overflow-hidden h-12 rounded-2xl bg-subtle/40">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-bg to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-bg to-transparent z-10" />
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="flex items-center gap-8 h-full px-6 will-change-transform"
            style={{ width: 'max-content' }}
          >
            {[...paymentMethods, ...paymentMethods].map((m, i) => (
              <img
                key={`${m}-${i}`}
                src={`/${m}.svg`}
                alt={m}
                className="h-6 w-auto opacity-50 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
                loading="lazy"
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== LINK COLUMNS + BRAND ===== */}
      <section className="card p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="icon-chip bg-accent text-on-accent">
                <img
                  src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                  alt=""
                  className="w-6 h-6"
                />
              </div>
              <span className="text-[16px] font-bold text-ink tracking-tight">Skinify</span>
            </div>
            <p className="text-[13px] text-ink-muted leading-relaxed font-medium max-w-[240px]">
              A premium peer-to-peer marketplace for CS2 skins. Built for collectors and traders.
            </p>
            <div className="flex items-center gap-2 mt-5">
              {[
                { Icon: MessageCircle, href: '#', label: 'Discord' },
                { Icon: Twitter, href: '#', label: 'Twitter' },
                { Icon: Github, href: '#', label: 'Github' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="icon-chip hover:bg-bg transition-colors"
                >
                  <Icon size={16} className="text-ink-muted" />
                </a>
              ))}
            </div>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title}>
              <div className="label-eyebrow mb-4">{col.title}</div>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-[13.5px] text-ink-muted hover:text-ink font-medium transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-ink-muted font-medium">
          <div>© {currentYear} Skinify. Not affiliated with Valve Corp. or Steam.</div>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-ink transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
            <Link to="/refund-policy" className="hover:text-ink transition-colors">Refunds</Link>
          </div>
        </div>
      </section>
    </footer>
  );
};

export default Footer;
