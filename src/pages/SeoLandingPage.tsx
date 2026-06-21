import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { spring, tap } from '../lib/motion';
import { findSeoLandingPage } from '../data/seoLandingPages';

/* ─────────────────────────────────────────────────────────────────────────
   SeoLandingPage — long-form, statically-rendered landing pages
   targeting specific search queries. Content comes from a single
   data file (src/data/seoLandingPages.ts) keyed by URL slug.

   What this page is for:
     - Rank for high-intent buying queries Google won't surface us for
       organically without explicit landing copy ("buy cs2 skins",
       "cs2 skiny koupit", "skinify vs steam market", etc.)
     - Give crawlers semantic HTML with H1/H2/H3, prose paragraphs, and
       internal links — none of which the SPA marketplace exposes
       directly.
     - Emit FAQPage and BreadcrumbList JSON-LD via useDocumentMeta so
       Google can serve rich snippets.

   The component is variant-agnostic: same layout for Czech, English,
   and comparison pages. Differences come from the content object.
   ───────────────────────────────────────────────────────────────────────── */

const SeoLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  /* /vs/steam-market style paths reach us with `vs/steam-market` as
     the slug via a wildcard route — strip the leading slash. */
  const resolvedSlug = (slug || location.pathname.replace(/^\//, '')).replace(/^\/+/, '');
  const content = findSeoLandingPage(resolvedSlug);

  useDocumentMeta({
    title: content?.title || 'Skinify',
    description: content?.description || '',
    canonical: `https://skinify.gg/${resolvedSlug}`,
    /* Single @graph blob bundles WebPage + BreadcrumbList + FAQPage —
       Google's rich-results parser merges them into one page model. */
    jsonLd: content
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              '@id': `https://skinify.gg/${resolvedSlug}#page`,
              url: `https://skinify.gg/${resolvedSlug}`,
              name: content.title,
              description: content.description,
              inLanguage: content.lang,
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Skinify',
                  item: 'https://skinify.gg/',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: content.h1,
                  item: `https://skinify.gg/${resolvedSlug}`,
                },
              ],
            },
            {
              '@type': 'FAQPage',
              mainEntity: content.faq.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ],
        }
      : undefined,
  });

  if (!content) {
    /* Slug didn't match a known landing page. Render a small 404
       rather than a hard error — Google sometimes hits old URLs. */
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[640px] mx-auto px-4 sm:px-6 pt-12 pb-16 text-center">
          <h1 className="text-[24px] font-bold text-ink tracking-tight">Page not found</h1>
          <p className="text-[14px] text-ink-muted font-medium mt-2">
            The page you were looking for doesn't exist. Try the marketplace instead.
          </p>
          <button
            onClick={() => navigate('/marketplace')}
            className="mt-6 h-11 px-5 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-2"
          >
            Go to marketplace
            <ArrowRight size={13} strokeWidth={2.4} />
          </button>
        </main>
        <Footer slim />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[820px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-16">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-6 sm:p-10"
        >
          <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-ink leading-[1.1]">
            {content.h1}
          </h1>
          <p className="text-[14px] sm:text-[16px] text-ink-muted font-medium mt-4 leading-relaxed">
            {content.lede}
          </p>
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate(content.cta.href)}
            className="mt-6 h-12 px-6 rounded-full bg-accent text-on-accent text-[14px] font-bold inline-flex items-center gap-2"
            style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.6)' }}
          >
            {content.cta.label}
            <ArrowRight size={14} strokeWidth={2.4} />
          </motion.button>
        </motion.section>

        {/* Body sections — each block: H2 + paragraphs + optional bullets */}
        <article className="mt-6 space-y-6">
          {content.sections.map((section, i) => (
            <motion.section
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -60px 0px' }}
              transition={{ ...spring, delay: Math.min(i * 0.05, 0.2) }}
              className="card p-6 sm:p-8"
            >
              <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-ink leading-tight">
                {section.h2}
              </h2>
              <div className="mt-4 space-y-3">
                {section.paragraphs.map((p, pi) => (
                  <p
                    key={pi}
                    className="text-[14px] sm:text-[15px] text-ink-muted font-medium leading-relaxed"
                  >
                    {p}
                  </p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {section.bullets.map((b, bi) => (
                    <li
                      key={bi}
                      className="flex items-start gap-2.5 text-[13.5px] sm:text-[14px] text-ink font-semibold"
                    >
                      <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="leading-relaxed font-medium text-ink-muted">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          ))}

          {/* FAQ — accordion + emits FAQPage schema above */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -60px 0px' }}
            transition={spring}
            className="card p-6 sm:p-8"
          >
            <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-ink leading-tight mb-4">
              {content.lang === 'cs' ? 'Časté dotazy' : 'Frequently asked questions'}
            </h2>
            <div className="space-y-2">
              {content.faq.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl bg-subtle p-4 transition-colors hover:bg-subtle/70 open:bg-subtle/80"
                >
                  <summary className="cursor-pointer flex items-center justify-between gap-3 text-[14px] sm:text-[15px] font-bold text-ink list-none">
                    <span>{f.q}</span>
                    <ChevronDown
                      size={16}
                      strokeWidth={2.4}
                      className="text-ink-muted shrink-0 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="text-[13.5px] sm:text-[14px] text-ink-muted font-medium mt-3 leading-relaxed">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </motion.section>

          {/* Related — internal links boost crawl coverage + keep users
              on-site longer (a soft engagement signal Google likes). */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -60px 0px' }}
            transition={spring}
            className="card p-6 sm:p-8"
          >
            <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-ink leading-tight mb-4">
              {content.lang === 'cs' ? 'Související' : 'Related'}
            </h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {content.related.map((r) => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    onClick={(e) => {
                      /* Use react-router for internal links so we don't
                         reload the whole bundle, while preserving the
                         real <a href> for crawlers. */
                      if (r.href.startsWith('/')) {
                        e.preventDefault();
                        navigate(r.href);
                      }
                    }}
                    className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-subtle hover:bg-accent-soft text-ink font-semibold text-[13.5px] transition-colors"
                  >
                    <span className="truncate">{r.label}</span>
                    <ArrowRight
                      size={14}
                      strokeWidth={2.4}
                      className="text-ink-muted shrink-0"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </motion.section>
        </article>
      </main>

      <Footer slim />
    </div>
  );
};

export default SeoLandingPage;
