import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  Bug,
  Calendar,
  Check,
  Code2,
  ExternalLink,
  Filter,
  Plus,
  Search,
  Shield,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import useDocumentMeta, { breadcrumbJsonLd } from '../hooks/useDocumentMeta';
import { useTranslationStore } from '../store/translationStore';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   ChangelogPage — rebuilt to match the rest of the site.

   Layout (desktop):
     ┌─────────────────────────────────────────────────────────────┐
     │  Eyebrow + H1 hero                                          │
     │  Tab row: All · Product · API · Status                       │
     │  Search input                                                │
     ├─ Versions (left rail, dates) ─┬─ Selected version detail ──┤
     │  v1.0.0 · Dec 2024            │  Categories: New / Improved │
     │  ...                          │  Item list per category     │
     └───────────────────────────────┴─────────────────────────────┘
     Below: System status grid, then API changelog timeline.

   Theme: only theme tokens (bg / ink / accent / subtle / line).
   No more raw gray-900 / purple-400 — matches the rest of Skinify.
   ───────────────────────────────────────────────────────────────────────── */

interface ProductChangeGroup {
  category: 'new' | 'improved' | 'fixed' | 'security';
  items: string[];
}

interface ProductVersion {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  changes: ProductChangeGroup[];
}

const PRODUCT_VERSIONS: ProductVersion[] = [
  {
    version: '1.2.0',
    date: '2026-06-24',
    type: 'minor',
    changes: [
      {
        category: 'new',
        items: [
          'Full developer documentation site at /docs (Cohere-style multi-page reference with left nav, per-page TOC, prev/next pager).',
          'Shop CSS customization docs added — overview, structure, variable reference, selector reference, three example themes, publishing flow.',
          'API key creation in Profile → Settings → API access (gated behind a $10+ verified deposit).',
          'Right-rail "On this page" with stretched indicator line that tracks the active section as you scroll.',
          'Multi-language code samples (curl / TypeScript / Python / Go / PHP) on every endpoint and guide.',
          'Visual sitemap at /sitemap and a real blog index at /blog.',
        ],
      },
      {
        category: 'improved',
        items: [
          'Mobile: page padding now stacks ~10px on top of the iOS safe-area inset so content sits below the status bar / dynamic island.',
          'Deposit modal: redesigned for mobile as a Revolut-style bottom sheet with drag-to-dismiss, while keeping the desktop split-pane.',
          'Marketplace grid: now 5 cards/row with filters open, 6 with filters closed (was 4 everywhere).',
          'Search bar (navbar): no more page-jump on every keystroke — scroll-anchoring fixed at the document level.',
          'Czech language detection: stops being overwritten by IP geo on every page mount.',
          'Landing-page SEO copy tightened; long-tail keywords added.',
        ],
      },
      {
        category: 'security',
        items: [
          'Indexing fixed: removed the X-Robots-Tag: none server header that was blocking the site from Google\'s index. Explicit per-route noindex headers added for /profile, /cart, /auth, /admin, /messages, /onboarding.',
          'robots.txt rewritten — explicit Allow per major bot, crawl-delay tuned for Bing/Yandex/Baidu, expanded scraper blocklist.',
          'API keys generated with crypto.getRandomValues; full secret shown exactly once at creation.',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2024-12-02',
    type: 'major',
    changes: [
      {
        category: 'new',
        items: [
          'Initial release of the Skinify marketplace',
          'Steam authentication + Steam-linked accounts',
          'Real-time marketplace listings',
          'Shopping cart and checkout system',
          'User profiles and inventory management',
          'Wishlist functionality',
          'VIP subscription system',
          'Referral program',
          'Real-time chat support',
          'Multi-currency support',
          'Push notifications',
          'Admin panel with analytics',
        ],
      },
      {
        category: 'improved',
        items: [
          'Optimized image loading with caching',
          'Enhanced mobile responsiveness',
          'Improved search functionality',
          'Better performance with lazy loading',
        ],
      },
      {
        category: 'security',
        items: [
          'Row Level Security (RLS) policies',
          'KYC verification system',
          'Secure payment processing',
          'Rate limiting on API endpoints',
        ],
      },
    ],
  },
];

interface ApiChangeEntry {
  date: string;
  kind: 'addition' | 'breaking' | 'improvement' | 'fix' | 'docs';
  title: string;
  detail?: string;
}

const API_CHANGELOG: ApiChangeEntry[] = [
  {
    date: '2026-06-24',
    kind: 'addition',
    title: 'Public API live — every documented endpoint now wired',
    detail:
      '/v1/prices, /v1/listings (+ filters / sort / cursor), /v1/listings/:id, /v1/search (alias-aware), /v1/render, /v1/trends (7/30/90/180/365d), /v1/floor (bulk), /v1/inventory/:steamId, /v1/shops/:url, /v1/shops/:url/listings. Anonymous 60 rpm, keyed 600 rpm. Every response carries X-RateLimit-* + X-Request-Id.',
  },
  {
    date: '2026-06-24',
    kind: 'addition',
    title: 'API key creation now works end-to-end',
    detail:
      'New /functions/v1/api-keys edge function (GET list, POST create, DELETE revoke). Settings → API access calls it directly; keys are generated with crypto.getRandomValues, shown once at creation, and stored masked thereafter. Server enforces the $10 verification gate + 5-key cap.',
  },
  {
    date: '2026-06-24',
    kind: 'improvement',
    title: 'Currency parameter on every price-returning endpoint',
    detail:
      'Pass currency=CZK/EUR/USD/GBP/PLN/HUF. Conversion done server-side so floor/median/max share the same rate.',
  },
  {
    date: '2026-06-24',
    kind: 'docs',
    title: 'Shop CSS customization docs added',
    detail:
      'New "Shop styling" section under /docs covering CSS overview, page structure, variable reference, selector reference, three example themes, and the preset-publishing flow.',
  },
  {
    date: '2026-06-24',
    kind: 'docs',
    title: 'Right-rail TOC: stretched indicator line',
    detail:
      'The right "On this page" rail now renders a Cohere-style vertical track with an accent segment that animates between active headings as the user scrolls.',
  },
  {
    date: '2026-06-24',
    kind: 'improvement',
    title: 'API-key creation now requires verified account',
    detail:
      'Keys can only be issued to users with at least $10 in lifetime deposits (any supported currency, converted at the time of the deposit). Keeps spam abuse off the public tier.',
  },
  {
    date: '2026-06-24',
    kind: 'docs',
    title: 'Docs restructured into multi-page tree',
    detail:
      '/docs is now a real documentation site — left rail navigates between sub-pages, right rail summarises the current page only.',
  },
  {
    date: '2026-06-24',
    kind: 'docs',
    title: 'Code samples in five languages on every endpoint',
    detail: 'curl, TypeScript, Python, Go, PHP — picked language persists across page navigations.',
  },
  {
    date: '2026-06-22',
    kind: 'addition',
    title: 'v1 API declared stable',
    detail: 'Plus a new /v1/floor bulk endpoint (up to 100 skins per request).',
  },
  {
    date: '2026-06-10',
    kind: 'addition',
    title: '/v1/trends added',
    detail: 'Daily price aggregates with 7 / 30 / 90 / 180 / 365 day windows.',
  },
  {
    date: '2026-05-28',
    kind: 'breaking',
    title: 'Webhook signatures upgraded to HMAC-SHA256 with timestamp guard',
    detail:
      'Old signature scheme deprecated. Any timestamp older than 5 minutes is rejected — set your server clock with NTP.',
  },
  {
    date: '2026-05-15',
    kind: 'addition',
    title: '/v1/search rolled out',
    detail: 'Fuzzy matching with weapon-name aliases (AK → AK-47).',
  },
  {
    date: '2026-04-30',
    kind: 'improvement',
    title: 'Currency conversion parameter on all price-returning endpoints',
    detail: 'Pass currency=CZK/EUR/USD/GBP/PLN/HUF.',
  },
  {
    date: '2026-04-12',
    kind: 'improvement',
    title: '/v1/inventory cache TTL bumped 5m → 30m',
    detail: 'Plus a ?fresh=1 escape hatch that costs 5× the normal rate-limit budget.',
  },
  {
    date: '2026-03-28',
    kind: 'addition',
    title: 'X-RateLimit-* headers on every response',
  },
  {
    date: '2026-03-15',
    kind: 'breaking',
    title: 'Error envelope standardised',
    detail: 'Every error returns { error: { code, message, request_id } }. Older shapes deprecated.',
  },
];

const CATEGORY_META: Record<
  ProductChangeGroup['category'],
  { label: string; Icon: React.ComponentType<any>; tone: string }
> = {
  new: { label: 'New', Icon: Plus, tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  improved: { label: 'Improved', Icon: Zap, tone: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' },
  fixed: { label: 'Fixed', Icon: Bug, tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  security: { label: 'Security', Icon: Shield, tone: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' },
};

const VERSION_TYPE_META: Record<ProductVersion['type'], { label: string; tone: string }> = {
  major: { label: 'Major', tone: 'bg-accent text-on-accent' },
  minor: { label: 'Minor', tone: 'bg-accent-soft text-accent' },
  patch: { label: 'Patch', tone: 'bg-subtle text-ink-muted' },
};

const API_KIND_META: Record<ApiChangeEntry['kind'], { label: string; tone: string }> = {
  addition: { label: 'Addition', tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  breaking: { label: 'Breaking', tone: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' },
  improvement: { label: 'Improvement', tone: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' },
  fix: { label: 'Fix', tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  docs: { label: 'Docs', tone: 'text-accent bg-accent-soft' },
};

type TabId = 'all' | 'product' | 'api' | 'status';

const ChangelogPage: React.FC = () => {
  const { t } = useTranslationStore();
  const location = useLocation();
  const [tab, setTab] = useState<TabId>('all');
  const [query, setQuery] = useState('');
  const [activeVersion, setActiveVersion] = useState<string>(PRODUCT_VERSIONS[0].version);

  useDocumentMeta({
    title: 'Changelog — Skinify',
    description:
      'Every product update, security fix, and API change on Skinify, dated and grouped. Track new features, improvements and breaking changes.',
    canonical: 'https://skinify.gg/changelog',
    jsonLd: breadcrumbJsonLd([
      { name: 'Home', url: 'https://skinify.gg/' },
      { name: 'Changelog', url: 'https://skinify.gg/changelog' },
    ]),
  });

  useEffect(() => {
    if (location.hash === '#status' || location.hash === '#api-changelog') {
      setTab(location.hash === '#status' ? 'status' : 'api');
      requestAnimationFrame(() => {
        document
          .getElementById(location.hash.slice(1))
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  const activeVersionEntry = useMemo(
    () => PRODUCT_VERSIONS.find((v) => v.version === activeVersion) || PRODUCT_VERSIONS[0],
    [activeVersion],
  );

  const filteredApi = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return API_CHANGELOG;
    return API_CHANGELOG.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.detail || '').toLowerCase().includes(q) ||
        c.kind.includes(q) ||
        c.date.includes(q),
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-3 pb-16">
        {/* ───── Hero ─────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mt-4 mb-8 sm:mt-8 sm:mb-10"
        >
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-ink-dim mb-3">
            <Link to="/" className="hover:text-ink transition-colors">
              {t('nav.home') || 'Home'}
            </Link>
            <span>/</span>
            <span className="text-ink">{t('changelog.title') || 'Changelog'}</span>
          </div>
          <h1 className="text-[30px] sm:text-[44px] font-bold tracking-tight text-ink leading-[1.05]">
            {t('changelog.heading') || 'What\'s new on Skinify'}
          </h1>
          <p className="text-[14px] sm:text-[16px] text-ink-muted font-medium mt-3 max-w-[640px] leading-relaxed">
            {t('changelog.lead') ||
              'Every product update, system-status change and API tweak — dated, grouped and searchable.'}
          </p>
        </motion.header>

        {/* ───── Tabs + search ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {(
              [
                { id: 'all', label: t('changelog.tab.all') || 'All', Icon: Sparkles },
                { id: 'product', label: t('changelog.tab.product') || 'Product', Icon: Wrench },
                { id: 'api', label: t('changelog.tab.api') || 'API', Icon: Code2 },
                { id: 'status', label: t('changelog.tab.status') || 'Status', Icon: Activity },
              ] as { id: TabId; label: string; Icon: React.ComponentType<any> }[]
            ).map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <motion.button
                  key={id}
                  whileTap={tap}
                  onClick={() => setTab(id)}
                  className={`relative h-10 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
                    active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="changelog-tab-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ ...spring, mass: 0.6 }}
                    />
                  )}
                  {!active && <span className="absolute inset-0 rounded-full bg-subtle" aria-hidden />}
                  <span className="relative inline-flex items-center gap-1.5">
                    <Icon size={13} strokeWidth={2.4} />
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>
          <div className="relative flex-1 sm:max-w-[300px] sm:ml-auto">
            <Search
              size={14}
              strokeWidth={2.4}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('changelog.search') || 'Search changes…'}
              className="w-full h-10 pl-9 pr-3 rounded-full bg-subtle text-[13px] font-medium text-ink placeholder:text-ink-muted outline-none focus:ring-2 ring-accent/30"
            />
          </div>
        </div>

        {/* ───── PRODUCT (versions) ───────────────────────────────── */}
        {(tab === 'all' || tab === 'product') && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.06 }}
            className="mb-10"
          >
            <SectionHeader
              Icon={Wrench}
              eyebrow={t('changelog.product.eyebrow') || 'Product'}
              title={t('changelog.product.title') || 'Release timeline'}
              subtitle={
                t('changelog.product.subtitle') ||
                'Each version groups its changes into New, Improved, Fixed and Security.'
              }
            />
            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 lg:gap-6">
              {/* Version rail */}
              <aside>
                <ul className="card-flat p-2 sticky top-20">
                  {PRODUCT_VERSIONS.map((v) => {
                    const active = v.version === activeVersion;
                    return (
                      <li key={v.version}>
                        <motion.button
                          whileTap={tap}
                          onClick={() => setActiveVersion(v.version)}
                          className={`relative w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                            active ? 'text-ink' : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="changelog-version-bg"
                              className="absolute inset-0 rounded-xl bg-subtle"
                              transition={{ ...spring, mass: 0.6 }}
                            />
                          )}
                          <span className="relative flex items-baseline justify-between gap-3">
                            <span className="font-bold tracking-tight tabular-nums">
                              v{v.version}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${VERSION_TYPE_META[v.type].tone}`}
                            >
                              {VERSION_TYPE_META[v.type].label}
                            </span>
                          </span>
                          <span className="relative block text-[11.5px] text-ink-dim font-semibold tabular-nums mt-0.5">
                            {formatDate(v.date)}
                          </span>
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>
              </aside>

              {/* Selected version detail */}
              <article className="card p-5 sm:p-8">
                <header className="flex flex-wrap items-baseline gap-3 mb-5">
                  <h3 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-ink">
                    v{activeVersionEntry.version}
                  </h3>
                  <span
                    className={`text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${VERSION_TYPE_META[activeVersionEntry.type].tone}`}
                  >
                    {VERSION_TYPE_META[activeVersionEntry.type].label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted font-semibold tabular-nums ml-auto">
                    <Calendar size={12} strokeWidth={2.4} />
                    {formatDate(activeVersionEntry.date)}
                  </span>
                </header>

                <div className="space-y-6">
                  {activeVersionEntry.changes.map((change, ci) => {
                    const meta = CATEGORY_META[change.category];
                    return (
                      <motion.div
                        key={change.category}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: 0.05 + ci * 0.04 }}
                      >
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider mb-2.5 ${meta.tone}`}
                        >
                          <meta.Icon size={12} strokeWidth={2.4} />
                          {meta.label}
                        </div>
                        <ul className="space-y-2 ml-1">
                          {change.items.map((item, ii) => (
                            <li
                              key={ii}
                              className="flex items-start gap-2.5 text-[13.5px] text-ink-muted font-medium leading-relaxed"
                            >
                              <Check
                                size={13}
                                strokeWidth={2.6}
                                className="text-accent mt-1 shrink-0"
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    );
                  })}
                </div>
              </article>
            </div>
          </motion.section>
        )}

        {/* ───── STATUS ───────────────────────────────────────────── */}
        {(tab === 'all' || tab === 'status') && (
          <motion.section
            id="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="mb-10 scroll-mt-24"
          >
            <SectionHeader
              Icon={Activity}
              eyebrow={t('changelog.status.eyebrow') || 'System status'}
              title={t('changelog.status.title') || 'All systems operational'}
              subtitle={
                t('changelog.status.subtitle') ||
                'Lightweight read on platform health. A real-time uptime board ships with the status pipeline.'
              }
              rightSlot={
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {t('changelog.status.operational') || 'Operational'}
                </span>
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Marketplace', state: 'Operational' },
                { label: 'Public API', state: 'Operational' },
                { label: 'Steam trade pipeline', state: 'Operational' },
                { label: 'Webhooks', state: 'Operational' },
              ].map((s) => (
                <div key={s.label} className="card-flat p-4">
                  <div className="label-meta">{s.label}</div>
                  <div className="text-[14px] font-bold text-emerald-700 dark:text-emerald-400 mt-1.5 inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {s.state}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ───── API CHANGELOG ────────────────────────────────────── */}
        {(tab === 'all' || tab === 'api') && (
          <motion.section
            id="api-changelog"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.14 }}
            className="mb-10 scroll-mt-24"
          >
            <SectionHeader
              Icon={Code2}
              eyebrow={t('changelog.api.eyebrow') || 'API'}
              title={t('changelog.api.title') || 'API changelog'}
              subtitle={
                t('changelog.api.subtitle') ||
                'Every API-level change, dated. Mirror of /docs/api-changelog.'
              }
              rightSlot={
                <Link
                  to="/docs/api-changelog"
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-accent hover:opacity-80 transition-opacity"
                >
                  {t('changelog.api.viewDocs') || 'View on docs'}
                  <ExternalLink size={11} strokeWidth={2.6} />
                </Link>
              }
            />
            <div className="card overflow-hidden">
              {filteredApi.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[13px] text-ink-muted font-medium">
                    {t('changelog.empty') || 'No matching entries.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {filteredApi.map((c, i) => {
                    const meta = API_KIND_META[c.kind];
                    return (
                      <motion.li
                        key={`${c.date}-${i}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 + i * 0.015 }}
                        className="flex items-start gap-3 p-4 sm:p-5 hover:bg-subtle/30 transition-colors"
                      >
                        <span
                          className={`mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-[11px] font-mono text-ink-dim tabular-nums">
                              {c.date}
                            </span>
                            <span className="text-[14px] font-bold text-ink tracking-tight">
                              {c.title}
                            </span>
                          </div>
                          {c.detail && (
                            <p className="text-[12.5px] text-ink-muted font-medium mt-1 leading-relaxed">
                              {c.detail}
                            </p>
                          )}
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.section>
        )}

        {/* ───── Stay updated card ───────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6 sm:p-10 relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 70%)',
            }}
          />
          <div className="relative max-w-[680px]">
            <div className="label-eyebrow mb-2 inline-flex items-center gap-1.5">
              <Sparkles size={11} strokeWidth={2.4} /> {t('changelog.stay.eyebrow') || 'Stay updated'}
            </div>
            <h3 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-ink leading-tight">
              {t('changelog.stay.title') || 'New features, fixes and API tweaks — straight to your inbox'}
            </h3>
            <p className="text-[13.5px] text-ink-muted font-medium mt-2 leading-relaxed">
              {t('changelog.stay.lead') ||
                'Subscribe to the RSS feed or follow us on X — we post every release the moment it ships.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="/changelog.xml"
                className="h-11 px-5 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5"
                style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.6)' }}
              >
                <Filter size={13} strokeWidth={2.4} />
                {t('changelog.stay.rss') || 'RSS feed'}
              </a>
              <a
                href="https://twitter.com/SkinifyCS2"
                target="_blank"
                rel="noopener"
                className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                {t('changelog.stay.twitter') || 'Follow on X'}
                <ExternalLink size={11} strokeWidth={2.4} />
              </a>
            </div>
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

const SectionHeader: React.FC<{
  Icon: React.ComponentType<any>;
  eyebrow: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}> = ({ Icon, eyebrow, title, subtitle, rightSlot }) => (
  <div className="flex items-start gap-3 mb-5">
    <div className="w-9 h-9 rounded-2xl bg-accent-soft text-accent grid place-items-center shrink-0 mt-1">
      <Icon size={17} strokeWidth={2.2} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="label-eyebrow">{eyebrow}</div>
      <h2 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-ink leading-tight mt-1">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[13px] text-ink-muted font-medium mt-1 leading-relaxed max-w-[600px]">
          {subtitle}
        </p>
      )}
    </div>
    {rightSlot && <div className="shrink-0">{rightSlot}</div>}
  </div>
);

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default ChangelogPage;
