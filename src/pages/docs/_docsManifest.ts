/* ─────────────────────────────────────────────────────────────────────────
   Docs manifest — single source of truth for the /docs/* tree.

   Left rail (in DocsPage) reads `DOCS_NAV` to render category groups.
   Right rail reads the active page's `headings` to build the
   per-page TOC.

   Each page's own React module exports a matching `pageMeta` object that
   gets aggregated here. Keeping the metadata in this file (instead of
   re-exported from every page) avoids forcing the route loader to import
   every page module on mount.

   When you add a new docs page:
     1. Create `src/pages/docs/<Slug>.tsx` exporting a default React
        component AND a `pageMeta` const.
     2. Add a `{ slug, label }` entry under the right section here.
     3. Add a `<Route>` in App.tsx pointing at the new component.
   ───────────────────────────────────────────────────────────────────────── */

export interface DocsHeading {
  id: string;
  label: string;
  /* Level 2 = top-section heading; 3 = sub-section. The right-rail TOC
     indents level 3 to read as a nested item. */
  level: 2 | 3;
}

export interface DocsPageMeta {
  slug: string;
  title: string;
  description: string;
  summary?: string;
  headings: DocsHeading[];
}

export interface DocsNavItem {
  slug: string;
  label: string;
}
export interface DocsNavSection {
  title: string;
  items: DocsNavItem[];
}

export const DOCS_NAV: DocsNavSection[] = [
  {
    title: 'Getting started',
    items: [
      { slug: 'overview', label: 'Overview' },
      { slug: 'quickstart', label: 'Quickstart' },
      { slug: 'authentication', label: 'Authentication' },
      { slug: 'rate-limits', label: 'Rate limits' },
      { slug: 'errors', label: 'Errors' },
      { slug: 'versioning', label: 'Versioning' },
    ],
  },
  {
    title: 'Core endpoints',
    items: [
      { slug: 'endpoints/prices', label: 'GET /v1/prices' },
      { slug: 'endpoints/listings', label: 'GET /v1/listings' },
      { slug: 'endpoints/listing', label: 'GET /v1/listings/:id' },
      { slug: 'endpoints/search', label: 'GET /v1/search' },
      { slug: 'endpoints/render', label: 'GET /v1/render' },
      { slug: 'endpoints/trends', label: 'GET /v1/trends' },
      { slug: 'endpoints/floor', label: 'GET /v1/floor' },
    ],
  },
  {
    title: 'Inventory & user',
    items: [
      { slug: 'endpoints/inventory', label: 'GET /v1/inventory/:steamId' },
      { slug: 'endpoints/shops', label: 'GET /v1/shops/:url' },
      { slug: 'endpoints/shop-listings', label: 'GET /v1/shops/:url/listings' },
    ],
  },
  {
    title: 'Webhooks',
    items: [
      { slug: 'webhooks/overview', label: 'Overview' },
      { slug: 'webhooks/events', label: 'Event types' },
      { slug: 'webhooks/signatures', label: 'Verifying signatures' },
    ],
  },
  {
    title: 'SDKs & guides',
    items: [
      { slug: 'sdks', label: 'Official SDKs' },
      { slug: 'guides/price-ticker', label: 'Build a price ticker' },
      { slug: 'guides/price-alerts', label: 'Build a price-drop alert' },
      { slug: 'api-changelog', label: 'API changelog' },
      { slug: 'support', label: 'Support' },
    ],
  },
];

/* Per-page metadata. We co-locate the meta here (rather than importing
   each page) because (a) it powers the right rail without forcing the
   loader to evaluate every page module, and (b) it makes the layout
   independent of the page that happens to be mounted. */
export const DOCS_PAGES: Record<string, DocsPageMeta> = {
  overview: {
    slug: 'overview',
    title: 'Overview',
    description: 'What the Skinify API is, what you can build with it, and how to start.',
    summary:
      'Read-only REST API for the Skinify CS2 marketplace. Prices, listings, search, renders, inventory and webhooks. JSON only, versioned, rate-limited.',
    headings: [
      { id: 'what-it-is', label: 'What it is', level: 2 },
      { id: 'what-you-can-build', label: 'What you can build', level: 2 },
      { id: 'design-principles', label: 'Design principles', level: 2 },
      { id: 'base-url', label: 'Base URL', level: 2 },
    ],
  },
  quickstart: {
    slug: 'quickstart',
    title: 'Quickstart',
    description: 'Fetch your first price aggregate in under a minute. No SDK required.',
    summary: 'Send one HTTP request, get JSON back. Optional API key for higher rate limits.',
    headings: [
      { id: 'first-request', label: 'Your first request', level: 2 },
      { id: 'with-a-key', label: 'With an API key', level: 2 },
      { id: 'response-shape', label: 'Response shape', level: 2 },
      { id: 'next-steps', label: 'Next steps', level: 2 },
    ],
  },
  authentication: {
    slug: 'authentication',
    title: 'Authentication',
    description: 'Two auth modes — anonymous (rate-limited) or API key for higher quotas.',
    summary: 'Send the key in the X-Skinify-Key request header. Keys are secret — never embed them in client bundles.',
    headings: [
      { id: 'modes', label: 'Auth modes', level: 2 },
      { id: 'sending-the-key', label: 'Sending the key', level: 2 },
      { id: 'rotating-keys', label: 'Rotating keys', level: 2 },
      { id: 'security', label: 'Security notes', level: 2 },
    ],
  },
  'rate-limits': {
    slug: 'rate-limits',
    title: 'Rate limits',
    description: 'How many requests you can make per minute and how to pace yourself.',
    summary: '60 rpm anonymous, 600 rpm free key, 6,000 rpm pro key. Every response carries quota headers.',
    headings: [
      { id: 'limits-by-tier', label: 'Limits by tier', level: 2 },
      { id: 'response-headers', label: 'Response headers', level: 2 },
      { id: 'when-you-hit-the-cap', label: 'When you hit the cap', level: 2 },
    ],
  },
  errors: {
    slug: 'errors',
    title: 'Errors',
    description: 'Stable JSON envelope, predictable HTTP status codes, request_id for support escalations.',
    summary: 'Always check status code; body has a code, message and request_id.',
    headings: [
      { id: 'error-envelope', label: 'Error envelope', level: 2 },
      { id: 'status-codes', label: 'Status codes', level: 2 },
      { id: 'retry-strategy', label: 'Retry strategy', level: 2 },
    ],
  },
  versioning: {
    slug: 'versioning',
    title: 'Versioning',
    description: 'How we ship breaking and additive changes without breaking your integration.',
    summary: 'Breaking changes ship under a new version prefix and run in parallel ≥12 months. Additive changes ship inside v1.',
    headings: [
      { id: 'how-versions-work', label: 'How versions work', level: 2 },
      { id: 'what-counts-as-breaking', label: 'What counts as breaking', level: 2 },
      { id: 'deprecation-flow', label: 'Deprecation flow', level: 2 },
    ],
  },

  'endpoints/prices': {
    slug: 'endpoints/prices',
    title: 'GET /v1/prices',
    description: 'Floor, median, and max across all active listings for one market_hash_name.',
    summary: 'Single-skin price aggregate. The fastest endpoint to surface a "current value" for a CS2 skin.',
    headings: [
      { id: 'endpoint', label: 'Endpoint', level: 2 },
      { id: 'parameters', label: 'Parameters', level: 2 },
      { id: 'examples', label: 'Examples', level: 2 },
      { id: 'response', label: 'Response', level: 2 },
    ],
  },
  'endpoints/listings': {
    slug: 'endpoints/listings',
    title: 'GET /v1/listings',
    description: 'Filterable index of active listings. Sort by price, recency, or float.',
    summary: 'Search the live marketplace. Supports type/rarity/price filters, four sort modes, cursor pagination.',
    headings: [
      { id: 'endpoint', label: 'Endpoint', level: 2 },
      { id: 'parameters', label: 'Parameters', level: 2 },
      { id: 'examples', label: 'Examples', level: 2 },
      { id: 'response', label: 'Response', level: 2 },
      { id: 'pagination', label: 'Pagination', level: 2 },
    ],
  },
  'endpoints/listing': {
    slug: 'endpoints/listing',
    title: 'GET /v1/listings/:id',
    description: 'Full detail for one listing including stickers, paint seed, inspect link.',
    summary: 'Detail view used by the marketplace item page; safe to call from your own product page.',
    headings: [
      { id: 'endpoint', label: 'Endpoint', level: 2 },
      { id: 'parameters', label: 'Parameters', level: 2 },
      { id: 'examples', label: 'Examples', level: 2 },
      { id: 'response', label: 'Response', level: 2 },
    ],
  },
  'endpoints/search': {
    slug: 'endpoints/search',
    title: 'GET /v1/search',
    description: 'Fuzzy search across active listings. Typo-tolerant, alias-aware.',
    summary: 'Free-text search with alias support (AK → AK-47) and tolerance for misspellings.',
    headings: [
      { id: 'endpoint', label: 'Endpoint', level: 2 },
      { id: 'parameters', label: 'Parameters', level: 2 },
      { id: 'examples', label: 'Examples', level: 2 },
      { id: 'response', label: 'Response', level: 2 },
    ],
  },
  'endpoints/render': {
    slug: 'endpoints/render',
    title: 'GET /v1/render',
    description: '302 redirect to a per-listing render image (CSFloat-powered).',
    summary: 'Drop directly into an <img> tag. Returns a long-lived CDN URL via redirect.',
    headings: [
      { id: 'endpoint', label: 'Endpoint', level: 2 },
      { id: 'parameters', label: 'Parameters', level: 2 },
      { id: 'examples', label: 'Examples', level: 2 },
      { id: 'response', label: 'Response', level: 2 },
    ],
  },
  'endpoints/trends': {
    slug: 'endpoints/trends',
    title: 'GET /v1/trends',
    description: 'Daily price aggregates over the last N days. Great for sparklines.',
    summary: 'Time-series floor / median / volume. 7, 30, 90, 180, 365 day windows.',
    headings: [
      { id: 'endpoint', label: 'Endpoint', level: 2 },
      { id: 'parameters', label: 'Parameters', level: 2 },
      { id: 'examples', label: 'Examples', level: 2 },
      { id: 'response', label: 'Response', level: 2 },
    ],
  },
  'endpoints/floor': {
    slug: 'endpoints/floor',
    title: 'GET /v1/floor',
    description: 'Floor price for up to 100 skins in one round-trip.',
    summary: 'Bulk pricing — designed for inventory-valuation tools.',
    headings: [
      { id: 'endpoint', label: 'Endpoint', level: 2 },
      { id: 'parameters', label: 'Parameters', level: 2 },
      { id: 'examples', label: 'Examples', level: 2 },
      { id: 'response', label: 'Response', level: 2 },
    ],
  },
  'endpoints/inventory': {
    slug: 'endpoints/inventory',
    title: 'GET /v1/inventory/:steamId',
    description: 'Cached Steam inventory snapshot with Skinify-suggested prices.',
    summary: '30-minute cache by default. Force a fresh read with ?fresh=1 (5x rate-limit cost).',
    headings: [
      { id: 'endpoint', label: 'Endpoint', level: 2 },
      { id: 'parameters', label: 'Parameters', level: 2 },
      { id: 'examples', label: 'Examples', level: 2 },
      { id: 'response', label: 'Response', level: 2 },
    ],
  },
  'endpoints/shops': {
    slug: 'endpoints/shops',
    title: 'GET /v1/shops/:url',
    description: 'Public storefront metadata: display name, rating, trade count.',
    summary: 'Read-only shop profile. Use the shop slug from a Skinify URL.',
    headings: [
      { id: 'endpoint', label: 'Endpoint', level: 2 },
      { id: 'parameters', label: 'Parameters', level: 2 },
      { id: 'examples', label: 'Examples', level: 2 },
      { id: 'response', label: 'Response', level: 2 },
    ],
  },
  'endpoints/shop-listings': {
    slug: 'endpoints/shop-listings',
    title: 'GET /v1/shops/:url/listings',
    description: 'All public listings inside one seller\'s shop.',
    summary: 'Same pagination + sort options as /v1/listings, scoped to a single shop.',
    headings: [
      { id: 'endpoint', label: 'Endpoint', level: 2 },
      { id: 'parameters', label: 'Parameters', level: 2 },
      { id: 'examples', label: 'Examples', level: 2 },
      { id: 'response', label: 'Response', level: 2 },
    ],
  },

  'webhooks/overview': {
    slug: 'webhooks/overview',
    title: 'Webhooks · overview',
    description: 'Real-time events delivered to your endpoint via signed HTTPS POST.',
    summary: 'At-least-once delivery, idempotent on event.id, automatic retries, 8s timeout per delivery.',
    headings: [
      { id: 'how-it-works', label: 'How it works', level: 2 },
      { id: 'configuring', label: 'Configuring a receiver', level: 2 },
      { id: 'delivery', label: 'Delivery guarantees', level: 2 },
    ],
  },
  'webhooks/events': {
    slug: 'webhooks/events',
    title: 'Webhook event types',
    description: 'Every event you can subscribe to, with a sample payload.',
    summary: 'listing.* and price.alert events drive most integrations.',
    headings: [
      { id: 'event-list', label: 'Event list', level: 2 },
      { id: 'sample-payload', label: 'Sample payload', level: 2 },
    ],
  },
  'webhooks/signatures': {
    slug: 'webhooks/signatures',
    title: 'Verifying webhook signatures',
    description: 'HMAC-SHA256 with timestamp guards. Reject anything older than 5 minutes.',
    summary: 'Validate the X-Skinify-Signature header before trusting the body. Library examples in five languages.',
    headings: [
      { id: 'signature-format', label: 'Signature format', level: 2 },
      { id: 'verification', label: 'Verification examples', level: 2 },
      { id: 'replay-protection', label: 'Replay protection', level: 2 },
    ],
  },

  sdks: {
    slug: 'sdks',
    title: 'Official SDKs',
    description: 'Thin clients in TypeScript, Python, Go, PHP, and Rust.',
    summary: 'All SDKs MIT-licensed with full type definitions.',
    headings: [
      { id: 'available', label: 'Available SDKs', level: 2 },
      { id: 'install', label: 'Install', level: 2 },
      { id: 'first-call', label: 'First call', level: 2 },
    ],
  },
  'guides/price-ticker': {
    slug: 'guides/price-ticker',
    title: 'Guide · build a price ticker',
    description: 'A 20-line widget that polls /v1/prices and renders a sparkline.',
    summary: 'Combines /v1/prices (current) with /v1/trends (sparkline data).',
    headings: [
      { id: 'goal', label: 'Goal', level: 2 },
      { id: 'data-shape', label: 'Data shape', level: 2 },
      { id: 'implementation', label: 'Implementation', level: 2 },
    ],
  },
  'guides/price-alerts': {
    slug: 'guides/price-alerts',
    title: 'Guide · price-drop alert',
    description: 'Bridge price.alert webhooks to Discord, Slack or email.',
    summary: 'Skinify owns the threshold check; you just route the resulting webhook.',
    headings: [
      { id: 'goal', label: 'Goal', level: 2 },
      { id: 'webhook-handler', label: 'Webhook handler', level: 2 },
      { id: 'production-tips', label: 'Production tips', level: 2 },
    ],
  },
  'api-changelog': {
    slug: 'api-changelog',
    title: 'API changelog',
    description: 'Dated history of every API-level change.',
    summary: 'For product-level changes, see the main /changelog. This page is API-only.',
    headings: [
      { id: 'recent', label: 'Recent changes', level: 2 },
      { id: 'deprecations', label: 'Deprecations', level: 2 },
    ],
  },
  support: {
    slug: 'support',
    title: 'Support',
    description: 'How to reach the developer team when you need help.',
    summary: 'Email developers@skinify.gg or join #developers on Discord.',
    headings: [
      { id: 'channels', label: 'Channels', level: 2 },
      { id: 'sla', label: 'Response times', level: 2 },
    ],
  },
};

/* Flat, ordered list of slugs — used for prev/next navigation between
   adjacent docs pages without crossing nav-section boundaries. */
export const DOCS_PAGE_ORDER: string[] = DOCS_NAV.flatMap((s) =>
  s.items.map((i) => i.slug),
);

export function getDocsPageBySlug(slug: string): DocsPageMeta | undefined {
  return DOCS_PAGES[slug];
}

export function getAdjacentDocsPages(slug: string): {
  prev?: { slug: string; label: string };
  next?: { slug: string; label: string };
} {
  const i = DOCS_PAGE_ORDER.indexOf(slug);
  if (i === -1) return {};
  const flatItems = DOCS_NAV.flatMap((s) => s.items);
  return {
    prev: i > 0 ? flatItems[i - 1] : undefined,
    next: i < flatItems.length - 1 ? flatItems[i + 1] : undefined,
  };
}

export const SKINIFY_API_BASE =
  'https://xorxvaubgxhmusbvbzfd.supabase.co/functions/v1/public-api';
