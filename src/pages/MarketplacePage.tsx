import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SkinCard } from '../components/ui/SkinCard';
import { weaponCategories } from '../data/weaponCategories';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   Mocked listings used when the live `useMarketplaceItems()` hook returns
   nothing. Lets the page demo correctly with no real listings yet. Each item
   uses Steam's CDN icon URL pattern so we get a real CS2 visual without
   shipping image binaries. Mocked items have `id` prefixed `mock-` so we
   can hide cart/wishlist semantics — they're for visual demo only.
   ───────────────────────────────────────────────────────────────────────── */
const MOCK_ITEMS = [
  {
    id: 'mock-1',
    name: 'AWP | Dragon Lore',
    market_name: 'AWP | Dragon Lore (Field-Tested)',
    type: 'Sniper Rifle',
    rarity: 'Covert',
    condition: 'Field-Tested',
    price: 142500,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-1mZWMmuPLJ7XEhGRu7Mwn3evP9NWg2QPj_Bc4N2yhI4eVcQE2YlmC_FntyL_n0Z6_v52cnSdgsiAh4mGdwULdz5l_GhA/360fx360f',
    float: '0.21',
    priceChange: 12.4,
    seller: { steamId: 'mock-seller-1', name: 'BluePhase' },
  },
  {
    id: 'mock-2',
    name: 'AK-47 | Fire Serpent',
    market_name: 'AK-47 | Fire Serpent (Minimal Wear)',
    type: 'Rifle',
    rarity: 'Covert',
    condition: 'Minimal Wear',
    price: 38900,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpouj63LQRm-PrgZThR5cmim5GRqOH6IbnUmlRd6cF4n-T--Y3nj1H6_xY-Z2H7coSWcw9rNQ7Vrla6lO_n08K8tJjImXY1u3VxsHbcyhDl1B5SLrs4lvCKWdb0kg/360fx360f',
    float: '0.09',
    priceChange: -3.2,
    seller: { steamId: 'mock-seller-2', name: 'CT_Camper' },
  },
  {
    id: 'mock-3',
    name: 'Karambit | Doppler',
    market_name: '★ Karambit | Doppler (Factory New)',
    type: 'Knife',
    rarity: 'Covert',
    condition: 'Factory New',
    price: 89400,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou7TyJgRf0vL3dDpV4M-im5SOhfL4MITdn2xZ_Pp9j-vT8Y2migzj_kdrYW-iJoaUcVdoNgnY-Vi-w-vphMToupzKwHB9-n51KmGdwUKnP-uOLdM/360fx360f',
    float: '0.007',
    priceChange: 5.1,
    seller: { steamId: 'mock-seller-3', name: 'TyphonGG' },
    special: 'stattrak' as const,
  },
  {
    id: 'mock-4',
    name: 'M4A4 | Howl',
    market_name: 'M4A4 | Howl (Factory New)',
    type: 'Rifle',
    rarity: 'Contraband',
    condition: 'Factory New',
    price: 215000,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpouj63LQRm-PrgZThR5cmim5GRqOH6IbnUmlRd6cF4n-T--Y3nj1H6_xY-Z2H7coSWcw9rNQ7Vrla6lO_n08K8tJjImXY1u3VxsHbcyhDl1B5SLrs4lvCKWdb0kg/360fx360f',
    float: '0.04',
    priceChange: 18.7,
    seller: { steamId: 'mock-seller-1', name: 'BluePhase' },
  },
  {
    id: 'mock-5',
    name: 'Glock-18 | Fade',
    market_name: 'Glock-18 | Fade (Factory New)',
    type: 'Pistol',
    rarity: 'Restricted',
    condition: 'Factory New',
    price: 4290,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLQpf7v_3IzhX09GwhpKAk-zLP7LWnn8fucMo2u3D8diniwa1qBdoa2H1cYWQc1U7N1HXq1S4xLrshpa9v8nIyXYxv3F2sCqIyhKxnxxIcKUx0sk7zfQI/360fx360f',
    float: '0.012',
    priceChange: 2.3,
    seller: { steamId: 'mock-seller-2', name: 'CT_Camper' },
  },
  {
    id: 'mock-6',
    name: 'USP-S | Kill Confirmed',
    market_name: 'USP-S | Kill Confirmed (Minimal Wear)',
    type: 'Pistol',
    rarity: 'Covert',
    condition: 'Minimal Wear',
    price: 2150,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLQpf7v_3IzhX09GwhpKAk-zLP7LWnn8fucMo2u3D8diniwa1qBdoa2H1cYWQc1U7N1HXq1S4xLrshpa9v8nIyXYxv3F2sCqIyhKxnxxIcKUx0sk7zfQI/360fx360f',
    float: '0.09',
    priceChange: -1.1,
    seller: { steamId: 'mock-seller-4', name: 'A_Long' },
  },
  {
    id: 'mock-7',
    name: 'M4A1-S | Hyper Beast',
    market_name: 'M4A1-S | Hyper Beast (Factory New)',
    type: 'Rifle',
    rarity: 'Covert',
    condition: 'Factory New',
    price: 1890,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpouj63LQRm-PrgZThR5cmim5GRqOH6IbnUmlRd6cF4n-T--Y3nj1H6_xY-Z2H7coSWcw9rNQ7Vrla6lO_n08K8tJjImXY1u3VxsHbcyhDl1B5SLrs4lvCKWdb0kg/360fx360f',
    float: '0.05',
    priceChange: 0.4,
    seller: { steamId: 'mock-seller-5', name: 'Hooch' },
  },
  {
    id: 'mock-8',
    name: 'Desert Eagle | Blaze',
    market_name: 'Desert Eagle | Blaze (Factory New)',
    type: 'Pistol',
    rarity: 'Restricted',
    condition: 'Factory New',
    price: 5780,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLQpf7v_3IzhX09GwhpKAk-zLP7LWnn8fucMo2u3D8diniwa1qBdoa2H1cYWQc1U7N1HXq1S4xLrshpa9v8nIyXYxv3F2sCqIyhKxnxxIcKUx0sk7zfQI/360fx360f',
    float: '0.008',
    priceChange: 7.9,
    seller: { steamId: 'mock-seller-3', name: 'TyphonGG' },
  },
  {
    id: 'mock-9',
    name: 'Butterfly Knife | Doppler',
    market_name: '★ Butterfly Knife | Doppler (Factory New)',
    type: 'Knife',
    rarity: 'Covert',
    condition: 'Factory New',
    price: 78900,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou7TyJgRf0vL3dDpV4M-im5SOhfL4MITdn2xZ_Pp9j-vT8Y2migzj_kdrYW-iJoaUcVdoNgnY-Vi-w-vphMToupzKwHB9-n51KmGdwUKnP-uOLdM/360fx360f',
    float: '0.006',
    priceChange: 9.2,
    seller: { steamId: 'mock-seller-1', name: 'BluePhase' },
  },
  {
    id: 'mock-10',
    name: 'P250 | Asiimov',
    market_name: 'P250 | Asiimov (Field-Tested)',
    type: 'Pistol',
    rarity: 'Classified',
    condition: 'Field-Tested',
    price: 920,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLQpf7v_3IzhX09GwhpKAk-zLP7LWnn8fucMo2u3D8diniwa1qBdoa2H1cYWQc1U7N1HXq1S4xLrshpa9v8nIyXYxv3F2sCqIyhKxnxxIcKUx0sk7zfQI/360fx360f',
    float: '0.21',
    priceChange: -2.5,
    seller: { steamId: 'mock-seller-2', name: 'CT_Camper' },
  },
  {
    id: 'mock-11',
    name: 'AWP | Asiimov',
    market_name: 'AWP | Asiimov (Field-Tested)',
    type: 'Sniper Rifle',
    rarity: 'Covert',
    condition: 'Field-Tested',
    price: 2840,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-1mZWMmuPLJ7XEhGRu7Mwn3evP9NWg2QPj_Bc4N2yhI4eVcQE2YlmC_FntyL_n0Z6_v52cnSdgsiAh4mGdwULdz5l_GhA/360fx360f',
    float: '0.18',
    priceChange: 4.6,
    seller: { steamId: 'mock-seller-5', name: 'Hooch' },
  },
  {
    id: 'mock-12',
    name: 'Sport Gloves | Pandora’s Box',
    market_name: '★ Sport Gloves | Pandora’s Box (Minimal Wear)',
    type: 'Gloves',
    rarity: 'Covert',
    condition: 'Minimal Wear',
    price: 64900,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-1mZWMmuPLJ7XEhGRu7Mwn3evP9NWg2QPj_Bc4N2yhI4eVcQE2YlmC_FntyL_n0Z6_v52cnSdgsiAh4mGdwULdz5l_GhA/360fx360f',
    float: '0.10',
    priceChange: 11.2,
    seller: { steamId: 'mock-seller-4', name: 'A_Long' },
  },
];

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
      if (String(item.id).startsWith('mock-')) {
        addToast({
          type: 'info',
          title: 'Demo listing',
          message: 'This is a placeholder while the marketplace is being populated.',
        });
        return;
      }
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
      if (String(item.id).startsWith('mock-')) {
        addToast({ type: 'info', title: 'Demo listing' });
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
              Browse listings
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
            <motion.button
              whileTap={tap}
              onClick={refetch}
              className="icon-chip hover:bg-bg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} strokeWidth={2} className={loading ? 'animate-spin text-ink-muted' : 'text-ink-muted'} />
            </motion.button>

            <div className="card-flat flex h-11 p-1 gap-0.5">
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
                className="h-11 px-4 rounded-full bg-subtle hover:bg-subtle/70 text-[13px] text-ink font-semibold flex items-center gap-2 transition-colors"
              >
                <ArrowUpDown size={14} strokeWidth={2.2} />
                {SORT_OPTIONS.find((o) => o.key === sort)?.label}
                <ChevronDown
                  size={14}
                  strokeWidth={2.2}
                  className={`transition-transform ${sortMenu ? 'rotate-180' : ''}`}
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
              className={`h-11 px-4 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-colors ${
                filtersOpen ? 'bg-accent text-on-accent' : 'bg-subtle text-ink hover:bg-subtle/70'
              }`}
            >
              <SlidersHorizontal size={14} strokeWidth={2.4} />
              Filters
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
          {/* ===== FILTERS SIDEBAR ===== */}
          <AnimatePresence initial={false}>
            {filtersOpen && (
              <motion.aside
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={spring}
                className="card p-5 self-start lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin"
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
                    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'space-y-2'
                }
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={
                      view === 'grid'
                        ? 'rounded-3xl skel'
                        : 'rounded-2xl skel h-24'
                    }
                    style={view === 'grid' ? { aspectRatio: '5 / 6.4' } : undefined}
                  />
                ))}
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
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filtered.map((item: any) => (
                  <motion.div
                    key={item.id}
                    variants={staggerChild}
                    whileHover={{ y: -4 }}
                    transition={spring}
                  >
                    <SkinCard
                      item={item}
                      onView={() => !String(item.id).startsWith('mock-') && navigate(`/item/${item.id}`)}
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
                      onView={() => !String(item.id).startsWith('mock-') && navigate(`/item/${item.id}`)}
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
