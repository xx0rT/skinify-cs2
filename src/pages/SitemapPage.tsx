import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  Code2,
  FileText,
  HelpCircle,
  Home,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trophy,
  Users,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import useDocumentMeta, { breadcrumbJsonLd } from '../hooks/useDocumentMeta';
import { spring } from '../lib/motion';
import { weaponCategories } from '../data/weaponCategories';

/* ─────────────────────────────────────────────────────────────────────────
   SitemapPage — human-readable site map at /sitemap.

   The XML at /sitemap.xml is for crawlers. This HTML page is for both
   crawlers AND humans — it's an internal-linking page that doubles as
   an SEO asset because every important URL is one click from this one
   page, which boosts the link-equity flow inside the site.

   Layout: category cards (Marketplace / Knowledge / Account / Legal /
   Developers) with a tight bulleted list per card. No clever motion,
   no novel layout — just dense, scan-friendly navigation. The cards
   stagger-fade-in on mount for polish.
   ───────────────────────────────────────────────────────────────────────── */

interface Section {
  Icon: React.ComponentType<any>;
  title: string;
  blurb: string;
  links: { label: string; to: string; description?: string }[];
}

const SECTIONS: Section[] = [
  {
    Icon: ShoppingBag,
    title: 'Marketplace',
    blurb: 'Every public surface for buying and selling CS2 skins.',
    links: [
      { label: 'Home', to: '/', description: 'Landing page with trending items and live activity' },
      { label: 'Marketplace', to: '/marketplace', description: 'Full filterable listings catalogue' },
      { label: 'Weapon categories', to: '/weapons', description: 'Browse by rifle, pistol, knife, glove, SMG' },
      { label: 'Bonuses', to: '/bonuses', description: '+10% first deposit + recurring promos' },
      { label: 'VIP membership', to: '/vip', description: 'Reduced seller fees + priority support' },
      { label: 'Rewards', to: '/rewards', description: 'Daily / weekly reward streak' },
      { label: 'Referral program', to: '/referral', description: 'Earn from invited traders' },
    ],
  },
  {
    Icon: BookOpen,
    title: 'Knowledge & guides',
    blurb: 'How Skinify works, how trading works, what to watch for.',
    links: [
      { label: 'FAQ', to: '/faq', description: 'Most-asked CS2 trading questions answered' },
      { label: 'Trading guide', to: '/trading-guide', description: 'End-to-end walk-through of a P2P trade' },
      { label: 'Dispute resolution', to: '/dispute-resolution', description: 'What happens when a trade goes wrong' },
      { label: 'Refund policy', to: '/refund-policy', description: 'When + how refunds are issued' },
      { label: 'Security tips', to: '/security-tips', description: 'Protect your Steam account and inventory' },
      { label: 'Blog', to: '/blog', description: 'Long-form articles, market analysis, deep-dives' },
    ],
  },
  {
    Icon: Code2,
    title: 'Developers',
    blurb: 'Public API for builders integrating Skinify data.',
    links: [
      { label: 'API documentation', to: '/developers', description: 'Endpoints, auth, examples, rate limits' },
      { label: 'Full docs', to: '/docs', description: 'Reference for every public endpoint' },
      { label: 'Developer guide', to: '/developer-docs', description: 'Shop CSS theming + customization' },
      { label: 'Changelog', to: '/changelog', description: 'Recent product + API changes' },
    ],
  },
  {
    Icon: Users,
    title: 'Account',
    blurb: 'Sign-in, onboarding, and personal surfaces.',
    links: [
      { label: 'Sign in', to: '/auth/signin', description: 'Email / password or Steam' },
      { label: 'Sign up', to: '/auth/signup', description: 'Create a new Skinify account' },
      { label: 'Onboarding', to: '/onboarding', description: 'Trade link setup for new sellers' },
    ],
  },
  {
    Icon: HelpCircle,
    title: 'Support',
    blurb: 'How to reach us when something goes sideways.',
    links: [
      { label: 'Contact', to: '/contact', description: 'Reach the support team' },
      { label: 'Support', to: '/support', description: 'Ticketing + live-chat entry point' },
      { label: 'Press & media', to: '/press', description: 'Logos, brand assets, founder bios' },
      { label: 'About', to: '/about', description: 'Who runs Skinify and why' },
    ],
  },
  {
    Icon: FileText,
    title: 'Legal',
    blurb: 'Terms, privacy, compliance.',
    links: [
      { label: 'Terms of service', to: '/terms', description: 'The contract that governs your use of Skinify' },
      { label: 'Privacy policy', to: '/privacy', description: 'What we collect and how it\'s used' },
    ],
  },
];

const SitemapPage: React.FC = () => {
  useDocumentMeta({
    title: 'Sitemap — every page on Skinify · CS2 Marketplace',
    description:
      'Browse every public page on Skinify: marketplace, weapon categories, FAQ, trading guide, blog, developer API docs, bonuses, VIP and more. One page, every link.',
    canonical: 'https://skinify.gg/sitemap',
    keywords:
      'skinify sitemap, skinify pages, cs2 marketplace pages, skinify navigation, all skinify pages',
    jsonLd: breadcrumbJsonLd([
      { name: 'Home', url: 'https://skinify.gg/' },
      { name: 'Sitemap', url: 'https://skinify.gg/sitemap' },
    ]),
  });

  /* Weapon-category list comes from the same data the marketplace uses
     so the sitemap is automatically in sync as new categories ship. */
  const weaponEntries = Object.entries(weaponCategories);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-3 pb-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mt-4 mb-10 sm:mt-8 sm:mb-14"
        >
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-ink-dim mb-3">
            <Home size={13} strokeWidth={2.4} />
            <Link to="/" className="hover:text-ink transition-colors">Home</Link>
            <span>/</span>
            <span className="text-ink">Sitemap</span>
          </div>
          <h1 className="text-[28px] sm:text-[44px] font-bold tracking-tight text-ink leading-[1.05]">
            Everything on Skinify, in one place
          </h1>
          <p className="text-[14px] sm:text-[16px] text-ink-muted font-medium mt-3 max-w-[680px] leading-relaxed">
            A flat index of every public page — marketplace, weapon hubs,
            knowledge base, developer docs and account flows. Crawlers
            love this. So do new users.
          </p>
        </motion.header>

        {/* Primary section grid */}
        <motion.div
          initial="hidden"
          animate="shown"
          variants={{
            hidden: {},
            shown: { transition: { staggerChildren: 0.06 } },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          {SECTIONS.map(({ Icon, title, blurb, links }) => (
            <motion.section
              key={title}
              variants={{
                hidden: { opacity: 0, y: 14 },
                shown: { opacity: 1, y: 0, transition: spring },
              }}
              className="card p-5 sm:p-6 flex flex-col"
            >
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 rounded-2xl bg-accent-soft text-accent grid place-items-center shrink-0">
                  <Icon size={17} strokeWidth={2.2} />
                </div>
                <h2 className="text-[16px] font-bold tracking-tight text-ink">
                  {title}
                </h2>
              </div>
              <p className="text-[12.5px] text-ink-muted font-medium leading-relaxed mt-2 mb-4">
                {blurb}
              </p>
              <ul className="space-y-0.5 -mx-2">
                {links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="group flex items-start gap-2 px-2 py-1.5 rounded-xl hover:bg-subtle transition-colors"
                    >
                      <ArrowRight
                        size={13}
                        strokeWidth={2.4}
                        className="text-ink-dim group-hover:text-accent transition-colors mt-[3px] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold text-ink truncate">
                          {l.label}
                        </div>
                        {l.description && (
                          <div className="text-[11.5px] text-ink-muted font-medium leading-snug mt-0.5">
                            {l.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </motion.div>

        {/* Weapon-category sub-grid — second-tier internal linking. */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -80px 0px' }}
          transition={spring}
          className="card p-5 sm:p-8 mt-5"
        >
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-accent-soft text-accent grid place-items-center shrink-0">
              <Tag size={17} strokeWidth={2.2} />
            </div>
            <h2 className="text-[16px] sm:text-[18px] font-bold tracking-tight text-ink">
              Every weapon category
            </h2>
          </div>
          <p className="text-[12.5px] text-ink-muted font-medium leading-relaxed mt-2 mb-5">
            Each category links to a dedicated hub with all listings for
            that weapon group — rarities, exteriors, float, sticker filters.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
            {weaponEntries.map(([key, cat]: any) => (
              <div key={key}>
                <Link
                  to={`/weapons/${encodeURIComponent(key.toLowerCase())}`}
                  className="text-[13.5px] font-bold text-ink hover:text-accent transition-colors block mb-1.5 tracking-tight"
                >
                  {cat.name}
                </Link>
                <ul className="space-y-0.5">
                  {(cat.weapons || []).slice(0, 8).map((w: string) => (
                    <li key={w}>
                      <Link
                        to={`/weapons/${encodeURIComponent(key.toLowerCase())}/${encodeURIComponent(w.toLowerCase())}`}
                        className="text-[12px] text-ink-muted hover:text-accent font-medium transition-colors"
                      >
                        {w}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

        {/* SEO landing aliases — the short keyword-anchored URLs that
            feed the same SeoLandingPage. Surfacing them on the sitemap
            helps crawlers discover and rank them. */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -80px 0px' }}
          transition={spring}
          className="card p-5 sm:p-6 mt-5"
        >
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-accent-soft text-accent grid place-items-center shrink-0">
              <Sparkles size={17} strokeWidth={2.2} />
            </div>
            <h2 className="text-[16px] font-bold tracking-tight text-ink">
              Quick-access landing pages
            </h2>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-4">
            {[
              { label: 'Buy CS2 skins', to: '/buy-cs2-skins' },
              { label: 'Sell CS2 skins', to: '/cs2-sell-skins' },
              { label: 'CS2 skiny — koupit', to: '/cs2-skiny-koupit' },
              { label: 'CS2 nože — koupit', to: '/cs2-nuze-koupit' },
            ].map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-[13px] text-ink-muted hover:text-accent font-semibold transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Trust strip — Skinify counter-flag for the engines so they
            see this isn't a thin link-list page but a substantive
            "wayfinding" page worth indexing on its own. */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -80px 0px' }}
          transition={spring}
          className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            { Icon: ShieldCheck, label: 'Escrow', value: '8-day window' },
            { Icon: Trophy, label: 'Buyer fees', value: '0%' },
            { Icon: Award, label: 'Seller fee', value: '2%' },
            { Icon: Sparkles, label: 'Delivery', value: '< 1 min' },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="card-flat p-4">
              <Icon size={15} className="text-accent mb-2" strokeWidth={2.2} />
              <div className="label-meta">{label}</div>
              <div className="text-[16px] font-bold text-ink tracking-tight tabular-nums leading-none mt-1">
                {value}
              </div>
            </div>
          ))}
        </motion.div>

        <p className="text-[11px] text-ink-dim font-medium mt-8 text-center">
          The XML sitemap consumed by search engines lives at{' '}
          <a href="/sitemap.xml" className="text-accent hover:underline">
            /sitemap.xml
          </a>
          .
        </p>
      </main>

      <Footer />
    </div>
  );
};

export default SitemapPage;
