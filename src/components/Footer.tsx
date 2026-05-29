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
import { useTranslationStore } from '../store/translationStore';

const paymentMethods = [
  'Visa', 'MasterCard', 'Paypal', 'Apple', 'GoogleWallet',
  'Bitcoin', 'Stripe', 'Klarna', 'Skrill', 'Amazon',
  'AmericanExpress', 'DinersClub', 'Discover', 'JCB', 'Maestro',
  'AliPay', 'Bancontact', 'GiroPay', 'Sepa', 'UnionPay',
  'Bitpay', 'Clickandbuy',
];

const trustBadges = [
  { icon: Shield, label: 'Steam-verified' },
  { icon: CheckCircle2, label: 'CS2 partner' },
  { icon: Lock, label: 'Escrow protected' },
  { icon: Star, label: 'Trusted marketplace' },
  { icon: Headphones, label: '24/7 support' },
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
  const { t } = useTranslationStore();
  const currentYear = new Date().getFullYear();
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  return (
    <footer className="md:pl-[100px] pl-4 pr-4 pb-6 max-w-[1480px] mx-auto">
      {/* ===== FAQ ===== */}
      <section className="glass rounded-3xl2 p-6 md:p-8 mb-4">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-[22px] font-display font-bold text-white tracking-tight">
              Frequently asked
            </h2>
            <p className="text-[13px] text-zinc-500 mt-0.5">
              Six things people ask before their first trade.
            </p>
          </div>
          <Link
            to="/faq"
            className="h-10 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.10] text-[13px] text-white font-medium transition-colors"
          >
            See all
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {faqItems.map((item, i) => {
            const open = openFAQ === i;
            return (
              <button
                key={i}
                onClick={() => setOpenFAQ(open ? null : i)}
                className={`text-left rounded-2xl p-4 border transition-colors ${
                  open
                    ? 'bg-white/[0.06] border-white/[0.12]'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[14px] font-semibold text-white leading-tight">{item.q}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-zinc-400 transition-transform duration-200 ${
                      open ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.p
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden text-[13px] text-zinc-400 leading-relaxed"
                    >
                      {item.a}
                    </motion.p>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </section>

      {/* ===== TRUST + PAYMENTS ===== */}
      <section className="glass rounded-3xl2 p-6 md:p-8 mb-4">
        <div className="flex flex-wrap items-center gap-2.5 mb-6">
          {trustBadges.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="h-9 px-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-[12.5px] text-zinc-300 font-medium inline-flex items-center gap-2"
            >
              <Icon size={14} className="text-accent-400" strokeWidth={2.25} />
              {label}
            </span>
          ))}
        </div>

        <div className="text-[12px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">
          Accepted payments
        </div>
        <div className="relative overflow-hidden h-14 rounded-2xl bg-white/[0.02]">
          {/* edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink-900/95 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink-900/95 to-transparent z-10" />
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
                className="h-7 w-auto opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
                loading="lazy"
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== LINK COLUMNS + BRAND ===== */}
      <section className="glass rounded-3xl2 p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 grid place-items-center shadow-accent-glow">
                <img
                  src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                  alt=""
                  className="w-6 h-6"
                />
              </div>
              <span className="text-white font-display font-semibold text-[16px] tracking-tight">
                Skinify
              </span>
            </div>
            <p className="text-[13px] text-zinc-500 leading-relaxed max-w-[240px]">
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
                  className="w-10 h-10 rounded-2xl bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.06] grid place-items-center text-zinc-400 hover:text-white transition-colors"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-4">
                {col.title}
              </div>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-[13.5px] text-zinc-300 hover:text-white transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-8 pt-5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-zinc-500">
          <div>© {currentYear} Skinify. Not affiliated with Valve Corp. or Steam.</div>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/refund-policy" className="hover:text-white transition-colors">
              Refunds
            </Link>
          </div>
        </div>
      </section>
    </footer>
  );
};

export default Footer;
