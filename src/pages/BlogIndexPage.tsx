import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock, Eye, Sparkles, Tag } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import useDocumentMeta, { breadcrumbJsonLd } from '../hooks/useDocumentMeta';
import { spring } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   BlogIndexPage — /blog list view.

   Pulls published posts from `blog_posts` (Supabase). The first post is
   the hero, the next 6 form a 3-column grid, anything beyond renders in
   a denser two-column list. Categories double as filters: clicking one
   narrows the visible posts without leaving the page.

   For SEO we emit a Blog/CollectionPage JSON-LD object including the
   first 12 posts as `blogPost` references so Google can discover them
   without crawling each detail page individually.

   When the table is empty (fresh DB) we render a small placeholder
   card row so the page never looks broken on first deploy. The real
   content shows up automatically once posts ship.
   ───────────────────────────────────────────────────────────────────────── */

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover_image_url?: string;
  author_name?: string;
  read_time_minutes?: number;
  views?: number;
  published_at: string;
}

const PLACEHOLDER_POSTS: BlogPost[] = [
  {
    id: 'placeholder-1',
    slug: 'cs2-skin-prices-explained',
    title: 'How CS2 skin prices are set — float, pattern, and stickers explained',
    excerpt:
      'Why the same skin can be worth €30 or €300. Break down float values, rare patterns, sticker craft scores, and the supply curve that runs the market.',
    category: 'Guides',
    author_name: 'Skinify Team',
    read_time_minutes: 8,
    views: 0,
    published_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'placeholder-2',
    slug: 'avoiding-cs2-skin-scams',
    title: 'Avoiding CS2 skin scams — the eight patterns that catch beginners',
    excerpt:
      'API-key theft, fake middlemen, look-alike domains, trade-hold deception. The exact playbook scammers use, plus the one-rule fix that defeats most of them.',
    category: 'Security',
    author_name: 'Skinify Security',
    read_time_minutes: 6,
    views: 0,
    published_at: '2026-01-22T09:30:00Z',
  },
  {
    id: 'placeholder-3',
    slug: 'p2p-vs-steam-market',
    title: 'P2P marketplaces vs Steam Market — when each one wins',
    excerpt:
      'The 15% Steam Market cut is famous. The hidden costs of P2P are less famous. A side-by-side calculator that shows which model wins for your trade size.',
    category: 'Market analysis',
    author_name: 'Skinify Team',
    read_time_minutes: 7,
    views: 0,
    published_at: '2026-02-04T11:15:00Z',
  },
];

const BlogIndexPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('id, slug, title, excerpt, category, cover_image_url, author_name, read_time_minutes, views, published_at')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(60);
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          /* Empty / failed query → show the seed placeholders so the
             page never reads as broken. They link to slugs that the
             detail page will 404 on — that's expected until the real
             posts are authored. */
          setPosts(PLACEHOLDER_POSTS);
        } else {
          setPosts(data as BlogPost[]);
        }
      } catch {
        if (!cancelled) setPosts(PLACEHOLDER_POSTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.category && set.add(p.category));
    return ['all', ...Array.from(set)];
  }, [posts]);

  const visible = useMemo(() => {
    if (activeCategory === 'all') return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [posts, activeCategory]);

  const hero = visible[0];
  const grid = visible.slice(1, 7);
  const list = visible.slice(7);

  useDocumentMeta({
    title: 'CS2 Skin Trading Blog — Guides, Market Analysis · Skinify',
    description:
      'Long-form guides, market analysis, and security deep-dives for CS2 skin traders. Float values, sticker craft scores, P2P vs Steam Market math, scam-prevention playbooks.',
    canonical: 'https://skinify.gg/blog',
    keywords:
      'cs2 skin blog, cs2 trading guides, cs2 market analysis, cs2 scam prevention, cs2 float guide, cs2 sticker guide, csgo skin trading articles',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'Skinify Blog',
        url: 'https://skinify.gg/blog',
        description:
          'Long-form articles, market analysis and security deep-dives for CS2 skin traders.',
        publisher: { '@id': 'https://skinify.gg/#org' },
        blogPost: visible.slice(0, 12).map((p) => ({
          '@type': 'BlogPosting',
          headline: p.title,
          description: p.excerpt,
          url: `https://skinify.gg/blog/${p.slug}`,
          datePublished: p.published_at,
          author: { '@type': 'Organization', name: p.author_name || 'Skinify' },
        })),
      },
      breadcrumbJsonLd([
        { name: 'Home', url: 'https://skinify.gg/' },
        { name: 'Blog', url: 'https://skinify.gg/blog' },
      ]),
    ],
  });

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-3 pb-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mt-4 mb-8 sm:mt-8 sm:mb-12"
        >
          <div className="label-eyebrow mb-2">Skinify Blog</div>
          <h1 className="text-[28px] sm:text-[44px] font-bold tracking-tight text-ink leading-[1.05]">
            Smarter trades start with sharper context
          </h1>
          <p className="text-[14px] sm:text-[16px] text-ink-muted font-medium mt-3 max-w-[680px] leading-relaxed">
            Long-form guides, market analysis, and security deep-dives —
            written for traders who want to know *why* a skin moves, not
            just what it costs.
          </p>
        </motion.header>

        {/* Category pills */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-3 mb-6">
            {categories.map((c) => {
              const active = activeCategory === c;
              return (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCategory(c)}
                  className={`relative h-9 px-3.5 rounded-full text-[12.5px] font-bold whitespace-nowrap transition-colors ${
                    active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="blog-cat-active"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={spring}
                    />
                  )}
                  {!active && <span className="absolute inset-0 rounded-full bg-subtle" aria-hidden />}
                  <span className="relative capitalize">{c === 'all' ? 'All posts' : c}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Hero card */}
        {hero && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.06 }}
            className="mb-5"
          >
            <Link
              to={`/blog/${hero.slug}`}
              className="group card p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-10 hover:bg-subtle/30 transition-colors"
            >
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="pill bg-accent text-on-accent">
                    {hero.category || 'Featured'}
                  </span>
                  <span className="text-[11px] text-ink-dim font-semibold tabular-nums">
                    {formatDate(hero.published_at)}
                  </span>
                </div>
                <h2 className="text-[22px] sm:text-[30px] font-bold tracking-tight text-ink leading-[1.1]">
                  {hero.title}
                </h2>
                <p className="text-[13.5px] sm:text-[15px] text-ink-muted font-medium mt-3 leading-relaxed line-clamp-3">
                  {hero.excerpt}
                </p>
                <div className="mt-4 flex items-center gap-4 text-[11.5px] text-ink-dim font-semibold">
                  {hero.author_name && <span>{hero.author_name}</span>}
                  {hero.read_time_minutes && (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} strokeWidth={2.4} />
                      {hero.read_time_minutes} min read
                    </span>
                  )}
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-accent">
                  Read article
                  <ArrowRight size={13} strokeWidth={2.4} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
              <div className="rounded-2xl bg-subtle overflow-hidden aspect-[4/3] lg:aspect-auto relative">
                {hero.cover_image_url ? (
                  <img
                    src={hero.cover_image_url}
                    alt={hero.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <Sparkles size={36} className="text-ink-dim/40" />
                  </div>
                )}
              </div>
            </Link>
          </motion.section>
        )}

        {/* Grid of next 6 */}
        {grid.length > 0 && (
          <motion.div
            initial="hidden"
            animate="shown"
            variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.05 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
          >
            {grid.map((p) => (
              <motion.article
                key={p.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  shown: { opacity: 1, y: 0, transition: spring },
                }}
              >
                <Link
                  to={`/blog/${p.slug}`}
                  className="group card overflow-hidden hover:bg-subtle/30 transition-colors h-full flex flex-col"
                >
                  <div className="aspect-[16/10] bg-subtle relative">
                    {p.cover_image_url ? (
                      <img
                        src={p.cover_image_url}
                        alt={p.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center">
                        <Tag size={24} className="text-ink-dim/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                        {p.category || 'Article'}
                      </span>
                      <span className="text-[10px] text-ink-dim font-semibold tabular-nums">
                        {formatDate(p.published_at)}
                      </span>
                    </div>
                    <h3 className="text-[15.5px] font-bold tracking-tight text-ink leading-[1.2] mb-2 line-clamp-2">
                      {p.title}
                    </h3>
                    <p className="text-[12.5px] text-ink-muted font-medium leading-relaxed line-clamp-2 mb-3">
                      {p.excerpt}
                    </p>
                    <div className="mt-auto flex items-center justify-between text-[10.5px] text-ink-dim font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={10} strokeWidth={2.4} />
                        {p.read_time_minutes || 5} min
                      </span>
                      {typeof p.views === 'number' && p.views > 0 && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Eye size={10} strokeWidth={2.4} />
                          {p.views.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </motion.div>
        )}

        {/* Dense list of older posts */}
        {list.length > 0 && (
          <div className="card p-5 sm:p-8">
            <div className="label-eyebrow mb-4">More from the blog</div>
            <ul className="divide-y divide-line">
              {list.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/blog/${p.slug}`}
                    className="group flex items-start gap-3 py-3 sm:py-3.5 hover:bg-subtle/40 rounded-xl px-2 -mx-2 transition-colors"
                  >
                    <Calendar size={13} className="text-ink-dim mt-1 shrink-0" strokeWidth={2.2} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-ink tracking-tight truncate group-hover:text-accent transition-colors">
                        {p.title}
                      </div>
                      <div className="text-[11.5px] text-ink-muted font-medium mt-0.5 flex items-center gap-2">
                        <span>{formatDate(p.published_at)}</span>
                        {p.category && <><span aria-hidden>·</span><span>{p.category}</span></>}
                      </div>
                    </div>
                    <ArrowRight
                      size={13}
                      strokeWidth={2.4}
                      className="text-ink-dim group-hover:text-accent transition-colors mt-1 shrink-0"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-[14px] text-ink-muted font-medium">
              No posts published yet in this category.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default BlogIndexPage;
