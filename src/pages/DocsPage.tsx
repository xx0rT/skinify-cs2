import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Book,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Globe,
  Hash,
  Key,
  Layers,
  Lock,
  Search,
  Terminal,
  Webhook,
  Zap,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import useDocumentMeta, { breadcrumbJsonLd } from '../hooks/useDocumentMeta';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   DocsPage — full developer documentation site (Cohere-docs / Stripe-docs
   style) served from the main app at /docs.

   Layout:
     - Left rail: sticky category-grouped nav with active-section highlight.
       Sections are anchor IDs inside the same page so navigation is
       a smooth scroll, not a route change. That keeps the docs feel of
       one long readable page while the deep nav still gives reference
       structure.
     - Center column: ordered sections (overview → auth → rate limits →
       errors → endpoints → webhooks → SDKs → support). Code blocks
       carry copy buttons; tables are minimal-chrome.
     - Right rail: auto-generated "On this page" TOC from the visible
       sections; the active heading highlights as the user scrolls.

   The thin `/developers` page is the preview / marketing surface for
   the API. This page is the deep reference. Both link to each other.
   ───────────────────────────────────────────────────────────────────────── */

const BASE = 'https://xorxvaubgxhmusbvbzfd.supabase.co/functions/v1/public-api';

interface NavItem {
  id: string;
  label: string;
}
interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: 'Getting started',
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'quickstart', label: 'Quickstart' },
      { id: 'authentication', label: 'Authentication' },
      { id: 'rate-limits', label: 'Rate limits' },
      { id: 'errors', label: 'Errors' },
      { id: 'versioning', label: 'Versioning' },
    ],
  },
  {
    title: 'Core endpoints',
    items: [
      { id: 'endpoint-prices', label: 'GET /v1/prices' },
      { id: 'endpoint-listings', label: 'GET /v1/listings' },
      { id: 'endpoint-listing', label: 'GET /v1/listings/:id' },
      { id: 'endpoint-search', label: 'GET /v1/search' },
      { id: 'endpoint-render', label: 'GET /v1/render' },
      { id: 'endpoint-trends', label: 'GET /v1/trends' },
      { id: 'endpoint-floor', label: 'GET /v1/floor' },
    ],
  },
  {
    title: 'Inventory & user',
    items: [
      { id: 'endpoint-inventory', label: 'GET /v1/inventory/:steamId' },
      { id: 'endpoint-shops', label: 'GET /v1/shops/:url' },
      { id: 'endpoint-shop-listings', label: 'GET /v1/shops/:url/listings' },
    ],
  },
  {
    title: 'Webhooks',
    items: [
      { id: 'webhooks-overview', label: 'Overview' },
      { id: 'webhooks-events', label: 'Event types' },
      { id: 'webhooks-signing', label: 'Verifying signatures' },
    ],
  },
  {
    title: 'SDKs & guides',
    items: [
      { id: 'sdks', label: 'Official SDKs' },
      { id: 'guide-pricing', label: 'Build a price ticker' },
      { id: 'guide-alerts', label: 'Build a price-drop alert' },
      { id: 'changelog', label: 'API changelog' },
      { id: 'support', label: 'Support' },
    ],
  },
];

/* Flat list of section ids in document order — used by the scroll-spy
   to map the topmost visible heading to the highlighted nav item. */
const SECTION_ORDER = NAV.flatMap((s) => s.items.map((i) => i.id));

const DocsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string>('overview');
  const [copied, setCopied] = useState<string | null>(null);
  const [navQuery, setNavQuery] = useState('');

  useDocumentMeta({
    title: 'Skinify API Reference — Full Developer Documentation · Docs',
    description:
      'Complete reference for the Skinify CS2 marketplace API. Authentication, rate limits, errors, every endpoint with examples, webhooks, SDKs, and integration guides.',
    canonical: 'https://skinify.gg/docs',
    keywords:
      'skinify api docs, cs2 marketplace api reference, cs2 skin api documentation, skinify endpoints, skinify rate limits, skinify webhooks, cs2 price api docs',
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Home', url: 'https://skinify.gg/' },
        { name: 'Developers', url: 'https://skinify.gg/developers' },
        { name: 'API docs', url: 'https://skinify.gg/docs' },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: 'Skinify API Reference',
        description:
          'Complete reference for the Skinify CS2 marketplace API.',
        url: 'https://skinify.gg/docs',
        author: { '@type': 'Organization', name: 'Skinify' },
        proficiencyLevel: 'Beginner to Advanced',
        dependencies: 'HTTP, JSON',
      },
    ],
  });

  /* IntersectionObserver-driven scroll-spy: tracks which section is
     currently in the viewport and highlights the matching nav item. */
  useEffect(() => {
    const headings = SECTION_ORDER.map((id) => document.getElementById(id)).filter(
      Boolean,
    ) as HTMLElement[];
    if (!headings.length) return;

    const onScroll = () => {
      const yRef = window.innerHeight * 0.25;
      let current = headings[0].id;
      for (const h of headings) {
        const top = h.getBoundingClientRect().top;
        if (top - yRef <= 0) current = h.id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* unsupported */
    }
  };

  const filteredNav = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return NAV;
    return NAV.map((s) => ({
      ...s,
      items: s.items.filter((i) => i.label.toLowerCase().includes(q)),
    })).filter((s) => s.items.length > 0);
  }, [navQuery]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      {/* Promo strip — like Cohere's "new model" banner. Soft, dismissible
          visually (sits at the top of /docs only). */}
      <div className="border-b border-line bg-accent-soft/40">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="text-[12.5px] font-semibold text-ink flex items-center gap-2 min-w-0">
            <Zap size={13} className="text-accent shrink-0" strokeWidth={2.4} />
            <span className="truncate">
              <strong>v1 API now stable.</strong> Free anonymous tier
              up to 60 req/min. Generate a key for 600 rpm.
            </span>
          </div>
          <Link
            to="/profile?tab=settings&sub=api"
            className="hidden sm:inline-flex items-center gap-1 text-[12px] font-bold text-accent hover:opacity-80 transition-opacity shrink-0"
          >
            Get API key
            <ChevronRight size={12} strokeWidth={2.6} />
          </Link>
        </div>
      </div>

      <div className="max-w-[1320px] mx-auto px-4 sm:px-6">
        {/* Top docs subnav — mirrors the Cohere "Guides / API Reference /
            Release Notes / Cookbooks" row. */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pt-4 pb-3 -mx-1 px-1">
          {[
            { label: 'API Reference', to: '/docs', active: true, Icon: Code2 },
            { label: 'Quickstart preview', to: '/developers', Icon: Zap },
            { label: 'Changelog', to: '/changelog', Icon: Layers },
            { label: 'Status', href: 'https://status.skinify.gg', Icon: Globe },
          ].map((tab) => {
            const cls = `h-9 px-3.5 rounded-full text-[12.5px] font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
              tab.active
                ? 'bg-subtle text-ink'
                : 'text-ink-muted hover:bg-subtle/60 hover:text-ink'
            }`;
            const Inner = (
              <>
                <tab.Icon size={13} strokeWidth={2.4} />
                {tab.label}
              </>
            );
            return tab.to ? (
              <Link key={tab.label} to={tab.to} className={cls}>
                {Inner}
              </Link>
            ) : (
              <a
                key={tab.label}
                href={tab.href}
                target="_blank"
                rel="noopener"
                className={cls}
              >
                {Inner}
              </a>
            );
          })}
          <div className="flex-1" />
          <div className="hidden lg:flex items-center gap-2 text-[12px] text-ink-muted font-semibold shrink-0">
            <kbd className="px-1.5 py-0.5 rounded bg-subtle text-[10px] font-mono">/</kbd>
            <span>to search</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_220px] gap-8 lg:gap-10 pb-16">
          {/* ─── LEFT NAV ───────────────────────────────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin pr-2">
              <div className="relative mb-4">
                <Search
                  size={14}
                  strokeWidth={2.4}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                />
                <input
                  type="text"
                  value={navQuery}
                  onChange={(e) => setNavQuery(e.target.value)}
                  placeholder="Filter docs…"
                  className="w-full h-9 pl-8 pr-3 rounded-full bg-subtle text-[12.5px] font-medium text-ink placeholder:text-ink-muted outline-none focus:ring-2 ring-accent/30"
                />
              </div>

              {filteredNav.map((section) => (
                <div key={section.title} className="mb-5">
                  <div className="label-eyebrow mb-2 px-1">{section.title}</div>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = activeId === item.id;
                      return (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className={`relative block px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                              active
                                ? 'text-ink bg-subtle'
                                : 'text-ink-muted hover:text-ink hover:bg-subtle/40'
                            }`}
                          >
                            {active && (
                              <motion.span
                                layoutId="docs-nav-bar"
                                className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-accent"
                                transition={{
                                  type: 'spring',
                                  stiffness: 460,
                                  damping: 32,
                                }}
                              />
                            )}
                            {item.label}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </aside>

          {/* ─── CONTENT ────────────────────────────────────────────── */}
          <main className="min-w-0 docs-prose">
            <button
              onClick={() => navigate('/developers')}
              className="lg:hidden inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted hover:text-ink transition-colors mb-4"
            >
              <ArrowLeft size={14} strokeWidth={2.4} />
              Back to preview
            </button>

            <header className="mb-8">
              <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-accent mb-2">
                API Reference
              </div>
              <h1 className="text-[34px] sm:text-[44px] font-bold tracking-tight leading-[1.05]">
                Skinify API — full reference
              </h1>
              <p className="text-[15px] text-ink-muted font-medium mt-4 leading-relaxed max-w-[640px]">
                Everything you need to integrate with the Skinify
                marketplace. Pricing, listings, search, renders, webhooks
                and inventory — versioned, JSON-only, rate-limited.
              </p>
            </header>

            <Section id="overview" title="Overview" Icon={Book}>
              <p>
                The Skinify API is a JSON-over-HTTPS interface for the
                Skinify CS2 marketplace. All endpoints are GET-only at the
                public tier — write operations (creating listings,
                accepting trades) live behind authenticated user sessions
                and are not exposed here yet.
              </p>
              <Callout tone="info" Icon={Globe}>
                <strong>Base URL.</strong>{' '}
                <Code inline>{BASE}</Code>
              </Callout>
              <ul>
                <li>Read-only at the public tier; no write scopes required.</li>
                <li>JSON request and response bodies. UTF-8 throughout.</li>
                <li>Prices are returned in CZK by default; pass <Code inline>currency=EUR</Code> (or USD/GBP/PLN/HUF) to convert.</li>
                <li>Timestamps are ISO 8601 with a UTC offset.</li>
                <li>Stable v1. Breaking changes ship under a new version prefix.</li>
              </ul>
            </Section>

            <Section id="quickstart" title="Quickstart" Icon={Zap}>
              <p>
                The fastest way to see the API in action — no key required.
                Paste the curl below into a terminal and you'll get a live
                price aggregate for an AK-47 | Redline in field-tested
                condition.
              </p>
              <CodeBlock
                id="qs-curl"
                copied={copied === 'qs-curl'}
                onCopy={copy}
                lang="bash"
                code={`curl '${BASE}/v1/prices?market_hash_name=AK-47%20%7C%20Redline%20(Field-Tested)'`}
              />
              <p>
                For higher quotas, generate a key from your{' '}
                <Link to="/profile?tab=settings&sub=api" className="text-accent hover:underline">
                  account → settings → API
                </Link>{' '}
                tab and send it with every request:
              </p>
              <CodeBlock
                id="qs-curl-auth"
                copied={copied === 'qs-curl-auth'}
                onCopy={copy}
                lang="bash"
                code={`curl '${BASE}/v1/prices?market_hash_name=AK-47%20%7C%20Redline%20(Field-Tested)' \\
  -H 'X-Skinify-Key: sk_live_xxxxxxxxxxxxxxxxxxxxxxxx'`}
              />
            </Section>

            <Section id="authentication" title="Authentication" Icon={Lock}>
              <p>
                Two auth modes:
              </p>
              <ul>
                <li>
                  <strong>Anonymous.</strong> No header. 60 requests per
                  minute per IP. Great for prototyping and low-volume
                  community tools.
                </li>
                <li>
                  <strong>API key.</strong> Send the key in the
                  {' '}<Code inline>X-Skinify-Key</Code> request header. 600
                  requests per minute. Higher tiers available on request.
                </li>
              </ul>
              <Callout tone="warn" Icon={Key}>
                Keys are <strong>secret</strong>. Never embed them in
                client-side bundles, mobile apps or git repositories.
                Proxy through your own backend if you need to call from a
                browser.
              </Callout>
              <Table
                headers={['Field', 'Where', 'Example']}
                rows={[
                  ['X-Skinify-Key', 'Request header', 'sk_live_xxxxxxxxxxxxxxxxxxxxxxxx'],
                  ['Authorization', 'Bearer fallback', 'Bearer sk_live_xxxxxxxxxxxx'],
                ]}
              />
            </Section>

            <Section id="rate-limits" title="Rate limits" Icon={Zap}>
              <p>
                Limits are per <em>identity</em>: per IP for anonymous,
                per key for authenticated. When you hit the cap the API
                returns <Code inline>429 Too Many Requests</Code>.
              </p>
              <Table
                headers={['Tier', 'Rate limit', 'Burst', 'Concurrency']}
                rows={[
                  ['Anonymous', '60 req / min', '20 req / 10s', '4'],
                  ['Free key', '600 req / min', '60 req / 10s', '12'],
                  ['Pro key', '6,000 req / min', '600 req / 10s', '64'],
                  ['Enterprise', 'Custom', 'Custom', 'Custom'],
                ]}
              />
              <p>
                Every response carries headers so you can pace your
                requests without hitting the cap:
              </p>
              <CodeBlock
                id="rl-headers"
                copied={copied === 'rl-headers'}
                onCopy={copy}
                lang="http"
                code={`X-RateLimit-Limit: 600
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1719237600
Retry-After: 12`}
              />
            </Section>

            <Section id="errors" title="Errors" Icon={Hash}>
              <p>
                Errors return a stable JSON envelope. Always check the
                HTTP status code; the body carries human-readable detail.
              </p>
              <CodeBlock
                id="err-shape"
                copied={copied === 'err-shape'}
                onCopy={copy}
                lang="json"
                code={`{
  "error": {
    "code": "rate_limited",
    "message": "Rate limit exceeded. Retry in 12 seconds.",
    "request_id": "req_01HZ3K3V7CQX4PJ4M6PYJ4F7TQ"
  }
}`}
              />
              <Table
                headers={['Status', 'Code', 'When']}
                rows={[
                  ['400', 'invalid_request', 'Missing or malformed query parameter.'],
                  ['401', 'invalid_key', 'API key missing, malformed, or revoked.'],
                  ['403', 'forbidden', 'Key is valid but lacks scope.'],
                  ['404', 'not_found', 'Listing / shop / market_hash_name does not exist.'],
                  ['429', 'rate_limited', 'You hit your tier\'s rpm or burst limit.'],
                  ['500', 'internal_error', 'Something broke on our side. Retry with backoff.'],
                  ['503', 'unavailable', 'Maintenance window. Try again in a few seconds.'],
                ]}
              />
            </Section>

            <Section id="versioning" title="Versioning" Icon={Layers}>
              <p>
                The current API is <Code inline>v1</Code>. Backwards-
                incompatible changes ship under a new prefix
                (<Code inline>v2</Code>, etc.) and run in parallel for at
                least 12 months before deprecation. Additive changes
                (new optional fields, new endpoints) ship inside v1.
              </p>
              <ul>
                <li>We never rename or remove existing JSON fields inside a version.</li>
                <li>New optional fields can appear at any time — make sure your client ignores unknown keys.</li>
                <li>Deprecation announcements ship via the <Link to="/changelog" className="text-accent hover:underline">changelog</Link> and a <Code inline>Sunset</Code> response header on affected endpoints.</li>
              </ul>
            </Section>

            {/* ── ENDPOINTS ─────────────────────────────────────────── */}
            <Endpoint
              id="endpoint-prices"
              method="GET"
              path="/v1/prices"
              summary="Price aggregate for a skin"
              description="Floor, median and max across all active listings for one market_hash_name. The fastest endpoint to integrate when you want to surface a 'current value' for a skin."
              params={[
                {
                  name: 'market_hash_name',
                  type: 'string',
                  required: true,
                  description:
                    'Steam market hash name, exactly as Steam returns it. Case-sensitive.',
                },
                {
                  name: 'currency',
                  type: 'string',
                  required: false,
                  description: 'CZK (default), EUR, USD, GBP, PLN, HUF.',
                },
              ]}
              example={`curl '${BASE}/v1/prices?market_hash_name=AK-47%20%7C%20Redline%20(Field-Tested)'`}
              response={`{
  "data": {
    "market_hash_name": "AK-47 | Redline (Field-Tested)",
    "listings_count": 47,
    "floor": 312.5,
    "median": 358.0,
    "max": 612.0,
    "currency": "CZK"
  }
}`}
              copied={copied}
              onCopy={copy}
            />

            <Endpoint
              id="endpoint-listings"
              method="GET"
              path="/v1/listings"
              summary="Search active listings"
              description="Read-only listings index. Filter by market_hash_name, price range, type, rarity, sort by price, recency or relevance. Each row carries a deep-link URL back to skinify.gg so you can attribute traffic."
              params={[
                { name: 'market_hash_name', type: 'string', required: false, description: 'Filter to one specific skin.' },
                { name: 'type', type: 'string', required: false, description: 'Rifle, Pistol, Knife, Gloves, SMG, Sniper, Container.' },
                { name: 'rarity', type: 'string', required: false, description: 'Consumer, Industrial, Mil-Spec, Restricted, Classified, Covert, Extraordinary.' },
                { name: 'min_price', type: 'number', required: false, description: 'Minimum price in the requested currency.' },
                { name: 'max_price', type: 'number', required: false, description: 'Maximum price in the requested currency.' },
                { name: 'sort', type: 'string', required: false, description: 'price_asc, price_desc, newest (default), float_asc.' },
                { name: 'limit', type: 'number', required: false, description: '1–100. Default 25.' },
                { name: 'cursor', type: 'string', required: false, description: 'Pagination cursor returned in meta.next.' },
              ]}
              example={`curl '${BASE}/v1/listings?type=Rifle&rarity=Covert&sort=price_asc&limit=5'`}
              response={`{
  "data": [
    {
      "id": "1234",
      "market_hash_name": "AK-47 | Redline (Field-Tested)",
      "item_type": "Rifle",
      "condition": "Field-Tested",
      "rarity": "Classified",
      "price": 312.5,
      "currency": "CZK",
      "float": "0.21034",
      "image_url": "https://community.cloudflare.steamstatic.com/...png",
      "listed_at": "2026-06-22T10:14:00+00:00",
      "seller_name": "BluePhase",
      "url": "https://skinify.gg/item/1234"
    }
  ],
  "meta": { "count": 1, "limit": 5, "next": "eyJpZCI6IjEyMzQifQ" }
}`}
              copied={copied}
              onCopy={copy}
            />

            <Endpoint
              id="endpoint-listing"
              method="GET"
              path="/v1/listings/{id}"
              summary="Fetch a single listing"
              description="Full detail for one listing, including sticker breakdown, paint seed, pattern index, and a per-listing inspect link."
              params={[
                { name: 'id', type: 'string (path)', required: true, description: 'Listing id from /v1/listings.' },
              ]}
              example={`curl '${BASE}/v1/listings/1234'`}
              response={`{
  "data": {
    "id": "1234",
    "market_hash_name": "AK-47 | Redline (Field-Tested)",
    "price": 312.5,
    "currency": "CZK",
    "float": "0.21034",
    "paint_seed": 661,
    "stickers": [
      { "name": "Boston 2018 (Foil) | Mirage", "wear": 0.02, "position": 0 }
    ],
    "inspect_url": "steam://rungame/730/.../+csgo_econ_action_preview%20S...A...D...",
    "image_url": "https://community.cloudflare.steamstatic.com/...png",
    "seller_name": "BluePhase",
    "url": "https://skinify.gg/item/1234"
  }
}`}
              copied={copied}
              onCopy={copy}
            />

            <Endpoint
              id="endpoint-search"
              method="GET"
              path="/v1/search"
              summary="Fuzzy search by skin name"
              description="Free-text search across active listings. Tolerates typos, weapon-name aliases (AK / AK-47) and partial matches. Returns up to 25 grouped results."
              params={[
                { name: 'q', type: 'string', required: true, description: 'Free-text query. 2-character minimum.' },
                { name: 'limit', type: 'number', required: false, description: '1–25. Default 10.' },
              ]}
              example={`curl '${BASE}/v1/search?q=karambit+doppler'`}
              response={`{
  "data": [
    {
      "market_hash_name": "★ Karambit | Doppler (Factory New)",
      "listings_count": 8,
      "floor": 18920.0,
      "image_url": "https://...",
      "url": "https://skinify.gg/marketplace?q=Karambit%20Doppler"
    }
  ]
}`}
              copied={copied}
              onCopy={copy}
            />

            <Endpoint
              id="endpoint-render"
              method="GET"
              path="/v1/render"
              summary="CSFloat-rendered preview image"
              description="Returns a 302 redirect to a per-listing render image showing the real float / seed pattern of the skin. Drop directly into an <img> tag; the redirect target is a long-lived CDN URL with browser caching."
              params={[
                { name: 'inspect', type: 'string', required: true, description: 'URL-encoded Steam inspect link.' },
              ]}
              example={`curl -L '${BASE}/v1/render?inspect=steam%3A%2F%2Frungame%2F730%2F76561198021723640%2F%2Bcsgo_econ_action_preview%2520S76561198021723640A12345D67890'`}
              response={`302 Location: https://render.csgofloat.com/preview/abc123.png`}
              copied={copied}
              onCopy={copy}
            />

            <Endpoint
              id="endpoint-trends"
              method="GET"
              path="/v1/trends"
              summary="Time-series price trend"
              description="Daily price aggregates over the last N days. Useful for sparklines, market dashboards, or a 'is this skin going up or down' indicator on your own site."
              params={[
                { name: 'market_hash_name', type: 'string', required: true, description: 'Same case-sensitive Steam name as elsewhere.' },
                { name: 'days', type: 'number', required: false, description: '7, 30 (default), 90, 180, 365.' },
              ]}
              example={`curl '${BASE}/v1/trends?market_hash_name=AK-47%20%7C%20Redline%20(Field-Tested)&days=30'`}
              response={`{
  "data": [
    { "day": "2026-05-25", "floor": 305.0, "median": 348.0, "volume": 12 },
    { "day": "2026-05-26", "floor": 308.5, "median": 352.0, "volume": 9 }
  ]
}`}
              copied={copied}
              onCopy={copy}
            />

            <Endpoint
              id="endpoint-floor"
              method="GET"
              path="/v1/floor"
              summary="Bulk floor prices"
              description="Floor price for up to 100 skins in one round-trip. Designed for inventory-valuation tools — pass a comma-separated market_hash_name list, get back the cheapest active listing for each."
              params={[
                { name: 'names', type: 'string[]', required: true, description: 'Comma-separated, URL-encoded list. Max 100 per request.' },
                { name: 'currency', type: 'string', required: false, description: 'CZK / EUR / USD / GBP / PLN / HUF.' },
              ]}
              example={`curl '${BASE}/v1/floor?names=AK-47%20%7C%20Redline%20(FT),AWP%20%7C%20Asiimov%20(FT)'`}
              response={`{
  "data": {
    "AK-47 | Redline (Field-Tested)": { "floor": 312.5, "currency": "CZK" },
    "AWP | Asiimov (Field-Tested)":   { "floor": 1850.0, "currency": "CZK" }
  }
}`}
              copied={copied}
              onCopy={copy}
            />

            <Endpoint
              id="endpoint-inventory"
              method="GET"
              path="/v1/inventory/{steamId}"
              summary="Public Steam inventory"
              description="Cached snapshot of a Steam user's CS2 inventory with Skinify-priced suggestions for each item. Cache TTL is 30 minutes. Force-refresh with ?fresh=1 (rate-limit-cost: 5x)."
              params={[
                { name: 'steamId', type: 'string (path)', required: true, description: 'Steam 64-bit id.' },
                { name: 'fresh', type: 'boolean', required: false, description: 'Bypass cache. Default false.' },
              ]}
              example={`curl '${BASE}/v1/inventory/76561198021723640'`}
              response={`{
  "data": {
    "steam_id": "76561198021723640",
    "items_count": 142,
    "estimated_value": 8420.50,
    "currency": "CZK",
    "items": [
      {
        "asset_id": "12345...",
        "market_hash_name": "AK-47 | Redline (Field-Tested)",
        "suggested_price": 312.5,
        "tradable": true
      }
    ]
  }
}`}
              copied={copied}
              onCopy={copy}
            />

            <Endpoint
              id="endpoint-shops"
              method="GET"
              path="/v1/shops/{url}"
              summary="Public seller-shop metadata"
              description="Storefront info for a Skinify seller shop — display name, rating, total trades, and a link out to the shop on skinify.gg."
              params={[
                { name: 'url', type: 'string (path)', required: true, description: 'Shop slug (e.g. bluephase).' },
              ]}
              example={`curl '${BASE}/v1/shops/bluephase'`}
              response={`{
  "data": {
    "url": "bluephase",
    "display_name": "BluePhase",
    "trades_count": 1428,
    "rating": 4.94,
    "joined_at": "2025-08-12T09:00:00+00:00",
    "shop_url": "https://skinify.gg/shop/bluephase"
  }
}`}
              copied={copied}
              onCopy={copy}
            />

            <Endpoint
              id="endpoint-shop-listings"
              method="GET"
              path="/v1/shops/{url}/listings"
              summary="Listings inside a shop"
              description="All public listings inside one seller's shop. Same pagination + sort options as /v1/listings."
              params={[
                { name: 'url', type: 'string (path)', required: true, description: 'Shop slug.' },
                { name: 'limit', type: 'number', required: false, description: '1–100. Default 25.' },
                { name: 'cursor', type: 'string', required: false, description: 'Pagination cursor.' },
              ]}
              example={`curl '${BASE}/v1/shops/bluephase/listings?limit=10'`}
              response={`{
  "data": [
    { "id": "1234", "market_hash_name": "AK-47 | Redline (FT)", "price": 312.5 }
  ],
  "meta": { "count": 10, "next": "eyJpZCI6IjEyMzQifQ" }
}`}
              copied={copied}
              onCopy={copy}
            />

            {/* ── WEBHOOKS ──────────────────────────────────────────── */}
            <Section id="webhooks-overview" title="Webhooks · overview" Icon={Webhook}>
              <p>
                Webhooks deliver real-time events to your endpoint via
                signed HTTPS POST. Configure receivers from{' '}
                <Link to="/profile?tab=settings&sub=api" className="text-accent hover:underline">
                  Settings → API → Webhooks
                </Link>{' '}
                and choose which event types you want.
              </p>
              <ul>
                <li>Delivery is at-least-once. Build your handler to be idempotent on <Code inline>event.id</Code>.</li>
                <li>Retries: 30s, 2m, 10m, 1h, 6h, 24h, then dead-lettered.</li>
                <li>Timeout: your endpoint must reply with a 2xx within 8 seconds.</li>
              </ul>
            </Section>

            <Section id="webhooks-events" title="Webhook event types" Icon={Hash}>
              <Table
                headers={['Event', 'When it fires']}
                rows={[
                  ['listing.created', 'A new listing is published.'],
                  ['listing.updated', 'Price, condition or visibility changes.'],
                  ['listing.sold', 'A trade closes successfully.'],
                  ['listing.delisted', 'Seller removes the listing.'],
                  ['price.alert', 'A skin you subscribed to crosses a threshold.'],
                  ['shop.review', 'A new review is left on a shop you watch.'],
                ]}
              />
              <CodeBlock
                id="hook-body"
                copied={copied === 'hook-body'}
                onCopy={copy}
                lang="json"
                code={`{
  "id": "evt_01HZ3K3V7CQX4PJ4M6PYJ4F7TQ",
  "type": "listing.sold",
  "created_at": "2026-06-24T08:21:14+00:00",
  "data": {
    "listing_id": "1234",
    "market_hash_name": "AK-47 | Redline (Field-Tested)",
    "sold_price": 312.5,
    "currency": "CZK"
  }
}`}
              />
            </Section>

            <Section id="webhooks-signing" title="Verifying webhook signatures" Icon={Lock}>
              <p>
                Every delivery carries an{' '}
                <Code inline>X-Skinify-Signature</Code> header of the form{' '}
                <Code inline>t=&lt;timestamp&gt;,v1=&lt;hmac&gt;</Code> where
                hmac is HMAC-SHA256 over{' '}
                <Code inline>{`{timestamp}.{raw_body}`}</Code> using your
                webhook secret. Reject any request older than 5 minutes
                to prevent replay attacks.
              </p>
              <CodeBlock
                id="sig-node"
                copied={copied === 'sig-node'}
                onCopy={copy}
                lang="js"
                code={`import crypto from 'node:crypto';

function verify(rawBody, header, secret) {
  const [tPart, sigPart] = header.split(',');
  const t = tPart.split('=')[1];
  const sig = sigPart.split('=')[1];
  const expected = crypto
    .createHmac('sha256', secret)
    .update(\`\${t}.\${rawBody}\`)
    .digest('hex');
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}`}
              />
            </Section>

            {/* ── SDKs & guides ────────────────────────────────────── */}
            <Section id="sdks" title="Official SDKs" Icon={Terminal}>
              <p>
                Lightweight thin clients that wrap the API and surface
                typed responses. All SDKs are MIT-licensed and ship with
                full TypeScript types.
              </p>
              <Table
                headers={['Language', 'Package', 'Status']}
                rows={[
                  ['TypeScript / Node', '@skinify/sdk', 'Stable'],
                  ['Python', 'skinify', 'Stable'],
                  ['Go', 'github.com/skinify/skinify-go', 'Beta'],
                  ['PHP', 'skinify/skinify-php', 'Beta'],
                  ['Rust', 'skinify', 'Alpha'],
                ]}
              />
              <CodeBlock
                id="sdk-ts"
                copied={copied === 'sdk-ts'}
                onCopy={copy}
                lang="ts"
                code={`import { Skinify } from '@skinify/sdk';

const s = new Skinify({ apiKey: process.env.SKINIFY_KEY });
const prices = await s.prices.get({
  marketHashName: 'AK-47 | Redline (Field-Tested)',
});
console.log(prices.floor); // 312.5`}
              />
            </Section>

            <Section id="guide-pricing" title="Guide · build a price ticker" Icon={Zap}>
              <p>
                Combine <Code inline>/v1/prices</Code> and{' '}
                <Code inline>/v1/trends</Code> for a 20-line price-ticker
                widget. Polls every 60 seconds; sparkline backed by 30
                days of trends.
              </p>
              <CodeBlock
                id="guide-ticker"
                copied={copied === 'guide-ticker'}
                onCopy={copy}
                lang="ts"
                code={`async function ticker(name: string) {
  const [now, history] = await Promise.all([
    fetch(\`${BASE}/v1/prices?market_hash_name=\${encodeURIComponent(name)}\`).then(r => r.json()),
    fetch(\`${BASE}/v1/trends?market_hash_name=\${encodeURIComponent(name)}&days=30\`).then(r => r.json()),
  ]);
  return { current: now.data.floor, series: history.data.map(d => d.floor) };
}`}
              />
            </Section>

            <Section id="guide-alerts" title="Guide · price-drop alert" Icon={Webhook}>
              <p>
                Subscribe to <Code inline>price.alert</Code> webhooks and
                route them through your own Discord, Slack or email
                notifier. Skinify computes the threshold check; you only
                pay attention when something actually moves.
              </p>
              <CodeBlock
                id="guide-alerts-code"
                copied={copied === 'guide-alerts-code'}
                onCopy={copy}
                lang="ts"
                code={`// Express + Discord webhook bridge
app.post('/skinify-hook', async (req, res) => {
  if (!verify(req.rawBody, req.get('X-Skinify-Signature'), SECRET)) {
    return res.sendStatus(400);
  }
  const evt = req.body;
  if (evt.type === 'price.alert') {
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: \`💸 \${evt.data.market_hash_name} now at \${evt.data.price} \${evt.data.currency}\`,
      }),
    });
  }
  res.sendStatus(200);
});`}
              />
            </Section>

            <Section id="changelog" title="API changelog" Icon={Layers}>
              <p>
                Every API-level change ships with a dated entry. Subscribe
                to the <Link to="/changelog" className="text-accent hover:underline">full changelog</Link>{' '}
                for product updates as well.
              </p>
              <Table
                headers={['Date', 'Change']}
                rows={[
                  ['2026-06-22', 'v1 declared stable. /v1/floor bulk endpoint added.'],
                  ['2026-06-10', '/v1/trends added (30 / 90 / 180 / 365 days).'],
                  ['2026-05-28', 'Webhook signatures upgraded to HMAC-SHA256 with timestamp.'],
                  ['2026-05-15', '/v1/search rolled out — fuzzy matching, alias support.'],
                  ['2026-04-30', 'Currency conversion parameter added to all price-returning endpoints.'],
                ]}
              />
            </Section>

            <Section id="support" title="Support" Icon={Book}>
              <p>
                Stuck on something? We try to reply within a business day.
              </p>
              <ul>
                <li>
                  Email{' '}
                  <a href="mailto:developers@skinify.gg" className="text-accent hover:underline">
                    developers@skinify.gg
                  </a>{' '}
                  for integration help and API key requests.
                </li>
                <li>
                  Join the{' '}
                  <a href="https://discord.gg/skinify" target="_blank" rel="noopener" className="text-accent hover:underline">
                    Skinify Discord
                  </a>{' '}
                  · #developers channel for community help.
                </li>
                <li>
                  Report bugs at{' '}
                  <a href="https://github.com/skinify" target="_blank" rel="noopener" className="text-accent hover:underline">
                    github.com/skinify
                  </a>
                  .
                </li>
              </ul>
            </Section>

            {/* Bottom nav: prev / next surface so docs feel continuous. */}
            <div className="mt-12 flex items-center justify-between gap-3">
              <Link
                to="/developers"
                className="card-flat px-5 py-4 hover:bg-subtle/40 transition-colors flex-1 min-w-0"
              >
                <div className="label-meta">Back to</div>
                <div className="text-[14px] font-bold text-ink tracking-tight mt-1 inline-flex items-center gap-1.5">
                  <ArrowLeft size={14} strokeWidth={2.4} />
                  Quickstart preview
                </div>
              </Link>
              <Link
                to="/changelog"
                className="card-flat px-5 py-4 hover:bg-subtle/40 transition-colors flex-1 min-w-0 text-right"
              >
                <div className="label-meta">Next</div>
                <div className="text-[14px] font-bold text-ink tracking-tight mt-1 inline-flex items-center gap-1.5">
                  Product changelog
                  <ArrowRight size={14} strokeWidth={2.4} />
                </div>
              </Link>
            </div>
          </main>

          {/* ─── RIGHT TOC ─────────────────────────────────────────── */}
          <aside className="hidden xl:block">
            <div className="sticky top-20">
              <div className="label-eyebrow mb-3">On this page</div>
              <ul className="space-y-1.5">
                {SECTION_ORDER.map((id) => {
                  const label = NAV.flatMap((s) => s.items).find((i) => i.id === id)?.label;
                  if (!label) return null;
                  const active = activeId === id;
                  return (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className={`block text-[12px] font-medium leading-snug transition-colors ${
                          active
                            ? 'text-accent font-bold'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Scoped typography for the docs prose surface. Kept here rather
          than in index.css to avoid polluting other pages. */}
      <style>{`
        .docs-prose { color: rgb(var(--ink)); }
        .docs-prose p {
          font-size: 14.5px;
          line-height: 1.7;
          color: rgb(var(--ink-muted));
          margin: 0.9em 0;
        }
        .docs-prose strong { color: rgb(var(--ink)); font-weight: 700; }
        .docs-prose em { font-style: italic; }
        .docs-prose ul {
          list-style: disc;
          padding-left: 1.4em;
          margin: 0.9em 0;
        }
        .docs-prose ul li {
          font-size: 14px;
          line-height: 1.7;
          color: rgb(var(--ink-muted));
          margin: 0.25em 0;
        }
        .docs-prose a { color: rgb(var(--accent)); }
        .docs-prose a:hover { text-decoration: underline; }
        .docs-section { scroll-margin-top: 80px; }
      `}</style>

      <Footer />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────────────────── */

const Section: React.FC<{
  id: string;
  title: string;
  Icon?: React.ComponentType<any>;
  children: React.ReactNode;
}> = ({ id, title, Icon, children }) => (
  <section id={id} className="docs-section mt-12 first:mt-0">
    <h2 className="group text-[24px] sm:text-[26px] font-bold tracking-tight text-ink leading-tight inline-flex items-center gap-2">
      {Icon && (
        <span className="w-7 h-7 rounded-lg bg-accent-soft text-accent grid place-items-center shrink-0">
          <Icon size={14} strokeWidth={2.2} />
        </span>
      )}
      {title}
      <a
        href={`#${id}`}
        className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-accent transition-opacity"
        aria-label={`Anchor to ${title}`}
      >
        <Hash size={14} strokeWidth={2.4} />
      </a>
    </h2>
    <div className="mt-4">{children}</div>
  </section>
);

const Endpoint: React.FC<{
  id: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  params: { name: string; type: string; required: boolean; description: string }[];
  example: string;
  response: string;
  copied: string | null;
  onCopy: (text: string, id: string) => void;
}> = ({ id, method, path, summary, description, params, example, response, copied, onCopy }) => (
  <section id={id} className="docs-section mt-12">
    <div className="flex flex-wrap items-baseline gap-2 mb-1">
      <span
        className="px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide"
        style={{
          background: 'rgb(var(--accent) / 0.14)',
          color: 'rgb(var(--accent))',
        }}
      >
        {method}
      </span>
      <code className="text-[15px] font-mono font-bold text-ink tracking-tight">
        {path}
      </code>
    </div>
    <h2 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-ink leading-tight">
      {summary}
    </h2>
    <p className="text-[13.5px] text-ink-muted font-medium mt-2 leading-relaxed">
      {description}
    </p>

    {params.length > 0 && (
      <div className="mt-5">
        <div className="label-eyebrow mb-2">Parameters</div>
        <div className="card-flat overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[560px]">
            <thead>
              <tr className="border-b border-line text-ink-muted">
                <th className="text-left font-bold uppercase tracking-wider text-[10.5px] px-3 py-2">Name</th>
                <th className="text-left font-bold uppercase tracking-wider text-[10.5px] px-3 py-2">Type</th>
                <th className="text-left font-bold uppercase tracking-wider text-[10.5px] px-3 py-2">Required</th>
                <th className="text-left font-bold uppercase tracking-wider text-[10.5px] px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <tr key={p.name} className="border-b border-line/40 last:border-0">
                  <td className="px-3 py-2 font-mono text-ink font-bold">{p.name}</td>
                  <td className="px-3 py-2 font-mono text-ink-muted">{p.type}</td>
                  <td className="px-3 py-2">
                    {p.required ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">required</span>
                    ) : (
                      <span className="text-ink-dim">optional</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink-muted font-medium leading-snug">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
      <div>
        <div className="label-eyebrow mb-2">Example request</div>
        <CodeBlock id={`${id}-req`} copied={copied === `${id}-req`} onCopy={onCopy} lang="bash" code={example} />
      </div>
      <div>
        <div className="label-eyebrow mb-2">Example response</div>
        <CodeBlock id={`${id}-res`} copied={copied === `${id}-res`} onCopy={onCopy} lang="json" code={response} />
      </div>
    </div>
  </section>
);

const CodeBlock: React.FC<{
  id: string;
  code: string;
  lang?: string;
  copied: boolean;
  onCopy: (text: string, id: string) => void;
}> = ({ id, code, lang, copied, onCopy }) => (
  <div className="relative rounded-2xl overflow-hidden bg-ink/95 dark:bg-black/40 border border-line">
    {lang && (
      <div className="px-3.5 pt-2 pb-1 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
        <span>{lang}</span>
        <button
          type="button"
          onClick={() => onCopy(code, id)}
          className="inline-flex items-center gap-1 text-ink-dim hover:text-ink transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check size={11} strokeWidth={2.6} /> : <Copy size={11} strokeWidth={2.4} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    )}
    <pre className="px-3.5 pb-3.5 pt-1 overflow-x-auto text-[12.5px] font-mono leading-[1.6] text-zinc-100">
      <code>{code}</code>
    </pre>
  </div>
);

const Callout: React.FC<{
  tone: 'info' | 'warn' | 'success';
  Icon?: React.ComponentType<any>;
  children: React.ReactNode;
}> = ({ tone, Icon, children }) => {
  const toneStyles = {
    info: {
      bg: 'rgb(var(--accent) / 0.08)',
      border: 'rgb(var(--accent) / 0.35)',
      color: 'rgb(var(--accent))',
    },
    warn: {
      bg: 'rgb(245 158 11 / 0.10)',
      border: 'rgb(245 158 11 / 0.35)',
      color: 'rgb(217 119 6)',
    },
    success: {
      bg: 'rgb(16 185 129 / 0.10)',
      border: 'rgb(16 185 129 / 0.35)',
      color: 'rgb(5 150 105)',
    },
  }[tone];
  return (
    <div
      className="rounded-2xl px-4 py-3 my-4 flex items-start gap-3 text-[13px] font-medium text-ink"
      style={{ background: toneStyles.bg, boxShadow: `inset 0 0 0 1px ${toneStyles.border}` }}
    >
      {Icon && (
        <span style={{ color: toneStyles.color }} className="mt-0.5 shrink-0">
          <Icon size={15} strokeWidth={2.4} />
        </span>
      )}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
};

const Table: React.FC<{ headers: string[]; rows: (string | React.ReactNode)[][] }> = ({
  headers,
  rows,
}) => (
  <div className="card-flat overflow-x-auto my-4">
    <table className="w-full text-[12.5px] min-w-[480px]">
      <thead>
        <tr className="border-b border-line text-ink-muted">
          {headers.map((h) => (
            <th
              key={h}
              className="text-left font-bold uppercase tracking-wider text-[10.5px] px-3 py-2"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-line/40 last:border-0">
            {row.map((cell, j) => (
              <td
                key={j}
                className={`px-3 py-2 ${j === 0 ? 'font-mono text-ink font-bold' : 'text-ink-muted font-medium'}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Code: React.FC<{ inline?: boolean; children: React.ReactNode }> = ({ inline, children }) =>
  inline ? (
    <code className="px-1.5 py-0.5 rounded-md bg-subtle text-[12.5px] font-mono text-ink font-bold">
      {children}
    </code>
  ) : (
    <code>{children}</code>
  );

export default DocsPage;
