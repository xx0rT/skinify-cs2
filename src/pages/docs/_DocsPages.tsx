import React from 'react';
import { Link } from 'react-router-dom';
import {
  Book,
  FileCode,
  Globe,
  Hash,
  Key,
  Layers,
  Lock,
  Palette,
  Share2,
  Sparkles,
  Terminal,
  Webhook,
  Zap,
} from 'lucide-react';
import {
  Callout,
  CodeBlock,
  CodeTabs,
  DocsHeader,
  DocsPager,
  DocsTable,
  EndpointHeader,
  InlineCode,
  ParamsTable,
  Section,
  type EndpointParam,
  type LangSample,
} from './_DocsParts';
import { SKINIFY_API_BASE as BASE } from './_docsManifest';

/* All docs sub-pages. Each one default-exports nothing; instead we
   re-export a named React component per page so a single import in
   App.tsx wires up every route.

   The shared building blocks (`Section`, `CodeTabs`, etc.) come from
   `_DocsParts`; the per-page metadata lives in `_docsManifest`.
   ───────────────────────────────────────────────────────────────────── */

/* Multi-language samples reused across endpoint pages — define here so
   every endpoint page can lean on a curl/JS/Python/Go/PHP set without
   re-defining the same callsite four times. */
function pricesSamples(name: string): LangSample[] {
  const encoded = encodeURIComponent(name);
  return [
    {
      lang: 'bash',
      label: 'curl',
      code: `curl '${BASE}/v1/prices?market_hash_name=${encoded}'`,
    },
    {
      lang: 'ts',
      label: 'TypeScript',
      code: `const res = await fetch(
  '${BASE}/v1/prices?market_hash_name=${encoded}',
);
const { data } = await res.json();
console.log(data.floor, data.median, data.max);`,
    },
    {
      lang: 'python',
      label: 'Python',
      code: `import requests

r = requests.get(
    '${BASE}/v1/prices',
    params={'market_hash_name': '${name}'},
)
data = r.json()['data']
print(data['floor'], data['median'], data['max'])`,
    },
    {
      lang: 'go',
      label: 'Go',
      code: `package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
)

func main() {
    u, _ := url.Parse("${BASE}/v1/prices")
    q := u.Query()
    q.Set("market_hash_name", "${name}")
    u.RawQuery = q.Encode()

    res, _ := http.Get(u.String())
    defer res.Body.Close()
    var body map[string]map[string]any
    json.NewDecoder(res.Body).Decode(&body)
    fmt.Println(body["data"]["floor"])
}`,
    },
    {
      lang: 'php',
      label: 'PHP',
      code: `<?php
$ch = curl_init(
    '${BASE}/v1/prices?market_hash_name=${encoded}'
);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$body = json_decode(curl_exec($ch), true);
curl_close($ch);

echo $body['data']['floor'];`,
    },
  ];
}

/* ═══════════════════════════════════════════════════════════════════════
   Getting-started pages
   ═══════════════════════════════════════════════════════════════════════ */

export const OverviewDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="API Reference"
      title="Skinify API — Overview"
      description="Read-only JSON-over-HTTPS interface for the Skinify CS2 marketplace. Prices, listings, search, renders, inventory and webhooks."
    />

    <Section id="what-it-is" title="What it is" Icon={Book}>
      <p>
        The Skinify API is a small, versioned REST surface that any client
        — browser, server, native app, automation script — can call to
        read live marketplace data. Everything is GET-only at the public
        tier; write operations live behind authenticated user sessions
        and are not exposed here yet.
      </p>
    </Section>

    <Section id="what-you-can-build" title="What you can build" Icon={Zap}>
      <ul>
        <li>Price tickers, valuation calculators, inventory dashboards.</li>
        <li>Discord / Telegram price-alert bots backed by webhooks.</li>
        <li>Sticker, float and pattern lookup tools.</li>
        <li>Marketplace comparators and "should I sell now" advisors.</li>
        <li>Embedded Skinify floor-price widgets on community sites.</li>
      </ul>
    </Section>

    <Section id="design-principles" title="Design principles" Icon={Layers}>
      <ul>
        <li>JSON request and response bodies. UTF-8 throughout.</li>
        <li>Prices in CZK by default; pass <InlineCode>currency=EUR/USD/GBP/PLN/HUF</InlineCode> to convert.</li>
        <li>Timestamps are ISO 8601 with a UTC offset.</li>
        <li>Stable <InlineCode>v1</InlineCode>. Breaking changes ship under a new version prefix.</li>
        <li>Predictable error shape — see <Link to="/docs/errors">Errors</Link>.</li>
      </ul>
    </Section>

    <Section id="base-url" title="Base URL" Icon={Globe}>
      <Callout tone="info" Icon={Globe}>
        <strong>Base URL.</strong> <InlineCode>{BASE}</InlineCode>
      </Callout>
      <p>
        All endpoints in these docs are written relative to that base.
        Send standard HTTPS GET requests; there's no auth dance, no
        OAuth, no API gateway in the middle.
      </p>
    </Section>

    <DocsPager slug="overview" />
  </>
);

export const QuickstartDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Getting started"
      title="Quickstart"
      description="Fetch your first price aggregate in under a minute. No SDK or auth required."
    />

    <Section id="first-request" title="Your first request" Icon={Zap}>
      <p>
        The API is anonymous-friendly. Paste the snippet below in your
        language of choice — you'll get back a live price aggregate for
        an AK-47 | Redline in field-tested condition.
      </p>
      <CodeTabs samples={pricesSamples('AK-47 | Redline (Field-Tested)')} />
    </Section>

    <Section id="with-a-key" title="With an API key" Icon={Key}>
      <p>
        For 10× the rate limit, generate a key from your{' '}
        <Link to="/profile?tab=settings&sub=api">account settings</Link>{' '}
        and pass it as the <InlineCode>X-Skinify-Key</InlineCode> header.
        Key creation requires a verified account (one-time deposit of
        $10 or more) — see <Link to="/docs/authentication">Authentication</Link>{' '}
        for the full flow.
      </p>
      <CodeTabs
        samples={[
          {
            lang: 'bash',
            label: 'curl',
            code: `curl '${BASE}/v1/prices?market_hash_name=AK-47%20%7C%20Redline%20(Field-Tested)' \\
  -H 'X-Skinify-Key: sk_live_xxxxxxxxxxxxxxxxxxxxxxxx'`,
          },
          {
            lang: 'ts',
            label: 'TypeScript',
            code: `const res = await fetch(
  '${BASE}/v1/prices?market_hash_name=AK-47%20%7C%20Redline%20(Field-Tested)',
  { headers: { 'X-Skinify-Key': process.env.SKINIFY_KEY! } },
);
const json = await res.json();
console.log(json.data);`,
          },
          {
            lang: 'python',
            label: 'Python',
            code: `import os, requests

r = requests.get(
    '${BASE}/v1/prices',
    params={'market_hash_name': 'AK-47 | Redline (Field-Tested)'},
    headers={'X-Skinify-Key': os.environ['SKINIFY_KEY']},
)
print(r.json()['data'])`,
          },
        ]}
      />
    </Section>

    <Section id="response-shape" title="Response shape" Icon={Hash}>
      <p>
        Every successful response wraps the payload in a <InlineCode>data</InlineCode>{' '}
        object. List endpoints add a <InlineCode>meta</InlineCode>{' '}
        block with pagination state. Errors come back under an{' '}
        <InlineCode>error</InlineCode> key — never alongside data.
      </p>
      <CodeBlock
        lang="json"
        code={`{
  "data": {
    "market_hash_name": "AK-47 | Redline (Field-Tested)",
    "listings_count": 47,
    "floor": 312.5,
    "median": 358.0,
    "max": 612.0,
    "currency": "CZK"
  }
}`}
      />
    </Section>

    <Section id="next-steps" title="Next steps" Icon={Layers}>
      <ul>
        <li><Link to="/docs/authentication">Authentication</Link> — when and how to send a key.</li>
        <li><Link to="/docs/rate-limits">Rate limits</Link> — pace your client to stay inside the cap.</li>
        <li><Link to="/docs/endpoints/listings">GET /v1/listings</Link> — search live listings.</li>
        <li><Link to="/docs/guides/price-ticker">Build a price ticker</Link> — a worked example.</li>
      </ul>
    </Section>

    <DocsPager slug="quickstart" />
  </>
);

export const AuthenticationDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Getting started"
      title="Authentication"
      description="Send the API key in the X-Skinify-Key header. Keys are issued only after a verified deposit."
    />

    <Section id="modes" title="Auth modes" Icon={Lock}>
      <ul>
        <li>
          <strong>Anonymous.</strong> No header. 60 requests per minute
          per IP. Great for prototyping and low-volume community tools.
        </li>
        <li>
          <strong>API key.</strong> Send the key in the{' '}
          <InlineCode>X-Skinify-Key</InlineCode> request header.
          600 requests per minute. Higher tiers available on request.
        </li>
      </ul>
      <Callout tone="warn" Icon={Key}>
        <strong>Key creation requires a verified account.</strong> You
        must complete a one-time deposit of <strong>$10 USD or
        more</strong> (any supported currency, converted) before the{' '}
        <Link to="/profile?tab=settings&sub=api">API tab</Link> unlocks
        key generation. This keeps spam abuse off the public tier.
      </Callout>
    </Section>

    <Section id="sending-the-key" title="Sending the key" Icon={Terminal}>
      <CodeTabs
        samples={[
          {
            lang: 'bash',
            label: 'curl',
            code: `curl '${BASE}/v1/prices?market_hash_name=AK-47%20%7C%20Redline%20(FT)' \\
  -H 'X-Skinify-Key: sk_live_xxxxxxxxxxxxxxxxxxxxxxxx'`,
          },
          {
            lang: 'ts',
            label: 'TypeScript',
            code: `await fetch('${BASE}/v1/prices?...', {
  headers: { 'X-Skinify-Key': process.env.SKINIFY_KEY! },
});`,
          },
          {
            lang: 'python',
            label: 'Python',
            code: `requests.get(
    '${BASE}/v1/prices',
    headers={'X-Skinify-Key': os.environ['SKINIFY_KEY']},
)`,
          },
          {
            lang: 'go',
            label: 'Go',
            code: `req, _ := http.NewRequest("GET", "${BASE}/v1/prices?...", nil)
req.Header.Set("X-Skinify-Key", os.Getenv("SKINIFY_KEY"))
res, _ := http.DefaultClient.Do(req)`,
          },
          {
            lang: 'php',
            label: 'PHP',
            code: `$ch = curl_init('${BASE}/v1/prices?...');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-Skinify-Key: ' . getenv('SKINIFY_KEY'),
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$body = json_decode(curl_exec($ch), true);`,
          },
        ]}
      />
      <p>
        As a fallback, the API also accepts <InlineCode>Authorization: Bearer sk_…</InlineCode>{' '}
        but prefer the dedicated header — it's the canonical form and
        easier to grep for in HTTP logs.
      </p>
    </Section>

    <Section id="rotating-keys" title="Rotating keys" Icon={Hash}>
      <p>
        Create a new key first (account settings → API → New key), update
        your callers, then revoke the old one. Revocation is immediate;
        any in-flight request using the revoked key returns{' '}
        <InlineCode>401 invalid_key</InlineCode>.
      </p>
    </Section>

    <Section id="security" title="Security notes" Icon={Lock}>
      <ul>
        <li>Keys are <strong>secret</strong>. Never commit them or ship in client bundles.</li>
        <li>Browser usage? Proxy through your backend.</li>
        <li>Each key carries a creator user id; abuse → revoke + cooldown on issuance.</li>
        <li>Skinify never asks for your key over chat / email / Discord. Real support requests start from your verified account.</li>
      </ul>
    </Section>

    <DocsPager slug="authentication" />
  </>
);

export const RateLimitsDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Getting started"
      title="Rate limits"
      description="Per-identity caps with burst windows and quota headers on every response."
    />

    <Section id="limits-by-tier" title="Limits by tier" Icon={Zap}>
      <p>
        Limits apply per <em>identity</em>: per IP for anonymous, per key
        for authenticated. Going over the cap returns{' '}
        <InlineCode>429 Too Many Requests</InlineCode>.
      </p>
      <DocsTable
        headers={['Tier', 'Rate limit', 'Burst', 'Concurrency']}
        rows={[
          ['Anonymous', '60 req / min', '20 req / 10s', '4'],
          ['Free key', '600 req / min', '60 req / 10s', '12'],
          ['Pro key', '6,000 req / min', '600 req / 10s', '64'],
          ['Enterprise', 'Custom', 'Custom', 'Custom'],
        ]}
      />
    </Section>

    <Section id="response-headers" title="Response headers" Icon={Hash}>
      <p>Every response carries the current quota state.</p>
      <CodeBlock
        lang="http"
        code={`X-RateLimit-Limit: 600
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1719237600
Retry-After: 12`}
      />
    </Section>

    <Section id="when-you-hit-the-cap" title="When you hit the cap" Icon={Lock}>
      <p>
        Back off using the <InlineCode>Retry-After</InlineCode> hint, then
        retry the original request. If you're hitting the cap regularly,
        upgrade your tier or batch via <Link to="/docs/endpoints/floor">/v1/floor</Link>{' '}
        which collapses up to 100 price lookups into a single round-trip.
      </p>
    </Section>

    <DocsPager slug="rate-limits" />
  </>
);

export const ErrorsDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Getting started"
      title="Errors"
      description="Predictable HTTP statuses, stable JSON envelope, request_id for support escalations."
    />

    <Section id="error-envelope" title="Error envelope" Icon={Hash}>
      <CodeBlock
        lang="json"
        code={`{
  "error": {
    "code": "rate_limited",
    "message": "Rate limit exceeded. Retry in 12 seconds.",
    "request_id": "req_01HZ3K3V7CQX4PJ4M6PYJ4F7TQ"
  }
}`}
      />
      <p>
        Quote the <InlineCode>request_id</InlineCode> when reaching out
        to <a href="mailto:developers@skinify.gg">developers@skinify.gg</a>{' '}
        — it lets us pull the exact trace.
      </p>
    </Section>

    <Section id="status-codes" title="Status codes" Icon={Layers}>
      <DocsTable
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

    <Section id="retry-strategy" title="Retry strategy" Icon={Zap}>
      <ul>
        <li><strong>4xx</strong> — fix the request. Don't retry.</li>
        <li><strong>429</strong> — wait the <InlineCode>Retry-After</InlineCode> value, then retry once.</li>
        <li><strong>5xx</strong> — exponential backoff: 1s → 2s → 4s → 8s, cap at 30s, max 6 attempts.</li>
        <li>Network failures (no response, ECONNRESET) — same exponential backoff.</li>
      </ul>
    </Section>

    <DocsPager slug="errors" />
  </>
);

export const VersioningDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Getting started"
      title="Versioning"
      description="Breaking changes ship under a new version prefix. Additive changes ship inside v1."
    />

    <Section id="how-versions-work" title="How versions work" Icon={Layers}>
      <ul>
        <li>The current API is <InlineCode>v1</InlineCode>.</li>
        <li>Backwards-incompatible changes ship under a new prefix (<InlineCode>v2</InlineCode>, etc.) and run in parallel for at least 12 months.</li>
        <li>Additive changes (new optional fields, new endpoints) ship inside v1 at any time — make sure your client ignores unknown keys.</li>
      </ul>
    </Section>

    <Section id="what-counts-as-breaking" title="What counts as breaking" Icon={Hash}>
      <ul>
        <li>Renaming or removing a JSON field.</li>
        <li>Changing the type of a field (string → number, etc.).</li>
        <li>Tightening required-parameter rules.</li>
        <li>Changing default sort order or default pagination size.</li>
      </ul>
      <p>
        Things that <em>aren't</em> breaking: adding new fields, adding
        new endpoints, adding new optional parameters, adding new error
        codes.
      </p>
    </Section>

    <Section id="deprecation-flow" title="Deprecation flow" Icon={Zap}>
      <ol className="list-decimal pl-6 space-y-1.5 my-3 text-[14px] text-ink-muted">
        <li>Deprecation announced in <Link to="/docs/api-changelog">API changelog</Link>.</li>
        <li><InlineCode>Sunset</InlineCode> response header appears on affected endpoints with the cutoff date.</li>
        <li>12-month parallel run minimum.</li>
        <li>Removed only after at least one full year and a 30-day "last call" reminder via the changelog.</li>
      </ol>
    </Section>

    <DocsPager slug="versioning" />
  </>
);

/* ═══════════════════════════════════════════════════════════════════════
   Endpoint pages
   ═══════════════════════════════════════════════════════════════════════ */

const endpointParams: Record<string, EndpointParam[]> = {
  prices: [
    { name: 'market_hash_name', type: 'string', required: true, description: 'Steam market hash name, exactly as Steam returns it. Case-sensitive.' },
    { name: 'currency', type: 'string', required: false, description: 'CZK (default), EUR, USD, GBP, PLN, HUF.' },
  ],
  listings: [
    { name: 'market_hash_name', type: 'string', required: false, description: 'Filter to one specific skin.' },
    { name: 'type', type: 'string', required: false, description: 'Rifle, Pistol, Knife, Gloves, SMG, Sniper, Container.' },
    { name: 'rarity', type: 'string', required: false, description: 'Consumer, Industrial, Mil-Spec, Restricted, Classified, Covert, Extraordinary.' },
    { name: 'min_price', type: 'number', required: false, description: 'Minimum price in the requested currency.' },
    { name: 'max_price', type: 'number', required: false, description: 'Maximum price in the requested currency.' },
    { name: 'sort', type: 'string', required: false, description: 'price_asc, price_desc, newest (default), float_asc.' },
    { name: 'limit', type: 'number', required: false, description: '1–100. Default 25.' },
    { name: 'cursor', type: 'string', required: false, description: 'Pagination cursor returned in meta.next.' },
  ],
  listing: [
    { name: 'id', type: 'string (path)', required: true, description: 'Listing id from /v1/listings.' },
  ],
  search: [
    { name: 'q', type: 'string', required: true, description: 'Free-text query. 2-character minimum.' },
    { name: 'limit', type: 'number', required: false, description: '1–25. Default 10.' },
  ],
  render: [
    { name: 'inspect', type: 'string', required: true, description: 'URL-encoded Steam inspect link.' },
  ],
  trends: [
    { name: 'market_hash_name', type: 'string', required: true, description: 'Same case-sensitive Steam name as elsewhere.' },
    { name: 'days', type: 'number', required: false, description: '7, 30 (default), 90, 180, 365.' },
  ],
  floor: [
    { name: 'names', type: 'string[]', required: true, description: 'Comma-separated, URL-encoded list. Max 100 per request.' },
    { name: 'currency', type: 'string', required: false, description: 'CZK / EUR / USD / GBP / PLN / HUF.' },
  ],
  inventory: [
    { name: 'steamId', type: 'string (path)', required: true, description: 'Steam 64-bit id.' },
    { name: 'fresh', type: 'boolean', required: false, description: 'Bypass cache. Default false.' },
  ],
  shops: [
    { name: 'url', type: 'string (path)', required: true, description: 'Shop slug (e.g. bluephase).' },
  ],
  'shop-listings': [
    { name: 'url', type: 'string (path)', required: true, description: 'Shop slug.' },
    { name: 'limit', type: 'number', required: false, description: '1–100. Default 25.' },
    { name: 'cursor', type: 'string', required: false, description: 'Pagination cursor.' },
  ],
};

export const PricesEndpointDoc: React.FC = () => (
  <>
    <EndpointHeader
      method="GET"
      path="/v1/prices"
      summary="Price aggregate for a skin"
      description="Floor, median and max across all active listings for one market_hash_name. The fastest endpoint to integrate when you want to surface a 'current value' for a skin."
    />
    <Section id="endpoint" title="Endpoint" Icon={Globe}>
      <CodeBlock lang="http" code={`GET ${BASE}/v1/prices`} />
    </Section>
    <Section id="parameters" title="Parameters" Icon={Hash}>
      <ParamsTable params={endpointParams.prices} />
    </Section>
    <Section id="examples" title="Examples" Icon={Terminal}>
      <CodeTabs samples={pricesSamples('AK-47 | Redline (Field-Tested)')} />
    </Section>
    <Section id="response" title="Response" Icon={Hash}>
      <CodeBlock
        lang="json"
        code={`{
  "data": {
    "market_hash_name": "AK-47 | Redline (Field-Tested)",
    "listings_count": 47,
    "floor": 312.5,
    "median": 358.0,
    "max": 612.0,
    "currency": "CZK"
  }
}`}
      />
    </Section>
    <DocsPager slug="endpoints/prices" />
  </>
);

export const ListingsEndpointDoc: React.FC = () => (
  <>
    <EndpointHeader
      method="GET"
      path="/v1/listings"
      summary="Search active listings"
      description="Read-only listings index. Filter by name, type, rarity and price range. Each row carries a deep-link URL back to skinify.gg."
    />
    <Section id="endpoint" title="Endpoint" Icon={Globe}>
      <CodeBlock lang="http" code={`GET ${BASE}/v1/listings`} />
    </Section>
    <Section id="parameters" title="Parameters" Icon={Hash}>
      <ParamsTable params={endpointParams.listings} />
    </Section>
    <Section id="examples" title="Examples" Icon={Terminal}>
      <CodeTabs
        samples={[
          { lang: 'bash', label: 'curl', code: `curl '${BASE}/v1/listings?type=Rifle&rarity=Covert&sort=price_asc&limit=5'` },
          {
            lang: 'ts',
            label: 'TypeScript',
            code: `const params = new URLSearchParams({
  type: 'Rifle', rarity: 'Covert', sort: 'price_asc', limit: '5',
});
const { data, meta } = await fetch(
  \`${BASE}/v1/listings?\${params}\`,
).then(r => r.json());`,
          },
          {
            lang: 'python',
            label: 'Python',
            code: `r = requests.get('${BASE}/v1/listings', params={
    'type': 'Rifle', 'rarity': 'Covert', 'sort': 'price_asc', 'limit': 5,
})
listings = r.json()['data']`,
          },
        ]}
      />
    </Section>
    <Section id="response" title="Response" Icon={Hash}>
      <CodeBlock
        lang="json"
        code={`{
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
      />
    </Section>
    <Section id="pagination" title="Pagination" Icon={Layers}>
      <p>
        We use opaque cursor pagination. When <InlineCode>meta.next</InlineCode>{' '}
        is present, pass it back as the <InlineCode>cursor</InlineCode>{' '}
        parameter for the next page. When it's <InlineCode>null</InlineCode>,
        you've reached the end of the result set.
      </p>
      <CodeBlock
        lang="ts"
        code={`async function* paginate() {
  let cursor: string | undefined;
  while (true) {
    const url = new URL('${BASE}/v1/listings');
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    const { data, meta } = await fetch(url).then(r => r.json());
    yield* data;
    if (!meta.next) return;
    cursor = meta.next;
  }
}`}
      />
    </Section>
    <DocsPager slug="endpoints/listings" />
  </>
);

export const ListingEndpointDoc: React.FC = () => (
  <>
    <EndpointHeader
      method="GET"
      path="/v1/listings/{id}"
      summary="Fetch a single listing"
      description="Full detail for one listing including sticker breakdown, paint seed, pattern index, and a per-listing inspect link."
    />
    <Section id="endpoint" title="Endpoint" Icon={Globe}>
      <CodeBlock lang="http" code={`GET ${BASE}/v1/listings/{id}`} />
    </Section>
    <Section id="parameters" title="Parameters" Icon={Hash}>
      <ParamsTable params={endpointParams.listing} />
    </Section>
    <Section id="examples" title="Examples" Icon={Terminal}>
      <CodeTabs
        samples={[
          { lang: 'bash', label: 'curl', code: `curl '${BASE}/v1/listings/1234'` },
          { lang: 'ts', label: 'TypeScript', code: `const { data } = await fetch('${BASE}/v1/listings/1234').then(r => r.json());` },
          { lang: 'python', label: 'Python', code: `data = requests.get('${BASE}/v1/listings/1234').json()['data']` },
        ]}
      />
    </Section>
    <Section id="response" title="Response" Icon={Hash}>
      <CodeBlock
        lang="json"
        code={`{
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
      />
    </Section>
    <DocsPager slug="endpoints/listing" />
  </>
);

export const SearchEndpointDoc: React.FC = () => (
  <>
    <EndpointHeader
      method="GET"
      path="/v1/search"
      summary="Fuzzy search by skin name"
      description="Free-text search across active listings. Tolerates typos, weapon-name aliases (AK / AK-47) and partial matches."
    />
    <Section id="endpoint" title="Endpoint" Icon={Globe}>
      <CodeBlock lang="http" code={`GET ${BASE}/v1/search`} />
    </Section>
    <Section id="parameters" title="Parameters" Icon={Hash}>
      <ParamsTable params={endpointParams.search} />
    </Section>
    <Section id="examples" title="Examples" Icon={Terminal}>
      <CodeTabs
        samples={[
          { lang: 'bash', label: 'curl', code: `curl '${BASE}/v1/search?q=karambit+doppler'` },
          { lang: 'ts', label: 'TypeScript', code: `const { data } = await fetch('${BASE}/v1/search?q=karambit+doppler').then(r => r.json());` },
          { lang: 'python', label: 'Python', code: `data = requests.get('${BASE}/v1/search', params={'q': 'karambit doppler'}).json()['data']` },
        ]}
      />
    </Section>
    <Section id="response" title="Response" Icon={Hash}>
      <CodeBlock
        lang="json"
        code={`{
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
      />
    </Section>
    <DocsPager slug="endpoints/search" />
  </>
);

export const RenderEndpointDoc: React.FC = () => (
  <>
    <EndpointHeader
      method="GET"
      path="/v1/render"
      summary="CSFloat-rendered preview image"
      description="Returns a 302 redirect to a per-listing render image showing the real float / seed pattern of the skin. Drop directly into an <img> tag."
    />
    <Section id="endpoint" title="Endpoint" Icon={Globe}>
      <CodeBlock lang="http" code={`GET ${BASE}/v1/render`} />
    </Section>
    <Section id="parameters" title="Parameters" Icon={Hash}>
      <ParamsTable params={endpointParams.render} />
    </Section>
    <Section id="examples" title="Examples" Icon={Terminal}>
      <CodeTabs
        samples={[
          { lang: 'bash', label: 'curl', code: `curl -L '${BASE}/v1/render?inspect=steam%3A%2F%2Frungame%2F730%2F...'` },
          { lang: 'html', label: 'HTML', code: `<img src="${BASE}/v1/render?inspect=steam%3A%2F%2Frungame%2F730%2F..." alt="" />` },
        ]}
      />
    </Section>
    <Section id="response" title="Response" Icon={Hash}>
      <CodeBlock lang="http" code={`302 Location: https://render.csgofloat.com/preview/abc123.png`} />
    </Section>
    <DocsPager slug="endpoints/render" />
  </>
);

export const TrendsEndpointDoc: React.FC = () => (
  <>
    <EndpointHeader
      method="GET"
      path="/v1/trends"
      summary="Time-series price trend"
      description="Daily price aggregates over the last N days. Useful for sparklines, market dashboards, or 'is this skin going up or down' indicators."
    />
    <Section id="endpoint" title="Endpoint" Icon={Globe}>
      <CodeBlock lang="http" code={`GET ${BASE}/v1/trends`} />
    </Section>
    <Section id="parameters" title="Parameters" Icon={Hash}>
      <ParamsTable params={endpointParams.trends} />
    </Section>
    <Section id="examples" title="Examples" Icon={Terminal}>
      <CodeTabs
        samples={[
          { lang: 'bash', label: 'curl', code: `curl '${BASE}/v1/trends?market_hash_name=AK-47%20%7C%20Redline%20(FT)&days=30'` },
          {
            lang: 'ts',
            label: 'TypeScript',
            code: `const { data } = await fetch(
  \`${BASE}/v1/trends?market_hash_name=\${encodeURIComponent(name)}&days=30\`,
).then(r => r.json());`,
          },
        ]}
      />
    </Section>
    <Section id="response" title="Response" Icon={Hash}>
      <CodeBlock
        lang="json"
        code={`{
  "data": [
    { "day": "2026-05-25", "floor": 305.0, "median": 348.0, "volume": 12 },
    { "day": "2026-05-26", "floor": 308.5, "median": 352.0, "volume": 9 }
  ]
}`}
      />
    </Section>
    <DocsPager slug="endpoints/trends" />
  </>
);

export const FloorEndpointDoc: React.FC = () => (
  <>
    <EndpointHeader
      method="GET"
      path="/v1/floor"
      summary="Bulk floor prices"
      description="Floor price for up to 100 skins in one round-trip. Designed for inventory-valuation tools."
    />
    <Section id="endpoint" title="Endpoint" Icon={Globe}>
      <CodeBlock lang="http" code={`GET ${BASE}/v1/floor`} />
    </Section>
    <Section id="parameters" title="Parameters" Icon={Hash}>
      <ParamsTable params={endpointParams.floor} />
    </Section>
    <Section id="examples" title="Examples" Icon={Terminal}>
      <CodeTabs
        samples={[
          { lang: 'bash', label: 'curl', code: `curl '${BASE}/v1/floor?names=AK-47%20%7C%20Redline%20(FT),AWP%20%7C%20Asiimov%20(FT)'` },
          {
            lang: 'python',
            label: 'Python',
            code: `names = ['AK-47 | Redline (Field-Tested)', 'AWP | Asiimov (Field-Tested)']
r = requests.get('${BASE}/v1/floor', params={'names': ','.join(names)})
floors = r.json()['data']`,
          },
        ]}
      />
    </Section>
    <Section id="response" title="Response" Icon={Hash}>
      <CodeBlock
        lang="json"
        code={`{
  "data": {
    "AK-47 | Redline (Field-Tested)": { "floor": 312.5, "currency": "CZK" },
    "AWP | Asiimov (Field-Tested)":   { "floor": 1850.0, "currency": "CZK" }
  }
}`}
      />
    </Section>
    <DocsPager slug="endpoints/floor" />
  </>
);

export const InventoryEndpointDoc: React.FC = () => (
  <>
    <EndpointHeader
      method="GET"
      path="/v1/inventory/{steamId}"
      summary="Public Steam inventory"
      description="Cached snapshot of a Steam user's CS2 inventory with Skinify-priced suggestions for each item. Cache TTL is 30 minutes."
    />
    <Section id="endpoint" title="Endpoint" Icon={Globe}>
      <CodeBlock lang="http" code={`GET ${BASE}/v1/inventory/{steamId}`} />
    </Section>
    <Section id="parameters" title="Parameters" Icon={Hash}>
      <ParamsTable params={endpointParams.inventory} />
    </Section>
    <Section id="examples" title="Examples" Icon={Terminal}>
      <CodeTabs
        samples={[
          { lang: 'bash', label: 'curl', code: `curl '${BASE}/v1/inventory/76561198021723640'` },
          { lang: 'ts', label: 'TypeScript', code: `const inv = await fetch('${BASE}/v1/inventory/' + steamId).then(r => r.json());` },
        ]}
      />
      <Callout tone="warn">
        Force-refresh with <InlineCode>?fresh=1</InlineCode> — costs 5× the
        normal rate-limit budget. Use sparingly.
      </Callout>
    </Section>
    <Section id="response" title="Response" Icon={Hash}>
      <CodeBlock
        lang="json"
        code={`{
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
      />
    </Section>
    <DocsPager slug="endpoints/inventory" />
  </>
);

export const ShopsEndpointDoc: React.FC = () => (
  <>
    <EndpointHeader
      method="GET"
      path="/v1/shops/{url}"
      summary="Public seller-shop metadata"
      description="Storefront info for a Skinify seller shop — display name, rating, total trades, and a link out to the shop on skinify.gg."
    />
    <Section id="endpoint" title="Endpoint" Icon={Globe}>
      <CodeBlock lang="http" code={`GET ${BASE}/v1/shops/{url}`} />
    </Section>
    <Section id="parameters" title="Parameters" Icon={Hash}>
      <ParamsTable params={endpointParams.shops} />
    </Section>
    <Section id="examples" title="Examples" Icon={Terminal}>
      <CodeBlock lang="bash" code={`curl '${BASE}/v1/shops/bluephase'`} />
    </Section>
    <Section id="response" title="Response" Icon={Hash}>
      <CodeBlock
        lang="json"
        code={`{
  "data": {
    "url": "bluephase",
    "display_name": "BluePhase",
    "trades_count": 1428,
    "rating": 4.94,
    "joined_at": "2025-08-12T09:00:00+00:00",
    "shop_url": "https://skinify.gg/shop/bluephase"
  }
}`}
      />
    </Section>
    <DocsPager slug="endpoints/shops" />
  </>
);

export const ShopListingsEndpointDoc: React.FC = () => (
  <>
    <EndpointHeader
      method="GET"
      path="/v1/shops/{url}/listings"
      summary="Listings inside a shop"
      description="All public listings inside one seller's shop. Same pagination + sort options as /v1/listings."
    />
    <Section id="endpoint" title="Endpoint" Icon={Globe}>
      <CodeBlock lang="http" code={`GET ${BASE}/v1/shops/{url}/listings`} />
    </Section>
    <Section id="parameters" title="Parameters" Icon={Hash}>
      <ParamsTable params={endpointParams['shop-listings']} />
    </Section>
    <Section id="examples" title="Examples" Icon={Terminal}>
      <CodeBlock lang="bash" code={`curl '${BASE}/v1/shops/bluephase/listings?limit=10'`} />
    </Section>
    <Section id="response" title="Response" Icon={Hash}>
      <CodeBlock
        lang="json"
        code={`{
  "data": [
    { "id": "1234", "market_hash_name": "AK-47 | Redline (FT)", "price": 312.5 }
  ],
  "meta": { "count": 10, "next": "eyJpZCI6IjEyMzQifQ" }
}`}
      />
    </Section>
    <DocsPager slug="endpoints/shop-listings" />
  </>
);

/* ═══════════════════════════════════════════════════════════════════════
   Webhooks
   ═══════════════════════════════════════════════════════════════════════ */

export const WebhooksOverviewDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Webhooks"
      title="Overview"
      description="Real-time events delivered to your endpoint via signed HTTPS POST."
    />
    <Section id="how-it-works" title="How it works" Icon={Webhook}>
      <p>
        Configure a receiver URL from{' '}
        <Link to="/profile?tab=settings&sub=api">Settings → API → Webhooks</Link>{' '}
        and pick which event types you want. When something happens that
        matches, Skinify POSTs a JSON envelope to your URL.
      </p>
    </Section>
    <Section id="configuring" title="Configuring a receiver" Icon={Terminal}>
      <ul>
        <li>Endpoint must be HTTPS.</li>
        <li>Endpoint must respond with a 2xx within 8 seconds.</li>
        <li>Pick one or more event types from the <Link to="/docs/webhooks/events">event list</Link>.</li>
        <li>Copy the generated <InlineCode>whsec_…</InlineCode> secret and store it server-side.</li>
      </ul>
    </Section>
    <Section id="delivery" title="Delivery guarantees" Icon={Lock}>
      <ul>
        <li>Delivery is at-least-once — make your handler idempotent on <InlineCode>event.id</InlineCode>.</li>
        <li>Retries on non-2xx: 30s, 2m, 10m, 1h, 6h, 24h, then dead-lettered.</li>
        <li>You can inspect recent deliveries (and replay them) in Settings → API → Webhooks.</li>
      </ul>
    </Section>
    <DocsPager slug="webhooks/overview" />
  </>
);

export const WebhooksEventsDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Webhooks"
      title="Webhook event types"
      description="Every event you can subscribe to, plus a sample payload."
    />
    <Section id="event-list" title="Event list" Icon={Hash}>
      <DocsTable
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
    </Section>
    <Section id="sample-payload" title="Sample payload" Icon={Terminal}>
      <CodeBlock
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
    <DocsPager slug="webhooks/events" />
  </>
);

export const WebhooksSignaturesDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Webhooks"
      title="Verifying signatures"
      description="HMAC-SHA256 over `timestamp.body` using your webhook secret. Reject anything older than 5 minutes."
    />
    <Section id="signature-format" title="Signature format" Icon={Lock}>
      <p>
        Every delivery carries <InlineCode>X-Skinify-Signature: t=&lt;ts&gt;,v1=&lt;hmac&gt;</InlineCode>{' '}
        where <InlineCode>hmac</InlineCode> is HMAC-SHA256 over{' '}
        <InlineCode>{`{timestamp}.{raw_body}`}</InlineCode> using your
        webhook secret.
      </p>
    </Section>
    <Section id="verification" title="Verification examples" Icon={Terminal}>
      <CodeTabs
        samples={[
          {
            lang: 'js',
            label: 'Node.js',
            code: `import crypto from 'node:crypto';

export function verify(rawBody, header, secret) {
  const [tPart, sigPart] = header.split(',');
  const t = tPart.split('=')[1];
  const sig = sigPart.split('=')[1];
  const expected = crypto
    .createHmac('sha256', secret)
    .update(\`\${t}.\${rawBody}\`)
    .digest('hex');
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(sig),
  );
}`,
          },
          {
            lang: 'python',
            label: 'Python',
            code: `import hmac, hashlib, time

def verify(raw_body: bytes, header: str, secret: str) -> bool:
    t_part, sig_part = header.split(',')
    t = int(t_part.split('=')[1])
    sig = sig_part.split('=')[1]
    if abs(time.time() - t) > 300:
        return False
    expected = hmac.new(
        secret.encode(), f'{t}.'.encode() + raw_body, hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, sig)`,
          },
          {
            lang: 'go',
            label: 'Go',
            code: `func Verify(rawBody []byte, header, secret string) bool {
    parts := strings.Split(header, ",")
    t := strings.SplitN(parts[0], "=", 2)[1]
    sig := strings.SplitN(parts[1], "=", 2)[1]

    ts, _ := strconv.ParseInt(t, 10, 64)
    if math.Abs(float64(time.Now().Unix()-ts)) > 300 {
        return false
    }
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(t + "."))
    mac.Write(rawBody)
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(sig))
}`,
          },
          {
            lang: 'php',
            label: 'PHP',
            code: `function verify(string $rawBody, string $header, string $secret): bool {
    [$tPart, $sigPart] = explode(',', $header);
    $t = (int) explode('=', $tPart)[1];
    $sig = explode('=', $sigPart)[1];
    if (abs(time() - $t) > 300) return false;
    $expected = hash_hmac('sha256', $t . '.' . $rawBody, $secret);
    return hash_equals($expected, $sig);
}`,
          },
        ]}
      />
    </Section>
    <Section id="replay-protection" title="Replay protection" Icon={Lock}>
      <p>
        Always reject events whose timestamp is more than 5 minutes off
        from your server's clock. Combined with the HMAC, this makes
        replay attacks impractical even if a signature leaks.
      </p>
    </Section>
    <DocsPager slug="webhooks/signatures" />
  </>
);

/* ═══════════════════════════════════════════════════════════════════════
   Shop CSS styling
   ─ Folded in from the legacy DeveloperDocsPage so the entire developer
   surface lives under one /docs tree. Lets sellers learn to restyle
   their shop without leaving the API reference.
   ═══════════════════════════════════════════════════════════════════════ */

export const ShopOverviewDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Shop styling"
      title="CSS customization"
      description="Restyle your seller shop with custom CSS. Colors, fonts, layouts, animations — all scoped to your shop only."
    />
    <Section id="what-it-is" title="What it is" Icon={Palette}>
      <p>
        Every Skinify seller shop ships with a default theme that matches
        the marketplace. Custom CSS lets you replace any of those styles
        with your own — backgrounds, typography, item-card chrome,
        animations, even responsive breakpoints. Your snippet is injected
        as a scoped style tag so it only affects <strong>your</strong>{' '}
        shop page and nothing else on Skinify.
      </p>
      <ul>
        <li>Standard CSS syntax — flexbox, grid, custom properties, media queries, keyframe animations all work.</li>
        <li>You can override any default rule on the page.</li>
        <li>Your CSS is sandboxed to <InlineCode>.shop-page</InlineCode> and its descendants.</li>
        <li>No JavaScript injection — styling only, by design.</li>
      </ul>
    </Section>

    <Section id="quick-start" title="Quick start" Icon={Zap}>
      <ol className="list-decimal pl-6 space-y-1.5 my-3 text-[14px] text-ink-muted">
        <li>Open <Link to="/profile?tab=shop">Profile → My Shop</Link>.</li>
        <li>Click <strong>Advanced Settings</strong> (or <strong>Visual Editor</strong> for the GUI).</li>
        <li>Find the <strong>Custom CSS</strong> textbox.</li>
        <li>Paste a snippet (try one of the <Link to="/docs/shop/examples">example themes</Link>).</li>
        <li>Click <strong>Save Changes</strong> and visit your shop URL to verify.</li>
      </ol>
    </Section>

    <Section id="first-snippet" title="First snippet" Icon={FileCode}>
      <p>A 12-line example that changes the background, retints the item cards, and bumps the item-name typography.</p>
      <CodeBlock
        lang="css"
        filename="custom.css"
        code={`/* Background gradient on the shop frame */
.shop-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Item card chrome */
.item-card {
  border: 2px solid #a78bfa;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(167, 139, 250, 0.3);
}

/* Item name typography */
.item-name {
  color: #ffffff;
  font-weight: 700;
  font-size: 18px;
}`}
      />
    </Section>

    <Section id="limits" title="Limits & sandboxing" Icon={Lock}>
      <ul>
        <li><strong>Scope.</strong> Your CSS is wrapped in an attribute selector so it can't escape <InlineCode>.shop-page</InlineCode>. Selectors that target <InlineCode>body</InlineCode>, <InlineCode>html</InlineCode>, or other shops are silently dropped.</li>
        <li><strong>Imports.</strong> <InlineCode>@import url(...)</InlineCode> is blocked. Inline your fonts via <InlineCode>@font-face</InlineCode> from <InlineCode>fonts.gstatic.com</InlineCode> only.</li>
        <li><strong>Size.</strong> 32 KB hard cap per shop.</li>
        <li><strong>No JS.</strong> <InlineCode>&lt;script&gt;</InlineCode>, <InlineCode>javascript:</InlineCode> URLs, and <InlineCode>expression()</InlineCode> are stripped at save time.</li>
      </ul>
      <Callout tone="warn" Icon={Lock}>
        Custom CSS that breaks the page (e.g. <InlineCode>* {`{display:none}`}</InlineCode>)
        is your problem to fix. We never auto-revert — preview before saving.
      </Callout>
    </Section>

    <DocsPager slug="shop/overview" />
  </>
);

export const ShopStructureDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Shop styling"
      title="Shop page structure"
      description="The class names and DOM nesting your selectors hook into."
    />
    <Section id="tree" title="DOM tree" Icon={FileCode}>
      <p>
        Every shop renders the same skeleton. Items inside{' '}
        <InlineCode>.shop-items-grid</InlineCode> repeat once per
        listing.
      </p>
      <CodeBlock
        lang="html"
        code={`<div class="shop-page">
  <div class="shop-header">
    <div class="shop-banner">…</div>
    <div class="shop-info">
      <h1 class="shop-name">…</h1>
      <p class="shop-description">…</p>
    </div>
  </div>

  <div class="shop-stats">
    <div class="stat-item">
      <span class="stat-value">…</span>
      <span class="stat-label">…</span>
    </div>
    <!-- repeats -->
  </div>

  <div class="shop-items-grid">
    <div class="item-card">
      <img class="item-image" />
      <h3 class="item-name">…</h3>
      <div class="item-details">
        <span class="item-price">…</span>
        <span class="item-condition">…</span>
      </div>
    </div>
    <!-- repeats -->
  </div>
</div>`}
      />
    </Section>

    <Section id="header" title="Header section" Icon={Layers}>
      <p>
        <InlineCode>.shop-header</InlineCode> wraps the cover banner and
        the seller's display name + description. Use grid or flexbox here
        for a top-of-page hero.
      </p>
    </Section>

    <Section id="grid" title="Items grid" Icon={Layers}>
      <p>
        <InlineCode>.shop-items-grid</InlineCode> is the listings
        container. Default layout is CSS Grid with
        <InlineCode>auto-fill, minmax(220px, 1fr)</InlineCode>. Override
        the <InlineCode>grid-template-columns</InlineCode> on this
        element to change density.
      </p>
    </Section>

    <Section id="item-card" title="Item card" Icon={Sparkles}>
      <p>
        Each listing renders as one <InlineCode>.item-card</InlineCode>
        with image + name + details. The image lives at the top, the
        text block at the bottom — restyle either independently.
      </p>
    </Section>

    <DocsPager slug="shop/structure" />
  </>
);

export const ShopVariablesDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Shop styling"
      title="CSS variables"
      description="Override the default theme variables for one-line, system-wide colour and spacing changes."
    />
    <Section id="available" title="Available variables" Icon={Hash}>
      <p>
        The default shop styles read from a set of CSS custom
        properties. Override any of them in a <InlineCode>:root</InlineCode>{' '}
        (or, scoped tighter, <InlineCode>.shop-page</InlineCode>) block
        to retheme the whole shop without writing per-element rules.
      </p>
      <CodeBlock
        lang="css"
        filename="defaults.css"
        code={`:root {
  /* Primary brand */
  --primary-color: #a78bfa;
  --primary-dark:  #7c3aed;
  --primary-light: #c4b5fd;

  /* Backgrounds */
  --bg-primary:   #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary:  #374151;

  /* Text */
  --text-primary:   #ffffff;
  --text-secondary: #d1d5db;
  --text-muted:     #9ca3af;

  /* Status accents */
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-error:   #ef4444;

  /* Spacing scale */
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Border radius scale */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}`}
      />
    </Section>

    <Section id="overriding" title="Overriding values" Icon={FileCode}>
      <p>One-line retheme: override just the brand color and the page background.</p>
      <CodeBlock
        lang="css"
        code={`.shop-page {
  --primary-color: #f59e0b;
  --bg-primary:    #0a0a0a;
  --bg-secondary:  #1a1a1a;
}`}
      />
    </Section>

    <Section id="tips" title="Tips" Icon={Sparkles}>
      <ul>
        <li>Override on <InlineCode>.shop-page</InlineCode> rather than <InlineCode>:root</InlineCode> — that's still inside the scoped style tag so nothing else on Skinify can be affected.</li>
        <li>Combine variable overrides with media queries to ship light/dark variants without duplicating selectors.</li>
        <li>The default values shift when Skinify ships a marketplace-wide theme refresh; pin a copy of the variables you depend on inside your own CSS to avoid surprises.</li>
      </ul>
    </Section>

    <DocsPager slug="shop/variables" />
  </>
);

export const ShopSelectorsDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Shop styling"
      title="Selectors reference"
      description="Every class you can target, what it wraps, and where it sits in the tree."
    />

    <Section id="layout" title="Layout" Icon={Layers}>
      <DocsTable
        headers={['Class', 'What it wraps']}
        rows={[
          ['.shop-page', 'Outermost container for the whole shop.'],
          ['.shop-header', 'Banner + seller info row at the top.'],
          ['.shop-stats', 'Strip of stat tiles below the header.'],
          ['.shop-items-grid', 'Grid container for every listing.'],
        ]}
      />
    </Section>

    <Section id="item-card" title="Item card" Icon={Sparkles}>
      <DocsTable
        headers={['Class', 'What it wraps']}
        rows={[
          ['.item-card', 'One listing tile inside the grid.'],
          ['.item-image', 'Listing image element.'],
          ['.item-name', 'Listing name / weapon line.'],
          ['.item-details', 'Footer row inside the card.'],
          ['.item-price', 'Numeric price inside the details row.'],
          ['.item-condition', 'Condition / wear label inside the details row.'],
        ]}
      />
    </Section>

    <Section id="header" title="Header" Icon={Layers}>
      <DocsTable
        headers={['Class', 'What it wraps']}
        rows={[
          ['.shop-banner', 'Top banner image (full bleed).'],
          ['.shop-info', 'Title + description column inside the header.'],
          ['.shop-name', 'H1 with the seller display name.'],
          ['.shop-description', 'Optional bio paragraph.'],
        ]}
      />
    </Section>

    <Section id="stats" title="Stats" Icon={Sparkles}>
      <DocsTable
        headers={['Class', 'What it wraps']}
        rows={[
          ['.stat-item', 'One stat tile (trades, rating, etc.).'],
          ['.stat-value', 'Big numeric value inside the tile.'],
          ['.stat-label', 'Caption underneath the value.'],
        ]}
      />
    </Section>

    <DocsPager slug="shop/selectors" />
  </>
);

export const ShopExamplesDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Shop styling"
      title="Example themes"
      description="Three ready-to-paste themes. Drop one into the Custom CSS textbox, save, done."
    />

    <Section id="dark-neon" title="Dark neon" Icon={Sparkles}>
      <p>Cyberpunk vibes — radial backdrop, cyan/magenta accents, glowing item titles.</p>
      <CodeBlock
        lang="css"
        filename="dark-neon.css"
        code={`/* Dark neon cyberpunk theme */
.shop-page {
  background: #000000;
  background-image:
    radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 77, 109, 0.3), transparent 50%);
}

.item-card {
  background: rgba(20, 20, 40, 0.8);
  border: 1px solid #00ffff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.item-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 0 30px rgba(255, 0, 255, 0.5);
  border-color: #ff00ff;
}

.item-name {
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.item-price {
  color: #ff00ff;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
}`}
      />
    </Section>

    <Section id="minimalist" title="Minimalist clean" Icon={Sparkles}>
      <p>White surface, single accent, restrained shadows — sells calm and trust.</p>
      <CodeBlock
        lang="css"
        filename="minimalist.css"
        code={`/* Clean minimal design */
.shop-page {
  background: #ffffff;
  font-family: 'Inter', sans-serif;
}

.item-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.item-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.item-name {
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.item-price {
  color: #6366f1;
  font-size: 18px;
  font-weight: 700;
}`}
      />
    </Section>

    <Section id="premium-gold" title="Premium gold" Icon={Sparkles}>
      <p>Luxury vibes — charcoal background, gold borders, tracking-wide titles.</p>
      <CodeBlock
        lang="css"
        filename="premium-gold.css"
        code={`/* Luxury gold theme */
.shop-page {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

.item-card {
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  border: 2px solid #d4af37;
  box-shadow: 0 4px 20px rgba(212, 175, 55, 0.2);
}

.item-name {
  color: #d4af37;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.item-price {
  background: linear-gradient(135deg, #ffd700 0%, #d4af37 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 20px;
  font-weight: 800;
}`}
      />
    </Section>

    <DocsPager slug="shop/examples" />
  </>
);

export const ShopPublishingDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Shop styling"
      title="Publishing CSS presets"
      description="Share your shop theme with the community. Submission flow, guidelines, what happens after you submit."
    />

    <Section id="how-to-publish" title="How to publish" Icon={Share2}>
      <ol className="list-decimal pl-6 space-y-1.5 my-3 text-[14px] text-ink-muted">
        <li>Go to <Link to="/css-presets">CSS Presets</Link>.</li>
        <li>Click <strong>Submit Your Preset</strong>.</li>
        <li>Fill in: name, description, category (Dark / Light / Colorful / Themed), CSS body.</li>
        <li>Use the live <strong>Preview</strong> pane to verify the snippet renders correctly.</li>
        <li>Hit <strong>Submit</strong>. Moderation usually takes a few hours.</li>
      </ol>
    </Section>

    <Section id="guidelines" title="Guidelines" Icon={Lock}>
      <ul>
        <li>Test on at least three different shops (1, 10, 100+ listings) before publishing.</li>
        <li>No malicious selectors — anything that hides Skinify's report / contact UI is rejected.</li>
        <li>No off-domain URLs except <InlineCode>fonts.gstatic.com</InlineCode>.</li>
        <li>Use clear comments — other sellers will fork your preset.</li>
        <li>Pick a category that actually matches; mislabelled submissions get bumped to <em>Other</em>.</li>
      </ul>
    </Section>

    <Section id="after-submit" title="After you submit" Icon={Zap}>
      <ul>
        <li>Your preset lands in the public gallery once a moderator approves it.</li>
        <li>You can edit metadata (name, description, category) any time; the CSS body is locked after first install.</li>
        <li>Want to ship an updated version? Submit it as a new preset and link the old one in the description.</li>
        <li>Top presets are featured on <Link to="/css-presets">/css-presets</Link> and inside the shop editor's "Browse community" tab.</li>
      </ul>
    </Section>

    <DocsPager slug="shop/publishing" />
  </>
);

/* ═══════════════════════════════════════════════════════════════════════
   SDKs + Guides + Changelog + Support
   ═══════════════════════════════════════════════════════════════════════ */

export const SdksDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="SDKs & guides"
      title="Official SDKs"
      description="Lightweight thin clients in five languages. MIT-licensed, full type definitions."
    />
    <Section id="available" title="Available SDKs" Icon={Terminal}>
      <DocsTable
        headers={['Language', 'Package', 'Status']}
        rows={[
          ['TypeScript / Node', '@skinify/sdk', 'Stable'],
          ['Python', 'skinify', 'Stable'],
          ['Go', 'github.com/skinify/skinify-go', 'Beta'],
          ['PHP', 'skinify/skinify-php', 'Beta'],
          ['Rust', 'skinify', 'Alpha'],
        ]}
      />
    </Section>
    <Section id="install" title="Install" Icon={Layers}>
      <CodeTabs
        samples={[
          { lang: 'bash', label: 'npm', code: `npm install @skinify/sdk` },
          { lang: 'bash', label: 'pnpm', code: `pnpm add @skinify/sdk` },
          { lang: 'bash', label: 'pip', code: `pip install skinify` },
          { lang: 'bash', label: 'go', code: `go get github.com/skinify/skinify-go` },
          { lang: 'bash', label: 'composer', code: `composer require skinify/skinify-php` },
        ]}
      />
    </Section>
    <Section id="first-call" title="First call" Icon={Zap}>
      <CodeTabs
        samples={[
          {
            lang: 'ts',
            label: 'TypeScript',
            code: `import { Skinify } from '@skinify/sdk';

const s = new Skinify({ apiKey: process.env.SKINIFY_KEY });
const { data } = await s.prices.get({
  marketHashName: 'AK-47 | Redline (Field-Tested)',
});
console.log(data.floor);`,
          },
          {
            lang: 'python',
            label: 'Python',
            code: `from skinify import Skinify

s = Skinify(api_key='sk_live_...')
prices = s.prices.get(market_hash_name='AK-47 | Redline (Field-Tested)')
print(prices.floor)`,
          },
        ]}
      />
    </Section>
    <DocsPager slug="sdks" />
  </>
);

export const PriceTickerGuideDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Guides"
      title="Build a price ticker"
      description="A 20-line widget that polls /v1/prices and renders a sparkline from /v1/trends."
    />
    <Section id="goal" title="Goal" Icon={Zap}>
      <p>
        Render the current floor for a skin plus a 30-day sparkline behind
        it. Updates every 60 seconds. Works as a Discord embed, a website
        widget, or a chrome extension popup.
      </p>
    </Section>
    <Section id="data-shape" title="Data shape" Icon={Hash}>
      <p>
        Two endpoints in parallel: <InlineCode>/v1/prices</InlineCode>{' '}
        gives the current numbers; <InlineCode>/v1/trends?days=30</InlineCode>{' '}
        gives the series for the sparkline.
      </p>
    </Section>
    <Section id="implementation" title="Implementation" Icon={Terminal}>
      <CodeTabs
        samples={[
          {
            lang: 'ts',
            label: 'TypeScript',
            code: `async function ticker(name: string) {
  const enc = encodeURIComponent(name);
  const [now, history] = await Promise.all([
    fetch(\`${BASE}/v1/prices?market_hash_name=\${enc}\`)
      .then(r => r.json()),
    fetch(\`${BASE}/v1/trends?market_hash_name=\${enc}&days=30\`)
      .then(r => r.json()),
  ]);
  return {
    current: now.data.floor,
    series: history.data.map((d: any) => d.floor),
  };
}`,
          },
          {
            lang: 'python',
            label: 'Python',
            code: `import requests
from urllib.parse import quote

def ticker(name: str):
    enc = quote(name)
    base = '${BASE}'
    now = requests.get(f'{base}/v1/prices?market_hash_name={enc}').json()
    hist = requests.get(f'{base}/v1/trends?market_hash_name={enc}&days=30').json()
    return {
        'current': now['data']['floor'],
        'series': [d['floor'] for d in hist['data']],
    }`,
          },
        ]}
      />
    </Section>
    <DocsPager slug="guides/price-ticker" />
  </>
);

export const PriceAlertsGuideDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="Guides"
      title="Price-drop alert"
      description="Bridge Skinify's price.alert webhooks to Discord, Slack or email."
    />
    <Section id="goal" title="Goal" Icon={Zap}>
      <p>
        Skinify owns the threshold check — you subscribe to a skin at a
        price, and we fire a webhook when the floor crosses below it.
        You just route the webhook to wherever your team lives.
      </p>
    </Section>
    <Section id="webhook-handler" title="Webhook handler" Icon={Webhook}>
      <CodeTabs
        samples={[
          {
            lang: 'ts',
            label: 'Express',
            code: `app.post('/skinify-hook', express.raw({ type: '*/*' }), async (req, res) => {
  const sig = req.get('X-Skinify-Signature')!;
  if (!verify(req.body.toString(), sig, process.env.WH_SECRET!)) {
    return res.sendStatus(400);
  }
  const evt = JSON.parse(req.body.toString());
  if (evt.type === 'price.alert') {
    await fetch(process.env.DISCORD_WEBHOOK!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: \`💸 \${evt.data.market_hash_name} now at \${evt.data.price} \${evt.data.currency}\`,
      }),
    });
  }
  res.sendStatus(200);
});`,
          },
          {
            lang: 'python',
            label: 'Flask',
            code: `@app.post('/skinify-hook')
def hook():
    raw = request.get_data()
    sig = request.headers['X-Skinify-Signature']
    if not verify(raw, sig, os.environ['WH_SECRET']):
        return ('', 400)
    evt = request.get_json()
    if evt['type'] == 'price.alert':
        requests.post(os.environ['DISCORD_WEBHOOK'], json={
            'content': f"💸 {evt['data']['market_hash_name']} at {evt['data']['price']} {evt['data']['currency']}",
        })
    return ('', 200)`,
          },
        ]}
      />
    </Section>
    <Section id="production-tips" title="Production tips" Icon={Lock}>
      <ul>
        <li>Reply 200 fast — do the Discord POST after responding (queue it).</li>
        <li>De-dupe on <InlineCode>event.id</InlineCode> — Skinify can retry on a flaky 5xx.</li>
        <li>Log the raw body plus signature on rejection so you can replay during dev.</li>
      </ul>
    </Section>
    <DocsPager slug="guides/price-alerts" />
  </>
);

export const ApiChangelogDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="SDKs & guides"
      title="API changelog"
      description="Every API-level change, dated. For product-level updates see the main /changelog."
    />
    <Section id="recent" title="Recent changes" Icon={Layers}>
      <DocsTable
        headers={['Date', 'Change']}
        rows={[
          ['2026-06-24', 'Docs: Shop CSS customization section added (6 pages — overview, structure, variables, selectors, examples, publishing).'],
          ['2026-06-24', 'Docs: Right-rail "On this page" now renders a stretched indicator line that tracks the active section as the user scrolls.'],
          ['2026-06-24', 'API-key gating: keys can now only be issued to accounts with ≥ $10 lifetime deposits.'],
          ['2026-06-24', 'Docs restructured into multi-page tree (/docs, /docs/authentication, /docs/endpoints/*, …).'],
          ['2026-06-24', 'Code samples in 5 languages added across every endpoint and guide.'],
          ['2026-06-22', 'v1 declared stable. /v1/floor bulk endpoint added.'],
          ['2026-06-10', '/v1/trends added (7 / 30 / 90 / 180 / 365 day windows).'],
          ['2026-05-28', 'Webhook signatures upgraded to HMAC-SHA256 with timestamp guard (5-min replay window).'],
          ['2026-05-15', '/v1/search rolled out — fuzzy matching with weapon-name aliases.'],
          ['2026-04-30', 'Currency conversion parameter added to all price-returning endpoints.'],
          ['2026-04-12', '/v1/inventory cache TTL increased from 5 → 30 minutes; ?fresh=1 introduced.'],
          ['2026-03-28', 'X-RateLimit-* response headers added to every endpoint.'],
          ['2026-03-15', 'Error envelope standardised — every error returns {error: {code, message, request_id}}.'],
        ]}
      />
    </Section>
    <Section id="deprecations" title="Deprecations" Icon={Hash}>
      <p>
        Nothing is currently scheduled for removal. When something is,
        affected endpoints will start carrying a{' '}
        <InlineCode>Sunset</InlineCode> response header with the cutoff
        date, and a 12-month parallel-run period kicks in.
      </p>
    </Section>
    <DocsPager slug="api-changelog" />
  </>
);

export const SupportDoc: React.FC = () => (
  <>
    <DocsHeader
      eyebrow="SDKs & guides"
      title="Support"
      description="Get unstuck — we try to reply within one business day."
    />
    <Section id="channels" title="Channels" Icon={Terminal}>
      <ul>
        <li>
          Email{' '}
          <a href="mailto:developers@skinify.gg">developers@skinify.gg</a>{' '}
          for integration help and API-tier requests.
        </li>
        <li>
          Join the{' '}
          <a href="https://discord.gg/skinify" target="_blank" rel="noopener">
            Skinify Discord
          </a>{' '}
          · <strong>#developers</strong> channel for community help.
        </li>
        <li>
          Report bugs at{' '}
          <a href="https://github.com/skinify" target="_blank" rel="noopener">
            github.com/skinify
          </a>
          .
        </li>
      </ul>
    </Section>
    <Section id="sla" title="Response times" Icon={Zap}>
      <ul>
        <li>Anonymous tier — community Discord only.</li>
        <li>Free key — one business day on email.</li>
        <li>Pro key — same business day, dedicated channel.</li>
        <li>Enterprise — custom SLA via contract.</li>
      </ul>
    </Section>
    <DocsPager slug="support" />
  </>
);
