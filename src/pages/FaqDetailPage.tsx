import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronRight, HelpCircle } from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import useDocumentMeta, { breadcrumbJsonLd, faqJsonLd } from '../hooks/useDocumentMeta';
import { spring, tap } from '../lib/motion';
import { findFaqDetail, FAQ_DETAILS } from '../data/faqDetailed';

/* ─────────────────────────────────────────────────────────────────────────
   FaqDetailPage — one indexable URL per question.

   Why per-question pages exist:
     - Google ranks topical detail pages way better than accordion items
       inside a long FAQ index. Each `/faq/<slug>` answers one specific
       intent ("how does escrow work", "how to sell cs2 skins") with a
       400-700 word body — way more matter than a 2-sentence accordion.
     - Internal cross-linking between questions (the "Related" block at
       the bottom) creates a strong topical cluster. Google's PageRank
       flows through these links and lifts the whole FAQ subtree.
     - Per-page FAQPage + BreadcrumbList JSON-LD gives Google the
       structured data it needs to surface us in "People also ask" and
       knowledge-panel results.

   Render shape:
     [Back to FAQ]
     Category breadcrumb · Question H1
     Short answer (the same text shown on the index)
     ── divider ──
     Long body (paragraphs / lists / headings / notes)
     CTA button (optional)
     Related questions (3-5 internal links)
   ───────────────────────────────────────────────────────────────────────── */

const FaqDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const detail = findFaqDetail(slug || '');

  const relatedItems = useMemo(
    () =>
      (detail?.related || [])
        .map((s) => FAQ_DETAILS.find((f) => f.slug === s))
        .filter(Boolean) as typeof FAQ_DETAILS,
    [detail],
  );

  useDocumentMeta({
    title: detail ? `${detail.question} · Skinify FAQ` : 'FAQ · Skinify',
    description: detail?.answer || '',
    canonical: detail
      ? `https://skinify.gg/faq/${detail.slug}`
      : 'https://skinify.gg/faq',
    jsonLd: detail
      ? [
          /* Single-question FAQPage so Google can serve a rich snippet
             for this URL specifically. */
          faqJsonLd([{ question: detail.question, answer: detail.answer }]),
          breadcrumbJsonLd([
            { name: 'Home', url: 'https://skinify.gg/' },
            { name: 'FAQ', url: 'https://skinify.gg/faq' },
            { name: detail.question, url: `https://skinify.gg/faq/${detail.slug}` },
          ]),
        ]
      : undefined,
  });

  if (!detail) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[640px] mx-auto px-4 sm:px-6 pt-12 pb-16 text-center">
          <h1 className="text-[24px] font-bold text-ink tracking-tight">Question not found</h1>
          <p className="text-[14px] text-ink-muted font-medium mt-2">
            The FAQ entry you were looking for doesn't exist. Try the full FAQ.
          </p>
          <button
            onClick={() => navigate('/faq')}
            className="mt-6 h-11 px-5 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-2"
          >
            All questions
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

      <main className="max-w-[760px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-16">
        <button
          onClick={() => navigate('/faq')}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted hover:text-ink transition-colors mb-5"
        >
          <ArrowLeft size={14} strokeWidth={2.4} />
          All FAQ
        </button>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-6 sm:p-10"
        >
          {/* Breadcrumb chip */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
            <HelpCircle size={11} strokeWidth={2.4} />
            <span>FAQ</span>
            <ChevronRight size={11} strokeWidth={2.4} />
            <span>{detail.category}</span>
          </div>

          <h1 className="text-[26px] sm:text-[34px] font-bold tracking-tight text-ink leading-[1.15] mt-3">
            {detail.question}
          </h1>

          <p className="text-[14px] sm:text-[16px] text-ink-muted font-medium leading-relaxed mt-4">
            {detail.answer}
          </p>

          <div className="h-px bg-line my-7" aria-hidden />

          {/* Long-form body */}
          <div className="space-y-5">
            {detail.body.map((block, i) => {
              if (block.type === 'h') {
                return (
                  <h2
                    key={i}
                    className="text-[18px] sm:text-[20px] font-bold tracking-tight text-ink leading-tight mt-2"
                  >
                    {block.text}
                  </h2>
                );
              }
              if (block.type === 'ul') {
                return (
                  <ul key={i} className="space-y-2">
                    {block.items.map((item, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2.5 text-[13.5px] sm:text-[14px] text-ink-muted font-medium leading-relaxed"
                      >
                        <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-accent" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              if (block.type === 'note') {
                return (
                  <div
                    key={i}
                    className="rounded-2xl bg-accent-soft p-4 text-[13px] text-ink font-medium leading-relaxed"
                  >
                    <span className="font-bold mr-1.5">Note:</span>
                    {block.text}
                  </div>
                );
              }
              return (
                <p
                  key={i}
                  className="text-[14px] sm:text-[15px] text-ink-muted font-medium leading-relaxed"
                >
                  {block.text}
                </p>
              );
            })}
          </div>

          {/* In-content CTA */}
          {detail.cta && (
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate(detail.cta!.href)}
              className="mt-7 h-12 px-5 rounded-full bg-accent text-on-accent text-[13.5px] font-bold inline-flex items-center gap-2"
              style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.6)' }}
            >
              {detail.cta.label}
              <ArrowRight size={14} strokeWidth={2.4} />
            </motion.button>
          )}
        </motion.article>

        {/* Related questions — the internal-linking workhorse. Each link
            is a real <a href> so crawlers traverse them, intercepted by
            react-router for in-app navigation. */}
        {relatedItems.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -60px 0px' }}
            transition={spring}
            className="card p-6 sm:p-8 mt-5"
          >
            <h2 className="text-[16px] sm:text-[18px] font-bold tracking-tight text-ink leading-tight mb-4">
              Related questions
            </h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {relatedItems.map((r) => (
                <li key={r.slug}>
                  <a
                    href={`/faq/${r.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/faq/${r.slug}`);
                    }}
                    className="block p-3 rounded-2xl bg-subtle hover:bg-accent-soft transition-colors group"
                  >
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim mb-1">
                      {r.category}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-semibold text-ink truncate tracking-tight">
                        {r.question}
                      </span>
                      <ArrowRight
                        size={14}
                        strokeWidth={2.4}
                        className="text-ink-muted shrink-0 group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        {/* Bottom backlink to the FAQ index for both crawl and human nav. */}
        <div className="mt-5 text-center">
          <a
            href="/faq"
            onClick={(e) => {
              e.preventDefault();
              navigate('/faq');
            }}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent hover:underline"
          >
            View all {FAQ_DETAILS.length} questions
            <ArrowRight size={12} strokeWidth={2.4} />
          </a>
        </div>
      </main>

      <Footer slim />
    </div>
  );
};

export default FaqDetailPage;
