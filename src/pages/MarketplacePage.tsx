import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  AlertCircle,
  Package,
  X,
  Filter,
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
import Header from '../components/Header';
import Footer from '../components/Footer';
import { SkinCard } from '../components/ui/SkinCard';
import { weaponCategories } from '../data/weaponCategories';

type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'float-asc' | 'float-desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'price-asc', label: 'Price · low to high' },
  { key: 'price-desc', label: 'Price · high to low' },
  { key: 'float-asc', label: 'Float · best' },
  { key: 'float-desc', label: 'Float · worst' },
];

const TYPES = ['Rifle', 'Pistol', 'SMG', 'Shotgun', 'Sniper', 'Machine Gun', 'Knife', 'Gloves'];

const RARITIES = [
  { key: 'Covert', color: '#EB4B4B' },
  { key: 'Classified', color: '#D32CE6' },
  { key: 'Restricted', color: '#8847FF' },
  { key: 'Mil-Spec', color: '#4B69FF' },
  { key: 'Industrial', color: '#5E98D9' },
  { key: 'Consumer', color: '#B0C3D9' },
];

const EXTERIORS = [
  'Factory New',
  'Minimal Wear',
  'Field-Tested',
  'Well-Worn',
  'Battle-Scarred',
];

const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, loading, error, refetch } = useMarketplaceItems();
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [sortMenu, setSortMenu] = useState(false);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [activeRarities, setActiveRarities] = useState<Set<string>>(new Set());
  const [activeExteriors, setActiveExteriors] = useState<Set<string>>(new Set());
  const [special, setSpecial] = useState<{ stattrak: boolean; souvenir: boolean }>({
    stattrak: false,
    souvenir: false,
  });

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

  const maxPrice = useMemo(() => {
    if (!items?.length) return 100000;
    return Math.max(...items.map((i: any) => i.price || 0));
  }, [items]);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, val: string) =>
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
        const matched = Array.from(activeTypes).some((s) => t.includes(s.toLowerCase()));
        if (!matched) return false;
      }
      if (activeRarities.size > 0) {
        const r = (it.rarity || '').toLowerCase();
        const matched = Array.from(activeRarities).some((s) => r.includes(s.toLowerCase()));
        if (!matched) return false;
      }
      if (activeExteriors.size > 0) {
        const e = (it.condition || '').toLowerCase();
        const matched = Array.from(activeExteriors).some((s) => e.includes(s.toLowerCase()));
        if (!matched) return false;
      }
      if (special.stattrak && it.special !== 'stattrak') return false;
      if (special.souvenir && it.special !== 'souvenir') return false;

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
        out = [...out].sort(
          (a, b) => (Number(a.float) || 1) - (Number(b.float) || 1),
        );
        break;
      case 'float-desc':
        out = [...out].sort(
          (a, b) => (Number(b.float) || 0) - (Number(a.float) || 0),
        );
        break;
      default:
        out = [...out].sort(
          (a, b) =>
            new Date(b.listed_at || 0).getTime() - new Date(a.listed_at || 0).getTime(),
        );
    }
    return out;
  }, [items, searchQuery, priceRange, activeTypes, activeRarities, activeExteriors, special, sort]);

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    activeTypes.size +
    activeRarities.size +
    activeExteriors.size +
    (special.stattrak ? 1 : 0) +
    (special.souvenir ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0);

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
  };

  return (
    <div className="min-h-screen text-white">
      <Header activeSection="Market" />

      <main className="md:pl-[100px] pl-4 pr-4 pt-24 pb-16 max-w-[1480px] mx-auto">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[34px] font-display font-bold text-white tracking-tight leading-tight">
              Marketplace
            </h1>
            <p className="text-[14px] text-zinc-400 mt-1">
              {loading
                ? 'Loading listings…'
                : `${filtered.length.toLocaleString()} of ${items.length.toLocaleString()} listings`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="h-11 w-11 rounded-2xl bg-white/[0.05] hover:bg-white/[0.10] text-zinc-300 hover:text-white grid place-items-center transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            <div className="flex h-11 rounded-2xl bg-white/[0.05] border border-white/[0.06] p-1">
              <button
                onClick={() => setView('grid')}
                className={`h-full px-3 rounded-xl transition-colors ${
                  view === 'grid' ? 'bg-white/[0.10] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Grid2x2 size={16} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`h-full px-3 rounded-xl transition-colors ${
                  view === 'list' ? 'bg-white/[0.10] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ListIcon size={16} />
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setSortMenu((v) => !v)}
                className="h-11 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.06] text-[13px] text-white font-medium flex items-center gap-2 transition-colors"
              >
                <ArrowUpDown size={14} />
                {SORT_OPTIONS.find((o) => o.key === sort)?.label}
                <ChevronDown size={14} className={sortMenu ? 'rotate-180' : ''} />
              </button>
              <AnimatePresence>
                {sortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 glass-strong rounded-2xl p-1.5 z-30"
                    onMouseLeave={() => setSortMenu(false)}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSort(opt.key);
                          setSortMenu(false);
                        }}
                        className={`w-full h-10 px-3 rounded-xl text-left text-[13px] font-medium flex items-center justify-between transition-colors ${
                          sort === opt.key
                            ? 'bg-accent-500/15 text-accent-300'
                            : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`h-11 px-4 rounded-2xl text-[13px] font-medium flex items-center gap-2 transition-colors ${
                filtersOpen
                  ? 'bg-white text-ink-900'
                  : 'bg-white/[0.05] hover:bg-white/[0.10] text-white border border-white/[0.06]'
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span
                  className={`ml-1 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold grid place-items-center ${
                    filtersOpen
                      ? 'bg-ink-900 text-white'
                      : 'bg-accent-500 text-white'
                  }`}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="glass rounded-3xl2 p-2 mb-4 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-3 px-4 h-12">
            <Search size={18} className="text-zinc-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skins, weapons, collections…"
              className="flex-1 bg-transparent outline-none text-white placeholder-zinc-500 text-[14px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] grid place-items-center text-zinc-400 hover:text-white transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={resetAll}
              className="h-12 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.10] text-[13px] text-zinc-300 hover:text-white font-medium transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className={`grid gap-4 ${filtersOpen ? 'lg:grid-cols-[280px_1fr]' : 'grid-cols-1'}`}>
          {/* Filters sidebar */}
          <AnimatePresence initial={false}>
            {filtersOpen && (
              <motion.aside
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="glass rounded-3xl2 p-5 self-start lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin"
              >
                {/* Price */}
                <FilterSection title="Price range">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([Math.max(0, Number(e.target.value) || 0), priceRange[1]])
                      }
                      className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] outline-none focus:border-accent-500/60 transition-colors"
                      placeholder="Min"
                    />
                    <span className="text-zinc-500">—</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], Number(e.target.value) || 0])
                      }
                      className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] outline-none focus:border-accent-500/60 transition-colors"
                      placeholder="Max"
                    />
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-2">
                    {formatPrice(priceRange[0])} – {formatPrice(priceRange[1])}
                  </div>
                </FilterSection>

                {/* Type */}
                <FilterSection title="Item type">
                  <div className="flex flex-wrap gap-1.5">
                    {TYPES.map((t) => {
                      const active = activeTypes.has(t);
                      return (
                        <button
                          key={t}
                          onClick={() => toggleSet(setActiveTypes, t)}
                          className={`h-8 px-3 rounded-xl text-[12px] font-medium transition-colors ${
                            active
                              ? 'bg-white text-ink-900'
                              : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>

                {/* Rarity */}
                <FilterSection title="Rarity">
                  <div className="space-y-1.5">
                    {RARITIES.map((r) => {
                      const active = activeRarities.has(r.key);
                      return (
                        <button
                          key={r.key}
                          onClick={() => toggleSet(setActiveRarities, r.key)}
                          className={`w-full h-9 px-3 rounded-xl flex items-center gap-2.5 text-[12.5px] font-medium transition-colors ${
                            active
                              ? 'bg-white/[0.08] text-white'
                              : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: r.color }}
                          />
                          <span className="flex-1 text-left">{r.key}</span>
                          {active && <span className="text-accent-400">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>

                {/* Exterior */}
                <FilterSection title="Exterior">
                  <div className="space-y-1.5">
                    {EXTERIORS.map((e) => {
                      const active = activeExteriors.has(e);
                      return (
                        <button
                          key={e}
                          onClick={() => toggleSet(setActiveExteriors, e)}
                          className={`w-full h-9 px-3 rounded-xl text-left text-[12.5px] font-medium transition-colors ${
                            active
                              ? 'bg-white/[0.08] text-white'
                              : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          {e}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>

                {/* Special */}
                <FilterSection title="Special">
                  <label className="flex items-center justify-between h-9 px-1 cursor-pointer">
                    <span className="text-[12.5px] text-zinc-300">StatTrak™</span>
                    <Toggle
                      checked={special.stattrak}
                      onChange={(v) => setSpecial((s) => ({ ...s, stattrak: v }))}
                    />
                  </label>
                  <label className="flex items-center justify-between h-9 px-1 cursor-pointer">
                    <span className="text-[12.5px] text-zinc-300">Souvenir</span>
                    <Toggle
                      checked={special.souvenir}
                      onChange={(v) => setSpecial((s) => ({ ...s, souvenir: v }))}
                    />
                  </label>
                </FilterSection>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Results */}
          <div className="min-w-0">
            {error ? (
              <div className="glass rounded-3xl2 p-12 text-center">
                <AlertCircle className="mx-auto text-rose-400 mb-3" size={28} />
                <p className="text-white text-[15px] font-medium">Could not load listings</p>
                <p className="text-zinc-500 text-[13px] mt-1">{error}</p>
                <button
                  onClick={refetch}
                  className="mt-5 h-11 px-5 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-semibold transition-colors"
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div
                className={
                  view === 'grid'
                    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'space-y-2'
                }
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={
                      view === 'grid'
                        ? 'rounded-3xl aspect-[3/4] skeleton'
                        : 'rounded-2xl h-24 skeleton'
                    }
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass rounded-3xl2 p-16 text-center">
                <Package className="mx-auto text-zinc-500 mb-4" size={32} />
                <p className="text-white text-[16px] font-semibold">No listings match your filters</p>
                <p className="text-zinc-500 text-[13px] mt-1">
                  Try widening the price range or clearing some filters.
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetAll}
                    className="mt-5 h-11 px-5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-medium transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((item: any) => (
                  <SkinCard
                    key={item.id}
                    item={item}
                    onView={() => navigate(`/item/${item.id}`)}
                    onAddCart={() => handleAddCart(item)}
                    onToggleWish={() => handleWish(item)}
                    wished={isInWishlist(item.id)}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((item: any) => (
                  <SkinCard
                    key={item.id}
                    variant="list"
                    item={item}
                    onView={() => navigate(`/item/${item.id}`)}
                    onAddCart={() => handleAddCart(item)}
                    onToggleWish={() => handleWish(item)}
                    wished={isInWishlist(item.id)}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
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
    <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">
      {title}
    </div>
    {children}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({
  checked,
  onChange,
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-10 rounded-full transition-colors ${
      checked ? 'bg-accent-500' : 'bg-white/[0.08]'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
        checked ? 'translate-x-4' : ''
      }`}
    />
  </button>
);

export default MarketplacePage;
