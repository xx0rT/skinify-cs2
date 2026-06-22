import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Package,
  X,
  Grid2x2,
  List as ListIcon,
  ChevronDown,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useFilterStore } from '../store/filterStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { SkinCard, SkinCardSkeleton } from '../components/ui/SkinCard';
import { weaponCategories } from '../data/weaponCategories';
import { MOCK_MARKET_ITEMS } from '../data/mockMarketItems';
import { spring, tap } from '../lib/motion';

/* Shared demo listings — used when the live `useMarketplaceItems()` hook
   returns nothing. ItemDetailPage uses the same dataset so deep links to
   `/item/mock-X` work too. */
const MOCK_ITEMS = MOCK_MARKET_ITEMS;

type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'float-asc' | 'float-desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'price-asc', label: 'Price · low to high' },
  { key: 'price-desc', label: 'Price · high to low' },
  { key: 'float-asc', label: 'Float · best' },
  { key: 'float-desc', label: 'Float · worst' },
];

const TYPES = ['Rifle', 'Pistol', 'SMG', 'Shotgun', 'Sniper Rifle', 'Knife', 'Gloves'];
const RARITIES = [
  { key: 'Covert', color: '#EB4B4B' },
  { key: 'Classified', color: '#D32CE6' },
  { key: 'Restricted', color: '#8847FF' },
  { key: 'Mil-Spec', color: '#4B69FF' },
  { key: 'Industrial', color: '#5E98D9' },
  { key: 'Consumer', color: '#B0C3D9' },
];
const EXTERIORS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];

const staggerParent = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
};
const staggerChild = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: spring },
};

import useDocumentMeta, {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  itemListJsonLd,
} from '../hooks/useDocumentMeta';

const MarketplacePage: React.FC = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const { items: liveItems, loading, error, refetch } = useMarketplaceItems();
  const { formatPrice } = useCurrencyStore();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist, fetchWishlist } = useWishlistStore();
  const {
    searchQuery,
    setSearchQuery,
    priceRange,
    setPriceRange,
    clearFilters,
  } = useFilterStore();

  const [sort, setSort] = useState<SortKey>('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  // Default open on desktop, closed on mobile so the page renders to the
  // grid immediately on small screens (where a fixed sidebar would be a wall).
  const [filtersOpen, setFiltersOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );
  const [sortMenu, setSortMenu] = useState(false);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [activeRarities, setActiveRarities] = useState<Set<string>>(new Set());
  const [activeExteriors, setActiveExteriors] = useState<Set<string>>(new Set());
  const [special, setSpecial] = useState<{ stattrak: boolean; souvenir: boolean }>({
    stattrak: false,
    souvenir: false,
  });
  /* Float / paint-seed / pattern advanced filters. Float is a range
     slider (0.00–1.00); seed + pattern are exact-match number inputs.
     Empty string means "no filter on this field". */
  const [floatRange, setFloatRange] = useState<[number, number]>([0, 1]);
  const [paintSeedQuery, setPaintSeedQuery] = useState('');
  const [patternQuery, setPatternQuery] = useState('');

  useEffect(() => {
    if (user?.steamId) fetchWishlist(user.steamId);
  }, [user?.steamId]);

  useEffect(() => {
    const q = (location.state as any)?.searchQuery;
    if (q) {
      setSearchQuery(q);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setSearchQuery]);

  /* Fall back to mocks when there are no live listings so the page demos
     cleanly. `isMock` is exposed in the empty-state hint so users know
     the items aren't real. */
  const items = useMemo(() => {
    if (loading) return [];
    return liveItems && liveItems.length > 0 ? liveItems : MOCK_ITEMS;
  }, [liveItems, loading]);
  const isMock = !loading && (!liveItems || liveItems.length === 0);

  const maxPrice = useMemo(() => {
    if (!items?.length) return 100000;
    return Math.max(...items.map((i: any) => i.price || 0));
  }, [items]);

  const toggleSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    val: string,
  ) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });

  const filtered = useMemo(() => {
    if (!items) return [];
    let out = items.filter((it: any) => {
      const name = (it.name || it.market_name || '').toLowerCase();
      if (searchQuery && !name.includes(searchQuery.toLowerCase())) return false;
      if (it.price < priceRange[0] || it.price > priceRange[1]) return false;

      if (activeTypes.size > 0) {
        const t = (it.type || '').toLowerCase();
        if (!Array.from(activeTypes).some((s) => t.includes(s.toLowerCase()))) return false;
      }
      if (activeRarities.size > 0) {
        const r = (it.rarity || '').toLowerCase();
        if (!Array.from(activeRarities).some((s) => r.includes(s.toLowerCase()))) return false;
      }
      if (activeExteriors.size > 0) {
        const e = (it.condition || '').toLowerCase();
        if (!Array.from(activeExteriors).some((s) => e.includes(s.toLowerCase()))) return false;
      }
      if (special.stattrak && it.special !== 'stattrak') return false;
      if (special.souvenir && it.special !== 'souvenir') return false;

      /* Float range — apply only when narrower than 0..1 */
      if (floatRange[0] > 0 || floatRange[1] < 1) {
        const f = it.float != null ? Number(it.float) : null;
        if (f == null || !Number.isFinite(f)) return false;
        if (f < floatRange[0] || f > floatRange[1]) return false;
      }

      /* Paint seed exact match */
      if (paintSeedQuery.trim()) {
        const want = paintSeedQuery.trim();
        const have = String(
          (it as any).paintSeed ?? (it as any).paint_seed ?? '',
        );
        if (have !== want) return false;
      }

      /* Pattern template exact match */
      if (patternQuery.trim()) {
        const want = patternQuery.trim();
        const have = String(
          (it as any).patternTemplate ?? (it as any).pattern_template ?? '',
        );
        if (have !== want) return false;
      }

      return true;
    });

    switch (sort) {
      case 'price-asc':
        out = [...out].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        out = [...out].sort((a, b) => b.price - a.price);
        break;
      case 'float-asc':
        out = [...out].sort((a, b) => (Number(a.float) || 1) - (Number(b.float) || 1));
        break;
      case 'float-desc':
        out = [...out].sort((a, b) => (Number(b.float) || 0) - (Number(a.float) || 0));
        break;
      default:
        out = [...out].sort(
          (a, b) =>
            new Date(b.listed_at || 0).getTime() - new Date(a.listed_at || 0).getTime(),
        );
    }
    return out;
  }, [items, searchQuery, priceRange, activeTypes, activeRarities, activeExteriors, special, sort, floatRange, paintSeedQuery, patternQuery]);

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    activeTypes.size +
    activeRarities.size +
    activeExteriors.size +
    (special.stattrak ? 1 : 0) +
    (special.souvenir ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0) +
    (floatRange[0] > 0 || floatRange[1] < 1 ? 1 : 0) +
    (paintSeedQuery.trim() ? 1 : 0) +
    (patternQuery.trim() ? 1 : 0);

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
        addToast({ type: 'warning', title: 'Login required', message: 'Sign in to use wishlist.' });
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

  const resetAll = () => {
    clearFilters();
    setActiveTypes(new Set());
    setActiveRarities(new Set());
    setActiveExteriors(new Set());
    setSpecial({ stattrak: false, souvenir: false });
    setFloatRange([0, 1]);
    setPaintSeedQuery('');
    setPatternQuery('');
  };

  /* Per-page SEO. Emits CollectionPage + BreadcrumbList + ItemList of
     the first 30 visible listings. Crawl-friendly without ballooning
     the JSON payload. */
  useDocumentMeta({
    title: 'Browse CS2 Skins — Marketplace · Skinify',
    description:
      'Browse live CS2 skin listings. Filter by weapon, rarity, float, stickers and condition. 0% buyer fees, escrow-protected trades, instant Steam delivery.',
    canonical: 'https://skinify.gg/marketplace',
    keywords:
      'cs2 marketplace, browse cs2 skins, cs2 skin prices, ak-47 skins, awp skins, karambit, m4a4 skins, m4a1-s skins, p2p cs2 marketplace',
    jsonLd: [
      collectionPageJsonLd({
        name: 'CS2 Marketplace',
        url: 'https://skinify.gg/marketplace',
        description:
          'Browse live CS2 skin listings on Skinify. AK-47, AWP, M4A4, Karambit, M9 Bayonet, gloves and cases.',
      }),
      breadcrumbJsonLd([
        { name: 'Home', url: 'https://skinify.gg/' },
        { name: 'Marketplace', url: 'https://skinify.gg/marketplace' },
      ]),
      itemListJsonLd({
        name: 'CS2 Listings',
        url: 'https://skinify.gg/marketplace',
        items: filtered.slice(0, 30).map((it: any) => ({
          name: it.name || it.market_name || 'CS2 item',
          url: `https://skinify.gg/item/${it.id}`,
          image: it.image,
          price: Number(it.price || 0),
          currency: 'CZK',
        })),
      }),
    ],
  });

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16">
        {/* ===== HEADER ===== */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex flex-wrap items-end justify-between gap-4 mb-5"
        >
          <div>
            <span className="label-eyebrow">Marketplace</span>
            <h1 className="text-[26px] sm:text-[32px] font-bold text-ink tracking-tight leading-none mt-2">
              CS2 Skin Marketplace
            </h1>
            <p className="text-[13px] sm:text-[14px] text-ink-muted mt-1.5 font-medium">
              {loading
                ? 'Loading listings…'
                : `${filtered.length.toLocaleString()} of ${items.length.toLocaleString()} listings`}
              {isMock && (
                <span className="ml-2 pill bg-accent-soft text-ink text-[10px] uppercase tracking-wider">
                  Demo
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Categories funnel entry — All categories → Category → Weapon → Skins */}
            <motion.button
              whileTap={tap}
              whileHover={{ y: -1 }}
              onClick={() => navigate('/weapons')}
              className="h-11 px-4 rounded-full bg-subtle hover:bg-subtle/70 text-ink text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors"
              title="Browse by category"
            >
              <span>Categories</span>
              <ChevronDown size={13} strokeWidth={2.4} className="text-ink-muted -rotate-90" />
            </motion.button>

            <motion.button
              whileTap={tap}
              onClick={refetch}
              className="icon-chip hover:bg-bg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} strokeWidth={2} className={loading ? 'animate-spin text-ink-muted' : 'text-ink-muted'} />
            </motion.button>

            {/* View toggle — md+ only (mobile defaults to grid, no need to switch) */}
            <div className="hidden md:flex card-flat h-11 p-1 gap-0.5">
              <motion.button
                whileTap={tap}
                onClick={() => setView('grid')}
                className={`h-full px-3 rounded-full grid place-items-center transition-colors ${
                  view === 'grid' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Grid2x2 size={16} strokeWidth={view === 'grid' ? 2.4 : 2} />
              </motion.button>
              <motion.button
                whileTap={tap}
                onClick={() => setView('list')}
                className={`h-full px-3 rounded-full grid place-items-center transition-colors ${
                  view === 'list' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <ListIcon size={16} strokeWidth={view === 'list' ? 2.4 : 2} />
              </motion.button>
            </div>

            <div className="relative">
              <motion.button
                whileTap={tap}
                onClick={() => setSortMenu((v) => !v)}
                aria-label="Sort"
                title="Sort"
                className="h-11 sm:px-4 px-0 w-11 sm:w-auto rounded-full bg-subtle hover:bg-subtle/70 text-[13px] text-ink font-semibold flex items-center justify-center sm:gap-2 transition-colors"
              >
                <ArrowUpDown size={14} strokeWidth={2.2} />
                <span className="hidden sm:inline">
                  {SORT_OPTIONS.find((o) => o.key === sort)?.label}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={2.2}
                  className={`hidden sm:block transition-transform ${sortMenu ? 'rotate-180' : ''}`}
                />
              </motion.button>
              <AnimatePresence>
                {sortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="card-elevated absolute right-0 mt-2 w-60 p-1.5 z-30"
                    onMouseLeave={() => setSortMenu(false)}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSort(opt.key);
                          setSortMenu(false);
                        }}
                        className={`w-full h-10 px-3 rounded-2xl text-left text-[13px] font-semibold flex items-center justify-between transition-colors ${
                          sort === opt.key
                            ? 'bg-accent-soft text-ink'
                            : 'text-ink-muted hover:bg-subtle hover:text-ink'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileTap={tap}
              onClick={() => setFiltersOpen((v) => !v)}
              className={`h-11 sm:px-4 px-0 w-11 sm:w-auto rounded-full text-[13px] font-semibold flex items-center justify-center sm:gap-2 transition-colors ${
                filtersOpen ? 'bg-accent text-on-accent' : 'bg-subtle text-ink hover:bg-subtle/70'
              }`}
            >
              <SlidersHorizontal size={14} strokeWidth={2.4} />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span
                  className={`ml-1 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold grid place-items-center ${
                    filtersOpen ? 'bg-on-accent text-accent' : 'bg-accent text-on-accent'
                  }`}
                  style={
                    filtersOpen ? { backgroundColor: 'rgb(var(--on-accent))', color: 'rgb(var(--accent))' } : undefined
                  }
                >
                  {activeFilterCount}
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* ===== SEARCH BAR ===== */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.06 }}
          className="card p-2 mb-4 flex items-center gap-2"
        >
          <div className="flex-1 flex items-center gap-3 px-4 h-12">
            <Search size={18} strokeWidth={2} className="text-ink-muted shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skins, weapons, collections…"
              className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[14px] font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-7 h-7 rounded-lg bg-subtle hover:bg-bg grid place-items-center text-ink-muted hover:text-ink transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={resetAll}
              className="h-12 px-4 rounded-2xl bg-subtle hover:bg-bg text-[13px] text-ink-muted hover:text-ink font-semibold transition-colors"
            >
              Clear all
            </button>
          )}
        </motion.div>

        <div className={`grid gap-4 ${filtersOpen ? 'lg:grid-cols-[280px_1fr]' : 'grid-cols-1'}`}>
          {/* ===== FILTERS — sidebar on lg+, bottom-sheet on <lg =====
              On large screens this is an in-flow sticky sidebar. Below lg we
              promote the same content to a fixed bottom-sheet so it doesn't
              consume the viewport above the results grid. The backdrop +
              sheet animate together, are closed by default on mobile, and
              get a top drag handle so the modal pattern is obvious.
          */}
          <AnimatePresence initial={false}>
            {filtersOpen && (
              <>
                {/* Backdrop — mobile only */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setFiltersOpen(false)}
                  className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
                  aria-hidden
                />
                <motion.aside
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="
                    fixed bottom-0 left-0 right-0 z-50
                    rounded-t-3xl rounded-b-none
                    max-h-[82vh] overflow-y-auto scrollbar-thin
                    card p-5
                    lg:static lg:z-auto
                    lg:rounded-3xl
                    lg:self-start lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)]
                  "
                >
                  {/* Header — mobile: drag-handle style; desktop: title +
                      close X so users can collapse the sidebar without
                      hunting for the toolbar toggle. */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] font-bold text-ink tracking-tight">Filters</span>
                    <button
                      onClick={() => setFiltersOpen(false)}
                      className="h-8 w-8 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
                      aria-label="Close filters"
                    >
                      <X size={14} strokeWidth={2.4} />
                    </button>
                  </div>
                {/* Price */}
                <FilterSection title="Price range">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([Math.max(0, Number(e.target.value) || 0), priceRange[1]])
                      }
                      className="w-full h-10 px-3 rounded-xl bg-subtle text-ink text-[13px] font-medium outline-none focus:bg-bg focus:ring-2 focus:ring-accent/30 transition-all"
                      placeholder="Min"
                    />
                    <span className="text-ink-dim">—</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 0])}
                      className="w-full h-10 px-3 rounded-xl bg-subtle text-ink text-[13px] font-medium outline-none focus:bg-bg focus:ring-2 focus:ring-accent/30 transition-all"
                      placeholder="Max"
                    />
                  </div>
                  <div className="text-[11px] text-ink-dim mt-2 font-medium">
                    {formatPrice(priceRange[0])} – {formatPrice(priceRange[1])}
                  </div>
                </FilterSection>

                <FilterSection title="Item type">
                  <div className="flex flex-wrap gap-1.5">
                    {TYPES.map((t) => {
                      const active = activeTypes.has(t);
                      return (
                        <motion.button
                          whileTap={tap}
                          key={t}
                          onClick={() => toggleSet(setActiveTypes, t)}
                          className={`h-8 px-3 rounded-full text-[12px] font-semibold transition-colors ${
                            active
                              ? 'bg-accent text-on-accent'
                              : 'bg-subtle text-ink-muted hover:bg-bg hover:text-ink'
                          }`}
                        >
                          {t}
                        </motion.button>
                      );
                    })}
                  </div>
                </FilterSection>

                <FilterSection title="Rarity">
                  <div className="space-y-1">
                    {RARITIES.map((r) => {
                      const active = activeRarities.has(r.key);
                      return (
                        <motion.button
                          whileTap={tap}
                          key={r.key}
                          onClick={() => toggleSet(setActiveRarities, r.key)}
                          className={`w-full h-9 px-3 rounded-2xl flex items-center gap-2.5 text-[12.5px] font-semibold transition-colors ${
                            active ? 'bg-accent-soft text-ink' : 'text-ink-muted hover:bg-subtle hover:text-ink'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: r.color }}
                          />
                          <span className="flex-1 text-left">{r.key}</span>
                          {active && <span className="text-accent">✓</span>}
                        </motion.button>
                      );
                    })}
                  </div>
                </FilterSection>

                <FilterSection title="Exterior">
                  <div className="space-y-1">
                    {EXTERIORS.map((e) => {
                      const active = activeExteriors.has(e);
                      return (
                        <motion.button
                          whileTap={tap}
                          key={e}
                          onClick={() => toggleSet(setActiveExteriors, e)}
                          className={`w-full h-9 px-3 rounded-2xl text-left text-[12.5px] font-semibold transition-colors ${
                            active ? 'bg-accent-soft text-ink' : 'text-ink-muted hover:bg-subtle hover:text-ink'
                          }`}
                        >
                          {e}
                        </motion.button>
                      );
                    })}
                  </div>
                </FilterSection>

                <FilterSection title="Float (exterior wear)">
                  <div className="px-1 pb-1">
                    {/* Dual-thumb slider — two stacked range inputs share a
                        track so users can clamp both min and max. The
                        active range is rendered as an accent strip
                        underneath via inline CSS. */}
                    <div className="relative h-6 mb-2">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-subtle rounded-full" />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-1 bg-accent rounded-full"
                        style={{
                          left: `${floatRange[0] * 100}%`,
                          right: `${(1 - floatRange[1]) * 100}%`,
                        }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.001}
                        value={floatRange[0]}
                        onChange={(e) => {
                          const v = Math.min(Number(e.target.value), floatRange[1] - 0.001);
                          setFloatRange([v, floatRange[1]]);
                        }}
                        className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
                      />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.001}
                        value={floatRange[1]}
                        onChange={(e) => {
                          const v = Math.max(Number(e.target.value), floatRange[0] + 0.001);
                          setFloatRange([floatRange[0], v]);
                        }}
                        className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.0001}
                        value={floatRange[0]}
                        onChange={(e) =>
                          setFloatRange([
                            Math.max(0, Math.min(Number(e.target.value) || 0, floatRange[1] - 0.001)),
                            floatRange[1],
                          ])
                        }
                        className="h-9 px-2.5 rounded-xl bg-subtle text-ink text-[12px] font-mono tabular-nums outline-none focus:ring-2 focus:ring-accent/40 min-w-0"
                      />
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.0001}
                        value={floatRange[1]}
                        onChange={(e) =>
                          setFloatRange([
                            floatRange[0],
                            Math.min(1, Math.max(Number(e.target.value) || 0, floatRange[0] + 0.001)),
                          ])
                        }
                        className="h-9 px-2.5 rounded-xl bg-subtle text-ink text-[12px] font-mono tabular-nums outline-none focus:ring-2 focus:ring-accent/40 min-w-0"
                      />
                    </div>
                    <div className="text-[10.5px] text-ink-dim font-medium mt-1.5 tabular-nums">
                      {floatRange[0].toFixed(4)} – {floatRange[1].toFixed(4)}
                    </div>
                  </div>
                </FilterSection>

                <FilterSection title="Paint seed">
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 661"
                    value={paintSeedQuery}
                    onChange={(e) => setPaintSeedQuery(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-subtle text-ink text-[13px] font-mono tabular-nums outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </FilterSection>

                <FilterSection title="Pattern template">
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 268"
                    value={patternQuery}
                    onChange={(e) => setPatternQuery(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-subtle text-ink text-[13px] font-mono tabular-nums outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </FilterSection>

                <FilterSection title="Special">
                  <label className="flex items-center justify-between h-10 px-1 cursor-pointer">
                    <span className="text-[12.5px] text-ink font-semibold">StatTrak™</span>
                    <Toggle
                      checked={special.stattrak}
                      onChange={(v) => setSpecial((s) => ({ ...s, stattrak: v }))}
                    />
                  </label>
                  <label className="flex items-center justify-between h-10 px-1 cursor-pointer">
                    <span className="text-[12.5px] text-ink font-semibold">Souvenir</span>
                    <Toggle
                      checked={special.souvenir}
                      onChange={(v) => setSpecial((s) => ({ ...s, souvenir: v }))}
                    />
                  </label>
                </FilterSection>
              </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* ===== RESULTS ===== */}
          <div className="min-w-0">
            {error && !isMock ? (
              <div className="card p-12 text-center">
                <Package className="mx-auto text-ink-muted mb-3" size={28} />
                <p className="text-ink text-[15px] font-bold">Could not load listings</p>
                <p className="text-ink-muted text-[13px] mt-1 font-medium">{error}</p>
                <button
                  onClick={refetch}
                  className="mt-5 h-11 px-5 rounded-full bg-accent text-on-accent font-bold transition-opacity hover:opacity-90"
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div
                className={
                  view === 'grid'
                    ? `market-grid grid grid-cols-2 sm:grid-cols-3 isolate ${
                      /* With filters open: sidebar takes ~280px of horizontal
                         space → max 5 columns on xl screens. With filters
                         closed: the grid spans the full width → 6 columns
                         on xl. Tracking these against `filtersOpen` keeps
                         the cards a consistent visual size regardless of
                         the sidebar state. */
                      filtersOpen
                        ? 'lg:grid-cols-4 xl:grid-cols-5'
                        : 'lg:grid-cols-5 xl:grid-cols-6'
                    }`
                    : 'space-y-2'
                }
              >
                {Array.from({ length: 12 }).map((_, i) =>
                  view === 'grid' ? (
                    <SkinCardSkeleton key={i} />
                  ) : (
                    <div key={i} className="rounded-2xl skel h-24" />
                  ),
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="card p-16 text-center">
                <Package className="mx-auto text-ink-muted mb-4" size={32} />
                <p className="text-ink text-[16px] font-bold">No listings match your filters</p>
                <p className="text-ink-muted text-[13px] mt-1 font-medium">
                  Try widening the price range or clearing some filters.
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetAll}
                    className="mt-5 h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink font-semibold transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : view === 'grid' ? (
              <motion.div
                variants={staggerParent}
                initial="hidden"
                animate="shown"
                key={`grid-${sort}-${activeTypes.size}-${activeRarities.size}`}
                /* Light mode: 1.5px gaps painted gray via the grid
                   container background showing through. Dark mode keeps
                   the original flush layout. Custom class lives in
                   index.css so the gray reads against white tiles
                   without leaking into the dark theme. */
                className="market-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 isolate"
              >
                {filtered.map((item: any) => (
                  <motion.div
                    key={item.id}
                    variants={staggerChild}
                    transition={spring}
                  >
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
            ) : (
              <motion.div
                variants={staggerParent}
                initial="hidden"
                animate="shown"
                className="space-y-2"
              >
                {filtered.map((item: any) => (
                  <motion.div key={item.id} variants={staggerChild}>
                    <SkinCard
                      variant="list"
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
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const FilterSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="mb-5 last:mb-0">
    <div className="label-eyebrow mb-3">{title}</div>
    {children}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({
  checked,
  onChange,
}) => (
  <motion.button
    whileTap={tap}
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-10 rounded-full transition-colors ${
      checked ? 'bg-accent' : 'bg-subtle'
    }`}
  >
    <motion.span
      animate={{ x: checked ? 16 : 0 }}
      transition={spring}
      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow-sm"
    />
  </motion.button>
);

export default MarketplacePage;
