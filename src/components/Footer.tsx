import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Twitter,
  Github,
  MessageCircle,
  Globe,
  CircleDollarSign,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrencyStore, currencies as currencyList } from '../store/currencyStore';

const paymentMethods = [
  'Visa', 'MasterCard', 'Paypal', 'Apple', 'GoogleWallet',
  'Bitcoin', 'Stripe', 'Klarna', 'Skrill', 'Amazon',
  'AmericanExpress', 'DinersClub', 'Discover', 'JCB', 'Maestro',
  'AliPay', 'Bancontact', 'GiroPay', 'Sepa', 'UnionPay',
  'Bitpay', 'Clickandbuy',
];

const faqItems = [
  {
    q: 'Can I buy real CS2 skins on Skinify?',
    a: 'Yes. Every listing is an authentic CS2 skin sourced from verified Steam inventories. Items remain tradable and marketable on Steam after purchase.',
  },
  {
    q: 'What CS2 items can I find here?',
    a: 'Knives, rifles, pistols, gloves, stickers, agents, music kits and cases — from $0.50 listings to high-tier collectibles. Use weapon, rarity, float and sticker filters to narrow it down.',
  },
  {
    q: 'Is Skinify a safe marketplace?',
    a: 'Trades are escrow-protected: payment is only released to the seller after you confirm the item has been delivered. Disputes are reviewed by our team within 24 hours and refunded in full if the seller fails to deliver.',
  },
  {
    q: 'Is there a welcome bonus?',
    a: 'Yes — new accounts receive a deposit bonus on their first top-up. See the Bonuses page for current offers, deposit tiers, and seasonal ramp dates.',
  },
  {
    q: 'How do trades work?',
    a: 'Browse → add to cart → pay → the seller sends a Steam trade offer → you confirm receipt → escrow releases the funds. Average completion is under 60 seconds for in-stock items.',
  },
  {
    q: 'How do deposits and withdrawals work?',
    a: 'Card, PayPal, Apple Pay, Google Pay, bank transfer and crypto (BTC, ETH, USDT) are supported. Deposits are instant. Withdrawals process within 24 hours; VIP users get same-day payouts.',
  },
  {
    q: 'Do you charge buyer fees?',
    a: 'No. We charge 0% on buy-now and cart purchases. Sellers pay a 2% listing fee, which decreases with VIP tiers down to 0% on Diamond.',
  },
  {
    q: 'Why is there an 8-day hold on funds?',
    a: 'CS2 reserves a 7-day window where item ownership can be reverted by Steam. Our escrow holds for 8 days to fully cover that window — you can still see pending funds in your balance the entire time.',
  },
  {
    q: 'What happens if my trade offer is declined?',
    a: 'You get an automatic full refund within minutes. The order is cancelled, the seller\'s reputation takes a hit, and you can re-purchase from another seller of the same item.',
  },
  {
    q: 'Can I list items with stickers, charms or rare patterns?',
    a: 'Yes. The listing modal pulls Steam metadata automatically — stickers, charms, pattern templates, float and fade percentages all show on the public listing.',
  },
];

const footerColumns = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Browse market', to: '/marketplace' },
      { label: 'Sell items', to: '/profile?tab=inventory' },
      { label: 'My listings', to: '/profile?tab=listings' },
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
      { label: 'Developer API', to: '/developers' },
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
  {
    title: 'Company',
    links: [
      { label: 'About Skinify', to: '/about' },
      { label: 'Press kit', to: '/press' },
      { label: 'Changelog', to: '/changelog' },
    ],
  },
];

/* Discovery / SEO link clusters. Rendered below the main column grid so
   crawlers and skim-readers hit the high-intent skin and weapon queries
   without cluttering the main nav. */
const seoSections = [
  {
    title: 'Popular rifles',
    links: [
      { label: 'AK-47 skins',  to: '/marketplace?weapon=AK-47' },
      { label: 'M4A4 skins',   to: '/marketplace?weapon=M4A4' },
      { label: 'M4A1-S skins', to: '/marketplace?weapon=M4A1-S' },
      { label: 'AWP skins',    to: '/marketplace?weapon=AWP' },
      { label: 'FAMAS skins',  to: '/marketplace?weapon=FAMAS' },
      { label: 'Galil AR',     to: '/marketplace?weapon=Galil%20AR' },
      { label: 'SSG 08',       to: '/marketplace?weapon=SSG%2008' },
    ],
  },
  {
    title: 'Pistols',
    links: [
      { label: 'Desert Eagle', to: '/marketplace?weapon=Desert%20Eagle' },
      { label: 'USP-S',        to: '/marketplace?weapon=USP-S' },
      { label: 'Glock-18',     to: '/marketplace?weapon=Glock-18' },
      { label: 'P250',         to: '/marketplace?weapon=P250' },
      { label: 'Five-SeveN',   to: '/marketplace?weapon=Five-SeveN' },
      { label: 'Tec-9',        to: '/marketplace?weapon=Tec-9' },
      { label: 'CZ75-Auto',    to: '/marketplace?weapon=CZ75-Auto' },
    ],
  },
  {
    title: 'Knives & gloves',
    links: [
      { label: 'Karambit',        to: '/marketplace?weapon=Karambit' },
      { label: 'M9 Bayonet',      to: '/marketplace?weapon=M9%20Bayonet' },
      { label: 'Butterfly Knife', to: '/marketplace?weapon=Butterfly%20Knife' },
      { label: 'Bayonet',         to: '/marketplace?weapon=Bayonet' },
      { label: 'Sport Gloves',    to: '/marketplace?weapon=Sport%20Gloves' },
      { label: 'Specialist Gloves', to: '/marketplace?weapon=Specialist%20Gloves' },
      { label: 'Driver Gloves',   to: '/marketplace?weapon=Driver%20Gloves' },
    ],
  },
  {
    title: 'SMGs & shotguns',
    links: [
      { label: 'MP9',     to: '/marketplace?weapon=MP9' },
      { label: 'MAC-10',  to: '/marketplace?weapon=MAC-10' },
      { label: 'MP7',     to: '/marketplace?weapon=MP7' },
      { label: 'P90',     to: '/marketplace?weapon=P90' },
      { label: 'UMP-45',  to: '/marketplace?weapon=UMP-45' },
      { label: 'Nova',    to: '/marketplace?weapon=Nova' },
      { label: 'MAG-7',   to: '/marketplace?weapon=MAG-7' },
    ],
  },
  {
    title: 'Browse by rarity',
    links: [
      { label: 'Covert skins',      to: '/marketplace?rarity=Covert' },
      { label: 'Classified',        to: '/marketplace?rarity=Classified' },
      { label: 'Restricted',        to: '/marketplace?rarity=Restricted' },
      { label: 'Mil-Spec',          to: '/marketplace?rarity=Mil-Spec' },
      { label: 'StatTrak™',         to: '/marketplace?stattrak=true' },
      { label: 'Souvenir',          to: '/marketplace?souvenir=true' },
      { label: 'Cases & capsules',  to: '/marketplace?category=Cases' },
    ],
  },
];

interface FooterProps {
  /** When true (Profile/account pages), only renders the link columns +
      brand row — hides the FAQ and Accepted-payments sections. */
  slim?: boolean;
}

const Footer: React.FC<FooterProps> = ({ slim = false }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="max-w-[1480px] mx-auto px-4 sm:px-6 pb-8">
      {/* Merged footer card — Popular tags + Accepted payments + Link
          columns + Brand are stacked inside one card with internal
          dividers so the page reads as a single landing platform
          instead of three disconnected boxes. */}
      <section className="card p-6 md:p-8">
        {!slim && (
          <>
            {/* ===== POPULAR TAGS + LANGUAGE SWITCHER ===== */}
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="label-eyebrow">Popular tags</span>
                  <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-ink mt-1 leading-none">
                    What people are looking for
                  </h2>
                </div>
                <LangCurrencySwitcher />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TAGS.map((t) => (
                  <Link
                    key={t.to}
                    to={t.to}
                    className="px-3 h-8 rounded-full bg-subtle hover:bg-accent-soft hover:text-accent text-ink text-[12px] font-semibold inline-flex items-center transition-colors"
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* ===== ACCEPTED PAYMENTS ===== */}
            <div className="mt-8 pt-7 border-t border-line">
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
            </div>

          </>
        )}

        {/* ===== LINK COLUMNS + BRAND — always rendered, including
            slim mode (Profile). The top border only kicks in when
            there's something above to separate from. */}
        <div className={!slim ? 'mt-8 pt-7 border-t border-line' : ''}>
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

            {/* DMCA Protection badge */}
            <a
              href="//www.dmca.com/Protection/Status.aspx?ID=9cb1cfc0-5c9d-4546-981d-bc8d34bc4c7d"
              title="DMCA.com Protection Status"
              className="dmca-badge inline-block mt-4 opacity-80 hover:opacity-100 transition-opacity"
              target="_blank"
              rel="noreferrer"
            >
              <img
                src="https://images.dmca.com/Badges/dmca-badge-w200-5x1-08.png?ID=9cb1cfc0-5c9d-4546-981d-bc8d34bc4c7d"
                alt="DMCA.com Protection Status"
                className="h-7 w-auto"
                loading="lazy"
              />
            </a>
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

        {/* SEO discovery sections — popular weapons, knives, rarities */}
        <div className="mt-8 pt-7 border-t border-line">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-7">
            {seoSections.map((s) => (
              <div key={s.title}>
                <div className="label-eyebrow mb-3">{s.title}</div>
                <ul className="space-y-2">
                  {s.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="text-[12.5px] text-ink-muted hover:text-ink font-medium transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-ink-muted font-medium">
          <div>© {currentYear} Skinify. Not affiliated with Valve Corp. or Steam.</div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/terms" className="hover:text-ink transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
            <Link to="/refund-policy" className="hover:text-ink transition-colors">Refunds</Link>
          </div>
        </div>
        </div>
      </section>
    </footer>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   PopularTagsBar — cloud of high-intent CS2 queries + a language picker.

   Each tag links to a filtered marketplace view. The language picker
   triggers Google Translate via the existing #google_translate_element
   widget — same mechanism the in-page settings panel uses, so we don't
   ship a second translation pipeline.
   ───────────────────────────────────────────────────────────────────────── */
const POPULAR_TAGS = [
  { label: 'AK-47 skins', to: '/weapons/Rifles/AK-47' },
  { label: 'AWP skins', to: '/weapons/Rifles/AWP' },
  { label: 'M4A4', to: '/weapons/Rifles/M4A4' },
  { label: 'M4A1-S', to: '/weapons/Rifles/M4A1-S' },
  { label: 'Karambit', to: '/weapons/Knives/Karambit' },
  { label: 'M9 Bayonet', to: '/weapons/Knives/M9%20Bayonet' },
  { label: 'Butterfly Knife', to: '/weapons/Knives/Butterfly%20Knife' },
  { label: 'Sport Gloves', to: '/weapons/Gloves/Sport%20Gloves' },
  { label: 'Desert Eagle', to: '/weapons/Pistols/Desert%20Eagle' },
  { label: 'USP-S', to: '/weapons/Pistols/USP-S' },
  { label: 'Dragon Lore', to: '/marketplace?q=Dragon%20Lore' },
  { label: 'Howl', to: '/marketplace?q=Howl' },
  { label: 'Fire Serpent', to: '/marketplace?q=Fire%20Serpent' },
  { label: 'Doppler', to: '/marketplace?q=Doppler' },
  { label: 'Fade', to: '/marketplace?q=Fade' },
  { label: 'Asiimov', to: '/marketplace?q=Asiimov' },
  { label: 'Case Hardened', to: '/marketplace?q=Case%20Hardened' },
  { label: 'StatTrak™', to: '/marketplace?q=StatTrak' },
  { label: 'Souvenir', to: '/marketplace?q=Souvenir' },
  { label: 'Factory New', to: '/marketplace?wear=Factory%20New' },
];

const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'cs', label: 'Čeština' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'pl', label: 'Polski' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'zh-CN', label: '中文' },
  { code: 'ja', label: '日本語' },
];

/* Combined language + currency switcher.
   Single rounded pill, two native <select>s separated by a hairline.
   Reused in the footer brand row (always visible) AND inside the
   popular-tags card (on landing/marketplace where the card renders). */
const LangCurrencySwitcher: React.FC = () => {
  const { selectedCurrency, setSelectedCurrency } = useCurrencyStore();

  const setLanguage = (code: string) => {
    try {
      document.cookie = `googtrans=/en/${code}; path=/`;
      document.cookie = `googtrans=/en/${code}; domain=.skinify.gg; path=/`;
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  const onCurrency = (code: string) => {
    const next = currencyList.find((c) => c.code === code);
    if (next) setSelectedCurrency(next);
  };

  const activeLang = (() => {
    if (typeof document === 'undefined') return 'en';
    const m = document.cookie.match(/googtrans=\/en\/([a-zA-Z-]+)/);
    return m ? m[1] : 'en';
  })();

  return (
    <div className="inline-flex items-stretch h-9 rounded-full bg-subtle overflow-hidden ring-1 ring-line">
      <div className="flex items-center gap-1.5 pl-3 pr-1.5 border-r border-line">
        <Globe size={11} strokeWidth={2.4} className="text-ink-muted" />
        <select
          onChange={(e) => setLanguage(e.target.value)}
          defaultValue={activeLang}
          aria-label="Language"
          className="bg-transparent outline-none text-ink text-[12px] font-semibold cursor-pointer pr-1"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1.5 pl-2.5 pr-3">
        <CircleDollarSign size={11} strokeWidth={2.4} className="text-ink-muted" />
        <select
          onChange={(e) => onCurrency(e.target.value)}
          value={selectedCurrency.code}
          aria-label="Currency"
          className="bg-transparent outline-none text-ink text-[12px] font-semibold cursor-pointer pr-1"
        >
          {currencyList.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.symbol}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Footer;
