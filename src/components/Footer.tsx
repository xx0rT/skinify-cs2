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
import { useTranslationStore } from '../store/translationStore';

/* Resolve a translation key against the current language with a
   guaranteed fallback. Mirrors the pattern used in LandingNav so all
   `t()` callsites read consistently across the app. */
const useResolve = () => {
  const { t } = useTranslationStore();
  return (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
};

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

/* Column titles read from the translation store. `titleKey` is the
   translation slug; `title` (set at render time) is the resolved
   string. We can't `t()` at module scope, so the render path maps
   `titleKey` → `t(titleKey)` and falls back to the English label. */
const footerColumns: { titleKey: string; titleFallback: string; links: { label: string; to: string }[] }[] = [
  {
    titleKey: 'footer.col.marketplace',
    titleFallback: 'Marketplace',
    links: [
      { label: 'Browse market', to: '/marketplace' },
      { label: 'Sell items', to: '/profile?tab=inventory' },
      { label: 'My listings', to: '/profile?tab=listings' },
      { label: 'Trades', to: '/profile?tab=trades' },
      { label: 'Rewards', to: '/rewards' },
    ],
  },
  {
    titleKey: 'footer.col.account',
    titleFallback: 'Account',
    links: [
      { label: 'Profile', to: '/profile' },
      { label: 'Cart', to: '/cart' },
      { label: 'Bonuses', to: '/bonuses' },
      { label: 'VIP', to: '/vip' },
      { label: 'Referral', to: '/referral' },
    ],
  },
  {
    titleKey: 'footer.col.help',
    titleFallback: 'Help',
    links: [
      { label: 'FAQ', to: '/faq' },
      { label: 'Trading guide', to: '/trading-guide' },
      { label: 'Security tips', to: '/security-tips' },
      { label: 'Blog', to: '/blog' },
      { label: 'API docs', to: '/docs' },
      { label: 'Support', to: '/support' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    titleKey: 'footer.col.legal',
    titleFallback: 'Legal',
    links: [
      { label: 'Terms of service', to: '/terms' },
      { label: 'Privacy policy', to: '/privacy' },
      { label: 'Refund policy', to: '/refund-policy' },
      { label: 'Dispute resolution', to: '/dispute-resolution' },
    ],
  },
  {
    titleKey: 'footer.col.company',
    titleFallback: 'Company',
    links: [
      { label: 'About Skinify', to: '/about' },
      { label: 'Press kit', to: '/press' },
      { label: 'Changelog', to: '/changelog' },
      { label: 'Sitemap', to: '/sitemap' },
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

/* Reusable variants for the scroll-in reveal — each tier fades up as it
   enters the viewport. We keep the amount low (12px translate) and the
   duration short so the footer feels alive without dragging the eye. */
const TIER_VARIANTS = {
  hidden: { opacity: 0, y: 14 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 360, damping: 36, mass: 0.6 },
  },
};

/* Staggered children variant for the link columns — when tier 1 reveals,
   the columns cascade in left-to-right rather than all popping at once. */
const TIER1_STAGGER = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const COL_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0 },
};

const Footer: React.FC<FooterProps> = ({ slim = false }) => {
  const currentYear = new Date().getFullYear();
  const [seoOpen, setSeoOpen] = useState(false);
  const resolve = useResolve();

  return (
    /* Full-bleed footer: no max-width on the outer element, no padding on
       the wrapper, no rounded corners. The inner `max-w-[1480px]` boxes
       inside each tier keep text from sprawling on ultrawide while the
       backgrounds / borders run edge-to-edge — matches how LandingNav
       reads as a docked top bar. */
    <footer
      className="relative w-full mt-12 border-t border-line"
      style={{
        background:
          'linear-gradient(to bottom, rgb(var(--bg)) 0%, rgb(var(--subtle) / 0.35) 100%)',
      }}
    >
      {/* Soft accent halo at the very top of the footer — mirrors the
          navbar's "lit from below" glow but inverted (lit from above).
          Same plus-lighter blend so dark mode glows and light mode reads
          as a soft lavender wash. */}
      <div
        aria-hidden
        className="absolute left-0 right-0 -top-px h-12 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 0%, rgb(var(--accent) / 0.16) 0%, rgb(var(--accent) / 0.05) 40%, transparent 80%)',
          mixBlendMode: 'plus-lighter',
        }}
      />

      {/* ╔════════════════════════════════════════════════════════════
          TIER 1 — Brand + main link columns. Dense but airy:
          brand block on the left (logo, tagline, socials, lang),
          four link columns on the right. On mobile everything stacks.
          Fades in as the footer scrolls into the viewport.
          ════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={TIER1_STAGGER}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, margin: '0px 0px -80px 0px' }}
        className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] gap-8 lg:gap-12"
      >
          {/* Brand block */}
          <motion.div variants={COL_VARIANTS}>
            <div className="flex items-center gap-2.5">
              <div className="icon-chip text-on-accent">
                <img
                  src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                  alt=""
                  className="w-6 h-6"
                />
              </div>
              <span className="text-[17px] font-bold text-ink tracking-tight">Skinify</span>
            </div>
            <p className="text-[13.5px] text-ink-muted leading-relaxed font-medium mt-4 max-w-[300px]">
              {resolve(
                'footer.brand.tagline',
                'The peer-to-peer marketplace for CS2 skins. 0% buyer fees, escrow-protected trades, instant Steam delivery.',
              )}
            </p>

            {/* Socials */}
            <div className="flex items-center gap-1.5 mt-5">
              {[
                { Icon: MessageCircle, href: 'https://discord.gg/skinify', label: 'Discord' },
                { Icon: Twitter, href: 'https://twitter.com/SkinifyCS2', label: 'Twitter' },
                { Icon: Github, href: 'https://github.com/skinify', label: 'Github' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener"
                  aria-label={label}
                  className="icon-chip hover:bg-bg hover:text-ink transition-colors"
                >
                  <Icon size={15} className="text-ink-muted" />
                </a>
              ))}
            </div>

            {/* Language + currency switcher */}
            {!slim && (
              <div className="mt-5">
                <LangCurrencySwitcher />
              </div>
            )}

            {/* DMCA badge */}
            <a
              href="https://www.dmca.com/r/8mrexyz"
              title="DMCA.com Protection Status"
              className="dmca-badge inline-block mt-5 opacity-70 hover:opacity-100 transition-opacity"
              target="_blank"
              rel="noreferrer"
            >
              <img
                src="https://images.dmca.com/Badges/dmca-badge-w200-5x1-08.png?ID=9cb1cfc0-5c9d-4546-981d-bc8d34bc4c7d"
                alt="DMCA.com Protection Status"
                className="h-6 w-auto"
                loading="lazy"
              />
            </a>
          </motion.div>

          {/* Link columns — 4 columns at lg, 2 at md, 1 at sm. We split
              "Company" out into a 5th column at xl so dense desktop
              viewports get a wider visual canvas. Each column is its
              own motion child so the stagger cascades across them. */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-7 min-w-0">
            {footerColumns.map((col) => (
              <motion.div
                key={col.titleKey}
                variants={COL_VARIANTS}
                className="min-w-0"
              >
                <div className="label-eyebrow mb-3.5">
                  {resolve(col.titleKey, col.titleFallback)}
                </div>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="text-[13px] text-ink-muted hover:text-ink font-medium transition-colors inline-block hover:translate-x-0.5"
                        style={{ transitionDuration: '180ms', transitionProperty: 'color, transform' }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
      </motion.div>

      {/* ╔════════════════════════════════════════════════════════════
          TIER 2 — Popular tags strip + accepted-payments carousel.
          Skinned with a soft top border so it visually segments from
          the main link grid above. Hidden in slim mode (profile pages).
          ════════════════════════════════════════════════════════════ */}
      {!slim && (
        <motion.div
          variants={TIER_VARIANTS}
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, margin: '0px 0px -60px 0px' }}
          className="border-t border-line bg-subtle/40"
        >
          <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <span className="label-eyebrow">
                  {resolve('footer.popularTags.eyebrow', 'Popular tags')}
                </span>
                <h2 className="text-[16px] sm:text-[17px] font-bold tracking-tight text-ink mt-1 leading-tight">
                  {resolve(
                    'footer.popularTags.title',
                    'What people are looking for right now',
                  )}
                </h2>
              </div>
              <Link
                to="/marketplace"
                className="text-[12.5px] font-bold text-accent hover:opacity-80 transition-opacity inline-flex items-center gap-1"
              >
                {resolve('footer.popularTags.cta', 'Browse marketplace')} →
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-6">
              {POPULAR_TAGS.map((t) => (
                <Link
                  key={t.to}
                  to={t.to}
                  className="px-3 h-8 rounded-full bg-bg hover:bg-accent-soft hover:text-accent text-ink text-[12px] font-semibold inline-flex items-center transition-colors"
                >
                  {t.label}
                </Link>
              ))}
            </div>

            {/* Accepted payments — narrower, calmer than before */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="label-eyebrow shrink-0">
                {resolve('footer.payments.label', 'Accepted payments')}
              </div>
              <div className="relative flex-1 min-w-[260px] overflow-hidden h-9 rounded-xl bg-bg">
                <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-bg to-transparent z-10" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-bg to-transparent z-10" />
                <motion.div
                  animate={{ x: ['0%', '-50%'] }}
                  transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                  className="flex items-center gap-6 h-full px-4 will-change-transform"
                  style={{ width: 'max-content' }}
                >
                  {[...paymentMethods, ...paymentMethods].map((m, i) => (
                    <img
                      key={`${m}-${i}`}
                      src={`/${m}.svg`}
                      alt={m}
                      className="h-5 w-auto opacity-50 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
                      loading="lazy"
                    />
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ╔════════════════════════════════════════════════════════════
          TIER 3 — Collapsible SEO link clusters. Closed by default
          so the footer doesn't dominate the viewport; expand reveals
          the long-tail keyword link grid.
          ════════════════════════════════════════════════════════════ */}
      {!slim && (
        <motion.div
          variants={TIER_VARIANTS}
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, margin: '0px 0px -60px 0px' }}
          className="border-t border-line"
        >
          <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <button
              type="button"
              onClick={() => setSeoOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-3 group"
              aria-expanded={seoOpen}
            >
              <span className="inline-flex items-center gap-2 text-[12.5px] font-bold tracking-tight text-ink">
                <span className="label-eyebrow">
                  {resolve('footer.seo.label', 'Browse by category')}
                </span>
                <span className="text-ink-muted font-medium">
                  {resolve(
                    'footer.seo.summary',
                    'Rifles · Pistols · Knives · SMGs · Rarity',
                  )}
                </span>
              </span>
              <motion.span
                animate={{ rotate: seoOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="icon-chip-sm bg-subtle group-hover:bg-bg transition-colors"
              >
                <ChevronDown size={14} className="text-ink-muted" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {seoOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-6 pt-5">
                    {seoSections.map((s) => (
                      <div key={s.title} className="min-w-0">
                        <div className="label-eyebrow mb-3">{s.title}</div>
                        <ul className="space-y-1.5">
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* ╔════════════════════════════════════════════════════════════
          TIER 4 — Slim legal bar. Copyright on the left, condensed
          secondary nav on the right. Sits on a slightly darker tint
          so it reads as a docked baseline.
          ════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={TIER_VARIANTS}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, margin: '0px 0px -40px 0px' }}
        className="border-t border-line bg-subtle/50"
      >
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12px] text-ink-muted font-medium">
          <div className="inline-flex items-center gap-1.5">
            <span>© {currentYear} Skinify.</span>
            <span className="text-ink-dim">
              {resolve('footer.legal.notAffiliated', 'Not affiliated with Valve Corp. or Steam.')}
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/blog" className="hover:text-ink transition-colors">Blog</Link>
            <Link to="/docs" className="hover:text-ink transition-colors">API docs</Link>
            <Link to="/sitemap" className="hover:text-ink transition-colors">Sitemap</Link>
            <Link to="/changelog" className="hover:text-ink transition-colors">Changelog</Link>
            <Link to="/terms" className="hover:text-ink transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
            <Link to="/refund-policy" className="hover:text-ink transition-colors">Refunds</Link>
          </nav>
        </div>
      </motion.div>
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
   popular-tags card (on landing/marketplace where the card renders).

   Language picks go straight into the translation store; the React
   tree re-renders without a page reload. The previous Google Translate
   cookie+reload flow was retired alongside the GT widget. */
const LangCurrencySwitcher: React.FC = () => {
  const { selectedCurrency, setSelectedCurrency } = useCurrencyStore();
  const { currentLanguage, setLanguageByCode } = useTranslationStore();

  const setLanguage = (code: string) => {
    setLanguageByCode(code);
  };

  const onCurrency = (code: string) => {
    const next = currencyList.find((c) => c.code === code);
    if (next) setSelectedCurrency(next);
  };

  const activeLang = currentLanguage?.code || 'en';

  return (
    <div className="inline-flex items-stretch h-9 rounded-full bg-subtle overflow-hidden ring-1 ring-line">
      <div className="flex items-center gap-1.5 pl-3 pr-1.5 border-r border-line">
        <Globe size={11} strokeWidth={2.4} className="text-ink-muted" />
        <select
          onChange={(e) => setLanguage(e.target.value)}
          value={activeLang}
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
