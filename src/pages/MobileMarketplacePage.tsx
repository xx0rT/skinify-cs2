import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ShoppingCart,
  Heart,
  Package,
} from 'lucide-react';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useFilterStore } from '../store/filterStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { CachedImage } from '../components/ui/CachedImage';
import { rarityColor } from '../components/ui/SkinCard';

type SortKey = 'newest' | 'price-asc' | 'price-desc';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'price-asc', label: 'Price ↑' },
  { key: 'price-desc', label: 'Price ↓' },
];

const TYPES = ['Rifle', 'Pistol', 'SMG', 'Sniper', 'Knife', 'Gloves'];
const RARITIES = ['Covert', 'Classified', 'Restricted', 'Mil-Spec', 'Industrial', 'Consumer'];

const MobileMarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, loading } = useMarketplaceItems();
  const { formatPrice } = useCurrencyStore();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { addItem, items: cartItems } = useCartStore();
  const { toggleItem, isInWishlist, fetchWishlist } = useWishlistStore();
  const { searchQuery, setSearchQuery, priceRange, setPriceRange, clearFilters } = useFilterStore();

  const [sort, setSort] = useState<SortKey>('newest');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [activeRarities, setActiveRarities] = useState<Set<string>>(new Set());
  const cartCount = cartItems.length;

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

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, v: string) =>
    setter((p) => {
      const n = new Set(p);
      n.has(v) ? n.delete(v) : n.add(v);
      return n;
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
      return true;
    });
    if (sort === 'price-asc') out = [...out].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') out = [...out].sort((a, b) => b.price - a.price);
    else
      out = [...out].sort(
        (a, b) => new Date(b.listed_at || 0).getTime() - new Date(a.listed_at || 0).getTime(),
      );
    return out;
  }, [items, searchQuery, priceRange, activeTypes, activeRarities, sort]);

  const handleAdd = (item: any) => {
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
    addToast({ type: 'success', title: 'Added to cart', message: item.name || item.market_name });
  };

  const handleWish = (item: any) => {
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
  };

  const activeFilters =
    activeTypes.size + activeRarities.size + (priceRange[0] > 0 || priceRange[1] < 100000 ? 1 : 0);

  return (
    <div className="min-h-screen text-white pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-30 px-4 pt-4 pb-3 bg-ink-900/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="w-11 h-11 rounded-2xl bg-white/[0.05] grid place-items-center text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 h-11 rounded-2xl bg-white/[0.05] border border-white/[0.06] flex items-center gap-2 px-3">
            <Search size={16} className="text-zinc-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skins…"
              className="flex-1 bg-transparent outline-none text-white placeholder-zinc-500 text-[14px] min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-zinc-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => navigate('/cart')}
            className="relative w-11 h-11 rounded-2xl bg-white/[0.05] grid place-items-center text-white"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 grid place-items-center text-[10px] font-bold">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Tools row */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
          <button
            onClick={() => setFilterOpen(true)}
            className="h-9 px-3 rounded-2xl bg-white/[0.05] border border-white/[0.06] text-[12.5px] text-white font-medium flex items-center gap-1.5 shrink-0"
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFilters > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 text-[10px] font-bold grid place-items-center">
                {activeFilters}
              </span>
            )}
          </button>
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`h-9 px-3 rounded-2xl text-[12.5px] font-medium shrink-0 transition-colors ${
                sort === s.key
                  ? 'bg-white text-ink-900'
                  : 'bg-white/[0.05] text-zinc-300 border border-white/[0.06]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      {/* Results */}
      <main className="px-4 pt-3">
        <div className="text-[12px] text-zinc-500 mb-3">
          {loading ? 'Loading…' : `${filtered.length} listings`}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-3xl aspect-[3/4] skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-3xl2 p-10 text-center mt-4">
            <Package className="mx-auto text-zinc-500 mb-3" size={28} />
            <p className="text-white font-semibold text-[15px]">No matches</p>
            <p className="text-zinc-500 text-[12px] mt-1">Try clearing filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item: any) => (
              <MobileSkinCard
                key={item.id}
                item={item}
                onView={() => navigate(`/item/${item.id}`)}
                onAdd={() => handleAdd(item)}
                onWish={() => handleWish(item)}
                wished={isInWishlist(item.id)}
                formatPrice={formatPrice}
              />
            ))}
          </div>
        )}
      </main>

      {/* Filter sheet */}
      <AnimatePresence>
        {filterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
              className="fixed left-0 right-0 bottom-0 z-50 glass-strong rounded-t-3xl2 p-5 max-h-[88vh] overflow-y-auto"
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[18px] font-display font-bold text-white tracking-tight">
                  Filters
                </h3>
                <button
                  onClick={() => {
                    clearFilters();
                    setActiveTypes(new Set());
                    setActiveRarities(new Set());
                  }}
                  className="text-[13px] text-accent-400 font-medium"
                >
                  Clear all
                </button>
              </div>

              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">
                  Price
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([Math.max(0, Number(e.target.value) || 0), priceRange[1]])
                    }
                    className="w-full h-11 px-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] outline-none"
                    placeholder="Min"
                  />
                  <span className="text-zinc-500">—</span>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 0])}
                    className="w-full h-11 px-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] outline-none"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">
                  Type
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map((t) => {
                    const active = activeTypes.has(t);
                    return (
                      <button
                        key={t}
                        onClick={() => toggleSet(setActiveTypes, t)}
                        className={`h-9 px-3 rounded-2xl text-[12.5px] font-medium ${
                          active
                            ? 'bg-white text-ink-900'
                            : 'bg-white/[0.04] text-zinc-300 border border-white/[0.06]'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">
                  Rarity
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {RARITIES.map((r) => {
                    const active = activeRarities.has(r);
                    return (
                      <button
                        key={r}
                        onClick={() => toggleSet(setActiveRarities, r)}
                        className={`h-9 px-3 rounded-2xl text-[12.5px] font-medium flex items-center gap-2 ${
                          active
                            ? 'bg-white text-ink-900'
                            : 'bg-white/[0.04] text-zinc-300 border border-white/[0.06]'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: rarityColor(r) }}
                        />
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setFilterOpen(false)}
                className="w-full h-12 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-semibold transition-colors shadow-accent-glow"
              >
                Show {filtered.length} listings
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const MobileSkinCard: React.FC<{
  item: any;
  onView: () => void;
  onAdd: () => void;
  onWish: () => void;
  wished: boolean;
  formatPrice: (n: number) => string;
}> = ({ item, onView, onAdd, onWish, wished, formatPrice }) => {
  const color = rarityColor(item.rarity);
  return (
    <article
      onClick={onView}
      className="relative rounded-3xl glass overflow-hidden active:scale-[0.98] transition-transform"
    >
      <div
        className="absolute bottom-0 left-3 right-3 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="relative aspect-[4/3] grid place-items-center p-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onWish();
          }}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-2xl bg-black/40 backdrop-blur-md grid place-items-center text-white/80"
        >
          <Heart size={13} className={wished ? 'fill-accent-500 text-accent-500' : ''} />
        </button>
        <CachedImage src={item.image} alt={item.name} className="w-full h-full object-contain" />
      </div>
      <div className="px-3 pb-3 pt-1">
        <div className="flex items-baseline justify-between mb-1">
          <span
            className="text-[10px] uppercase tracking-wider font-semibold truncate"
            style={{ color }}
          >
            {item.rarity || 'Standard'}
          </span>
          <span className="text-[10px] text-zinc-500 truncate ml-1">{item.condition || ''}</span>
        </div>
        <h3 className="text-[12.5px] font-semibold text-white truncate">
          {item.name || item.market_name}
        </h3>
        <div className="mt-2 flex items-center justify-between gap-1.5">
          <div className="text-[14px] font-display font-bold text-white tracking-tight">
            {formatPrice(item.price)}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="h-8 w-8 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white grid place-items-center transition-colors"
          >
            <ShoppingCart size={13} />
          </button>
        </div>
      </div>
    </article>
  );
};

export default MobileMarketplacePage;
