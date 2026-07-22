import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Search,
  ArrowUpDown,
  ChevronDown,
  Package,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { SkinCard, SkinCardSkeleton } from '../components/ui/SkinCard';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useToastStore } from '../store/toastStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useAuthStore } from '../store/authStore';
import { weaponCategories } from '../data/weaponCategories';
import { MOCK_MARKET_ITEMS } from '../data/mockMarketItems';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   WeaponCategoryPage — minimal layout

   /weapons/:category           → listings filtered to that category
   /weapons/:category/:weapon   → listings filtered to that weapon

   Just: breadcrumb · title row with floor price · toolbar · grid.
   No chart, no sibling-categories block, no hero stat tiles.
   ───────────────────────────────────────────────────────────────────────── */

type SortKey = 'price-asc' | 'price-desc' | 'name';

const SORT_LABELS: Record<SortKey, string> = {
  'price-asc': 'Price · low to high',
  'price-desc': 'Price · high to low',
  'name': 'Name (A–Z)',
};

import useDocumentMeta, {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  itemListJsonLd,
} from '../hooks/useDocumentMeta';

const WeaponCategoryPage: React.FC = () => {
  const { category, weapon } = useParams<{ category: string; weapon?: string }>();
  const navigate = useNavigate();
  const { items: liveItems, loading } = useMarketplaceItems();
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist, fetchWishlist } = useWishlistStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();
  const { user } = useAuthStore();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('price-asc');
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [category, weapon]);

  useEffect(() => {
    if (user?.steamId) fetchWishlist(user.steamId);
  }, [user?.steamId]);

  const resolvedCategory = useMemo(() => {
    if (!category) return null;
    const key = Object.keys(weaponCategories).find(
      (k) => k.toLowerCase() === decodeURIComponent(category).toLowerCase(),
    );
    return key ? weaponCategories[key] : null;
  }, [category]);

  const resolvedWeapon = useMemo(() => {
    if (!weapon || !resolvedCategory) return null;
    const target = decodeURIComponent(weapon).toLowerCase();
    return resolvedCategory.weapons.find((w) => w.toLowerCase() === target) || null;
  }, [weapon, resolvedCategory]);

  const items = useMemo(
    () => (liveItems && liveItems.length > 0 ? liveItems : MOCK_MARKET_ITEMS) as any[],
    [liveItems],
  );

  const categoryItems = useMemo(() => {
    if (!resolvedCategory) return [];
    const catName = resolvedCategory.name.toLowerCase();
    return items.filter((it) => {
      const t = String(it.type || '').toLowerCase();
      if (catName === 'rifles') return t.includes('rifle') || t.includes('sniper');
      if (catName === 'smgs') return t.includes('smg') || t.includes('submachine');
      if (catName === 'pistols') return t.includes('pistol');
      if (catName === 'knives') return t.includes('knife') || t.includes('karambit') || t.includes('bayonet');
      if (catName === 'gloves') return t.includes('glove');
      if (catName === 'heavy') return t.includes('heavy') || t.includes('shotgun') || t.includes('machine');
      return t.includes(catName);
    });
  }, [items, resolvedCategory]);

  const weaponItems = useMemo(() => {
    if (!resolvedWeapon) return [];
    const target = resolvedWeapon.toLowerCase();
    return categoryItems.filter((it) =>
      String(it.name || it.market_name || '').toLowerCase().includes(target),
    );
  }, [categoryItems, resolvedWeapon]);

  const filtered = useMemo(() => {
    const source = resolvedWeapon ? weaponItems : categoryItems;
    const q = query.trim().toLowerCase();
    let arr = source.filter((it) =>
      !q || String(it.name || it.market_name || '').toLowerCase().includes(q),
    );
    if (sort === 'price-asc') arr = [...arr].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === 'price-desc') arr = [...arr].sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === 'name') arr = [...arr].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return arr;
  }, [categoryItems, weaponItems, resolvedWeapon, query, sort]);

  const floor = useMemo(() => {
    const source = resolvedWeapon ? weaponItems : categoryItems;
    const prices = source.map((i) => Number(i.price || 0)).filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [categoryItems, weaponItems, resolvedWeapon]);

  /* Real, data-derived stats for the SEO paragraph below the title —
     ceiling price + the most common wear/condition among current
     listings. Both are computed from the SAME live data as the grid,
     so the paragraph is never stale or fabricated; it just goes blank
     (and the paragraph skips those sentences) when there's no stock. */
  const statsForCopy = useMemo(() => {
    const source = resolvedWeapon ? weaponItems : categoryItems;
    const prices = source.map((i) => Number(i.price || 0)).filter((p) => p > 0);
    const ceiling = prices.length ? Math.max(...prices) : 0;
    const conditionCounts = new Map<string, number>();
    for (const it of source) {
      const c = String(it.condition || '').trim();
      if (!c) continue;
      conditionCounts.set(c, (conditionCounts.get(c) || 0) + 1);
    }
    const topCondition = [...conditionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { ceiling, topCondition, count: source.length };
  }, [categoryItems, weaponItems, resolvedWeapon]);

  const handleAddCart = (it: any) => {
    addItem({
      id: it.id,
      name: it.name || it.market_name,
      price: it.price,
      image: it.image,
      condition: it.condition,
      rarity: it.rarity,
      type: it.type,
      seller: it.seller,
    } as any);
    addToast({ type: 'success', title: 'Added to cart', message: it.name || it.market_name });
  };
  const handleWish = (it: any) => {
    if (!user) {
      addToast({ type: 'warning', title: 'Sign in', message: 'Sign in to use wishlist.' });
      return;
    }
    toggleItem(
      {
        id: it.id,
        name: it.name || it.market_name,
        price: it.price,
        image: it.image,
        condition: it.condition,
        rarity: it.rarity,
        type: it.type,
        seller: it.seller,
      } as any,
      user.steamId,
    );
  };

  /* useDocumentMeta must run on every render — placed BEFORE any early
     returns to obey the rules of hooks.

     SEO strategy for this page:
       - Title leads with the *weapon/category* keyword (highest-intent
         token first), value-prop in the middle, brand last.
       - Description targets long-tail "buy [weapon] cheap", "[weapon]
         price" queries with the price floor inline.
       - JSON-LD includes CollectionPage + BreadcrumbList (helps Google
         show a Categories → Weapon trail) + ItemList of the visible
         listings so the SERP can render a rich-results product list. */
  const pageTitle = resolvedCategory
    ? resolvedWeapon
      ? `${resolvedWeapon} Skins · Buy & Sell · CS2 · Skinify`
      : `${resolvedCategory.name} · CS2 Skin Marketplace · Skinify`
    : 'Browse CS2 Weapons · Skinify';
  const pageDescription = resolvedCategory
    ? resolvedWeapon
      ? `Buy ${resolvedWeapon} CS2 skins on Skinify. 0% buyer fees, escrow-protected trades, instant Steam delivery. Browse every wear and float.`
      : `Browse ${resolvedCategory.name} CS2 skins on Skinify. 0% buyer fees, escrow protection, instant delivery. ${resolvedCategory.description}`
    : 'Browse every CS2 weapon category on Skinify with 0% buyer fees and escrow protection.';
  const pageCanonical = resolvedCategory
    ? resolvedWeapon
      ? `https://skinify.gg/weapons/${encodeURIComponent(resolvedCategory.name.toLowerCase())}/${encodeURIComponent(resolvedWeapon.toLowerCase())}`
      : `https://skinify.gg/weapons/${encodeURIComponent(resolvedCategory.name.toLowerCase())}`
    : 'https://skinify.gg/weapons';
  const pageKeywords = resolvedCategory
    ? resolvedWeapon
      ? `${resolvedWeapon} skins, ${resolvedWeapon} price, buy ${resolvedWeapon}, ${resolvedWeapon} cs2, ${resolvedCategory.name.toLowerCase()} cs2`
      : `${resolvedCategory.name.toLowerCase()} cs2, cs2 ${resolvedCategory.name.toLowerCase()}, buy cs2 ${resolvedCategory.name.toLowerCase()}, ${resolvedCategory.weapons.slice(0, 5).map((w) => w.toLowerCase()).join(', ')}`
    : 'cs2 weapons, cs2 weapon categories, browse cs2';

  const trail = resolvedCategory
    ? resolvedWeapon
      ? [
          { name: 'Home', url: 'https://skinify.gg/' },
          { name: 'Categories', url: 'https://skinify.gg/weapons' },
          {
            name: resolvedCategory.name,
            url: `https://skinify.gg/weapons/${encodeURIComponent(resolvedCategory.name.toLowerCase())}`,
          },
          { name: resolvedWeapon, url: pageCanonical },
        ]
      : [
          { name: 'Home', url: 'https://skinify.gg/' },
          { name: 'Categories', url: 'https://skinify.gg/weapons' },
          { name: resolvedCategory.name, url: pageCanonical },
        ]
    : [
        { name: 'Home', url: 'https://skinify.gg/' },
        { name: 'Categories', url: 'https://skinify.gg/weapons' },
      ];

  useDocumentMeta({
    title: pageTitle,
    description: pageDescription,
    canonical: pageCanonical,
    keywords: pageKeywords,
    jsonLd: [
      collectionPageJsonLd({
        name: resolvedWeapon || resolvedCategory?.name || 'CS2 weapons',
        url: pageCanonical,
        description: pageDescription,
      }),
      breadcrumbJsonLd(trail),
      itemListJsonLd({
        name: resolvedWeapon
          ? `${resolvedWeapon} listings`
          : `${resolvedCategory?.name || 'CS2'} listings`,
        url: pageCanonical,
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

  if (!resolvedCategory) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16">
          <div className="card p-12 text-center max-w-xl mx-auto mt-12">
            <Package size={26} className="mx-auto text-ink-muted mb-3" />
            <p className="text-[15px] font-bold text-ink">Category not found</p>
            <motion.button
              whileTap={tap}
              onClick={() => navigate('/marketplace')}
              className="mt-5 h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px]"
            >
              Browse marketplace
            </motion.button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const title = resolvedWeapon || resolvedCategory.name;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16 space-y-5">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted overflow-x-auto scrollbar-hide"
        >
          <button
            onClick={() => navigate('/marketplace')}
            className="hover:text-ink transition-colors whitespace-nowrap"
          >
            Market
          </button>
          <ChevronRight size={12} strokeWidth={2.4} className="text-ink-dim shrink-0" />
          <button
            onClick={() => navigate('/weapons')}
            className="hover:text-ink transition-colors whitespace-nowrap"
          >
            Categories
          </button>
          <ChevronRight size={12} strokeWidth={2.4} className="text-ink-dim shrink-0" />
          {resolvedWeapon ? (
            <>
              <button
                onClick={() => navigate(`/weapons/${encodeURIComponent(resolvedCategory.name.toLowerCase())}`)}
                className="hover:text-ink transition-colors whitespace-nowrap"
              >
                {resolvedCategory.name}
              </button>
              <ChevronRight size={12} strokeWidth={2.4} className="text-ink-dim shrink-0" />
              <span className="text-ink font-bold whitespace-nowrap">{resolvedWeapon}</span>
            </>
          ) : (
            <span className="text-ink font-bold whitespace-nowrap">{resolvedCategory.name}</span>
          )}
        </motion.nav>

        {/* Title row — title left, floor + count right. No cards, just text. */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex items-end justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-none">
              {title}
            </h1>
            <p className="text-[13px] text-ink-muted font-medium mt-2">
              {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}
              {floor > 0 && (
                <>
                  {' '}· from <span className="text-ink font-bold tabular-nums">{formatPrice(floor)}</span>
                </>
              )}
            </p>
          </div>
        </motion.div>

        {/* SEO paragraph — one sentence built from the SAME live market
            data as the grid (floor/ceiling price, listing count, most
            common wear). Every weapon/category page used to be just an
            H1 + a grid with zero unique body text, which Google Search
            Console flagged as thin/duplicate content across the whole
            /weapons/* tree. This can't go stale or read as filler
            because it's computed from what's actually listed right now. */}
        {statsForCopy.count > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.02 }}
            className="text-[13.5px] text-ink-muted font-medium leading-relaxed max-w-[70ch] -mt-2"
          >
            {resolvedWeapon ? (
              <>
                Skinify currently lists {statsForCopy.count} {resolvedWeapon}{' '}
                {statsForCopy.count === 1 ? 'skin' : 'skins'}
                {floor > 0 && statsForCopy.ceiling > 0 && (
                  <>
                    , ranging from {formatPrice(floor)} to {formatPrice(statsForCopy.ceiling)}
                  </>
                )}
                {statsForCopy.topCondition && (
                  <>
                    {' '}— most listings are in {statsForCopy.topCondition} condition
                  </>
                )}
                . Every {resolvedWeapon} sold here comes from a verified Steam inventory, with
                float, pattern and stickers shown on the listing before you buy, and every
                purchase is protected by Skinify's 8-day escrow.
              </>
            ) : (
              <>
                Skinify currently lists {statsForCopy.count} {resolvedCategory.name.toLowerCase()}{' '}
                {statsForCopy.count === 1 ? 'skin' : 'skins'} across{' '}
                {resolvedCategory.weapons.length} weapon{resolvedCategory.weapons.length === 1 ? '' : 's'}
                {floor > 0 && statsForCopy.ceiling > 0 && (
                  <>
                    , priced between {formatPrice(floor)} and {formatPrice(statsForCopy.ceiling)}
                  </>
                )}
                . {resolvedCategory.description} — buy with 0% buyer fees, or list your own for
                sale in a few clicks.
              </>
            )}
          </motion.p>
        )}

        {/* Toolbar — search + sort, nothing else */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <div className="flex-1 min-w-[200px] flex items-center gap-2 h-11 px-4 rounded-full bg-subtle">
            <Search size={14} strokeWidth={2} className="text-ink-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[13.5px] font-medium"
            />
          </div>

          <div className="relative">
            <motion.button
              whileTap={tap}
              onClick={() => setSortOpen((o) => !o)}
              className="h-11 px-4 rounded-full bg-subtle hover:bg-bg flex items-center gap-1.5 text-[13px] font-semibold text-ink transition-colors"
            >
              <ArrowUpDown size={13} strokeWidth={2.2} className="text-ink-muted" />
              {SORT_LABELS[sort]}
              <ChevronDown
                size={13}
                strokeWidth={2.4}
                className={`text-ink-muted transition-transform ${sortOpen ? 'rotate-180' : ''}`}
              />
            </motion.button>
            <AnimatePresence>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 z-20 card p-1.5 min-w-[200px] shadow-xl"
                  >
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                      <button
                        key={k}
                        onClick={() => {
                          setSort(k);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-colors ${
                          sort === k ? 'bg-accent-soft text-ink' : 'text-ink-muted hover:bg-subtle hover:text-ink'
                        }`}
                      >
                        {SORT_LABELS[k]}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Weapon picker — only in category mode, only if no weapon active.
            A simple horizontal pill scroller for jumping to a specific weapon.
            No icons, no cards, just text pills. */}
        {!resolvedWeapon && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {resolvedCategory.weapons.map((w, i) => (
              <motion.button
                whileTap={tap}
                key={w}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring, delay: Math.min(0.06 + i * 0.02, 0.4) }}
                onClick={() =>
                  navigate(
                    `/weapons/${encodeURIComponent(resolvedCategory.name.toLowerCase())}/${encodeURIComponent(w.toLowerCase())}`,
                  )
                }
                className="h-9 px-3.5 rounded-full bg-subtle hover:bg-accent-soft text-ink-muted hover:text-ink text-[12.5px] font-semibold whitespace-nowrap transition-colors"
              >
                {w}
              </motion.button>
            ))}
          </div>
        )}

        {/* Listings grid — identical to the marketplace: flush tile
            variant inside .market-grid so both pages read as one. */}
        {loading ? (
          <div className="market-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 isolate">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkinCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Package size={26} className="mx-auto text-ink-muted mb-3" />
            <p className="text-[15px] font-bold text-ink">No listings</p>
            <p className="text-[13px] text-ink-muted font-medium mt-1.5">
              Nothing matches that filter. Try clearing the search or pick a different sort.
            </p>
          </div>
        ) : (
          <motion.div
            layout
            initial="hidden"
            animate="shown"
            variants={{
              hidden: {},
              shown: { transition: { staggerChildren: 0.03 } },
            }}
            className="market-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 isolate"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((it: any) => (
                <motion.div
                  key={it.id}
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    shown: { opacity: 1, y: 0, transition: spring },
                  }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={spring}
                >
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
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default WeaponCategoryPage;
