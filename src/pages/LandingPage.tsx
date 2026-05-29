import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
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
import Header from '../components/Header';
import Footer from '../components/Footer';
import LiveActivityFeed from '../components/LiveActivityFeed';
import { SkinCard, SkinCardSkeleton, rarityColor } from '../components/ui/SkinCard';

/* ---------- inspect drawer ---------- */
const InspectDrawer: React.FC<{
  item: any | null;
  onClose: () => void;
  formatPrice: (n: number) => string;
  onAddCart: () => void;
}> = ({ item, onClose, formatPrice, onAddCart }) => {
  if (!item) return null;
  const color = rarityColor(item.rarity);
  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      className="fixed top-4 right-4 bottom-4 w-[420px] max-w-[calc(100vw-2rem)] z-50 glass-strong rounded-3xl flex flex-col"
    >
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        <span
          className="text-[11px] uppercase tracking-wider font-semibold"
          style={{ color }}
        >
          {item.rarity}
        </span>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-2xl bg-white/[0.05] hover:bg-white/[0.10] text-white grid place-items-center transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="p-5 overflow-y-auto flex-1 scrollbar-thin">
        <div
          className="rounded-3xl aspect-square grid place-items-center mb-5 relative overflow-hidden"
          style={{
            background: `radial-gradient(80% 60% at 50% 30%, ${color}25, transparent 70%), rgba(255,255,255,0.02)`,
          }}
        >
          <CachedImage src={item.image} alt={item.name} className="w-4/5 h-4/5 object-contain" />
        </div>

        <h2 className="text-[22px] font-display font-bold text-white tracking-tight leading-tight">
          {item.name || item.market_name}
        </h2>
        <p className="text-[13px] text-zinc-400 mt-1">{item.condition}</p>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {[
            ['Float', item.float ? Number(item.float).toFixed(6) : '—'],
            ['Type', item.type || '—'],
            ['Pattern', item.patternTemplate || '—'],
            ['Listed', item.listed_at ? new Date(item.listed_at).toLocaleDateString() : '—'],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">{k}</div>
              <div className="text-[14px] text-white font-medium mt-1 truncate">{v as string}</div>
            </div>
          ))}
        </div>

        {item.seller?.name && (
          <div className="mt-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 grid place-items-center text-white font-semibold">
              {item.seller.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] text-zinc-500">Seller</div>
              <div className="text-[14px] text-white font-medium truncate">{item.seller.name}</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-white/[0.06]">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[13px] text-zinc-400">Price</span>
          <span className="text-[26px] font-display font-bold text-white tracking-tight">
            {formatPrice(item.price)}
          </span>
        </div>
        <button
          onClick={onAddCart}
          className="w-full h-12 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-semibold flex items-center justify-center gap-2 shadow-accent-glow transition-colors"
        >
          <ShoppingCart size={16} />
          Add to Cart
        </button>
      </div>
    </motion.aside>
  );
};

/* ---------- main page ---------- */
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
  const [inspect, setInspect] = useState<any | null>(null);

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

  const portfolio = useMemo(() => {
    const v = Number(balance || 0);
    return v;
  }, [balance]);

  // Stable callbacks so SkinCard's React.memo actually skips renders when
  // unrelated parent state changes (search, hover, scroll).
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

  return (
    <div className="min-h-screen text-white">
      <Header activeSection="Market" />

      {/* main area — leaves room for left rail (md+) and top nav */}
      <main className="md:pl-[100px] pl-4 pr-4 pt-24 pb-16 max-w-[1480px] mx-auto">
        {/* ===== HERO ===== */}
        <section
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 rise-in"
          style={{ animationDelay: '0ms' }}
        >
          {/* Hero card */}
          <div className="lg:col-span-2 relative overflow-hidden glass rounded-3xl2 p-8 md:p-10 min-h-[340px]">
            <div
              className="absolute -top-32 -right-32 w-[460px] h-[460px] rounded-full opacity-60 blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(closest-side, rgba(139,73,242,0.40), transparent)' }}
            />
            <div
              className="absolute -bottom-24 left-10 w-[280px] h-[280px] rounded-full opacity-40 blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(closest-side, rgba(120,80,255,0.30), transparent)' }}
            />

            <div className="relative grid md:grid-cols-[1.15fr_0.85fr] gap-6 h-full items-center">
              {/* copy */}
              <div className="flex flex-col">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[12px] font-medium text-zinc-300 self-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live · {(marketplaceItems?.length || 0).toLocaleString()} listings
                </span>
                <h1 className="mt-5 text-[40px] md:text-[52px] leading-[1.02] font-display font-bold tracking-tight">
                  Trade CS2 skins.
                  <br />
                  <span className="bg-gradient-to-br from-white via-white to-accent-300 bg-clip-text text-transparent">
                    Instantly, fairly.
                  </span>
                </h1>
                <p className="mt-4 max-w-lg text-[14.5px] text-zinc-400 leading-relaxed">
                  Premium peer-to-peer marketplace. 0% trading fees, escrow protection, instant
                  payouts. Built for collectors and traders.
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-7">
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="h-12 px-6 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-semibold flex items-center gap-2 shadow-accent-glow transition-colors"
                  >
                    Browse market <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => navigate('/profile?tab=inventory')}
                    className="h-12 px-6 rounded-2xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-white font-medium transition-colors"
                  >
                    Sell an item
                  </button>
                </div>
              </div>

              {/* featured item showcase (real data when available) */}
              {!hotItemsLoading && hotItems?.[0] ? (
                <button
                  onClick={() => navigate(`/item/${hotItems[0].id}`)}
                  className="hidden md:block relative group text-left rounded-3xl2 overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                >
                  <div className="relative aspect-[5/4] grid place-items-center p-5">
                    <div
                      className="absolute inset-6 rounded-3xl blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"
                      style={{
                        background:
                          'radial-gradient(60% 50% at 50% 35%, rgba(139,73,242,0.40), transparent 70%)',
                      }}
                    />
                    <img
                      src={hotItems[0].image}
                      alt={hotItems[0].name}
                      className="relative w-full h-full object-contain drop-shadow-2xl group-hover:scale-[1.04] transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 h-7 px-2.5 rounded-xl bg-black/40 backdrop-blur-md text-[10.5px] uppercase tracking-wider font-bold text-accent-300 border border-accent-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                      Featured
                    </span>
                  </div>
                  <div className="px-4 pb-4 pt-1 border-t border-white/[0.05]">
                    <div className="text-[12.5px] text-zinc-500 truncate">
                      {hotItems[0].condition || 'Field-Tested'}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <h3 className="text-[13.5px] font-semibold text-white truncate">
                        {hotItems[0].name || hotItems[0].market_name}
                      </h3>
                      <div className="text-[15px] font-display font-bold text-white tracking-tight tabular-nums shrink-0">
                        {formatPrice(hotItems[0].price)}
                      </div>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="hidden md:block rounded-3xl2 aspect-[5/4] skeleton" />
              )}
            </div>
          </div>

          {/* Portfolio / quick stats card */}
          <div className="glass rounded-3xl2 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] uppercase tracking-wider text-zinc-500 font-semibold">
                {user ? 'Your portfolio' : 'Marketplace volume'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold">
                +2.4%
              </span>
            </div>
            <div className="text-[40px] font-display font-bold text-white tracking-tight leading-none mt-2">
              {user ? formatPrice(portfolio) : formatPrice(36714736)}
            </div>
            <div className="text-[13px] text-zinc-500 mt-1">
              {user ? 'Available balance' : 'Total volume traded'}
            </div>

            {/* mini sparkline placeholder */}
            <div className="mt-5 mb-4 h-16 rounded-2xl bg-white/[0.03] overflow-hidden relative">
              <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#8B49F2" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#8B49F2" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,40 L20,38 L40,30 L60,33 L80,22 L100,25 L120,18 L140,20 L160,10 L180,14 L200,8 L200,60 L0,60 Z"
                  fill="url(#spark)"
                />
                <path
                  d="M0,40 L20,38 L40,30 L60,33 L80,22 L100,25 L120,18 L140,20 L160,10 L180,14 L200,8"
                  fill="none"
                  stroke="#8B49F2"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              {[
                ['Fee', '0%'],
                ['Listings', `${(marketplaceItems?.length || 60794).toLocaleString()}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3">
                  <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">{k}</div>
                  <div className="text-[15px] font-semibold text-white mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== LIVE MARKET ACTIVITY ===== */}
        <div className="rise-in" style={{ animationDelay: '80ms' }}>
          <LiveActivityFeed className="mb-8" />
        </div>


        {/* ===== TRENDING / HOT ===== */}
        <section className="mb-10 rise-in" style={{ animationDelay: '160ms' }}>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-[22px] font-display font-bold text-white tracking-tight">
                Trending now
              </h2>
              <p className="text-[13px] text-zinc-500 mt-0.5">Most watched skins in the last 24h</p>
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              className="hidden sm:flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-white transition-colors"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>

          <div
            className={`flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2 snap-x ${
              hotItemsLoading || !hotItems?.length ? '' : 'rise-in-stagger'
            }`}
          >
            {hotItemsLoading || !hotItems?.length
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="shrink-0 w-[230px] snap-start">
                    <SkinCardSkeleton />
                  </div>
                ))
              : hotItems.slice(0, 8).map((it: any) => (
                  <div key={it.id} className="shrink-0 w-[230px] snap-start">
                    <SkinCard
                      item={it}
                      onView={() => setInspect(it)}
                      onAddCart={() => handleAddCart(it)}
                      onToggleWish={() => handleWish(it)}
                      wished={isInWishlist(it.id)}
                      formatPrice={formatPrice}
                    />
                  </div>
                ))}
          </div>
        </section>

        {/* ===== CATEGORY FILTER + GRID ===== */}
        <section className="mb-12 rise-in" style={{ animationDelay: '240ms' }}>
          <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-[22px] font-display font-bold text-white tracking-tight">
                Browse the market
              </h2>
              <p className="text-[13px] text-zinc-500 mt-0.5">
                Curated listings, ranked by price-to-float value
              </p>
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              className="h-10 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.10] text-[13px] text-white font-medium flex items-center gap-1.5 transition-colors"
            >
              Open marketplace <ArrowRight size={14} />
            </button>
          </div>

          {/* category pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3 mb-5 -mx-1 px-1">
            {categoryKeys.map((key) => {
              const label = key === 'featured' ? 'Featured' : weaponCategories[key]?.name || key;
              const active = activeCat === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCat(key)}
                  className={`h-10 px-4 rounded-2xl text-[13px] font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-white text-ink-900 shadow-soft'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                  }`}
                >
                  {label}
                </button>
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
            <div className="glass rounded-3xl2 p-12 text-center">
              <Search size={28} className="mx-auto text-zinc-500 mb-3" />
              <p className="text-zinc-400 text-[14px]">No listings in this category yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 rise-in-stagger">
              {visibleItems.map((item: any) => (
                <SkinCard
                  key={item.id}
                  item={item}
                  onView={() => setInspect(item)}
                  onAddCart={() => handleAddCart(item)}
                  onToggleWish={() => handleWish(item)}
                  wished={isInWishlist(item.id)}
                  formatPrice={formatPrice}
                />
              ))}
            </div>
          )}
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="glass rounded-3xl2 p-8 md:p-10 relative overflow-hidden mb-6">
          <div
            className="absolute -inset-px rounded-3xl2 pointer-events-none opacity-50"
            style={{
              background:
                'radial-gradient(40% 80% at 100% 50%, rgba(139,73,242,0.30), transparent 70%)',
            }}
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-[24px] font-display font-bold text-white tracking-tight">
                Start trading in under a minute
              </h3>
              <p className="text-[14px] text-zinc-400 mt-1 max-w-xl">
                Sign in with Steam, connect your inventory, list or buy. No verification fees, no
                hidden steps.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => navigate('/marketplace')}
                className="h-12 px-6 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-semibold transition-colors shadow-accent-glow"
              >
                Explore market
              </button>
              <button
                onClick={() => navigate('/trading-guide')}
                className="h-12 px-6 rounded-2xl bg-white/[0.06] hover:bg-white/[0.10] text-white font-medium transition-colors border border-white/[0.08]"
              >
                How it works
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <InspectDrawer
        item={inspect}
        onClose={() => setInspect(null)}
        formatPrice={formatPrice}
        onAddCart={() => {
          if (inspect) handleAddCart(inspect);
          setInspect(null);
        }}
      />

      {/* dim backdrop when drawer open */}
      {inspect && (
        <div
          onClick={() => setInspect(null)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        />
      )}
    </div>
  );
};

export default LandingPage;
