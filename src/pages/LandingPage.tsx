import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useBalanceStore } from '../store/balanceStore';
import { useT } from '../lib/useT';
import { useTranslationStore } from '../store/translationStore';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useHotItems } from '../hooks/useHotItems';
import { weaponCategories } from '../data/weaponCategories';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import LiveActivityFeed from '../components/LiveActivityFeed';
import { SkinCard, SkinCardSkeleton } from '../components/ui/SkinCard';
import { spring, tap } from '../lib/motion';
import { openDepositModal } from '../components/DepositModal';

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  shown:  { opacity: 1, y: 0, transition: { ...spring, mass: 0.7 } },
};

const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay = 0 }) => (
  <motion.section
    initial="hidden"
    whileInView="shown"
    viewport={{ once: true, margin: '0px 0px -80px 0px' }}
    variants={sectionVariants}
    transition={{ ...spring, delay }}
    className={className}
  >
    {children}
  </motion.section>
);

const staggerParent = {
  hidden: {},
  shown:  { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const staggerChild = {
  hidden: { opacity: 0, y: 12 },
  shown:  { opacity: 1, y: 0, transition: spring },
};


import useDocumentMeta, { faqJsonLd } from '../hooks/useDocumentMeta';


const LANDING_FAQ = [
  {
    question: 'What is the cheapest way to buy CS2 skins?',
    answer:
      'Skinify charges 0% buyer fees, so the price you see is the price you pay. Sellers list peer-to-peer at or near the live Steam market median, which usually undercuts third-party marketplaces that add 5–15% spreads.',
  },
  {
    question: 'Is Skinify safe for trading CS2 skins?',
    answer:
      'Every purchase is held in escrow until you confirm the Steam trade offer was received. If the seller fails to deliver within 60 minutes you are automatically refunded. Funds release to sellers 8 days after delivery to cover Steam\'s trade-back window.',
  },
  {
    question: 'How long does a CS2 skin trade take on Skinify?',
    answer:
      'Median delivery is under 60 seconds when the seller is online. After accepting the Steam trade offer in your mobile app the item lands in your inventory immediately.',
  },
  {
    question: 'Do I need Steam Mobile Authenticator to trade?',
    answer:
      'Yes. Without it Steam itself holds every trade offer for 15 days regardless of which marketplace you use. Enable Steam Guard Mobile for instant trades.',
  },
  {
    question: 'Can I sell my CS2 inventory on Skinify?',
    answer:
      'Yes. Connect your Steam account, open the Inventory tab, pick items, set a price (or use the recommended Steam median), and your listing goes live. Skinify charges a 2% seller fee — VIP members pay less.',
  },
];

const LandingPage: React.FC = () => {
  const langCode = useTranslationStore((s) => s.currentLanguage.code);
  const isCS = langCode === 'cs';

  useDocumentMeta({
    title: isCS
      ? 'Skinify — Tržiště CS2 · 0% poplatek pro kupující · Okamžité obchody'
      : 'Skinify — CS2 Marketplace · 0% Buyer Fees · Instant Trades',
    description: isCS
      ? 'Peer-to-peer tržiště CS2 s 0% poplatkem pro kupující. Obchody chráněné escrowem, doručení přes Steam do 60 sekund, výplaty v reálných penězích. Nakupujte AK-47, AWP, Karambit, M9 Bayonet, rukavice a vzácné patterny od ověřených prodejců.'
      : 'The peer-to-peer CS2 marketplace with 0% buyer fees. Escrow-protected trades, sub-60-second Steam delivery, real-money payouts. Buy AK-47, AWP, Karambit, M9 Bayonet, gloves and rare patterns from verified sellers.',
    canonical: 'https://skinify.gg/',
    langAlternates: ['cs', 'de', 'ru'],
    keywords:
      'cs2 marketplace, cs2 skins, buy cs2 skins, sell cs2 skins, instant sell cs2 skins, cs2 skins to cash, cs2 skins to money, skins to cash, cash out cs2 skins, sell skins for real money, counter-strike 2 marketplace, ak-47 redline, awp dragon lore, karambit doppler, m9 bayonet fade, sport gloves, butterfly knife, p2p cs2 trading, 0 fee cs2 marketplace, escrow cs2, instant steam delivery, cs2 skin prices, skinport alternative, skinport fees, steam market alternative, skinify cs2, skinyfi, skinyfy, skinifi, скинифай, скины кс2 продать, cs2 tržiště, cs2 skiny koupit, prodat cs2 skiny, cs2 obchod, cs2 nůž koupit',
    jsonLd: faqJsonLd(LANDING_FAQ),
  });

  const navigate = useNavigate();
  const t = useT();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist, fetchWishlist } = useWishlistStore();
  const { formatPrice } = useCurrencyStore();
  const { balance, fetchBalance } = useBalanceStore();
  const { items: marketplaceItems, loading: itemsLoading } = useMarketplaceItems();
  const { hotItems, loading: hotItemsLoading } = useHotItems(12);

  const [activeCat, setActiveCat] = useState<string>('featured');
  const reduceMotion = useReducedMotion();

  /* Hero parallax: the featured/portfolio card drifts up a touch as the
     user scrolls. Subtle (24px max) so it reads as polish, not motion. */
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 300], [0, -24]);

  useEffect(() => {
    if (user?.steamId) {
      fetchWishlist(user.steamId);
      fetchBalance(user.steamId);
    }
  }, [user?.steamId]);

  const categoryKeys = useMemo(
    () => ['featured', ...Object.keys(weaponCategories)],
    [],
  );

  const visibleItems = useMemo(() => {
    if (!marketplaceItems?.length) return [];
    if (activeCat === 'featured') return marketplaceItems.slice(0, 12);
    const weaponList = (weaponCategories[activeCat]?.weapons || []).map((w) =>
      w.toLowerCase(),
    );
    return marketplaceItems
      .filter((it) => {
        const n = (it.name || it.market_name || '').toLowerCase();
        return weaponList.some((w) => n.includes(w));
      })
      .slice(0, 12);
  }, [marketplaceItems, activeCat]);

  const handleAddCart = useCallback(
    (item: any) => {
      addItem({
        id: item.id,
        name: item.name || item.market_name,
        price: item.price,
        image: item.image,
        condition: item.condition,
        rarity: item.rarity,
        type: item.type,
        seller: item.seller,
      } as any);
      addToast({
        type: 'success',
        title: 'Added to cart',
        message: item.name || item.market_name,
      });
    },
    [addItem, addToast],
  );

  const handleWish = useCallback(
    (item: any) => {
      if (!user) {
        addToast({
          type: 'warning',
          title: 'Login required',
          message: 'Sign in to use your wishlist.',
        });
        return;
      }
      toggleItem(
        {
          id: item.id,
          name: item.name || item.market_name,
          price: item.price,
          image: item.image,
          condition: item.condition,
          rarity: item.rarity,
          type: item.type,
          seller: item.seller,
        } as any,
        user.steamId,
      );
    },
    [user, toggleItem, addToast],
  );

  const portfolio = useMemo(() => Number(balance || 0), [balance]);

  /* Real-data sparkline for the hero card. We don't have per-day price
     history client-side, so we build a genuine cumulative-volume curve
     from the actual live listings: sort by price, walk the cumulative
     total, and sample it into 12 points. The shape therefore reflects
     the real market's price distribution rather than a hardcoded line.
     The pathLength draw animation still plays over the top. */
  const sparkPaths = useMemo(() => {
    const live = Array.isArray(marketplaceItems) ? marketplaceItems : [];
    const prices = live
      .map((it: any) => Number(it?.price || 0))
      .filter((p) => p > 0)
      .sort((a, b) => a - b);
    const N = 12;
    let ys: number[];
    if (prices.length >= 2) {
      const total = prices.reduce((s, p) => s + p, 0) || 1;
      let cum = 0;
      const cumPts: number[] = prices.map((p) => {
        cum += p;
        return cum / total; // 0..1 rising curve
      });
      /* Resample the cumulative curve into N evenly-spaced points. */
      ys = Array.from({ length: N }, (_, i) => {
        const idx = Math.min(cumPts.length - 1, Math.round((i / (N - 1)) * (cumPts.length - 1)));
        return cumPts[idx];
      });
    } else {
      ys = [0.1, 0.18, 0.3, 0.28, 0.45, 0.5, 0.62, 0.6, 0.72, 0.8, 0.86, 0.95];
    }
    const coords = ys.map((v, i) => {
      const x = 8 + (i / (N - 1)) * 184; // 8px side margin inside the viewBox
      const y = 54 - v * 46; // keep 6px top/bottom padding
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    /* Map 0..1 (bottom→top) into the 0..60 viewBox (inverted Y). */
    const line = 'M' + coords.join(' L');
    const area = `${line} L192,60 L8,60 Z`;
    return { line, area };
  }, [marketplaceItems]);
  const promotedItems = useMemo(() => {
    const live = Array.isArray(marketplaceItems) ? marketplaceItems : [];
    if (live.length === 0) return [] as any[];
    /* ONLY paid promotions (49 Kč fee) appear here — no filler. When
       nobody is paying, the wall simply doesn't render. */
    return live.filter((it: any) => it?.promoted === true).slice(0, 100);
  }, [marketplaceItems]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-12 sm:pb-16">
        {/*
          Screen-reader-only H1 — Google reads this and uses it as the
          page's primary heading. The visual hero uses display headings
          inside cards that aren't `<h1>`, so we lift the head term up
          where crawlers expect it without disrupting the layout.
        */}
        <h1 className="sr-only">
          CS2 Marketplace — Buy and Sell CS2 Skins on Skinify
        </h1>

        {/* ===== HERO — the first thing on the page: your profile
            status when signed in, a welcome summary when not. ===== */}
        <section className="mb-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.12 }}
            className="card p-6 sm:p-7 flex flex-col h-full"
          >
            {user ? (
              /* Signed-in header: identity on the left, balance on the
                 right, one row — reads as a compact account summary
                 instead of two stacked mini-sections. */
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4 mb-5">
                <div className="flex items-center gap-3.5 flex-1 min-w-[220px]">
                  {user.avatarUrl && (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="w-14 h-14 rounded-2xl object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <span className="label-eyebrow">
                      {t('landing.welcome.back', 'Welcome back')}
                    </span>
                    <div className="text-[20px] sm:text-[24px] font-bold tracking-tight leading-tight truncate">
                      {user.displayName || 'Trader'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5 sm:gap-6">
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="label-meta">
                        {t('landing.portfolio.balance', 'Available balance')}
                      </span>
                      <span className="pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        +2.4%
                      </span>
                    </div>
                    <div className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-none text-ink tabular-nums mt-1">
                      {formatPrice(portfolio)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDepositModal()}
                      className="h-11 px-5 rounded-full bg-accent text-on-accent text-[13px] font-bold"
                    >
                      {t('nav.refill', 'Refill')}
                    </button>
                    <button
                      onClick={() => navigate('/profile')}
                      className="hidden sm:inline-flex h-11 px-4 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[13px] font-bold items-center transition-colors"
                    >
                      {t('landing.welcome.profile', 'Open profile')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <span className="label-eyebrow">
                  {t('landing.hero.eyebrow', 'CS2 marketplace · 0% buyer fees')}
                </span>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4 mb-4">
                  <div className="max-w-[640px]">
                    <h2 className="text-[24px] sm:text-[30px] font-bold tracking-tight leading-tight">
                      {t('landing.hero.headline', 'Buy and sell CS2 skins with zero buyer fees')}
                    </h2>
                    <p className="text-[13.5px] text-ink-muted font-medium mt-2 leading-relaxed">
                      {t(
                        'landing.hero.lead',
                        'Escrow-protected trades, sub-60-second Steam delivery, real-money payouts.',
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate('/marketplace')}
                      className="h-11 px-5 rounded-full bg-accent text-on-accent text-[13px] font-bold"
                    >
                      {t('landing.hero.browseMarket', 'Browse the marketplace')}
                    </button>
                    <button
                      onClick={() => navigate('/profile?tab=inventory')}
                      className="h-11 px-5 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[13px] font-bold transition-colors"
                    >
                      {t('landing.hero.startSelling', 'Start selling')}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="label-eyebrow">
                    {t('landing.portfolio.eyebrow.signedOut', 'Marketplace volume')}
                  </span>
                  <span className="pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    +2.4%
                  </span>
                </div>
                <div className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-none text-ink tabular-nums break-words">
                  {formatPrice(36714736)}
                </div>
                <div className="text-[13px] text-ink-muted font-medium mt-1.5 mb-4">
                  {t('landing.portfolio.volume', 'Total volume traded')}
                </div>
              </>
            )}

            <div className="mb-4 mx-1 sm:mx-2 h-[100px] sm:h-[130px] rounded-2xl bg-subtle/60 overflow-hidden relative">
              <svg
                viewBox="0 0 200 60"
                preserveAspectRatio="none"
                className="w-full h-full"
                aria-hidden
              >
                <defs>
                  <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path
                  key={sparkPaths.line}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, ease: 'easeOut', delay: 0.4 }}
                  d={sparkPaths.line}
                  fill="none"
                  stroke="rgb(var(--accent))"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <motion.path
                  key={sparkPaths.area}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.6 }}
                  d={sparkPaths.area}
                  fill="url(#spark-fill)"
                />
              </svg>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="card-flat px-3 py-2">
                <div className="label-meta">{t('landing.stat.fee', 'Fee')}</div>
                <div className="text-[14px] font-bold text-ink mt-0.5 tabular-nums">0%</div>
              </div>
              <div className="card-flat px-3 py-2">
                <div className="label-meta">{t('landing.stat.listings', 'Listings')}</div>
                <div className="text-[14px] font-bold text-ink mt-0.5 tabular-nums">
                  {(marketplaceItems?.length || 60794).toLocaleString()}
                </div>
              </div>
              <div className="card-flat px-3 py-2">
                <div className="label-meta">{t('landing.stat.escrow', 'Escrow')}</div>
                <div className="text-[14px] font-bold text-ink mt-0.5 tabular-nums">8d</div>
              </div>
              <div className="card-flat px-3 py-2">
                <div className="label-meta">{t('landing.stat.avgDelivery', 'Avg delivery')}</div>
                <div className="text-[14px] font-bold text-ink mt-0.5 tabular-nums">{'<1m'}</div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* The 15 newest marketplace listings, fading into translucency
            with a button to the full marketplace underneath. */}
        {(
          <LatestListings
            items={marketplaceItems || []}
            onView={(id) => navigate(`/item/${id}`)}
            onAddCart={handleAddCart}
            onToggleWish={handleWish}
            isWished={(id) => isInWishlist(id)}
            formatPrice={formatPrice}
            onOpenMarketplace={() => navigate('/marketplace')}
          />
        )}

        <Reveal className="mb-6">
          <LiveActivityFeed />
        </Reveal>
      <Reveal className="mb-10">
          <div className="flex items-end justify-between mb-4 px-1">
            <div>
              <h2 className="text-[17px] font-bold text-ink tracking-tight">
                {t('landing.section.trending.title', 'Trending now')}
              </h2>
              <p className="text-[12.5px] text-ink-muted mt-0.5 font-medium">
                {t('landing.section.trending.lead', 'Most watched skins in the last 24h')}
              </p>
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              className="hidden sm:flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink font-semibold transition-colors"
            >
              {t('landing.viewAll', 'View all')} <ArrowRight size={13} />
            </button>
          </div>

          {(() => {
            const trendingSource =
              hotItems && hotItems.length > 0
                ? hotItems
                : [...(marketplaceItems || [])]
                    .sort((a: any, b: any) => {
                      const va = Number(a?.views || 0);
                      const vb = Number(b?.views || 0);
                      if (vb !== va) return vb - va;
                      return (
                        new Date(b?.listed_at || 0).getTime() -
                        new Date(a?.listed_at || 0).getTime()
                      );
                    })
                    .slice(0, 8);

            const stillLoading =
              hotItemsLoading && (!marketplaceItems || marketplaceItems.length === 0);

            return (
              <motion.div
                variants={staggerParent}
                initial="hidden"
                whileInView="shown"
                viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2 snap-x"
              >
                {stillLoading || !trendingSource.length
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="shrink-0 w-[240px] snap-start">
                        <SkinCardSkeleton />
                      </div>
                    ))
                  : trendingSource.slice(0, 8).map((it: any) => (
                  <motion.div
                    key={it.id}
                    variants={staggerChild}
                    transition={spring}
                    className="shrink-0 w-[240px] snap-start"
                  >
                    {/* Same card variant as the marketplace grid so
                        the Trending strip and the main listing wall
                        look identical (no separate "trending" style). */}
                    <SkinCard
                      variant="tile"
                      item={it}
                      onView={() => navigate(`/item/${it.id}`)}
                      onAddCart={() => handleAddCart(it)}
                      onToggleWish={() => handleWish(it)}
                      wished={isInWishlist(it.id)}
                      formatPrice={formatPrice}
                    />
                  </motion.div>
                ))}
              </motion.div>
            );
          })()}
        </Reveal>

        {/* ===== CATEGORY FILTER + GRID ===== */}
        <Reveal className="mb-12">
          <div className="flex items-end justify-between mb-5 px-1 flex-wrap gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-ink tracking-tight">
                {t('landing.section.browse.title', 'Browse the market')}
              </h2>
              <p className="text-[12.5px] text-ink-muted mt-0.5 font-medium">
                {t('landing.section.browse.lead', 'Curated listings across every category')}
              </p>
            </div>
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/marketplace')}
              className="h-10 px-4 rounded-full bg-subtle text-ink text-[13px] font-semibold flex items-center gap-1.5 transition-colors"
            >
              {t('landing.openMarketplace', 'Open marketplace')} <ArrowRight size={13} strokeWidth={2.4} />
            </motion.button>
          </div>

          {/* category pills with motion underline */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3 mb-5 -mx-1 px-1">
            {categoryKeys.map((key) => {
              const label =
                key === 'featured'
                  ? t('landing.section.browse.featured', 'Featured')
                  : weaponCategories[key]?.name || key;
              const active = activeCat === key;
              return (
                <motion.button
                  key={key}
                  whileTap={tap}
                  onClick={() => setActiveCat(key)}
                  className={`relative h-10 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="cat-pill-active"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={spring}
                    />
                  )}
                  {!active && <span className="absolute inset-0 rounded-full bg-subtle" aria-hidden />}
                  <span className="relative">{label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* grid */}
          {itemsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <SkinCardSkeleton key={i} />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-[14px] text-ink-muted font-medium">
                {t('landing.empty.category', 'No listings in this category yet.')}
              </p>
            </div>
          ) : (
            <motion.div
              variants={staggerParent}
              initial="hidden"
              whileInView="shown"
              viewport={{ once: true, margin: '0px 0px -120px 0px' }}
              key={activeCat /* restart stagger on category switch */}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0 isolate"
            >
              {visibleItems.map((item: any) => (
                <motion.div key={item.id} variants={staggerChild} transition={spring}>
                  <SkinCard
                    variant="tile"
                    item={item}
                    onView={() => navigate(`/item/${item.id}`)}
                    onAddCart={() => handleAddCart(item)}
                    onToggleWish={() => handleWish(item)}
                    wished={isInWishlist(item.id)}
                    formatPrice={formatPrice}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </Reveal>

        {/* ===== WELCOME PROMO HERO =====
            The welcome banner (skins + smoke + skinify.gg tape with
            the "+10% on your first top-up" copy) now lives here as a
            full-width visual break before the SEO copy. */}
        <Reveal>
          <PromoBanner />
        </Reveal>

        {/*
          Long-tail SEO copy block — visible to crawlers (and humans
          scrolling to the very bottom). Targets head-term phrasing
          ("CS2 marketplace", "buy CS2 skins"), high-volume entity names
          (AK-47, AWP, Karambit), and competitor-alternative queries
          ("0% buyer fees", "escrow protection"). Internal links push
          PageRank into deep category and weapon pages.
        */}
        <Reveal className="mt-12">
          <section className="card p-6 sm:p-10 grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-8 lg:gap-12">
            <div className="min-w-0">
            <h2 className="text-[20px] sm:text-[24px] font-bold text-ink tracking-tight">
              {isCS
                ? 'Tržiště CS2 postavené pro obchodníky, ne prostředníky'
                : 'The CS2 marketplace built for traders, not middlemen'}
            </h2>
            <div className="mt-4 text-[14px] sm:text-[15px] text-ink-muted font-medium leading-relaxed space-y-4">
              {isCS ? (
                <>
                  <p>
                    Skinify je peer-to-peer{' '}
                    <a href="/marketplace" className="text-accent hover:underline">
                      tržiště CS2
                    </a>
                    , kde kupujete a prodáváte skiny do Counter-Strike 2 přímo
                    s ostatními hráči. Každý obchod je chráněný escrowem,
                    poplatky na straně kupujícího jsou nulové a položky se doručí
                    do vašeho Steam inventáře v okamžiku, kdy přijmete trade offer
                    — obvykle za méně než minutu.
                  </p>
                  <p>
                    Hledáte konkrétní zbraň? Projděte si{' '}
                    <a href="/weapons/Rifles/AK-47" className="text-accent hover:underline">
                      AK-47 skiny
                    </a>
                    ,{' '}
                    <a href="/weapons/Rifles/AWP" className="text-accent hover:underline">
                      AWP skiny
                    </a>
                    ,{' '}
                    <a href="/weapons/Rifles/M4A4" className="text-accent hover:underline">
                      M4A4
                    </a>{' '}
                    a{' '}
                    <a href="/weapons/Rifles/M4A1-S" className="text-accent hover:underline">
                      M4A1-S
                    </a>{' '}
                    z kategorie pušek. Z pistolí patří mezi nejnabízenější{' '}
                    <a href="/weapons/Pistols/Desert%20Eagle" className="text-accent hover:underline">
                      Desert Eagle
                    </a>
                    ,{' '}
                    <a href="/weapons/Pistols/USP-S" className="text-accent hover:underline">
                      USP-S
                    </a>{' '}
                    a{' '}
                    <a href="/weapons/Pistols/Glock-18" className="text-accent hover:underline">
                      Glock-18
                    </a>
                    . Nože a rukavice —{' '}
                    <a href="/weapons/Knives/Karambit" className="text-accent hover:underline">
                      Karambit
                    </a>
                    ,{' '}
                    <a href="/weapons/Knives/M9%20Bayonet" className="text-accent hover:underline">
                      M9 Bayonet
                    </a>
                    ,{' '}
                    <a href="/weapons/Knives/Butterfly%20Knife" className="text-accent hover:underline">
                      Butterfly Knife
                    </a>
                    ,{' '}
                    <a href="/weapons/Gloves/Sport%20Gloves" className="text-accent hover:underline">
                      Sport Gloves
                    </a>{' '}
                    — mají vlastní kategorie s filtry na float, pattern a samolepky.
                  </p>
                  <p>
                    Ve srovnání se Steam Marketem Skinify úplně odstraňuje 15% poplatek
                    Valve pro kupující a prodávajícím vyplácí skutečné peníze místo
                    Steam Wallet kreditu, který nemůžete vybrat. Ve srovnání s třetími
                    stranami držíme nulové poplatky pro kupující a účtujeme jen 2%
                    prodejcům, které se ještě snižují s{' '}
                    <a href="/vip" className="text-accent hover:underline">
                      VIP členstvím
                    </a>
                    . První vklad získá 10% bonus — podrobnosti najdete na stránce{' '}
                    <a href="/bonuses" className="text-accent hover:underline">
                      Bonusy
                    </a>
                    .
                  </p>
                  <p>
                    Každý obchod je držen v escrowu 8 dní, aby pokryl 7denní Steam
                    trade-back okno plus jednodenní bezpečnostní rezervu. Pokud
                    prodávající nikdy neodešle, obdržíte automaticky vrácení peněz.
                    Když se něco jiného pokazí, náš tým řeší spory do 24 hodin.
                    Přečtěte si{' '}
                    <a href="/trading-guide" className="text-accent hover:underline">
                      kompletního průvodce obchodováním
                    </a>{' '}
                    nebo přejděte rovnou na{' '}
                    <a href="/faq" className="text-accent hover:underline">
                      časté dotazy
                    </a>
                    .
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Skinify is a peer-to-peer{' '}
                    <a href="/marketplace" className="text-accent hover:underline">
                      CS2 marketplace
                    </a>{' '}
                    where you buy and sell Counter-Strike 2 skins directly with other
                    players. Every trade is escrow-protected, fees are zero on the
                    buyer side, and items deliver to your Steam inventory the moment
                    you accept the trade offer — typically in under a minute.
                  </p>
                  <p>
                    Looking for a specific weapon? Browse{' '}
                    <a href="/weapons/Rifles/AK-47" className="text-accent hover:underline">
                      AK-47 skins
                    </a>
                    ,{' '}
                    <a href="/weapons/Rifles/AWP" className="text-accent hover:underline">
                      AWP skins
                    </a>
                    ,{' '}
                    <a href="/weapons/Rifles/M4A4" className="text-accent hover:underline">
                      M4A4
                    </a>
                    , and{' '}
                    <a href="/weapons/Rifles/M4A1-S" className="text-accent hover:underline">
                      M4A1-S
                    </a>{' '}
                    from the rifle category. For pistols, the{' '}
                    <a href="/weapons/Pistols/Desert%20Eagle" className="text-accent hover:underline">
                      Desert Eagle
                    </a>
                    ,{' '}
                    <a href="/weapons/Pistols/USP-S" className="text-accent hover:underline">
                      USP-S
                    </a>{' '}
                    and{' '}
                    <a href="/weapons/Pistols/Glock-18" className="text-accent hover:underline">
                      Glock-18
                    </a>{' '}
                    are the most-listed. Knives and gloves —{' '}
                    <a href="/weapons/Knives/Karambit" className="text-accent hover:underline">
                      Karambit
                    </a>
                    ,{' '}
                    <a href="/weapons/Knives/M9%20Bayonet" className="text-accent hover:underline">
                      M9 Bayonet
                    </a>
                    ,{' '}
                    <a href="/weapons/Knives/Butterfly%20Knife" className="text-accent hover:underline">
                      Butterfly Knife
                    </a>
                    ,{' '}
                    <a href="/weapons/Gloves/Sport%20Gloves" className="text-accent hover:underline">
                      Sport Gloves
                    </a>{' '}
                    — sit in their own categories with float, pattern and sticker
                    filters built in.
                  </p>
                  <p>
                    Compared to in-game Steam Market trading, Skinify cuts the 15% Valve
                    fee entirely for buyers and pays sellers in real money instead of
                    Steam Wallet credit you can&apos;t cash out. Compared to third-party
                    marketplaces, we keep buyer fees at zero and run a smaller 2% seller
                    fee that drops further with{' '}
                    <a href="/vip" className="text-accent hover:underline">
                      VIP membership
                    </a>
                    . First-time deposits get a 10% top-up bonus — see the{' '}
                    <a href="/bonuses" className="text-accent hover:underline">
                      Bonuses
                    </a>{' '}
                    page for details.
                  </p>
                  <p>
                    Every trade is held in escrow for 8 days to cover Steam&apos;s 7-day
                    trade-back window plus a one-day safety margin. If the seller never
                    sends, you&apos;re refunded automatically. If something else goes
                    wrong, our team resolves disputes in under 24 hours. Read the{' '}
                    <a href="/trading-guide" className="text-accent hover:underline">
                      full trading guide
                    </a>{' '}
                    or jump straight to the{' '}
                    <a href="/faq" className="text-accent hover:underline">
                      FAQ
                    </a>
                    .
                  </p>
                </>
              )}
            </div>
            </div>

            {/* Right rail — fills what used to be empty whitespace with
                quick-look stats and one CTA. Sticks on tall viewports so
                it stays in view while the user reads. */}
            <aside className="lg:sticky lg:top-24 self-start space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label={isCS ? 'Poplatek kupujícího' : 'Buyer fees'}
                  value="0%"
                  sub={isCS ? 'Vždy' : 'Always'}
                />
                <Stat
                  label={isCS ? 'Poplatek prodávajícího' : 'Seller fee'}
                  value="2%"
                  sub={isCS ? 'Klesá s VIP' : 'Drops with VIP'}
                />
                <Stat
                  label={isCS ? 'Escrow' : 'Escrow window'}
                  value={isCS ? '8 dní' : '8 days'}
                  sub={isCS ? 'Bezpečné pro Steam' : 'Steam-safe'}
                />
                <Stat
                  label={isCS ? 'Průměrné doručení' : 'Avg delivery'}
                  value="<1 min"
                  sub={isCS ? 'Trade offer' : 'Trade offer'}
                />
              </div>

              <div className="card-flat p-5">
                <div className="label-eyebrow">
                  {isCS ? 'Jak kupující šetří' : 'How buyers save'}
                </div>
                <p className="text-[13px] text-ink-muted font-medium leading-relaxed mt-2">
                  {isCS ? (
                    <>
                      Steam Market účtuje{' '}
                      <strong className="text-ink">15% poplatek</strong> a
                      vyplácí v nevybíratelném Wallet kreditu. Skinify účtuje{' '}
                      <strong className="text-ink">0% kupujícím</strong> a
                      prodávajícím vyplácí skutečné peníze.
                    </>
                  ) : (
                    <>
                      Steam Market charges a{' '}
                      <strong className="text-ink">15% fee</strong> and pays in
                      non-cashable Wallet credit. Skinify charges{' '}
                      <strong className="text-ink">0% to buyers</strong> and pays
                      sellers in real money.
                    </>
                  )}
                </p>
                <a
                  href="/marketplace"
                  className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-accent hover:opacity-80 transition-opacity"
                >
                  {isCS ? 'Procházet tržiště' : 'Browse the marketplace'}
                  <ChevronRight size={13} strokeWidth={2.6} />
                </a>
              </div>
            </aside>
          </section>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   PromotedWall — large grid of promoted items shown at the top of the
   landing page.

   Behaviour:
     - First batch is 50 items
     - First 5 tiles are accent-highlighted (live paid promo slots)
     - Items 6..50 render normally
     - Tiles past index ~30 fade to lower opacity to signal that they're
       further down the queue / rotating into the spotlight
     - "Load more" CTA appends another batch of 50 each click

   This is the top-of-page replacement for the welcome banner. The
   welcome banner has been moved further down the page.
   ───────────────────────────────────────────────────────────────────────── */
const PROMOTED_BATCH = 50;
const PROMOTED_HIGHLIGHTED = 5;

/* ─────────────────────────────────────────────────────────────────────────
   FeaturedTradingCard — oversized trading-card style tile used in the
   top-5 carousel of the promoted wall.

   Design:
     - Rarity-tinted swirling radial backdrop that gently breathes
     - Giant ghosted weapon glyph as a watermark behind the skin
     - Skin image with a subtle vertical float loop
     - Diagonal "FEATURED" ribbon on the top-right with rank number
     - Mono-style name typography (Lexend display weight) + tracked
       wear/condition meta line
     - Animated number-ticker price + accent-rimmed Buy chip
   ───────────────────────────────────────────────────────────────────────── */
const RARITY_HEX_FEATURED: Record<string, string> = {
  consumer: '#B0C3D9',
  industrial: '#5E98D9',
  milspec: '#4B69FF',
  restricted: '#8847FF',
  classified: '#D32CE6',
  covert: '#EB4B4B',
  contraband: '#E4AE39',
  extraordinary: '#E4AE39',
};

const FeaturedTradingCard: React.FC<{
  item: any;
  index: number;
  onView: () => void;
  onAddCart: () => void;
  onToggleWish: () => void;
  wished: boolean;
  formatPrice: (n: number) => string;
}> = ({ item, index, onView, onAddCart, formatPrice }) => {
  const rarityKey = (item.rarity || '')
    .toLowerCase()
    .replace(/[^a-z-]/g, '')
    .replace('-', '');
  const color = RARITY_HEX_FEATURED[rarityKey] || '#8B8FA3';

  /* Pull "AK-47" out of "AK-47 | Redline (FT)"; everything after the
     pipe becomes the skin name on the plate. */
  const raw = item.name || item.market_name || '';
  const weapon =
    raw.split('|')[0]?.trim().replace(/^★\s*/, '').replace(/^StatTrak™\s*/, '') ||
    item.type ||
    '';
  const skin = (raw.split('|')[1] || raw).replace(/\(.*?\)/, '').trim();

  /* Short condition abbreviation for the meta line. */
  const condShort = (() => {
    const c = (item.condition || '').toLowerCase();
    if (c.includes('factory')) return 'FN';
    if (c.includes('minimal')) return 'MW';
    if (c.includes('field')) return 'FT';
    if (c.includes('well')) return 'WW';
    if (c.includes('battle')) return 'BS';
    return '';
  })();

  return (
    <motion.button
      type="button"
      onClick={onView}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      whileTap={tap}
      className="snap-start shrink-0 relative text-left cursor-pointer flex flex-col group bg-surface overflow-hidden"
      style={{
        width: 'min(82vw, 300px)',
        aspectRatio: '5 / 7',
        borderRadius: '18px',
        boxShadow: 'inset 0 0 0 1px rgb(var(--line))',
      }}
    >
      {/* Skin image */}
      <div className="relative flex-1 flex items-center justify-center px-6 pt-5">
        <img
          src={item.image}
          alt={raw}
          className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-300 group-hover:scale-[1.04]"
          loading="eager"
        />
      </div>

      {/* Info plate */}
      <div className="relative px-4 pt-3 pb-4">
        <div
          className="text-[9.5px] font-bold uppercase tracking-[0.16em] truncate"
          style={{ color }}
        >
          {weapon || 'Featured'}
        </div>
        <div
          className="font-bold text-ink tracking-tight truncate mt-1"
          style={{
            fontSize: 'clamp(15px, 4vw, 18px)',
            lineHeight: 1.15,
            fontFamily: '"Lexend", system-ui, sans-serif',
          }}
        >
          {skin || 'Featured skin'}
        </div>
        <div className="text-[11px] text-ink-muted font-medium truncate mt-0.5">
          {item.condition || 'Standard'}{condShort ? ` · ${condShort}` : ''}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div
            className="font-bold tabular-nums tracking-tight text-ink leading-none"
            style={{
              fontSize: 'clamp(16px, 4vw, 19px)',
              fontFamily: '"Lexend", system-ui, sans-serif',
            }}
          >
            {formatPrice(item.price)}
          </div>
          <motion.span
            whileTap={tap}
            whileHover={{ scale: 1.04 }}
            onClick={(e) => {
              e.stopPropagation();
              onAddCart();
            }}
            className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-accent text-on-accent text-[12px] font-bold cursor-pointer"
          >
            Buy
          </motion.span>
        </div>
      </div>

      {/* Bottom rarity stripe — solid accent bar with a centred
          shimmer sweep. Parent has `overflow-hidden` so the bar
          clips cleanly to the card's rounded corners. */}
      <div
        aria-hidden
        className="absolute left-0 right-0 bottom-0 overflow-hidden"
        style={{ height: 6 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${color}00 0%, ${color} 14%, ${color} 86%, ${color}00 100%)`,
            boxShadow: `0 0 18px 0 ${color}80, inset 0 1px 0 ${color}ff`,
          }}
        />
        <motion.div
          className="absolute inset-y-0 w-1/3"
          initial={false}
          animate={{ left: ['-33%', '133%'] }}
          transition={{
            duration: 3.4,
            repeat: Infinity,
            ease: 'linear',
            delay: index * 0.5,
          }}
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${color}, transparent 100%)`,
            filter: 'blur(4px)',
            mixBlendMode: 'screen',
          }}
        />
      </div>
    </motion.button>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   FeaturedCarousel — auto-scrolling horizontal slider for the top-5
   promoted trading-cards.

   - Snaps card-by-card with a smooth scroll every 4s
   - Pauses while the user hovers, presses, or actively scrolls
   - Resumes 2.5s after the user releases
   - Pagination dots reflect the active index and let the user jump
   ───────────────────────────────────────────────────────────────────────── */
const FeaturedCarousel: React.FC<{
  items: any[];
  onView: (id: string) => void;
  onAddCart: (item: any) => void;
  onToggleWish: (item: any) => void;
  isWished: (id: string) => boolean;
  formatPrice: (n: number) => string;
}> = ({ items, onView, onAddCart, onToggleWish, isWished, formatPrice }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<number | null>(null);

  const scrollToIndex = (i: number, smooth = true) => {
    const node = scrollerRef.current;
    if (!node) return;
    const card = node.querySelectorAll<HTMLElement>('[data-featured-card]')[i];
    if (!card) return;
    node.scrollTo({
      left: card.offsetLeft - node.offsetLeft - 8,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  /* Auto-cycle through cards every 4 s. Resets the interval whenever
     the user pauses (hover/touch) or the active card changes via
     manual scroll. */
  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = window.setInterval(() => {
      setActiveIdx((i) => {
        const next = (i + 1) % items.length;
        scrollToIndex(next);
        return next;
      });
    }, 4000);
    return () => window.clearInterval(t);
  }, [paused, items.length]);

  /* Track user scroll so the dots stay in sync if they swipe manually.
     Also pauses the auto-cycle briefly so we don't fight their input. */
  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const onScroll = () => {
      const cards = node.querySelectorAll<HTMLElement>('[data-featured-card]');
      let best = 0;
      let bestDelta = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft - node.scrollLeft - 8);
        if (d < bestDelta) {
          bestDelta = d;
          best = i;
        }
      });
      setActiveIdx(best);
      setPaused(true);
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
      resumeTimer.current = window.setTimeout(() => setPaused(false), 2500);
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      node.removeEventListener('scroll', onScroll);
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    };
  }, []);

  return (
    <div
      className="mb-4 relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-3 -mx-1 px-1"
        style={{ scrollPaddingLeft: '8px' }}
      >
        {items.map((item, i) => (
          <div key={`featured-${item.id}`} data-featured-card>
            <FeaturedTradingCard
              item={item}
              index={i}
              onView={() => onView(String(item.id))}
              onAddCart={() => onAddCart(item)}
              onToggleWish={() => onToggleWish(item)}
              wished={isWished(item.id)}
              formatPrice={formatPrice}
            />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-1">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show featured card ${i + 1}`}
              onClick={() => {
                setActiveIdx(i);
                scrollToIndex(i);
                setPaused(true);
                if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
                resumeTimer.current = window.setTimeout(() => setPaused(false), 4000);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx ? 'w-6 bg-accent' : 'w-1.5 bg-ink-dim/30 hover:bg-ink-dim/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   LatestListings — back-fill under the promoted wall when few sellers
   pay for promotion. Shows the 15 newest marketplace listings; the
   grid's tail fades into translucency and a button below opens the
   full marketplace.
   ───────────────────────────────────────────────────────────────────────── */
const LatestListings: React.FC<{
  items: any[];
  onView: (id: string) => void;
  onAddCart: (item: any) => void;
  onToggleWish: (item: any) => void;
  isWished: (id: string) => boolean;
  formatPrice: (n: number) => string;
  onOpenMarketplace: () => void;
}> = ({ items, onView, onAddCart, onToggleWish, isWished, formatPrice, onOpenMarketplace }) => {
  const t = useT();

  const latest = useMemo(
    () =>
      [...(items || [])]
        .sort(
          (a: any, b: any) =>
            new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime(),
        )
        .slice(0, 15),
    [items],
  );

  if (latest.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 px-1">
        <h2 className="text-[17px] font-bold text-ink tracking-tight">
          {t('landing.section.browse.title', 'Procházet tržiště')}
        </h2>
        <p className="text-[12.5px] text-ink-muted mt-0.5 font-medium">
          {t('landing.latest.lead', 'The newest listings across the marketplace')}
        </p>
      </div>

      <div className="relative">
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-0 isolate"
          style={{
            /* The tail of the grid dissolves into the page — reads as
               "there's more" and hands off to the button below. */
            maskImage:
              'linear-gradient(to bottom, #000 0%, #000 62%, rgb(0 0 0 / 0.45) 82%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, #000 0%, #000 62%, rgb(0 0 0 / 0.45) 82%, transparent 100%)',
          }}
        >
          {latest.map((item: any, i: number) => {
            /* Cards under the fade shouldn't catch hovers/clicks. */
            const faded = i >= latest.length - 5;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.28,
                  delay: Math.min(i * 0.02, 0.3),
                  ease: [0.2, 0.65, 0.3, 1],
                }}
                className={faded ? 'pointer-events-none' : ''}
              >
                <SkinCard
                  variant="tile"
                  item={item}
                  onView={() => onView(String(item.id))}
                  onAddCart={() => onAddCart(item)}
                  onToggleWish={() => onToggleWish(item)}
                  wished={isWished(item.id)}
                  formatPrice={formatPrice}
                />
              </motion.div>
            );
          })}
        </div>

        <div className="-mt-10 relative z-10 flex justify-center">
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.03 }}
            onClick={onOpenMarketplace}
            className="h-11 px-7 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5"
          >
            {t('landing.latest.openMarketplace', 'Open the marketplace')}
            <ArrowRight size={13} strokeWidth={2.6} />
          </motion.button>
        </div>
      </div>
    </section>
  );
};

const PromotedWall: React.FC<{
  items: any[];
  onView: (id: string) => void;
  onAddCart: (item: any) => void;
  onToggleWish: (item: any) => void;
  isWished: (id: string) => boolean;
  formatPrice: (n: number) => string;
}> = ({ items, onView, onAddCart, onToggleWish, isWished, formatPrice }) => {
  const t = useT();
  const [visibleCount, setVisibleCount] = useState(PROMOTED_BATCH);
  /* Filter state — drives the chip row. Categories map to a coarse
     classification on item.type / rarity / special so the user can
     narrow what's in the grid without leaving the landing page. */
  const [filter, setFilter] = useState<
    'all' | 'rifles' | 'knives' | 'pistols' | 'gloves' | 'covert' | 'stattrak'
  >('all');
  /* Track the height of a single tile so the bottom fade overlay
     covers exactly ONE row (not 40% of the whole grid). We measure
     the rendered tile DOM and update on resize / batch changes. */
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [rowHeight, setRowHeight] = useState(220);

  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;
    const measure = () => {
      const firstTile = node.querySelector<HTMLElement>(':scope > div');
      if (firstTile) {
        const h = firstTile.getBoundingClientRect().height;
        if (h > 0 && Math.abs(h - rowHeight) > 1) setRowHeight(h);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [visibleCount, rowHeight]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((it: any) => {
      const t = String(it.type || '').toLowerCase();
      const r = String(it.rarity || '').toLowerCase();
      switch (filter) {
        case 'rifles':
          return t.includes('rifle') || t.includes('sniper');
        case 'knives':
          return (
            t.includes('knife') || t.includes('karambit') || t.includes('bayonet')
          );
        case 'pistols':
          return t.includes('pistol');
        case 'gloves':
          return t.includes('glove');
        case 'covert':
          return r.includes('covert') || r.includes('extraordinary');
        case 'stattrak':
          return it.special === 'stattrak';
      }
      return true;
    });
  }, [items, filter]);

  const visible = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  );
  const hasMore = filteredItems.length > visibleCount;

  /* Reset to the first batch whenever the filter changes so the user
     always sees the top of the freshly-filtered list. */
  useEffect(() => {
    setVisibleCount(PROMOTED_BATCH);
  }, [filter]);

  /* When the filtered set shrinks, clamp visibleCount inside bounds
     so we don't render past the end. */
  useEffect(() => {
    if (visibleCount > filteredItems.length && filteredItems.length >= PROMOTED_BATCH) {
      setVisibleCount(Math.max(PROMOTED_BATCH, filteredItems.length));
    }
  }, [filteredItems.length, visibleCount]);

  if (items.length === 0) return null;

  return (
    <section className="mb-3">
      {/* Header — clean: title on the left, simple counter on the right. */}
      <header className="flex items-end justify-between gap-3 mb-3 px-1">
        <h2
          className="text-[20px] sm:text-[22px] font-bold text-ink tracking-tight leading-none"
          style={{ fontFamily: '"Lexend", system-ui, sans-serif' }}
        >
          {t('landing.promoted.title', 'Aktuálně populární')}
        </h2>
        <span className="text-[12px] text-ink-muted font-medium tabular-nums">
          {Math.min(filteredItems.length, visibleCount)} / {filteredItems.length}
        </span>
      </header>

      {/* TOP-5 TRADING-CARD CAROUSEL — the paid promotion slots are
          rendered as oversize trading-cards in a horizontal snap row.
          Card #1 carries the strongest accent, each subsequent slot
          gets a slightly weaker treatment so the eye walks down the
          row. No backgrounds beyond the rarity-derived accent so it
          looks like a curated set, not an ad. */}
      {visible.length > 0 && (
        <FeaturedCarousel
          items={visible.slice(0, PROMOTED_HIGHLIGHTED)}
          onView={onView}
          onAddCart={onAddCart}
          onToggleWish={onToggleWish}
          isWished={isWished}
          formatPrice={formatPrice}
        />
      )}

      {/* REGULAR GRID — items 6..N. Wrapped in a relative container
          so the bottom fade overlay can cover only the LAST ROW's
          bottom half without leaking onto neighbouring sections. */}
      <div className="relative">
        <div
          ref={gridRef}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0 isolate"
        >
          <AnimatePresence initial={false}>
            {visible.slice(PROMOTED_HIGHLIGHTED).map((item, i) => {
              const idxInGrid = i;
              const totalGridItems = visible.length - PROMOTED_HIGHLIGHTED;
              /* The last row's tiles sit under the fade gradient. We
                 disable pointer events on them so:
                   1. Their hover ADD-TO-CART overlay (which renders at
                      `top: 100%`, below the tile) can't be triggered
                      under the fade where it'd be invisible.
                   2. Mouse wheel/scroll passes through cleanly into the
                      load-more button area.
                 Tiles fully above the fade keep all interactions. */
              const isFadedRow =
                hasMore && idxInGrid >= Math.max(0, totalGridItems - 6);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{
                    duration: 0.28,
                    delay: Math.min(i * 0.012, 0.35),
                    ease: [0.2, 0.65, 0.3, 1],
                  }}
                  className={`relative ${isFadedRow ? 'pointer-events-none' : ''}`}
                >
                  <SkinCard
                    variant="tile"
                    item={item}
                    onView={() => onView(String(item.id))}
                    onAddCart={() => onAddCart(item)}
                    onToggleWish={() => onToggleWish(item)}
                    wished={isWished(item.id)}
                    formatPrice={formatPrice}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Bottom fade overlay — softer + shorter so it suggests
            there's more below without making the page feel
            half-broken. `pointer-events-none` so it never blocks
            scroll or clicks. High z-index keeps it above any hover
            action bars that the SkinCard tile renders just below the
            tile (those are the elements that previously felt like
            they were swallowing the mouse). */}
        {hasMore && (
          <div
            aria-hidden
            className="absolute left-0 right-0 bottom-0 pointer-events-none z-40"
            style={{
              height: `${Math.round(rowHeight * 0.4)}px`,
              background:
                'linear-gradient(to bottom, transparent 0%, rgb(var(--bg) / 0.35) 50%, rgb(var(--bg) / 0.9) 100%)',
            }}
          />
        )}
      </div>

      {hasMore && (
        <div className="mt-4 flex flex-col items-center gap-2 relative">
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.03 }}
            onClick={() => setVisibleCount((c) => c + PROMOTED_BATCH)}
            className="h-11 px-7 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center justify-center min-w-[200px] whitespace-nowrap"
          >
            Load {Math.min(PROMOTED_BATCH, filteredItems.length - visibleCount)} more
          </motion.button>
          <div className="text-[11px] text-ink-dim font-medium">
            {filteredItems.length - visibleCount} more listings below
          </div>
        </div>
      )}
    </section>
  );
};

/* PromoBanner — landing-page hero banner. Image lives in /public; the
   left-side dark zone of the artwork carries our promotional copy. The
   text fades up on mount and the CTA spring-pulses on hover. */
const PromoBanner: React.FC = () => {
  const navigate = useNavigate();
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="relative overflow-hidden rounded-3xl mb-3 isolate"
      style={{ aspectRatio: '1218 / 580' }}
    >
      <img
        src="/3586ae5d-05bb-4fcb-8a4e-9948fd62b17b.png"
        alt="Skinify · upgrade your CS2 skins"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />
      {/* Subtle left-side gradient to keep the copy legible on the dark zone */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(8,5,20,0.78) 0%, rgba(8,5,20,0.55) 30%, rgba(8,5,20,0) 60%)',
        }}
        aria-hidden
      />

      <div className="relative h-full grid grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-8 lg:py-0 max-w-[560px]">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.08 }}
            className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-purple-300/90 mb-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
            Welcome promo · live now
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.14 }}
            className="text-[26px] sm:text-[36px] lg:text-[44px] font-bold text-white leading-[1.05] tracking-tight"
          >
            Upgrade your skins.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-fuchsia-300 to-purple-400">
              +10% on your first top-up.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="text-[13px] sm:text-[14.5px] text-zinc-200/90 font-medium mt-3 leading-relaxed max-w-[440px]"
          >
            Buy AK-47, AWP, Karambit and more on Skinify — 0% buyer fees,
            escrow-protected trades, instant Steam delivery.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.26 }}
            className="mt-5 flex flex-wrap gap-2.5"
          >
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate('/marketplace')}
              className="h-11 px-5 rounded-full bg-white text-[#0f1018] text-[13px] font-bold inline-flex items-center gap-1.5"
              style={{ boxShadow: '0 14px 30px -12px rgba(168, 85, 247, 0.55)' }}
            >
              Browse the marketplace
              <ArrowRight size={14} strokeWidth={2.6} />
            </motion.button>
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate('/bonuses')}
              className="h-11 px-5 rounded-full bg-purple-500/30 hover:bg-purple-500/40 text-white text-[13px] font-bold inline-flex items-center gap-1.5 backdrop-blur-sm ring-1 ring-purple-300/40 transition-colors"
            >
              See bonuses
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

const Stat: React.FC<{ label: string; value: string; sub: string }> = ({
  label,
  value,
  sub,
}) => (
  <div className="card-flat p-4">
    <div className="label-meta">{label}</div>
    <div className="text-[20px] sm:text-[22px] font-bold text-ink tracking-tight tabular-nums leading-none mt-1.5">
      {value}
    </div>
    <div className="text-[11px] text-ink-muted font-medium mt-1 truncate">{sub}</div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   PromotedShowcase — replaces the static "Trade CS2 skins" headline.

   Renders a dark, ad-style hero showcasing one promoted user listing
   at a time (rotates every 6s) with the inspired layout from the
   reference image:
     - Left column: pinned label dots ("M4A1-S", "$15.25") + headline
       + CTA to buy a promotion slot (2 € / 24h)
     - Right column: big floating skin image

   The promoted items are sourced from the marketplace listings the
   page already loads — once the dedicated `promoted_listings` table
   ships, swap the `promoted` prop's source and nothing else changes.
   ───────────────────────────────────────────────────────────────────────── */
const PromotedShowcase: React.FC<{
  promoted: any[];
  formatPrice: (n: number) => string;
  onView: (id: string) => void;
}> = ({ promoted, formatPrice, onView }) => {
  const [idx, setIdx] = useState(0);
  /* "now" ticker — drives the countdown timer below. Updates once per
     second so HH:MM:SS counts down smoothly without re-rendering the
     whole tree at sub-second intervals. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Auto-rotate every 5 s minimum. Each promo gets at least 5 seconds
     on screen before swapping to the next. */
  useEffect(() => {
    if (promoted.length < 2) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % promoted.length);
    }, 5000);
    return () => clearInterval(t);
  }, [promoted.length]);

  /* Reset index if the promoted list shrinks while we're focused on a
     now-out-of-range entry. */
  useEffect(() => {
    if (idx >= promoted.length) setIdx(0);
  }, [idx, promoted.length]);

  const active = promoted[idx];

  /* Pull weapon class out of "AWP | Dragon Lore (FN)" → "AWP" for
     the small label-eyebrow chip. */
  const weaponClass = useMemo(() => {
    if (!active) return null;
    const raw = active.name || active.market_name || '';
    const first = raw.split('|')[0]?.trim();
    return first ? first.replace(/^★\s*/, '').replace(/^StatTrak™\s*/, '') : null;
  }, [active]);
  const skinName = useMemo(() => {
    if (!active) return null;
    const raw = active.name || active.market_name || '';
    const after = raw.split('|')[1];
    if (!after) return raw;
    return after.replace(/\(.*?\)/, '').trim().toUpperCase();
  }, [active]);

  /* Per-promo time-left countdown.
     Real listings can carry `promoted_until` (ISO string) — when
     present we count down to that timestamp. When missing we
     synthesize a stable 24 h window seeded by the item id so the
     timer feels real without requiring a backend deploy first. */
  const promoEndMs = useMemo(() => {
    if (!active) return null;
    const raw =
      (active as any).promoted_until ||
      (active as any).promotedUntil ||
      (active as any).promo_ends_at;
    if (raw) {
      const t = new Date(raw).getTime();
      if (Number.isFinite(t)) return t;
    }
    /* Deterministic 24-hour stretch — keyed by item id so reloading
       doesn't reset the timer to a wildly different value. */
    const seedSource = String(active.id || active.name || '');
    let seed = 0;
    for (let i = 0; i < seedSource.length; i++) {
      seed = (seed * 31 + seedSource.charCodeAt(i)) | 0;
    }
    const phaseMs = Math.abs(seed) % (24 * 60 * 60 * 1000);
    /* Build an end-time that's `phaseMs` from now, anchored to a fixed
       per-hour boundary so all viewers see roughly the same value. */
    const dayStart = Math.floor(now / (24 * 60 * 60 * 1000)) * 24 * 60 * 60 * 1000;
    return dayStart + 24 * 60 * 60 * 1000 + phaseMs;
  }, [active, now]);

  const timeLeft = useMemo(() => {
    if (!promoEndMs) return null;
    const diff = Math.max(0, promoEndMs - now);
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return { h, m, s, label: `${pad(h)}:${pad(m)}:${pad(s)}` };
  }, [promoEndMs, now]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.04 }}
      className="relative overflow-hidden flex flex-col justify-between min-h-[260px] sm:min-h-[340px] rounded-3xl"
      style={{
        /* Match the dark, slightly-purple ad backdrop from the
           reference. Token-driven so it tints with the user's accent. */
        background:
          'radial-gradient(140% 100% at 75% 50%, rgb(var(--accent) / 0.18) 0%, transparent 55%), linear-gradient(180deg, #0e1018 0%, #15131f 100%)',
      }}
    >
      {/* Header row — countdown only, no badge. */}
      <div className="relative z-10 p-5 sm:p-7 md:p-8 flex items-start justify-end gap-4">
        {timeLeft && (
          <motion.span
            key={active?.id || idx}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-black/35 ring-1 ring-white/15 backdrop-blur-sm text-white tabular-nums text-[12px] font-bold"
            aria-label={`Promotion ends in ${timeLeft.label}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Ends in <span className="font-mono">{timeLeft.label}</span>
          </motion.span>
        )}
      </div>

      {/* Body — pinned details + floating image */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-3 px-5 sm:px-7 md:px-8 pb-5 sm:pb-7 md:pb-8">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key={active.id || idx}
              initial={{ opacity: 0, x: -30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 18, filter: 'blur(6px)' }}
              transition={{
                opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                x: { type: 'spring', stiffness: 260, damping: 32, mass: 0.8 },
                filter: { duration: 0.35 },
              }}
              className="flex flex-col justify-end"
            >
              {/* Pinned weapon-class dot label */}
              {weaponClass && (
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                  <span className="text-[12.5px] font-bold uppercase tracking-[0.18em] text-rose-400">
                    {weaponClass}
                  </span>
                </div>
              )}
              <h1 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold tracking-tight text-white leading-[1.02]">
                {skinName || 'Featured skin'}
              </h1>
              <div className="mt-3 inline-flex items-center gap-2 text-[12.5px] text-white/70 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {active.condition || 'Showcase'} ·{' '}
                <span className="font-semibold text-white/90">
                  by {active.seller?.name || 'Skinify'}
                </span>
              </div>

              <div className="mt-5">
                <motion.button
                  whileTap={tap}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => onView(String(active.id))}
                  className="h-11 px-5 rounded-full bg-white text-zinc-900 text-[13px] font-bold inline-flex items-center gap-1.5"
                >
                  Buy for {formatPrice(active.price || 0)}
                  <ArrowRight size={13} strokeWidth={2.6} />
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="fallback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col justify-end"
            >
              <h1 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold tracking-tight text-white leading-[1.05]">
                No promotions live yet.
              </h1>
              <p className="mt-3 text-[14px] text-white/70 font-medium leading-relaxed max-w-[440px]">
                Featured listings appear here for 24 hours each. Check
                back soon.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skin image — taller container so wide rifle/knife sprites
            never get squashed. `min-h` guarantees enough vertical
            room for tall items (knives), `max-h` keeps the card from
            blowing out for square cases/stickers. */}
        <div className="relative h-[200px] sm:h-[260px] lg:h-[300px] [perspective:1200px]">
          <AnimatePresence mode="wait">
            {active && (
              <motion.div
                key={`img-${active.id || idx}`}
                initial={{
                  opacity: 0,
                  x: 90,
                  scale: 0.86,
                  rotateY: -22,
                  filter: 'blur(10px)',
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  rotateY: 0,
                  filter: 'blur(0px)',
                }}
                exit={{
                  opacity: 0,
                  x: -120,
                  scale: 0.82,
                  rotateY: 18,
                  filter: 'blur(8px)',
                }}
                transition={{
                  opacity: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                  filter: { duration: 0.4 },
                  default: { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 },
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <img
                  src={active.image}
                  alt={active.name || active.market_name}
                  /* `w-full h-full object-contain` lets the image
                     fill whichever dimension is smaller while keeping
                     aspect — wide rifles span the width, tall knives
                     span the height. Neither gets clipped. */
                  className="block w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(168,85,247,0.35)] cursor-pointer"
                  onClick={() => onView(String(active.id))}
                  loading="eager"
                />

                {/* Price pin */}
                <div className="absolute top-3 right-3 sm:top-5 sm:right-5 flex items-center gap-2 pointer-events-none">
                  <span className="text-[18px] sm:text-[20px] font-bold tracking-tight text-white tabular-nums">
                    {formatPrice(active.price || 0)}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Pagination dots — one per promoted slot, only when >1 */}
      {promoted.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {promoted.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show promoted item ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default LandingPage;
