import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Zap,
  ShieldCheck,
  LineChart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useBalanceStore } from '../store/balanceStore';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useHotItems } from '../hooks/useHotItems';
import { weaponCategories } from '../data/weaponCategories';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import LiveActivityFeed from '../components/LiveActivityFeed';
import { SkinCard, SkinCardSkeleton } from '../components/ui/SkinCard';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   Motion helpers — co-located because they're only used here. `Reveal` is
   the standard fade-up-on-enter that every section uses; `StaggerGrid` is
   its container variant for child items.
   ───────────────────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────── */

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-2 pb-16">
        {/* ===== HERO ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3 mb-3">
          {/* Headline card — animates in on mount with a calm fade-up */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.04 }}
            className="card p-8 md:p-10 relative overflow-hidden flex flex-col justify-between min-h-[320px]"
          >
            {/* Hero ambient accent — gently breathes */}
            <motion.div
              aria-hidden
              className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 65%)',
              }}
              animate={reduceMotion ? {} : { scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative">
              <motion.span
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.14 }}
                className="pill"
              >
                <span className="chip-dot bg-emerald-500" />
                Live · {(marketplaceItems?.length || 0).toLocaleString()} listings
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.2 }}
                className="mt-5 text-[34px] md:text-[44px] leading-[1.05] font-bold tracking-tight text-ink"
              >
                Trade CS2 skins.
                <br />
                <span className="text-accent">Instantly, fairly.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.28 }}
                className="mt-3.5 max-w-[480px] text-[14px] text-ink-muted leading-relaxed font-medium"
              >
                A premium peer-to-peer marketplace. 0% fees, escrow protection,
                instant payouts. Built for collectors and traders.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.36 }}
              className="relative flex flex-wrap items-center gap-2 mt-6"
            >
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/marketplace')}
                className="h-12 px-6 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center gap-2"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.65)' }}
              >
                Browse market
                <ArrowRight size={16} strokeWidth={2.4} />
              </motion.button>
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/profile?tab=inventory')}
                className="h-12 px-6 rounded-full bg-subtle text-ink font-semibold text-[14px]"
              >
                Sell an item
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Featured / portfolio card — parallaxes as you scroll */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.12 }}
            style={{ y: reduceMotion ? 0 : heroParallax }}
            className="card p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="label-eyebrow">
                {user ? 'Your portfolio' : 'Marketplace volume'}
              </span>
              <span className="pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                +2.4%
              </span>
            </div>
            <div className="text-[34px] font-bold tracking-tight leading-none text-ink mt-1 tabular-nums">
              {user ? formatPrice(portfolio) : formatPrice(36714736)}
            </div>
            <div className="text-[13px] text-ink-muted font-medium mt-1.5">
              {user ? 'Available balance' : 'Total volume traded'}
            </div>

            {/* mini sparkline — uses accent */}
            <div className="mt-5 mb-4 h-16 rounded-2xl bg-subtle/60 overflow-hidden relative">
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
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, ease: 'easeOut', delay: 0.4 }}
                  d="M0,40 L20,38 L40,30 L60,33 L80,22 L100,25 L120,18 L140,20 L160,10 L180,14 L200,8"
                  fill="none"
                  stroke="rgb(var(--accent))"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <motion.path
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.6 }}
                  d="M0,40 L20,38 L40,30 L60,33 L80,22 L100,25 L120,18 L140,20 L160,10 L180,14 L200,8 L200,60 L0,60 Z"
                  fill="url(#spark-fill)"
                />
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              <div className="card-flat px-3 py-2.5">
                <div className="label-meta">Fee</div>
                <div className="text-[15px] font-bold text-ink mt-0.5 tabular-nums">0%</div>
              </div>
              <div className="card-flat px-3 py-2.5">
                <div className="label-meta">Listings</div>
                <div className="text-[15px] font-bold text-ink mt-0.5 tabular-nums">
                  {(marketplaceItems?.length || 60794).toLocaleString()}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ===== TRUST STRIP =====
            Staggered children — each badge lifts in with a small spring,
            and bows down 2px on hover. Subtle but adds life. */}
        <Reveal className="mb-3">
          <motion.div
            variants={staggerParent}
            className="card px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { Icon: ShieldCheck, hue: 'mint',  label: 'Escrow protected', sub: 'Every trade insured' },
              { Icon: Zap,         hue: 'peach', label: 'Instant trades',   sub: 'Avg 14 seconds' },
              { Icon: Shield,      hue: 'sky',   label: '0% fees',          sub: 'No hidden charges' },
              { Icon: LineChart,   hue: 'lilac', label: 'Live pricing',     sub: 'Updated each minute' },
            ].map(({ Icon, hue, label, sub }) => (
              <motion.div
                key={label}
                variants={staggerChild}
                whileHover={{ y: -2 }}
                transition={spring}
                className="flex items-center gap-3 min-w-0"
              >
                <div className={`icon-chip chip-${hue}`}>
                  <Icon
                    size={18}
                    strokeWidth={2.2}
                    style={{ color: `rgb(var(--hue-${hue}))` }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold text-ink truncate tracking-tight">{label}</div>
                  <div className="text-[12px] text-ink-muted truncate font-medium">{sub}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>

        {/* ===== LIVE MARKET ACTIVITY ===== */}
        <Reveal className="mb-6">
          <LiveActivityFeed />
        </Reveal>

        {/* ===== TRENDING ===== */}
        <Reveal className="mb-10">
          <div className="flex items-end justify-between mb-4 px-1">
            <div>
              <h2 className="text-[17px] font-bold text-ink tracking-tight">Trending now</h2>
              <p className="text-[12.5px] text-ink-muted mt-0.5 font-medium">
                Most watched skins in the last 24h
              </p>
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              className="hidden sm:flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink font-semibold transition-colors"
            >
              View all <ArrowRight size={13} />
            </button>
          </div>

          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="shown"
            viewport={{ once: true, margin: '0px 0px -80px 0px' }}
            className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2 snap-x"
          >
            {hotItemsLoading || !hotItems?.length
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="shrink-0 w-[240px] snap-start">
                    <SkinCardSkeleton />
                  </div>
                ))
              : hotItems.slice(0, 8).map((it: any) => (
                  <motion.div
                    key={it.id}
                    variants={staggerChild}
                    whileHover={{ y: -4 }}
                    transition={spring}
                    className="shrink-0 w-[240px] snap-start"
                  >
                    <SkinCard
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
        </Reveal>

        {/* ===== CATEGORY FILTER + GRID ===== */}
        <Reveal className="mb-12">
          <div className="flex items-end justify-between mb-5 px-1 flex-wrap gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-ink tracking-tight">Browse the market</h2>
              <p className="text-[12.5px] text-ink-muted mt-0.5 font-medium">
                Curated listings across every category
              </p>
            </div>
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/marketplace')}
              className="h-10 px-4 rounded-full bg-subtle text-ink text-[13px] font-semibold flex items-center gap-1.5 transition-colors"
            >
              Open marketplace <ArrowRight size={13} strokeWidth={2.4} />
            </motion.button>
          </div>

          {/* category pills with motion underline */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3 mb-5 -mx-1 px-1">
            {categoryKeys.map((key) => {
              const label = key === 'featured' ? 'Featured' : weaponCategories[key]?.name || key;
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <SkinCardSkeleton key={i} />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-[14px] text-ink-muted font-medium">
                No listings in this category yet.
              </p>
            </div>
          ) : (
            <motion.div
              variants={staggerParent}
              initial="hidden"
              whileInView="shown"
              viewport={{ once: true, margin: '0px 0px -120px 0px' }}
              key={activeCat /* restart stagger on category switch */}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {visibleItems.map((item: any) => (
                <motion.div key={item.id} variants={staggerChild} whileHover={{ y: -4 }} transition={spring}>
                  <SkinCard
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

        {/* ===== CTA ===== */}
        <Reveal>
          <div className="card p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <motion.div
              aria-hidden
              className="absolute -bottom-24 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(closest-side, rgb(var(--accent) / 0.14), transparent 65%)',
              }}
              animate={reduceMotion ? {} : { scale: [1, 1.08, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative">
              <h3 className="text-[22px] font-bold tracking-tight text-ink">
                Start trading in under a minute
              </h3>
              <p className="text-[14px] text-ink-muted font-medium mt-1.5 max-w-xl">
                Sign in with Steam, connect your inventory, list or buy. No verification fees, no
                hidden steps.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 relative">
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/marketplace')}
                className="h-12 px-6 rounded-full bg-accent text-on-accent font-bold text-[14px]"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.65)' }}
              >
                Explore market
              </motion.button>
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/trading-guide')}
                className="h-12 px-6 rounded-full bg-subtle text-ink font-semibold text-[14px]"
              >
                How it works
              </motion.button>
            </div>
          </div>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
