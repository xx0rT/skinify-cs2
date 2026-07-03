import React, { useState } from 'react';
import { useT } from '../lib/useT';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  Copy,
  Key,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import useDocumentMeta, { breadcrumbJsonLd } from '../hooks/useDocumentMeta';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   DevelopersPage — public developer documentation for the Skinify API.

   Goal: anyone deciding whether to integrate Skinify can read this in
   under 5 minutes and understand the auth model, the three endpoints,
   the response shape, and the rate-limit tier. No SDK install needed
   — every example is plain curl + JSON.

   We don't show "Generate an API key" inline; that lives on the
   Profile → Developer tab once a user is signed in. The link here
   is the only mention.
   ───────────────────────────────────────────────────────────────────────── */

const BASE = 'https://xorxvaubgxhmusbvbzfd.supabase.co/functions/v1/public-api';

interface EndpointDoc {
  method: 'GET';
  path: string;
  summary: string;
  description: string;
  params: { name: string; type: string; required: boolean; description: string }[];
  example: string;
  responseExample: string;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/v1/prices',
    summary: 'Price aggregate for a skin',
    description:
      'Returns floor, median, and max for all active listings of a market_hash_name. Use to display a competitive-price hint, build a price history graph, or seed your own pricing engine.',
    params: [
      {
        name: 'market_hash_name',
        type: 'string',
        required: true,
        description:
          'Steam market hash name, exactly as Steam returns it. Case-sensitive. Examples: "AK-47 | Redline (Field-Tested)", "★ Karambit | Doppler (Factory New)"',
      },
    ],
    example: `curl '${BASE}/v1/prices?market_hash_name=AK-47%20%7C%20Redline%20(Field-Tested)'`,
    responseExample: `{
  "data": {
    "market_hash_name": "AK-47 | Redline (Field-Tested)",
    "listings_count": 47,
    "floor": 312.5,
    "median": 358.0,
    "max": 612.0,
    "currency": "CZK"
  }
}`,
  },
  {
    method: 'GET',
    path: '/v1/listings',
    summary: 'Search active listings',
    description:
      'Read-only listings index. Filter by market_hash_name and/or price range. Each listing carries a deep-link URL so you can attribute traffic back to skinify.gg.',
    params: [
      {
        name: 'market_hash_name',
        type: 'string',
        required: false,
        description: 'Filter to listings of one specific skin.',
      },
      {
        name: 'min_price',
        type: 'number',
        required: false,
        description: 'Minimum price in CZK.',
      },
      {
        name: 'max_price',
        type: 'number',
        required: false,
        description: 'Maximum price in CZK.',
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: 'Max results, 1-100. Default 25.',
      },
    ],
    example: `curl '${BASE}/v1/listings?market_hash_name=AK-47%20%7C%20Redline%20(Field-Tested)&limit=5'`,
    responseExample: `{
  "data": [
    {
      "id": "1234",
      "market_hash_name": "AK-47 | Redline (Field-Tested)",
      "item_name": "AK-47 | Redline (Field-Tested)",
      "item_type": "Rifle",
      "condition": "Field-Tested",
      "rarity": "Classified",
      "price": 312.5,
      "currency": "CZK",
      "image_url": "https://community.cloudflare.steamstatic.com/.../...png",
      "float": "0.21034",
      "listing_type": "standard",
      "listed_at": "2026-06-22T10:14:00+00:00",
      "seller_name": "BluePhase",
      "url": "https://skinify.gg/item/1234"
    }
  ],
  "meta": { "count": 1, "limit": 5 }
}`,
  },
  {
    method: 'GET',
    path: '/v1/render',
    summary: 'CSFloat-rendered preview image',
    description:
      'Returns a 302 redirect to a per-listing render image showing the real float/seed pattern of the skin. Use directly as an <img src=…> in your own UI; the redirect target is a long-lived CDN URL with browser caching.',
    params: [
      {
        name: 'inspect',
        type: 'string',
        required: true,
        description:
          'URL-encoded Steam inspect link (steam://rungame/730/.../+csgo_econ_action_preview%20S<sid>A<aid>D<dcode>).',
      },
    ],
    example: `curl -L '${BASE}/v1/render?inspect=steam%3A%2F%2Frungame%2F730%2F76561198021723640%2F%2Bcsgo_econ_action_preview%2520S76561198021723640A12345D67890'`,
    responseExample: '302 Location: https://render.csgofloat.com/preview/abc123.png',
  },
];

const DevelopersPage: React.FC = () => {
  const tr = useT();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  useDocumentMeta({
    title: 'Skinify Developer API — Docs · Free CS2 Marketplace Data',
    description:
      'Public REST API for Skinify. Query CS2 skin prices, listings, and per-item renders. Free up to 60 req/min anonymous, 600 req/min with API key.',
    canonical: 'https://skinify.gg/developers',
    keywords:
      'skinify api, cs2 marketplace api, cs2 skin prices api, csgo api, csfloat api, skin price feed, cs2 listing api',
    jsonLd: breadcrumbJsonLd([
      { name: 'Home', url: 'https://skinify.gg/' },
      { name: 'Developers', url: 'https://skinify.gg/developers' },
    ]),
  });

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* user denied / unsupported — fall through silently */
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[920px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-16">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted hover:text-ink transition-colors mb-5"
        >
          <ArrowLeft size={14} strokeWidth={2.4} />
          Home
        </button>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-7 sm:p-10 relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(closest-side, rgb(var(--accent) / 0.16), transparent 70%)',
            }}
          />
          <div className="relative">
            <span className="label-eyebrow inline-flex items-center gap-1.5">
              <Code2 size={11} strokeWidth={2.4} /> Developer API
            </span>
            <h1 className="text-[28px] sm:text-[40px] font-bold text-ink tracking-tight leading-[1.05] mt-3">
              {tr('developers.hero.title', 'Build with Skinify')}
            </h1>
            <p className="text-[14px] sm:text-[16px] text-ink-muted font-medium mt-4 leading-relaxed max-w-[640px]">
              Public REST API for CS2 skin prices, listings, and per-item
              renders. Free to use up to 60 requests per minute. Generate
              a key to unlock 600 rpm and higher quotas.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/docs')}
                className="h-12 px-5 rounded-full bg-accent text-on-accent text-[13.5px] font-bold inline-flex items-center gap-2"
                style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.6)' }}
              >
                <Code2 size={14} strokeWidth={2.4} />
                Read the full docs
                <ArrowRight size={13} strokeWidth={2.6} />
              </motion.button>
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/profile?tab=settings&sub=api')}
                className="h-12 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13.5px] font-bold inline-flex items-center gap-2 transition-colors"
              >
                <Key size={14} strokeWidth={2.4} />
                Generate API key
              </motion.button>
              <a
                href={`${BASE}`}
                target="_blank"
                rel="noopener"
                className="h-12 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13.5px] font-bold inline-flex items-center gap-2 transition-colors"
              >
                <Terminal size={14} strokeWidth={2.4} />
                Try a live call
              </a>
            </div>
          </div>
        </motion.section>

        {/* Quick facts */}
        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          <FactTile Icon={Zap} title="REST + JSON" body="Plain HTTP. No SDK. Hit it with fetch / curl / anything." />
          <FactTile Icon={Sparkles} title="Free tier" body="60 req/min anonymous, no signup needed." />
          <FactTile Icon={Key} title="Higher quota" body="600 req/min with an API key. Generate from Profile → Developer." />
        </div>

        {/* Base URL */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={spring}
          className="card p-6 sm:p-8 mt-5"
        >
          <span className="label-eyebrow">Base URL</span>
          <h2 className="text-[18px] font-bold tracking-tight text-ink leading-tight mt-1.5">
            Where to send requests
          </h2>
          <p className="text-[13.5px] text-ink-muted font-medium mt-3 leading-relaxed">
            All endpoints share one base URL. Append the endpoint path
            and query string. Responses are always JSON, except{' '}
            <code className="font-mono text-ink">/v1/render</code> which 302-redirects
            to an image CDN.
          </p>
          <CodeBlock
            id="base-url"
            value={BASE}
            copied={copied === 'base-url'}
            onCopy={() => copyToClipboard(BASE, 'base-url')}
          />
        </motion.section>

        {/* Auth */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={spring}
          className="card p-6 sm:p-8 mt-5"
        >
          <span className="label-eyebrow">Authentication</span>
          <h2 className="text-[18px] font-bold tracking-tight text-ink leading-tight mt-1.5">
            Anonymous or API key
          </h2>
          <p className="text-[13.5px] text-ink-muted font-medium mt-3 leading-relaxed">
            Send your key via the{' '}
            <code className="font-mono text-ink">X-Skinify-Key</code> header.
            No key needed for the free tier — just call directly.
          </p>
          <CodeBlock
            id="auth"
            value={`curl '${BASE}/v1/prices?market_hash_name=AK-47%20%7C%20Redline%20(Field-Tested)' \\
  -H 'X-Skinify-Key: sk_live_xxxxxxxxxxxxxxxxxxxxxxxx'`}
            copied={copied === 'auth'}
            onCopy={() => copyToClipboard(
              `curl '${BASE}/v1/prices?market_hash_name=AK-47%20%7C%20Redline%20(Field-Tested)' \\\n  -H 'X-Skinify-Key: sk_live_xxxxxxxxxxxxxxxxxxxxxxxx'`,
              'auth',
            )}
          />
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="card-flat p-4">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                Anonymous
              </div>
              <div className="text-[20px] font-bold text-ink tracking-tight tabular-nums mt-1">
                60<span className="text-[12px] text-ink-muted font-medium ml-1">req/min</span>
              </div>
              <p className="text-[11.5px] text-ink-muted font-medium mt-1.5">
                Per IP. Use for prototyping, single-page widgets, or low-volume reads.
              </p>
            </div>
            <div className="card-flat p-4">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                Authenticated
              </div>
              <div className="text-[20px] font-bold text-ink tracking-tight tabular-nums mt-1">
                600<span className="text-[12px] text-ink-muted font-medium ml-1">req/min</span>
              </div>
              <p className="text-[11.5px] text-ink-muted font-medium mt-1.5">
                Per key. Headers <code className="font-mono">X-RateLimit-Remaining</code> and{' '}
                <code className="font-mono">X-RateLimit-Reset</code> tell you where you stand.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Endpoints */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={spring}
          className="mt-5"
        >
          <span className="label-eyebrow">Reference</span>
          <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-ink leading-tight mt-1.5">
            Endpoints
          </h2>
          <div className="mt-4 space-y-4">
            {ENDPOINTS.map((e) => (
              <EndpointCard
                key={e.path}
                endpoint={e}
                copied={copied}
                onCopy={(id, value) => copyToClipboard(value, id)}
              />
            ))}
          </div>
        </motion.section>

        {/* Errors */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={spring}
          className="card p-6 sm:p-8 mt-5"
        >
          <span className="label-eyebrow">Errors</span>
          <h2 className="text-[18px] font-bold tracking-tight text-ink leading-tight mt-1.5">
            Standard error shape
          </h2>
          <p className="text-[13.5px] text-ink-muted font-medium mt-3 leading-relaxed">
            Errors return a non-2xx HTTP status and a JSON body with{' '}
            <code className="font-mono text-ink">code</code> and{' '}
            <code className="font-mono text-ink">message</code> fields. Common codes:
          </p>
          <ul className="mt-3 space-y-1.5 text-[12.5px] text-ink-muted font-medium">
            <li><code className="font-mono text-ink">missing_param</code> — required query parameter not provided (400)</li>
            <li><code className="font-mono text-ink">not_found</code> — unknown endpoint or no data for the query (404)</li>
            <li><code className="font-mono text-ink">rate_limited</code> — quota exhausted, retry after the timestamp in <code className="font-mono">X-RateLimit-Reset</code> (429)</li>
            <li><code className="font-mono text-ink">upstream</code> — CSFloat / Steam returned an error we couldn't recover from (502)</li>
            <li><code className="font-mono text-ink">db_error</code> — internal database error, contact support if it persists (500)</li>
          </ul>
        </motion.section>

        {/* CTA — back to key gen */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={spring}
          className="card p-6 sm:p-8 mt-5 text-center"
        >
          <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-ink">
            Ready to build?
          </h2>
          <p className="text-[13.5px] text-ink-muted font-medium mt-2">
            Generate your first API key in 30 seconds.
          </p>
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate('/profile?tab=settings&sub=api')}
            className="mt-5 h-12 px-6 rounded-full bg-accent text-on-accent text-[13.5px] font-bold inline-flex items-center gap-2"
            style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.6)' }}
          >
            <Key size={14} strokeWidth={2.4} />
            Get an API key
            <ArrowRight size={14} strokeWidth={2.4} />
          </motion.button>
        </motion.section>
      </main>

      <Footer slim />
    </div>
  );
};

const FactTile: React.FC<{
  Icon: React.ComponentType<any>;
  title: string;
  body: string;
}> = ({ Icon, title, body }) => (
  <div className="card p-4">
    <div className="icon-chip-sm bg-accent-soft mb-3">
      <Icon size={13} strokeWidth={2.4} className="text-accent" />
    </div>
    <div className="text-[13.5px] font-bold text-ink tracking-tight">{title}</div>
    <p className="text-[11.5px] text-ink-muted font-medium mt-1 leading-relaxed">{body}</p>
  </div>
);

const CodeBlock: React.FC<{
  id: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}> = ({ value, copied, onCopy }) => (
  <div className="relative mt-3 rounded-2xl bg-ink/[0.85] dark:bg-ink/40 text-bg dark:text-ink p-4 font-mono text-[12.5px] leading-relaxed overflow-x-auto">
    <pre className="whitespace-pre-wrap break-all pr-12">{value}</pre>
    <button
      onClick={onCopy}
      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center transition-colors"
      aria-label={copied ? 'Copied' : 'Copy'}
      title={copied ? 'Copied' : 'Copy'}
    >
      {copied ? <Check size={13} strokeWidth={2.6} /> : <Copy size={13} strokeWidth={2.4} />}
    </button>
  </div>
);

const EndpointCard: React.FC<{
  endpoint: EndpointDoc;
  copied: string | null;
  onCopy: (id: string, value: string) => void;
}> = ({ endpoint, copied, onCopy }) => (
  <article className="card p-6 sm:p-7">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        {endpoint.method}
      </span>
      <code className="font-mono text-[14px] font-bold text-ink">{endpoint.path}</code>
    </div>
    <h3 className="text-[16px] font-bold tracking-tight text-ink leading-tight mt-3">
      {endpoint.summary}
    </h3>
    <p className="text-[13px] text-ink-muted font-medium mt-2 leading-relaxed">
      {endpoint.description}
    </p>

    {/* Parameters */}
    <div className="mt-4">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim mb-2">
        Parameters
      </div>
      <ul className="space-y-2">
        {endpoint.params.map((p) => (
          <li key={p.name} className="card-flat p-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <code className="font-mono text-[12.5px] font-bold text-ink">{p.name}</code>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                {p.type}
              </span>
              {p.required ? (
                <span className="px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider rounded bg-rose-500/15 text-rose-700 dark:text-rose-300">
                  Required
                </span>
              ) : (
                <span className="px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider rounded bg-subtle text-ink-muted">
                  Optional
                </span>
              )}
            </div>
            <p className="text-[12px] text-ink-muted font-medium mt-1.5 leading-relaxed">
              {p.description}
            </p>
          </li>
        ))}
      </ul>
    </div>

    {/* Example */}
    <div className="mt-4">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim mb-2">
        Example request
      </div>
      <CodeBlock
        id={`req-${endpoint.path}`}
        value={endpoint.example}
        copied={copied === `req-${endpoint.path}`}
        onCopy={() => onCopy(`req-${endpoint.path}`, endpoint.example)}
      />
    </div>
    <div className="mt-4">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim mb-2">
        Example response
      </div>
      <CodeBlock
        id={`res-${endpoint.path}`}
        value={endpoint.responseExample}
        copied={copied === `res-${endpoint.path}`}
        onCopy={() => onCopy(`res-${endpoint.path}`, endpoint.responseExample)}
      />
    </div>
  </article>
);

export default DevelopersPage;
