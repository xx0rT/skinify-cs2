import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  HelpCircle,
  Home,
  Package,
  Search,
  Sparkles,
  User,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { useT } from '../lib/useT';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   NotFoundPage — redesigned to match the rest of the site.

   The old version was a hard gray-900 / purple-600 island that read like
   a different product. This rebuild uses theme tokens and inherits the
   same chrome (LandingNav + Footer) so a 404 still feels like Skinify.

   Layout:
     - Floating "404" glyph with a soft accent radial behind it.
     - Headline + supporting copy.
     - Primary CTA back to home + secondary "go back".
     - Four quick-link tiles into the most likely intended destinations
       (Marketplace, FAQ, Profile, Sitemap).
   ───────────────────────────────────────────────────────────────────────── */

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useT();

  useDocumentMeta({
    title: '404 — page not found · Skinify',
    description:
      'The page you\'re looking for doesn\'t exist or has been moved. Browse the marketplace, FAQ, or your profile from here.',
    noindex: true,
  });

  const quickLinks = [
    {
      Icon: Package,
      label: t('404.link.marketplace', 'Marketplace'),
      blurb: t('404.link.marketplaceBlurb', 'Every active CS2 listing'),
      to: '/marketplace',
    },
    {
      Icon: HelpCircle,
      label: t('404.link.faq', 'FAQ'),
      blurb: t('404.link.faqBlurb', 'How trades, escrow and fees work'),
      to: '/faq',
    },
    {
      Icon: User,
      label: t('404.link.profile', 'Profile'),
      blurb: t('404.link.profileBlurb', 'Your inventory, listings, settings'),
      to: '/profile',
    },
    {
      Icon: Compass,
      label: t('404.link.sitemap', 'Sitemap'),
      blurb: t('404.link.sitemapBlurb', 'Browse every page on the site'),
      to: '/sitemap',
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <LandingNav />

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 pt-3 pb-12 flex items-center">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="w-full"
        >
          <div className="card relative overflow-hidden p-8 sm:p-12 lg:p-16 text-center">
            {/* Background accent radial — pulled in from the corners so
                the glyph reads as the focal point but the surface still
                feels alive. */}
            <div
              aria-hidden
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 70%)',
              }}
            />

            <div className="relative">
              {/* 404 glyph with a tracked-tight display weight + accent
                  gradient mask. */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ ...spring, mass: 0.6, delay: 0.08 }}
                className="font-bold leading-[0.9] tracking-[-0.05em] tabular-nums select-none"
                style={{
                  fontSize: 'clamp(96px, 22vw, 200px)',
                  fontFamily: '"Lexend", system-ui, sans-serif',
                  background:
                    'linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent) / 0.4) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                404
              </motion.div>

              <div className="label-eyebrow mt-2 inline-flex items-center gap-1.5 justify-center">
                <Sparkles size={11} strokeWidth={2.4} />
                {t('404.eyebrow', 'Lost in the marketplace')}
              </div>

              <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-ink leading-[1.05] mt-3">
                {t('404.title', 'This page doesn\'t exist')}
              </h1>

              <p className="text-[14px] sm:text-[15px] text-ink-muted font-medium mt-3 leading-relaxed max-w-[520px] mx-auto">
                {t(
                  '404.lead',
                  'The URL might have moved, the listing might have sold, or the link you followed might be broken. Pick a destination below.',
                )}
              </p>

              {/* CTAs */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <motion.button
                  whileTap={tap}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate('/')}
                  className="h-11 px-5 rounded-full bg-accent text-on-accent text-[13.5px] font-bold inline-flex items-center gap-1.5"
                  style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.6)' }}
                >
                  <Home size={14} strokeWidth={2.4} />
                  {t('404.cta.home', 'Back to home')}
                  <ArrowRight size={13} strokeWidth={2.6} />
                </motion.button>
                <motion.button
                  whileTap={tap}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate(-1)}
                  className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13.5px] font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={14} strokeWidth={2.4} />
                  {t('404.cta.back', 'Go back')}
                </motion.button>
                <motion.a
                  whileTap={tap}
                  whileHover={{ scale: 1.02 }}
                  href="/marketplace"
                  className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13.5px] font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Search size={14} strokeWidth={2.4} />
                  {t('404.cta.browse', 'Browse marketplace')}
                </motion.a>
              </div>
            </div>
          </div>

          {/* Quick-link grid */}
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickLinks.map(({ Icon, label, blurb, to }) => (
              <motion.div
                key={to}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.18 }}
              >
                <Link
                  to={to}
                  className="card-flat p-4 sm:p-5 flex items-start gap-3 hover:bg-subtle/40 transition-colors group h-full"
                >
                  <div className="w-9 h-9 rounded-2xl bg-accent-soft text-accent grid place-items-center shrink-0">
                    <Icon size={16} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-ink tracking-tight group-hover:text-accent transition-colors">
                      {label}
                    </div>
                    <div className="text-[11.5px] text-ink-muted font-medium mt-0.5 leading-snug">
                      {blurb}
                    </div>
                  </div>
                  <ArrowRight
                    size={13}
                    strokeWidth={2.4}
                    className="text-ink-dim group-hover:text-accent mt-1 shrink-0 group-hover:translate-x-0.5 transition-all"
                  />
                </Link>
              </motion.div>
            ))}
          </div>

          <p className="text-[11.5px] text-ink-dim font-medium mt-6 text-center">
            {t('404.helpHint', 'Still lost?')}{' '}
            <Link to="/contact" className="text-accent hover:underline">
              {t('404.helpLink', 'Contact support')}
            </Link>
            .
          </p>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default NotFoundPage;
