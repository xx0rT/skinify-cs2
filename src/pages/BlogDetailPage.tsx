import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, Clock, Eye, Tag, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   BlogDetailPage — flat redesign in the app's design language.
   Reader column + quiet sidebar (popular posts, categories, newsletter).
   Same data flow as before: fetch by slug, bump views, related + popular.
   ───────────────────────────────────────────────────────────────────────── */

const parent = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const child = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: spring },
};

const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<any>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<any[]>([]);
  const [popularBlogs, setPopularBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionEmail, setSubscriptionEmail] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [subscriptionMessage, setSubscriptionMessage] = useState('');

  useEffect(() => {
    const fetchBlog = async () => {
      if (!slug) {
        setError('No blog slug provided');
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single();
        if (error) throw error;
        if (!data) {
          setError('Blog post not found');
          setLoading(false);
          return;
        }
        setBlog(data);

        await supabase
          .from('blog_posts')
          .update({ views: (data.views || 0) + 1 })
          .eq('id', data.id);

        const { data: related } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('is_published', true)
          .eq('category', data.category)
          .neq('id', data.id)
          .order('published_at', { ascending: false })
          .limit(4);
        setRelatedBlogs(related || []);

        const { data: popular } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('is_published', true)
          .neq('id', data.id)
          .order('views', { ascending: false })
          .limit(5);
        setPopularBlogs(popular || []);
      } catch (err: any) {
        console.error('Error fetching blog:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-8">
          <div className="skel h-9 w-32 rounded-full mb-6" />
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              <div className="skel h-64 rounded-[20px]" />
              <div className="skel h-96 rounded-[20px]" />
            </div>
            <div className="skel h-80 rounded-[20px]" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[640px] mx-auto px-4 pt-20">
          <div className="panel p-14 text-center">
            <p className="text-[17px] font-bold text-ink">Blog post not found</p>
            <p className="text-[13px] text-ink-muted font-medium mt-1.5">
              It may have been unpublished or the link is wrong.
            </p>
            <button
              onClick={() => navigate('/blog')}
              className="mt-6 h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px]"
            >
              Back to the blog
            </button>
          </div>
        </main>
        <Footer slim />
      </div>
    );
  }

  const wordCount = blog.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  /* Minimal markdown-ish renderer — same syntax support as before,
     restyled with theme tokens. */
  const renderLine = (line: string, index: number) => {
    if (line.startsWith('# ')) {
      return (
        <h2
          key={index}
          className="text-[26px] sm:text-[30px] font-bold tracking-tight text-ink mt-12 mb-4 first:mt-0 leading-tight"
        >
          {line.substring(2)}
        </h2>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h3
          key={index}
          className="text-[20px] sm:text-[22px] font-bold tracking-tight text-ink mt-10 mb-3 leading-snug"
        >
          {line.substring(3)}
        </h3>
      );
    }
    if (line.startsWith('### ')) {
      return (
        <h4 key={index} className="text-[16px] font-bold text-accent mt-8 mb-2 leading-snug">
          {line.substring(4)}
        </h4>
      );
    }
    if (line.startsWith('- ')) {
      return (
        <li
          key={index}
          className="ml-6 mb-2 text-[15px] text-ink-muted font-medium list-disc marker:text-accent leading-relaxed"
        >
          {line.substring(2)}
        </li>
      );
    }
    if (line.startsWith('**') && line.endsWith('**')) {
      return (
        <p
          key={index}
          className="my-5 px-4 py-3 rounded-2xl bg-accent-soft text-[15px] font-bold text-ink leading-relaxed"
        >
          {line.substring(2, line.length - 2)}
        </p>
      );
    }
    if (line.startsWith('> ')) {
      return (
        <blockquote
          key={index}
          className="my-5 pl-5 border-l-2 border-accent italic text-[15px] text-ink-muted font-medium leading-relaxed"
        >
          {line.substring(2)}
        </blockquote>
      );
    }
    if (line.trim() === '') return <div key={index} className="h-4" />;
    return (
      <p key={index} className="my-3 text-[15px] text-ink-muted font-medium leading-relaxed">
        {line}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-16">
        <motion.button
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={tap}
          onClick={() => navigate('/blog')}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-subtle hover:bg-surface text-ink-muted hover:text-ink text-[13px] font-semibold transition-colors mb-5"
        >
          <ChevronLeft size={14} strokeWidth={2.4} />
          Blog
        </motion.button>

        <motion.div
          variants={parent}
          initial="hidden"
          animate="shown"
          className="grid lg:grid-cols-[1fr_320px] gap-6 items-start"
        >
          {/* ── Article ── */}
          <article className="min-w-0">
            {/* Header */}
            <motion.header variants={child}>
              <span className="label-eyebrow">{blog.category}</span>
              <h1 className="text-[30px] sm:text-[40px] font-bold tracking-tight text-ink leading-[1.1] mt-2">
                {blog.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-muted font-medium">
                <span className="text-ink font-bold">{blog.author_name}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={12} strokeWidth={2.2} />
                  {new Date(blog.published_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={12} strokeWidth={2.2} />
                  {readingTime} min read
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Eye size={12} strokeWidth={2.2} />
                  {blog.views} views
                </span>
              </div>
            </motion.header>

            {/* Cover */}
            {blog.cover_image_url && (
              <motion.div variants={child} className="mt-6 rounded-[20px] overflow-hidden">
                <img
                  src={blog.cover_image_url}
                  alt={blog.title}
                  className="w-full h-auto max-h-[440px] object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </motion.div>
            )}

            {/* Body */}
            <motion.div variants={child} className="panel p-6 sm:p-10 mt-6">
              {blog.content.split('\n').map(renderLine)}
            </motion.div>

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <motion.div variants={child} className="mt-6 flex flex-wrap items-center gap-2">
                <Tag size={14} strokeWidth={2.2} className="text-ink-dim" />
                {blog.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="pill bg-subtle text-ink-muted hover:bg-accent-soft hover:text-ink transition-colors cursor-default"
                  >
                    #{tag}
                  </span>
                ))}
              </motion.div>
            )}

            {/* Related */}
            {relatedBlogs.length > 0 && (
              <motion.div variants={child} className="mt-10">
                <span className="label-eyebrow">More from {blog.category}</span>
                <div className="mt-3 grid sm:grid-cols-2 gap-3">
                  {relatedBlogs.map((rb) => (
                    <motion.button
                      key={rb.id}
                      whileHover={{ y: -3 }}
                      whileTap={tap}
                      transition={spring}
                      onClick={() => navigate(`/blog/${rb.slug}`)}
                      className="panel p-5 text-left"
                    >
                      <h4 className="text-[14.5px] font-bold text-ink tracking-tight leading-snug line-clamp-2">
                        {rb.title}
                      </h4>
                      <p className="text-[12.5px] text-ink-muted font-medium mt-1.5 line-clamp-2">
                        {rb.excerpt}
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-dim font-medium tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(rb.published_at).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye size={11} />
                          {rb.views}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </article>

          {/* ── Sidebar ── */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            {popularBlogs.length > 0 && (
              <motion.section variants={child} className="panel p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={15} strokeWidth={2.2} className="text-accent" />
                  <span className="label-eyebrow">Popular posts</span>
                </div>
                <div className="space-y-1">
                  {popularBlogs.map((pb, index) => (
                    <button
                      key={pb.id}
                      onClick={() => navigate(`/blog/${pb.slug}`)}
                      className="w-full flex items-start gap-3 p-2.5 -mx-2.5 rounded-2xl hover:bg-subtle text-left transition-colors group"
                    >
                      <span className="w-7 h-7 rounded-xl bg-accent-soft text-accent grid place-items-center text-[12px] font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold text-ink tracking-tight leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                          {pb.title}
                        </span>
                        <span className="block text-[11px] text-ink-dim font-medium mt-1 tabular-nums">
                          {pb.views} views ·{' '}
                          {new Date(pb.published_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Newsletter */}
            <motion.section variants={child} className="panel p-5">
              <span className="label-eyebrow">Newsletter</span>
              <h3 className="text-[16px] font-bold tracking-tight mt-1.5 leading-tight">
                Stay updated
              </h3>
              <p className="text-[12.5px] text-ink-muted font-medium mt-1.5 leading-relaxed">
                The latest CS2 market analysis and guides, straight to your inbox.
              </p>

              {subscriptionStatus === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 rounded-2xl bg-emerald-500/10 p-4 text-center"
                >
                  <div className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                    Subscribed!
                  </div>
                  <div className="text-[12px] text-ink-muted font-medium mt-0.5">
                    {subscriptionMessage}
                  </div>
                </motion.div>
              ) : (
                <form
                  className="mt-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSubscriptionStatus('loading');
                    try {
                      const { error } = await supabase
                        .from('blog_subscriptions')
                        .insert([{ email: subscriptionEmail }]);
                      if (error) {
                        if (error.code === '23505') {
                          setSubscriptionMessage('This email is already subscribed!');
                          setSubscriptionStatus('error');
                        } else {
                          throw error;
                        }
                      } else {
                        setSubscriptionMessage('Check your email to confirm!');
                        setSubscriptionStatus('success');
                        setSubscriptionEmail('');
                      }
                    } catch (err: any) {
                      setSubscriptionMessage(err.message || 'Failed to subscribe');
                      setSubscriptionStatus('error');
                    }
                    setTimeout(() => {
                      setSubscriptionStatus('idle');
                      setSubscriptionMessage('');
                    }, 5000);
                  }}
                >
                  <input
                    type="email"
                    required
                    value={subscriptionEmail}
                    onChange={(e) => setSubscriptionEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full h-11 px-4 rounded-xl bg-subtle outline-none text-ink placeholder:text-ink-dim text-[13.5px] font-medium focus:ring-2 focus:ring-accent/40 transition-shadow"
                  />
                  <motion.button
                    whileTap={tap}
                    type="submit"
                    disabled={subscriptionStatus === 'loading'}
                    className="mt-2 w-full h-11 rounded-full bg-accent text-on-accent text-[13px] font-bold disabled:opacity-50"
                  >
                    {subscriptionStatus === 'loading' ? 'Subscribing…' : 'Subscribe'}
                  </motion.button>
                  {subscriptionStatus === 'error' && (
                    <div className="mt-2 text-[11.5px] text-rose-600 dark:text-rose-400 font-medium text-center">
                      {subscriptionMessage}
                    </div>
                  )}
                </form>
              )}
            </motion.section>
          </aside>
        </motion.div>
      </main>

      <Footer slim />
    </div>
  );
};

export default BlogDetailPage;
