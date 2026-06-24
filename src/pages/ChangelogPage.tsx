import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Calendar, Package, Sparkles, Bug, Zap, Shield, Wrench, Plus, Code2, Activity } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  changes: {
    category: 'new' | 'improved' | 'fixed' | 'security' | 'api';
    items: string[];
  }[];
}

/* Dated log of every API-level change. Mirrors the table on
   /docs/api-changelog so visitors who land here from the docs "Status"
   button see the same source of truth, but rendered against the
   product changelog timeline. */
interface ApiChangeEntry {
  date: string;
  /* Type narrows the badge tone: addition = green, breaking = red,
     fix / housekeeping = neutral. */
  kind: 'addition' | 'breaking' | 'improvement' | 'fix' | 'docs';
  title: string;
  detail?: string;
}

const API_CHANGELOG: ApiChangeEntry[] = [
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
      '/docs is now a real documentation site (overview, quickstart, auth, rate-limits, errors, versioning, 10 endpoints, webhooks, SDKs, guides). Left rail navigates between sub-pages, right rail summarises the current page only.',
  },
  {
    date: '2026-06-24',
    kind: 'docs',
    title: 'Code samples in five languages on every endpoint',
    detail:
      'curl, TypeScript, Python, Go, PHP — picked language persists across page navigations.',
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

const API_KIND_STYLES: Record<ApiChangeEntry['kind'], string> = {
  addition: 'text-green-400 bg-green-500/10 border-green-500/20',
  breaking: 'text-red-400 bg-red-500/10 border-red-500/20',
  improvement: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  fix: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  docs: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

const ChangelogPage: React.FC = () => {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const location = useLocation();

  /* If we landed with #status (e.g. from the docs "Status" subnav tab),
     scroll the status panel into view after first paint. */
  useEffect(() => {
    if (location.hash === '#status' || location.hash === '#api-changelog') {
      requestAnimationFrame(() => {
        const id = location.hash.slice(1);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  const changelog: ChangelogEntry[] = [
    {
      version: '1.0.0',
      date: '2024-12-02',
      type: 'major',
      changes: [
        {
          category: 'new',
          items: [
            'Initial release of Skinify marketplace',
            'User authentication with Steam integration',
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
          ]
        },
        {
          category: 'improved',
          items: [
            'Optimized image loading with caching',
            'Enhanced mobile responsiveness',
            'Improved search functionality',
            'Better performance with lazy loading',
          ]
        },
        {
          category: 'security',
          items: [
            'Row Level Security (RLS) policies',
            'KYC verification system',
            'Secure payment processing',
            'Rate limiting on API endpoints',
          ]
        }
      ]
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'new':
        return <Plus className="w-5 h-5" />;
      case 'improved':
        return <Zap className="w-5 h-5" />;
      case 'fixed':
        return <Bug className="w-5 h-5" />;
      case 'security':
        return <Shield className="w-5 h-5" />;
      default:
        return <Wrench className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'new':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'improved':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'fixed':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'security':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getVersionBadgeColor = (type: string) => {
    switch (type) {
      case 'major':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'minor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'patch':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Package className="w-12 h-12 text-purple-400" />
            <h1 className="text-5xl font-bold text-white">Changelog</h1>
          </div>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Track all updates, improvements, and bug fixes in Skinify
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto space-y-8">
          {changelog.map((entry, index) => (
            <motion.div
              key={entry.version}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-purple-400" />
                      <h2 className="text-3xl font-bold text-white">v{entry.version}</h2>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getVersionBadgeColor(entry.type)}`}>
                      {entry.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {entry.changes.map((change, changeIndex) => (
                  <div key={changeIndex} className="space-y-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-sm ${getCategoryColor(change.category)}`}>
                      {getCategoryIcon(change.category)}
                      <span>{getCategoryLabel(change.category)}</span>
                    </div>
                    <ul className="space-y-2 ml-4">
                      {change.items.map((item, itemIndex) => (
                        <motion.li
                          key={itemIndex}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 + changeIndex * 0.05 + itemIndex * 0.02 }}
                          className="flex items-start gap-3 text-gray-300"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ─── Status panel ─────────────────────────────────────────
            Anchored at #status so the docs "Status" subnav tab lands
            here. Lightweight read on system health — we expand this
            into a real uptime feed once we ship the status pipeline.
            ────────────────────────────────────────────────────────── */}
        <motion.section
          id="status"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-5xl mx-auto mt-12 scroll-mt-24"
        >
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-7 h-7 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">System status</h2>
            <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              All systems operational
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Marketplace', state: 'operational' },
              { label: 'Public API', state: 'operational' },
              { label: 'Steam trade pipeline', state: 'operational' },
              { label: 'Webhooks', state: 'operational' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-700/50 bg-gray-800/40 px-4 py-3"
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  {s.label}
                </div>
                <div className="mt-1 text-sm font-bold text-green-400 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  {s.state}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ─── API changelog ──────────────────────────────────────────
            Mirror of /docs/api-changelog. We log every API-level change
            here too so the docs "Changelog" button (which goes to this
            page) shows them prominently.
            ────────────────────────────────────────────────────────── */}
        <motion.section
          id="api-changelog"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="max-w-5xl mx-auto mt-12 scroll-mt-24"
        >
          <div className="flex items-center gap-3 mb-4">
            <Code2 className="w-7 h-7 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">API changelog</h2>
            <a
              href="/docs/api-changelog"
              className="ml-auto text-[12px] font-bold text-purple-400 hover:text-purple-300 transition-colors"
            >
              View on docs →
            </a>
          </div>
          <div className="rounded-xl border border-purple-500/20 bg-gray-800/40 overflow-hidden">
            <ul className="divide-y divide-gray-700/40">
              {API_CHANGELOG.map((c, i) => (
                <motion.li
                  key={`${c.date}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.02 }}
                  className="flex items-start gap-3 p-4"
                >
                  <span
                    className={`mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${API_KIND_STYLES[c.kind]}`}
                  >
                    {c.kind}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-gray-500 tabular-nums">
                        {c.date}
                      </span>
                      <span className="text-[14px] font-bold text-white">{c.title}</span>
                    </div>
                    {c.detail && (
                      <p className="text-[12.5px] text-gray-400 font-medium mt-1 leading-relaxed">
                        {c.detail}
                      </p>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-5xl mx-auto mt-12 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-8 text-center"
        >
          <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Stay Updated</h3>
          <p className="text-gray-400">
            Follow our development journey and be the first to know about new features and improvements
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default ChangelogPage;
