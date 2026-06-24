import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Code2,
  Globe,
  Layers,
  Search,
  Zap,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import useDocumentMeta, { breadcrumbJsonLd } from '../hooks/useDocumentMeta';
import { spring } from '../lib/motion';
import { DOCS_NAV, getDocsPageBySlug, type DocsHeading } from './docs/_docsManifest';

/* ─────────────────────────────────────────────────────────────────────────
   DocsPage — top-level shell for the /docs/* tree.

   Responsibilities split out from the previous monolithic version:
     - Left rail = real navigation between docs sub-pages (each link is
       a Route, not an anchor). Active highlight tracks the URL.
     - Content slot = `<Outlet />` rendered by react-router for the
       matched sub-page.
     - Right rail = "On this page" TOC built from the current page's
       declared headings (each docs page exports them).

   The right rail and the left rail no longer mirror each other — left
   is "where in the docs am I", right is "what's on this specific page".
   ───────────────────────────────────────────────────────────────────────── */

const DocsPage: React.FC = () => {
  const location = useLocation();
  const [navQuery, setNavQuery] = useState('');
  const [activeHeading, setActiveHeading] = useState<string>('');

  /* The current docs sub-page is derived from the URL. Anything after
     `/docs/` is the slug; the bare `/docs` root maps to `overview`. */
  const slug = useMemo(() => {
    const m = location.pathname.match(/^\/(?:[a-z]{2}\/)?docs\/?(.*)$/);
    return (m?.[1] || '').replace(/\/$/, '') || 'overview';
  }, [location.pathname]);

  const currentPage = useMemo(() => getDocsPageBySlug(slug), [slug]);

  useDocumentMeta({
    title: currentPage
      ? `${currentPage.title} — Skinify API Docs`
      : 'Skinify API Reference — Full Developer Documentation',
    description:
      currentPage?.description ||
      'Complete reference for the Skinify CS2 marketplace API. Authentication, rate limits, errors, every endpoint with examples, webhooks, SDKs, and integration guides.',
    canonical: `https://skinify.gg/docs${slug === 'overview' ? '' : `/${slug}`}`,
    keywords:
      'skinify api docs, cs2 marketplace api reference, cs2 skin api documentation, skinify endpoints, skinify rate limits, skinify webhooks, cs2 price api docs',
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Home', url: 'https://skinify.gg/' },
        { name: 'Developers', url: 'https://skinify.gg/developers' },
        { name: 'API docs', url: 'https://skinify.gg/docs' },
        ...(slug !== 'overview' && currentPage
          ? [{ name: currentPage.title, url: `https://skinify.gg/docs/${slug}` }]
          : []),
      ]),
    ],
  });

  /* Scroll-spy: track the topmost heading visible on screen. Re-attaches
     when the route changes (different page → different anchor ids). */
  useEffect(() => {
    if (!currentPage) return;
    const ids = currentPage.headings.map((h) => h.id);
    if (ids.length === 0) return;

    const onScroll = () => {
      const yRef = window.innerHeight * 0.25;
      const visible = ids
        .map((id) => {
          const el = document.getElementById(id);
          if (!el) return null;
          return { id, top: el.getBoundingClientRect().top };
        })
        .filter(Boolean) as { id: string; top: number }[];
      if (visible.length === 0) return;
      let current = visible[0].id;
      for (const v of visible) {
        if (v.top - yRef <= 0) current = v.id;
      }
      setActiveHeading(current);
    };

    // Defer one frame so newly mounted content has its anchor ids on DOM.
    requestAnimationFrame(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [currentPage]);

  /* Reset scroll on route change so deep pages don't open scrolled. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [slug]);

  const filteredNav = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return DOCS_NAV;
    return DOCS_NAV.map((s) => ({
      ...s,
      items: s.items.filter((i) => i.label.toLowerCase().includes(q)),
    })).filter((s) => s.items.length > 0);
  }, [navQuery]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      {/* Promo strip */}
      <div className="border-b border-line bg-accent-soft/40">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="text-[12.5px] font-semibold text-ink flex items-center gap-2 min-w-0">
            <Zap size={13} className="text-accent shrink-0" strokeWidth={2.4} />
            <span className="truncate">
              <strong>v1 API now stable.</strong> Free anonymous tier up to 60
              req/min. Generate a key for 600 rpm.
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
        {/* Subnav. "Status" now goes to /changelog (the source of truth
            for product + API state); a separate status board can be wired
            later when we have a real uptime feed. */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pt-4 pb-3 -mx-1 px-1">
          {[
            { label: 'API Reference', to: '/docs', active: true, Icon: Code2 },
            { label: 'Quickstart preview', to: '/developers', Icon: Zap },
            { label: 'Changelog', to: '/changelog', Icon: Layers },
            { label: 'Status', to: '/changelog#status', Icon: Globe },
          ].map((tab) => {
            const cls = `h-9 px-3.5 rounded-full text-[12.5px] font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
              tab.active
                ? 'bg-subtle text-ink'
                : 'text-ink-muted hover:bg-subtle/60 hover:text-ink'
            }`;
            return (
              <Link key={tab.label} to={tab.to} className={cls}>
                <tab.Icon size={13} strokeWidth={2.4} />
                {tab.label}
              </Link>
            );
          })}
          <div className="flex-1" />
          <div className="hidden lg:flex items-center gap-2 text-[12px] text-ink-muted font-semibold shrink-0">
            <kbd className="px-1.5 py-0.5 rounded bg-subtle text-[10px] font-mono">/</kbd>
            <span>to search</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_220px] gap-8 lg:gap-10 pb-16">
          {/* ─── LEFT NAV — site-level navigation between docs pages ── */}
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
                      const active = item.slug === slug;
                      return (
                        <li key={item.slug}>
                          <Link
                            to={item.slug === 'overview' ? '/docs' : `/docs/${item.slug}`}
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
                                transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                              />
                            )}
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </aside>

          {/* ─── CONTENT (per-route Outlet) ────────────────────────── */}
          <motion.main
            key={slug /* re-mount + fade between docs pages */}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, mass: 0.6 }}
            className="min-w-0 docs-prose"
          >
            <Outlet />
            {/* Prev / Next page navigation rendered by each sub-page so
                it can wire its own siblings. */}
          </motion.main>

          {/* ─── RIGHT RAIL — summary of THIS page ─────────────────── */}
          <aside className="hidden xl:block">
            <div className="sticky top-20">
              {currentPage && currentPage.headings.length > 0 ? (
                <>
                  <div className="label-eyebrow mb-3">On this page</div>
                  <ul className="space-y-1.5">
                    {currentPage.headings.map((h: DocsHeading) => {
                      const active = activeHeading === h.id;
                      return (
                        <li
                          key={h.id}
                          style={{
                            paddingLeft: h.level === 3 ? 12 : 0,
                          }}
                        >
                          <a
                            href={`#${h.id}`}
                            className={`block text-[12px] leading-snug transition-colors ${
                              active
                                ? 'text-accent font-bold'
                                : 'text-ink-muted hover:text-ink font-medium'
                            }`}
                          >
                            {h.label}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                  {currentPage.summary && (
                    <div className="mt-6 pt-5 border-t border-line">
                      <div className="label-eyebrow mb-2">Page summary</div>
                      <p className="text-[12px] text-ink-muted font-medium leading-relaxed">
                        {currentPage.summary}
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

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

export default DocsPage;
