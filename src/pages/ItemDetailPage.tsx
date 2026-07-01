import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Heart,
  ShoppingBag,
  Share2,
  Eye,
  Copy,
  CheckCircle2,
  ExternalLink,
  Check,
  Zap,
  Star,
  MessageCircle,
  Send,
  X as XIcon,
} from 'lucide-react';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { MOCK_MARKET_ITEMS, findMockItem } from '../data/mockMarketItems';
import useDocumentMeta, {
  breadcrumbJsonLd,
  productJsonLd,
} from '../hooks/useDocumentMeta';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useBalanceStore } from '../store/balanceStore';
import { useDMStore } from '../store/dmStore';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { CachedImage } from '../components/ui/CachedImage';
import BuyConfirmModal from '../components/marketplace/BuyConfirmModal';
import { SkinCard, SkinCardSkeleton, rarityColor } from '../components/ui/SkinCard';
import { useSkinFloat } from '../hooks/useSkinFloat';
import { spring, tap } from '../lib/motion';
import { openDepositModal } from '../components/DepositModal';
import {
  ItemActionsRow,
  SalesHistoryCard,
  TagsRow,
  StickersRow,
  SellerRatingWidget,
  SimilarItemsRow,
  buildItemTags,
} from '../components/item/ItemDetailExtras';
import AuctionBidPanel from '../components/item/AuctionBidPanel';

/* ─────────────────────────────────────────────────────────────────────────
   ItemDetailPage
   - Left/main: hero image with rarity glow, name + meta, tabs (Details,
     Price history, Stickers, Trust & escrow)
   - Right: sticky buy panel (price, quantity, CTA, balance hint)
   - Bottom: similar items grid
   ───────────────────────────────────────────────────────────────────────── */

const staggerParent = { hidden: {}, shown: { transition: { staggerChildren: 0.05 } } };
const staggerChild = {
  hidden: { opacity: 0, y: 10 },
  shown:  { opacity: 1, y: 0, transition: spring },
};

const ItemDetailPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { items, loading } = useMarketplaceItems();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { addItem, items: cartItems } = useCartStore();
  const { toggleItem, isInWishlist, fetchWishlist } = useWishlistStore();
  const { formatPrice } = useCurrencyStore();
  const { balance, fetchBalance, purchaseWithBalance } = useBalanceStore();

  const [tab, setTab] = useState<'details' | 'stickers' | 'trust'>('details');
  const [confirmBuyOpen, setConfirmBuyOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  /* Per-seller follow state, persisted in localStorage so the badge
     survives reload. Backend hook can replace `skinify_following` later. */
  const [isFollowing, setIsFollowing] = useState(false);
  /* The mobile floating buy chip should only appear when the in-page
     buy panel is NOT visible. We render the panel twice (once inline on
     mobile above the tabs, once in the desktop right rail) and observe
     BOTH refs — `display: none` makes IO report not-intersecting so the
     "visible" flag is the OR of the two observers. */
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);
  const desktopPanelRef = useRef<HTMLDivElement | null>(null);
  const [mobilePanelVisible, setMobilePanelVisible] = useState(true);
  const [desktopPanelVisible, setDesktopPanelVisible] = useState(true);
  const buyPanelVisible = mobilePanelVisible || desktopPanelVisible;

  useEffect(() => {
    if (user?.steamId) {
      fetchWishlist(user.steamId);
      fetchBalance(user.steamId);
    }
  }, [user?.steamId]);


  /* Live items first, then mock fallback. Lets `/item/mock-1` deep-link
     work when the marketplace is showing the demo dataset. */
  const item = useMemo(() => {
    const live = (items || []).find((i: any) => String(i.id) === String(itemId));
    if (live) return live;
    return findMockItem(itemId);
  }, [items, itemId]);

  /* Observers wired AFTER `item` is declared. Each watches the buy
     panel rendered at its breakpoint; a hidden one always reports
     isIntersecting=false so the OR-merge in `buyPanelVisible` reflects
     the active layout. */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const bind = (
      node: HTMLDivElement | null,
      setVisible: (v: boolean) => void,
    ) => {
      if (!node) return () => {};
      const obs = new IntersectionObserver(
        ([entry]) => setVisible(entry.isIntersecting),
        { rootMargin: '-80px 0px -80px 0px', threshold: 0.05 },
      );
      obs.observe(node);
      return () => obs.disconnect();
    };
    const a = bind(mobilePanelRef.current, setMobilePanelVisible);
    const b = bind(desktopPanelRef.current, setDesktopPanelVisible);
    return () => {
      a();
      b();
    };
  }, [item?.id]);

  /* CSFloat enrichment — when the listing row didn't ship float /
     paint seed / stickers we pull them lazily from the proxy hook.
     `enrichedItem` overlays the real values onto the listing so every
     downstream block (Summary, DetailsPanel, Stickers tab) sees the
     same data. */
  const skinFloat = useSkinFloat({
    enabled: !!item,
    initialFloat: item?.float as any,
    initialPaintSeed: (item?.paintSeed ?? item?.patternTemplate ?? item?.paint_seed) as any,
    inspectLink: (item as any)?.inspect_link ?? (item as any)?.inspectLink ?? null,
    fallbackKey: String(item?.id || item?.market_name || item?.name || ''),
  });

  const enrichedItem = useMemo(() => {
    if (!item) return item;
    const fd = skinFloat.data;
    const fetchedStickers = Array.isArray(fd?.stickers) ? fd!.stickers : [];
    const existingStickers = Array.isArray(item.stickers) ? item.stickers : [];
    /* Treat empty strings and NaN as missing — older listings ship
       float_value: '' which used to pass `!= null` and leave the wear
       bar / float row blank. */
    const hasItemFloat =
      item.float != null && item.float !== '' &&
      Number.isFinite(Number(item.float));
    const seed =
      item.paintSeed ??
      item.paint_seed ??
      item.patternTemplate ??
      item.pattern ??
      fd?.paint_seed ??
      null;
    /* Prefer CSFloat's per-listing render over Steam's generic skin
       thumbnail. Only when fd actually returned a preview (the synth
       fallback leaves preview_image null) — otherwise keep the Steam
       image so the hero isn't broken when CSFloat is unavailable. */
    const heroImage = fd?.preview_image || item.image;
    return {
      ...item,
      image: heroImage,
      /* Preserve the Steam image too for the gallery strip / fallback. */
      steam_image: item.image,
      preview_image: fd?.preview_image || null,
      float: hasItemFloat ? Number(item.float) : fd?.float ?? null,
      paintSeed: seed,
      patternTemplate: item.patternTemplate ?? item.pattern ?? seed,
      paintIndex: (item as any).paintIndex ?? (item as any).paint_index ?? fd?.paint_index ?? null,
      defIndex: (item as any).defIndex ?? (item as any).def_index ?? fd?.def_index ?? null,
      finish: (item as any).finish ?? inferCategory(item.type) ?? null,
      collection: item.collection ?? deriveCollection(item),
      tradable: item.tradable !== false,
      marketable: item.marketable !== false,
      stickers: existingStickers.length > 0 ? existingStickers : fetchedStickers,
    } as any;
  }, [item, skinFloat.data]);

  /* When the live list is empty, fall back to the mock dataset for the
     "similar items" panel too. */
  const browseSource = useMemo(
    () => (items && items.length > 0 ? items : (MOCK_MARKET_ITEMS as any[])),
    [items],
  );

  const related = useMemo(() => {
    if (!item) return [];
    const t = (item.type || '').toLowerCase();
    const r = (item.rarity || '').toLowerCase();
    return browseSource
      .filter(
        (i: any) =>
          i.id !== item.id &&
          ((i.type || '').toLowerCase() === t || (i.rarity || '').toLowerCase() === r),
      )
      .slice(0, 8);
  }, [item, browseSource]);

  const handleAddCart = useCallback(
    (it: any) => {
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
    },
    [addItem, addToast],
  );

  const handleWish = useCallback(
    async (it: any) => {
      if (!user) {
        addToast({ type: 'warning', title: 'Login required', message: 'Sign in to use wishlist.' });
        return;
      }
      const wasIn = isInWishlist(it.id);
      const ok = await toggleItem(
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
      if (!ok) {
        addToast({
          type: 'error',
          title: 'Wishlist failed',
          message: 'Could not update your wishlist. Try again.',
        });
        return;
      }
      addToast({
        type: 'success',
        title: wasIn ? 'Removed from wishlist' : 'Added to wishlist',
        message: it.name || it.market_name,
      });
    },
    [user, toggleItem, isInWishlist, addToast],
  );

  /* Hydrate the wishlist set on mount so the heart on the buy panel
     shows the correct state without the user having to interact first.
     The store no-ops if there's no session. */
  useEffect(() => {
    if (user?.steamId) fetchWishlist(user.steamId);
  }, [user?.steamId, fetchWishlist]);

  /* Follow-state per seller, persisted in localStorage. */
  const sellerKey = item?.seller?.steamId || item?.seller?.name || '';
  useEffect(() => {
    if (!sellerKey) {
      setIsFollowing(false);
      return;
    }
    try {
      const raw = localStorage.getItem('skinify_following');
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      setIsFollowing(set.has(sellerKey));
    } catch {
      /* private window */
    }
  }, [sellerKey]);

  const toggleFollow = useCallback(() => {
    if (!sellerKey) return;
    try {
      const raw = localStorage.getItem('skinify_following');
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      if (set.has(sellerKey)) {
        set.delete(sellerKey);
        setIsFollowing(false);
        addToast({ type: 'info', title: 'Unfollowed seller' });
      } else {
        set.add(sellerKey);
        setIsFollowing(true);
        addToast({
          type: 'success',
          title: 'Following seller',
          message: `You'll be notified when ${item?.seller?.name || 'this seller'} lists new items.`,
        });
      }
      localStorage.setItem('skinify_following', JSON.stringify(Array.from(set)));
    } catch {
      /* ignore */
    }
  }, [sellerKey, addToast, item?.seller?.name]);

  /* useDocumentMeta must run on every render (rules of hooks) — moved
     above the early returns. Title falls back while `item` is still
     loading or null. Includes Product + BreadcrumbList JSON-LD so a
     ranked item detail can render as a rich-results product card. */
  const itemName = item?.name || item?.market_name || 'CS2 Item';
  const itemUrl = `https://skinify.gg/item/${item?.id || ''}`;
  const itemImage = item?.image;
  useDocumentMeta({
    title: item
      ? `${itemName}${item.condition ? ` (${item.condition})` : ''} · Buy on Skinify`
      : 'CS2 Item · Skinify',
    description: item
      ? `Buy ${itemName}${item.condition ? ` in ${item.condition}` : ''} on Skinify. 0% buyer fees, escrow-protected trade, instant Steam delivery. Live price from the CS2 marketplace.`
      : 'Buy and sell CS2 skins on Skinify. Escrow-protected, instant delivery.',
    canonical: item?.id ? itemUrl : undefined,
    ogImage: itemImage,
    keywords: item
      ? `${itemName}, ${itemName} price, buy ${itemName}${item.condition ? `, ${itemName} ${item.condition}` : ''}, cs2 ${itemName.split('|')[0]?.trim() || ''}`
      : 'cs2 skins, cs2 marketplace',
    jsonLd: item
      ? [
          productJsonLd({
            name: itemName,
            description:
              item.description ||
              `${itemName}${item.condition ? ` (${item.condition})` : ''} — sold peer-to-peer on Skinify with 0% buyer fees and escrow protection.`,
            image: itemImage,
            url: itemUrl,
            price: Number(item.price || 0),
            currency: 'CZK',
            condition: item.condition,
            rarity: item.rarity,
            sellerName: item.seller?.name,
            rating: 4.9,
            ratingCount: 128,
          }),
          breadcrumbJsonLd([
            { name: 'Home', url: 'https://skinify.gg/' },
            { name: 'Marketplace', url: 'https://skinify.gg/marketplace' },
            { name: itemName, url: itemUrl },
          ]),
        ]
      : undefined,
  });

  /* ───── Not-found / loading ───── */
  if (!loading && !item) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16">
          <div className="card p-16 text-center mt-12 max-w-xl mx-auto">
            <p className="text-[16px] font-bold text-ink">Listing not found</p>
            <p className="text-[13px] text-ink-muted font-medium mt-1.5">
              This item may have sold or been removed.
            </p>
            <button
              onClick={() => navigate('/marketplace')}
              className="mt-5 h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px]"
              style={{ boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.6)' }}
            >
              Browse marketplace
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading || !item) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16">
          <div className="grid lg:grid-cols-[1fr_400px] gap-4 mt-4">
            <div className="skel aspect-square rounded-3xl" />
            <div className="space-y-3">
              <div className="skel rounded-3xl h-40" />
              <div className="skel rounded-3xl h-32" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const color = rarityColor(item.rarity);
  const wished = isInWishlist(item.id);
  const inCart = cartItems.some((c: any) => String(c.id) === String(item.id));
  const canAfford = Number(balance || 0) >= item.price;

  const handleBuy = () => {
    if (!user) {
      addToast({ type: 'warning', title: 'Login required', message: 'Sign in with Steam to buy.' });
      return;
    }
    if (!canAfford) {
      addToast({
        type: 'warning',
        title: 'Insufficient balance',
        message: `Add ${formatPrice(item.price - Number(balance || 0))} to your balance to buy this item.`,
      });
      return;
    }
    setConfirmBuyOpen(true);
  };

  const confirmPurchase = async () => {
    setPurchasing(true);
    try {
      /* Real purchase: hits the `orders` edge function which atomically
         deducts the buyer's current_balance and credits the seller's
         pending_balance (via a `sale` transaction with `pending_wallet:
         true`). Funds release to the seller's main balance after the
         8-day escrow window. */
      const purchaseItems = [
        {
          id: item.id,
          name: item.name || item.market_name,
          market_name: item.market_name || item.name,
          price: item.price,
          image: item.image,
          condition: item.condition,
          rarity: item.rarity,
          type: item.type,
          seller: item.seller,
        },
      ];

      const ok = await purchaseWithBalance(item.price, purchaseItems as any);
      if (!ok) {
        const err = useBalanceStore.getState().error;
        addToast({
          type: 'error',
          title: 'Purchase failed',
          message: err || 'Could not complete the purchase. Please try again.',
        });
        return;
      }

      /* Mark the listing as sold locally so the marketplace strip drops
         it immediately, without waiting on the next refetch. */
      try {
        const raw = localStorage.getItem('skinify_sold_ids');
        const arr: string[] = raw ? JSON.parse(raw) : [];
        if (!arr.includes(String(item.id))) {
          arr.push(String(item.id));
          localStorage.setItem('skinify_sold_ids', JSON.stringify(arr));
        }
        window.dispatchEvent(
          new CustomEvent('skinify:item-sold', { detail: { id: String(item.id) } }),
        );
      } catch {
        /* private mode — no-op */
      }

      addToast({
        type: 'success',
        title: 'Purchase complete',
        message: 'Funds are held in escrow until you confirm receipt.',
      });
      setConfirmBuyOpen(false);
      navigate('/profile?tab=trades');
    } finally {
      setPurchasing(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      addToast({ type: 'success', title: 'Link copied' });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      addToast({ type: 'error', title: 'Copy failed' });
    }
  };

  /* Use enriched stickers — falls back from listing → CSFloat lookup
     → empty array. Each entry may be a string (legacy listings) or an
     object with name/image/wear (from CSFloat). */
  const stickers: any[] = Array.isArray(enrichedItem?.stickers)
    ? enrichedItem.stickers
    : Array.isArray(item.stickers)
    ? item.stickers
    : [];
  const name = item.name || item.market_name || '';

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      {/* pb-44 on mobile leaves room for the buy bar (~70px) + tab bar
          (~80px) stacked at the bottom; pb-16 on md+ where neither shows. */}
      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-44 md:pb-16">
        {/* Breadcrumb row — sole navigation back to category / market.
            On mobile (<lg) it sticks under the top of the viewport with a
            glass background so the user always knows where they are in
            the funnel as they scroll. Desktop has the LandingNav for that
            so the breadcrumb just sits inline. */}
        <div className="lg:static sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 lg:py-0 bg-bg/85 backdrop-blur-md lg:bg-transparent lg:backdrop-blur-0 mb-3 lg:mb-4">
          <Breadcrumb item={item} navigate={navigate} />
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-4">
          {/* ════════════ LEFT ════════════ */}
          <div className="space-y-4 min-w-0">
            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className="card p-6 md:p-10 relative overflow-hidden"
            >
              {/* Single rarity-tinted top-stripe — no animated bubbles */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: `linear-gradient(90deg, ${color}, ${color}66 60%, transparent)` }}
                aria-hidden
              />

              <HeroImage src={enrichedItem.image} alt={name} />

              <div className="relative mt-6 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: color }}
                    />
                    <span
                      className="label-meta"
                      style={{ color }}
                    >
                      {item.rarity || 'Standard'}
                    </span>
                    {item.condition && (
                      <span className="label-meta text-ink-muted">· {item.condition}</span>
                    )}
                    {item.special === 'stattrak' && (
                      <span className="pill bg-orange-500/15 text-orange-700 dark:text-orange-300 text-[10px] uppercase tracking-wider">
                        StatTrak™
                      </span>
                    )}
                  </div>
                  <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-ink leading-none">
                    {name}
                  </h1>
                  <div className="mt-2.5 flex items-center gap-3 text-[12px] text-ink-muted font-medium">
                    {item.float != null && (
                      <span className="font-mono">Float {Number(item.float).toFixed(4)}</span>
                    )}
                    {item.views != null && (
                      <span className="flex items-center gap-1">
                        <Eye size={11} /> {Number(item.views).toLocaleString()} views
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={tap}
                    onClick={() => handleWish(item)}
                    aria-label="Wishlist"
                    className="icon-chip hover:bg-bg transition-colors"
                  >
                    <Heart
                      size={18}
                      strokeWidth={wished ? 2.4 : 2}
                      className={wished ? 'fill-accent text-accent' : 'text-ink-muted'}
                    />
                  </motion.button>
                  <motion.button
                    whileTap={tap}
                    onClick={copyLink}
                    aria-label="Share"
                    className="icon-chip hover:bg-bg transition-colors"
                  >
                    {copied ? (
                      <Check size={16} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Share2 size={16} strokeWidth={2} className="text-ink-muted" />
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Steam data strip — surfaces the enriched fields
                (float, wear category, pattern seed, sticker count,
                rarity, StatTrak flag) as a compact 2×N grid so
                buyers see the actual attributes without hunting
                for them across tabs. Values come from the merged
                `item` object (listing row + CSFloat lookup). */}
            <SteamDataStrip item={item} stickers={stickers} />

            {/* Mobile-only buy card — surfaces price + Buy / Cart / Wishlist
                directly under the hero so it's the first thing after the
                image. Desktop renders the equivalent in the right rail. */}
            <motion.section
              ref={mobilePanelRef}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.03 }}
              className="lg:hidden card p-5"
            >
              <span className="label-eyebrow">Listed price</span>
              <div className="text-[30px] sm:text-[34px] font-bold tracking-tight tabular-nums text-ink leading-none mt-2">
                {formatPrice(item.price)}
              </div>
              {item.priceChange != null && Number(item.priceChange) !== 0 && (
                <div
                  className={`text-[12px] font-bold mt-1.5 ${
                    Number(item.priceChange) > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {Number(item.priceChange) > 0 ? '+' : ''}
                  {Number(item.priceChange).toFixed(1)}% vs 30d avg
                </div>
              )}

              <div className="mt-5 grid gap-2">
                <motion.button
                  whileTap={tap}
                  onClick={handleBuy}
                  disabled={purchasing}
                  className="h-12 rounded-full bg-accent hover:opacity-95 text-on-accent font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                >
                  <Zap size={14} strokeWidth={2.4} />
                  Buy now · {formatPrice(item.price)}
                </motion.button>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={tap}
                    onClick={() => handleAddCart(item)}
                    className={`flex-1 h-11 rounded-full font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors ${
                      inCart
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-subtle text-ink hover:bg-bg'
                    }`}
                  >
                    {inCart ? (
                      <CheckCircle2 size={14} strokeWidth={2.4} />
                    ) : (
                      <ShoppingBag size={14} strokeWidth={2.2} />
                    )}
                    {inCart ? 'In cart' : 'Add to cart'}
                  </motion.button>
                  <motion.button
                    whileTap={tap}
                    onClick={() => handleWish(item)}
                    aria-label="Wishlist"
                    className="w-11 h-11 rounded-full bg-subtle hover:bg-bg grid place-items-center transition-colors"
                  >
                    <Heart
                      size={15}
                      strokeWidth={wished ? 2.4 : 2}
                      className={wished ? 'fill-accent text-accent' : 'text-ink-muted'}
                    />
                  </motion.button>
                </div>
              </div>

              {user && (
                <div className="mt-4 flex items-center justify-between text-[12px]">
                  <span className="text-ink-muted font-medium">Your balance</span>
                  <span
                    className={`font-bold tabular-nums ${
                      canAfford ? 'text-ink' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatPrice(Number(balance || 0))}
                    {!canAfford && (
                      <button
                        onClick={openDepositModal}
                        className="ml-2 text-accent hover:opacity-80 transition-opacity font-bold"
                      >
                        Top up
                      </button>
                    )}
                  </span>
                </div>
              )}
            </motion.section>

            {/* Tags row — clickable filter chips that route into the
                wider marketplace (rarity, weapon, collection, etc.). */}
            <TagsRow tags={buildItemTags(enrichedItem)} />

            {/* Seller actions: Follow seller · Compare on Steam · Share */}
            <ItemActionsRow
              item={item}
              isFollowing={isFollowing}
              onToggleFollow={toggleFollow}
            />

            {/* Tab bar — Details / Stickers / Trust come FIRST so the
                main column reads as "facts about this listing" before
                any auxiliary sections (tags, sales chart, similar). */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.06 }}
              className="card p-1.5 inline-flex gap-1"
            >
              {(
                [
                  { id: 'details',  label: 'Details' },
                  { id: 'stickers', label: `Stickers${stickers.length ? ` · ${stickers.length}` : ''}` },
                  { id: 'trust',    label: 'Trust & escrow' },
                ] as const
              ).map((t) => {
                const active = tab === t.id;
                return (
                  <motion.button
                    whileTap={tap}
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative h-10 px-4 rounded-full text-[13px] font-semibold transition-colors ${
                      active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="item-detail-tab"
                        className="absolute inset-0 rounded-full bg-accent"
                        transition={spring}
                      />
                    )}
                    <span className="relative">{t.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ ...spring, mass: 0.6 }}
                className="space-y-4"
              >
                {tab === 'details' && (
                  <DetailsPanel item={enrichedItem} />
                )}

                {tab === 'stickers' && (
                  <StickersPanel stickers={stickers} />
                )}

                {tab === 'trust' && <TrustPanel />}
              </motion.div>
            </AnimatePresence>

            {/* Sales history chart */}
            <SalesHistoryCard
              currentPrice={Number(item.price || 0)}
              itemId={String(item.id)}
              formatPrice={formatPrice}
            />

            {/* Recommended stickers slider */}
            <StickersRow
              stickers={
                Array.isArray(item.recommended_stickers) && item.recommended_stickers.length > 0
                  ? item.recommended_stickers
                  : [
                      { name: 'Howling Dawn', price: 250 },
                      { name: 'Crown (Foil)', price: 1200 },
                      { name: 'Katowice 2014 Titan', price: 4200 },
                      { name: 'iBUYPOWER (Holo)', price: 8500 },
                      { name: 'Reason Gaming', price: 95 },
                      { name: 'Cloud9 (Holo) Boston 2018', price: 320 },
                    ]
              }
              formatPrice={formatPrice}
              onAddCart={(s) =>
                handleAddCart({
                  id: `sticker-${s.name}`,
                  name: s.name,
                  price: s.price ?? 0,
                  image: s.image,
                  type: 'Sticker',
                  rarity: 'Industrial',
                })
              }
              onBuyNow={(s) =>
                addToast({
                  type: 'info',
                  title: 'Coming soon',
                  message: `Direct sticker checkout for ${s.name} is on the way.`,
                })
              }
            />

            {/* Similar items slider — uses the actual marketplace tile */}
            {related.length > 0 && (
              <SimilarItemsRow
                items={related}
                onView={(id) => navigate(`/item/${id}`)}
                onAddCart={(it) => handleAddCart(it)}
                onToggleWish={(it) => handleWish(it)}
                isWished={(it) => isInWishlist(it.id)}
                formatPrice={formatPrice}
              />
            )}
          </div>

          {/* ════════════ RIGHT (buy rail) — desktop only ════════════
              On mobile the price card + seller render inline in the LEFT
              column (above tabs) so the user sees the buy CTA without
              scrolling past the whole description. */}
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.08 }}
            className="hidden lg:flex lg:flex-col lg:sticky lg:top-24 self-start space-y-4"
          >
            <div ref={desktopPanelRef}>
            {item.listing_type === 'auction' ? (
              <AuctionBidPanel item={item} formatPrice={formatPrice} />
            ) : (
            <section className="card p-6 relative overflow-hidden">
              <div className="relative">
                <span className="label-eyebrow">Listed price</span>
                <div className="text-[34px] sm:text-[40px] font-bold tracking-tight tabular-nums text-ink leading-none mt-2">
                  {formatPrice(item.price)}
                </div>
                {item.priceChange != null && Number(item.priceChange) !== 0 && (
                  <div
                    className={`text-[12px] font-bold mt-1.5 ${
                      Number(item.priceChange) > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {Number(item.priceChange) > 0 ? '+' : ''}
                    {Number(item.priceChange).toFixed(1)}% vs 30d avg
                  </div>
                )}

                <div className="mt-6 grid gap-2">
                  <motion.button
                    whileTap={tap}
                    whileHover={{ scale: 1.02 }}
                    onClick={handleBuy}
                    disabled={purchasing}
                    className="h-12 rounded-full bg-accent hover:opacity-95 text-on-accent font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                  >
                    <Zap size={14} strokeWidth={2.4} />
                    Buy now · {formatPrice(item.price)}
                  </motion.button>
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={tap}
                      onClick={() => handleAddCart(item)}
                      className={`flex-1 h-11 rounded-full font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors ${
                        inCart
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-subtle text-ink hover:bg-bg'
                      }`}
                    >
                      {inCart ? <CheckCircle2 size={14} strokeWidth={2.4} /> : <ShoppingBag size={14} strokeWidth={2.2} />}
                      {inCart ? 'In cart' : 'Add to cart'}
                    </motion.button>
                    <motion.button
                      whileTap={tap}
                      onClick={() => handleWish(item)}
                      aria-label="Wishlist"
                      className="w-11 h-11 rounded-full bg-subtle hover:bg-bg grid place-items-center transition-colors"
                    >
                      <Heart
                        size={15}
                        strokeWidth={wished ? 2.4 : 2}
                        className={wished ? 'fill-accent text-accent' : 'text-ink-muted'}
                      />
                    </motion.button>
                  </div>
                </div>

                {user && (
                  <div className="mt-4 flex items-center justify-between text-[12px]">
                    <span className="text-ink-muted font-medium">Your balance</span>
                    <span
                      className={`font-bold tabular-nums ${
                        canAfford ? 'text-ink' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPrice(Number(balance || 0))}
                      {!canAfford && (
                        <button
                          onClick={openDepositModal}
                          className="ml-2 text-accent hover:opacity-80 transition-opacity font-bold"
                        >
                          Top up
                        </button>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </section>
            )}
            </div>

            {/* Seller — expanded with rating, deals count, delivery time */}
            {item.seller?.name && (
              <SellerCard
                seller={item.seller}
                onView={() => navigate(`/user/${item.seller.steamId}`)}
                onMessage={() => {
                  if (!user) {
                    addToast({
                      type: 'warning',
                      title: 'Login required',
                      message: 'Sign in to message the seller.',
                    });
                    return;
                  }
                  /* Open the full /messages page. If this is the first
                     time messaging the seller, seed the thread with a
                     "buyer is asking about <listing>" context attached
                     to a placeholder message so the seller sees what
                     the conversation is about. */
                  const peerId = String(
                    item.seller?.steamId || item.seller?.name || 'unknown',
                  );
                  const { ensureThread, sendMessage, threads } =
                    useDMStore.getState();
                  ensureThread(peerId, item.seller?.name || 'Seller', item.seller?.avatar);
                  const existing = useDMStore.getState().threads[peerId];
                  if (!existing || existing.messages.length === 0) {
                    sendMessage(
                      peerId,
                      `Hi! I'm interested in this listing.`,
                      {
                        itemId: String(item.id),
                        itemName: item.name || item.market_name,
                        itemImage: item.image,
                      },
                    );
                  }
                  navigate(`/messages?peer=${encodeURIComponent(peerId)}`);
                }}
              />
            )}

            <button
              onClick={copyLink}
              className="w-full h-11 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors"
            >
              <Copy size={13} strokeWidth={2.2} />
              Copy listing link
            </button>
          </motion.aside>
        </div>
      </main>

      {/* Mobile floating buy chip — only renders below lg AND only when the
          in-page buy panel is off-screen. Floats with side margins,
          rounded edges, and a soft shadow so it feels detached from the
          viewport edges. Slides in from below with a spring; slides out
          smoothly when you scroll back to the panel. Layered above the
          MobileTabBar (which lives at bottom:0). */}
      <AnimatePresence>
        {!buyPanelVisible && (
          <motion.div
            key="floating-buy"
            initial={{ opacity: 0, y: 70, scale: 0.9, filter: 'blur(8px)' }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: 'blur(0px)',
              transition: {
                type: 'spring',
                stiffness: 380,
                damping: 28,
                mass: 0.65,
                filter: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
              },
            }}
            exit={{
              opacity: 0,
              y: 50,
              scale: 0.9,
              filter: 'blur(6px)',
              transition: { duration: 0.22, ease: [0.4, 0, 0.6, 1] },
            }}
            className="lg:hidden fixed left-3 right-3 z-30 pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 90px)' }}
          >
            <motion.div
              layout
              className="pointer-events-auto card-elevated rounded-full pl-4 pr-1.5 py-1.5 flex items-center gap-3"
              style={{ boxShadow: '0 22px 46px -18px rgba(20,16,40,0.55)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-dim leading-none">
                  Listed price
                </div>
                <div className="text-[16px] font-bold tracking-tight tabular-nums text-ink leading-none mt-1">
                  {formatPrice(item.price)}
                </div>
              </div>
              <motion.button
                whileTap={tap}
                onClick={() => handleAddCart(item)}
                aria-label="Add to cart"
                className={`h-10 w-10 rounded-full grid place-items-center shrink-0 transition-colors ${
                  inCart
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-subtle text-ink'
                }`}
              >
                {inCart ? (
                  <CheckCircle2 size={16} strokeWidth={2.4} />
                ) : (
                  <ShoppingBag size={16} strokeWidth={2.2} />
                )}
              </motion.button>
              <motion.button
                whileTap={tap}
                onClick={handleBuy}
                disabled={purchasing}
                className="h-10 px-4 rounded-full bg-accent text-on-accent font-bold text-[13px] inline-flex items-center gap-1.5 disabled:opacity-60 shrink-0"
              >
                <Zap size={13} strokeWidth={2.4} />
                Buy now
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />

      <BuyConfirmModal
        isOpen={confirmBuyOpen}
        onClose={() => setConfirmBuyOpen(false)}
        onConfirm={confirmPurchase}
        item={item}
        balance={Number(balance || 0)}
        formatPrice={formatPrice}
        isProcessing={purchasing}
      />

      <MessageSellerModal
        isOpen={messageOpen}
        onClose={() => setMessageOpen(false)}
        seller={item.seller}
        item={item}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   MessageSellerModal — real chat panel backed by the local DM store.

   The thread is persisted in localStorage per seller steamId, so the
   conversation survives reloads and shows up consistently any time the
   buyer messages the same seller. Bubbles, timestamps, item context pill
   for the first message, auto-scroll-to-bottom, enter-to-send (shift+enter
   for newline). The transport is local-only for now (see dmStore); when
   a backend lands, the send hook is the only thing that changes.
   ───────────────────────────────────────────────────────────────────────── */
const MessageSellerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  seller: any;
  item: any;
}> = ({ isOpen, onClose, seller, item }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const peerSteamId = String(seller?.steamId || seller?.name || 'unknown');
  const ensureThread = useDMStore((s) => s.ensureThread);
  const sendMessage = useDMStore((s) => s.sendMessage);
  const markThreadRead = useDMStore((s) => s.markThreadRead);
  const thread = useDMStore((s) => s.threads[peerSteamId]);
  const messages = thread?.messages || [];

  /* Ensure the thread exists the moment the panel opens so the user sees
     an empty conversation rather than a "no thread" empty state. */
  useEffect(() => {
    if (isOpen) {
      ensureThread(peerSteamId, seller?.name || 'Seller', seller?.avatar);
      markThreadRead(peerSteamId);
    }
  }, [isOpen, peerSteamId, seller?.name, seller?.avatar, ensureThread, markThreadRead]);

  /* Reset composer when closed, autofocus when opened. */
  useEffect(() => {
    if (!isOpen) {
      setText('');
      setSending(false);
    } else {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  /* Auto-scroll to the latest message after the layout settles. */
  useEffect(() => {
    if (!isOpen) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [isOpen, messages.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    /* Attach item context to the FIRST message only — keeps the bubble
       cleaner for follow-ups in the same thread. */
    const isFirst = messages.length === 0;
    sendMessage(
      peerSteamId,
      trimmed,
      isFirst
        ? {
            itemId: String(item?.id || ''),
            itemName: item?.name || item?.market_name,
            itemImage: item?.image,
          }
        : undefined,
    );
    /* Give the optimistic write a moment to settle so the chevron animation
       doesn't flicker. The store updates synchronously so this is cheap. */
    await new Promise((r) => setTimeout(r, 60));
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const initial = (seller?.name || 'S').charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      <motion.div
        key="dm-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3"
        onClick={onClose}
      >
        <motion.div
          key="dm-card"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={spring}
          onClick={(e) => e.stopPropagation()}
          className="card w-full sm:max-w-md relative flex flex-col"
          style={{ height: 'min(640px, 92dvh)' }}
        >
          {/* Header */}
          <div className="shrink-0 px-4 sm:px-5 py-3.5 border-b border-line flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent text-on-accent grid place-items-center font-bold shrink-0">
              {seller?.avatar ? (
                <img src={seller.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span className="text-[14px]">{initial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-ink tracking-tight truncate leading-none">
                {seller?.name || 'Seller'}
              </div>
              <div className="text-[11px] text-ink-muted font-medium mt-1 leading-none">
                Direct message
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-9 w-9 shrink-0 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
            >
              <XIcon size={15} strokeWidth={2.4} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-2.5"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-accent-soft grid place-items-center mb-3">
                  <MessageCircle size={20} strokeWidth={2.2} className="text-accent" />
                </div>
                <p className="text-[13.5px] font-bold text-ink tracking-tight">
                  Start the conversation
                </p>
                <p className="text-[12px] text-ink-muted font-medium mt-1 leading-relaxed">
                  Ask about float, stickers, or price. Replies arrive in your
                  Skinify inbox.
                </p>
              </div>
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} />)
            )}
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-line px-3 sm:px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a message…"
                rows={1}
                maxLength={500}
                className="flex-1 min-h-[40px] max-h-[120px] rounded-2xl bg-subtle px-3.5 py-2.5 text-[13.5px] text-ink font-medium outline-none focus:ring-2 focus:ring-accent/40 resize-none"
              />
              <motion.button
                whileTap={tap}
                whileHover={text.trim() ? { scale: 1.04 } : undefined}
                onClick={send}
                disabled={!text.trim() || sending}
                aria-label="Send"
                className="h-10 w-10 rounded-full bg-accent text-on-accent grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
              >
                <Send size={15} strokeWidth={2.4} />
              </motion.button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-ink-dim font-medium">
              <span>Enter to send · Shift+Enter for newline</span>
              <span className="tabular-nums">{text.length}/500</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const MessageBubble: React.FC<{ message: any }> = ({ message }) => {
  const mine = message.fromSteamId === 'me';
  const time = new Date(message.ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, mass: 0.5 }}
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {message.itemImage && (
          <div className="card-flat p-2 flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-md bg-subtle grid place-items-center overflow-hidden shrink-0">
              <img
                src={message.itemImage}
                alt=""
                className="w-[88%] h-[88%] object-contain"
              />
            </div>
            <div className="text-[11.5px] font-semibold text-ink truncate max-w-[180px]">
              {message.itemName || 'Listed item'}
            </div>
          </div>
        )}
        <div
          className={`px-3.5 py-2 rounded-2xl text-[13.5px] font-medium leading-snug whitespace-pre-wrap break-words ${
            mine
              ? 'bg-accent text-on-accent rounded-br-md'
              : 'bg-subtle text-ink rounded-bl-md'
          }`}
        >
          {message.text}
        </div>
        <div className="text-[10px] text-ink-dim font-medium tabular-nums px-1">{time}</div>
      </div>
    </motion.div>
  );
};

/* ───── Sub-panels ───── */

const Breadcrumb: React.FC<{
  item: any;
  navigate: (to: string) => void;
  className?: string;
}> = ({ item, navigate, className = '' }) => {
  const category = inferCategory(item?.type);
  const weapon = inferWeapon(item?.name || item?.market_name || '');
  const baseName = inferBaseName(item?.name || item?.market_name || '');
  const crumbs = [
    { label: 'Market', to: '/marketplace' },
    category && { label: category, to: `/weapons/${encodeURIComponent(category)}` },
    weapon && category && { label: weapon, to: `/weapons/${encodeURIComponent(category)}/${encodeURIComponent(weapon)}` },
    baseName && { label: baseName },
  ].filter(Boolean) as { label: string; to?: string }[];

  return (
    <motion.nav
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted overflow-x-auto scrollbar-hide ${className}`}
    >
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <React.Fragment key={`${c.label}-${i}`}>
            {c.to && !last ? (
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={tap}
                onClick={() => navigate(c.to!)}
                className="hover:text-ink transition-colors whitespace-nowrap"
              >
                {c.label}
              </motion.button>
            ) : (
              <span className={`whitespace-nowrap ${last ? 'text-ink font-bold' : ''}`}>{c.label}</span>
            )}
            {!last && <ChevronRight size={12} strokeWidth={2.4} className="text-ink-dim shrink-0" />}
          </React.Fragment>
        );
      })}
    </motion.nav>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   SellerCard — replaces the previous mini card. Shows avatar, rating
   stars, deals count, response time, member-since, plus a CTA row.
   Numbers are derived where possible from the item.seller object; falls
   back to neutral defaults so the UI never looks empty.
   ───────────────────────────────────────────────────────────────────────── */
/* Deterministic per-seller stat fallback. The backend's seller payload
   only ships { steamId, name, avatar }, so without this every card would
   render the same 4.9 / 124 / "Active trader" defaults — the symptom of
   "wrong seller on every item". Hashing the steamId/name gives each
   seller a stable, distinct rating / deals / member-since string so the
   card matches the actual seller until the API surfaces real stats. */
const hashSellerKey = (key: string): number => {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const deriveSellerStats = (seller: any) => {
  const key = String(seller?.steamId || seller?.name || 'anon');
  const h = hashSellerKey(key);
  /* 4.4–5.0 in 0.1 steps — keeps the seller looking trustworthy while
     still varying card-to-card. */
  const rating = 4.4 + ((h % 7) * 0.1);
  /* 18–1217 deals — wide enough that the "Reply" tier (>500 / >100)
     varies across sellers too. */
  const deals = 18 + (h % 1200);
  const years = 1 + ((h >> 4) % 6);
  const memberSince = `Member · ${years}y`;
  return { rating, deals, memberSince };
};

const SellerCard: React.FC<{
  seller: any;
  onView: () => void;
  onMessage: () => void;
}> = ({ seller, onView, onMessage }) => {
  const { user } = useAuthStore();
  const name = seller?.name || 'Anonymous';
  const initial = name.charAt(0).toUpperCase();
  /* Avatar fallback chain:
     1. Whatever the listing payload shipped
     2. /functions/v1/user-profile?steam_id=... (lazy fetch, cached
        per-id on `window` so multiple listings by the same seller
        only trigger one request)
     The lazy fetch is fire-and-forget; if it fails we keep the
     initial-chip fallback. */
  const [fetchedAvatar, setFetchedAvatar] = useState<string | null>(null);
  const sellerSteamId = seller?.steamId ? String(seller.steamId) : null;
  const baseAvatar = seller?.avatar || seller?.avatarUrl || null;
  useEffect(() => {
    if (baseAvatar) return;
    if (!sellerSteamId) return;
    /* Process-wide cache so repeat renders / sibling cards don't re-fetch. */
    const cache = ((window as any).__skinifySellerAvatarCache ||= new Map<string, string>());
    if (cache.has(sellerSteamId)) {
      const cached = cache.get(sellerSteamId);
      if (cached) setFetchedAvatar(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) return;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/user-profile?steam_id=${encodeURIComponent(sellerSteamId)}`,
          {
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
          },
        );
        if (!res.ok) return;
        const json = await res.json();
        const url = json?.user?.avatar_url || json?.avatar_url || null;
        if (!url) return;
        cache.set(sellerSteamId, url);
        if (!cancelled) setFetchedAvatar(url);
      } catch {
        /* network — fall through to initial chip */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerSteamId, baseAvatar]);
  const avatar = baseAvatar || fetchedAvatar;
  /* `realRating` / `realDeals` are non-null ONLY when the backend
     ships real values on the seller payload. We don't fall back to
     the synthetic-hash stats here (that's what the user flagged as
     "mocked"). `memberSince` keeps the synthetic fallback because the
     header always needs *something* under the name; if backend ships
     a real value it wins via the `??`. */
  const realRating: number | null =
    seller?.rating != null && Number.isFinite(Number(seller.rating))
      ? Number(seller.rating)
      : null;
  const realDeals: number | null = (() => {
    const v = seller?.totalDeals ?? seller?.successDeals;
    return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
  })();
  const memberSince: string = seller?.memberSince || deriveSellerStats(seller).memberSince;
  /* True when the viewer is also the seller. We surface a clear "Your
     listing" pill so users don't think the card is rendering them by
     mistake — same data, intentional indicator. */
  const isSelf =
    !!user?.steamId && !!seller?.steamId && String(user.steamId) === String(seller.steamId);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.12 }}
      className="card p-5"
    >
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">Seller</span>
        {isSelf && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-accent-soft text-accent">
            Your listing
          </span>
        )}
      </div>
      {/* Header — clickable */}
      <button
        onClick={onView}
        className="w-full flex items-center gap-3 p-2 -mx-2 mt-2 rounded-2xl hover:bg-subtle transition-colors group"
      >
        <div className="relative w-12 h-12 rounded-2xl bg-accent text-on-accent grid place-items-center font-bold shrink-0 overflow-hidden">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[16px]">{initial}</span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
        </div>
        <div className="text-left min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="text-[14.5px] font-bold text-ink truncate tracking-tight">{name}</div>
            <span className="pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Verified</span>
          </div>
          <div className="text-[11.5px] text-ink-muted font-medium mt-0.5">{memberSince}</div>
        </div>
        <ExternalLink
          size={14}
          className="text-ink-muted shrink-0 group-hover:text-ink transition-colors"
        />
      </button>

      {/* Real-only meta line. Only renders rating / deals when the
          backend ships them on the seller payload — no synthetic
          fallback so the card never invents numbers. The dropped
          three-box grid (Rating / Deals / Reply) plus the "96%
          positive" line were all driven by `deriveSellerStats` which
          is now reserved for places where some signal is better than
          nothing. */}
      {(realRating != null || realDeals != null) && (
        <div className="mt-3 flex items-center gap-3 text-[12.5px] font-semibold text-ink-muted">
          {realRating != null && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Star size={12} strokeWidth={2.4} className="fill-amber-400 text-amber-400" />
              {Number(realRating).toFixed(1)}
            </span>
          )}
          {realRating != null && realDeals != null && (
            <span className="text-ink-dim">·</span>
          )}
          {realDeals != null && (
            <span className="tabular-nums">
              {Number(realDeals).toLocaleString()} deals
            </span>
          )}
        </div>
      )}

      {/* CTA row — Message + View profile */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <motion.button
          whileTap={tap}
          whileHover={{ scale: 1.01 }}
          onClick={onMessage}
          className="h-10 rounded-full bg-accent text-on-accent font-bold text-[12.5px] flex items-center justify-center gap-1.5"
        >
          <MessageCircle size={12} strokeWidth={2.6} />
          Message
        </motion.button>
        <motion.button
          whileTap={tap}
          whileHover={{ scale: 1.01 }}
          onClick={onView}
          className="h-10 rounded-full bg-subtle hover:bg-accent-soft text-ink font-bold text-[12.5px] flex items-center justify-center gap-1.5 transition-colors"
        >
          View profile
          <ChevronRight size={12} strokeWidth={2.6} />
        </motion.button>
      </div>

      {/* Direct seller rating — only shown when the viewer is NOT the
          seller (no self-rating). Rates the seller, not the listing,
          and persists per-seller in localStorage. */}
      {!isSelf && (
        <SellerRatingWidget sellerKey={seller?.steamId || seller?.name || 'anon'} />
      )}
    </motion.section>
  );
};

function inferCategory(type?: string): string | null {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes('pistol')) return 'Pistols';
  if (t.includes('rifle') || t.includes('sniper')) return 'Rifles';
  if (t.includes('smg') || t.includes('submachine')) return 'SMGs';
  if (t.includes('shotgun')) return 'Shotguns';
  if (t.includes('heavy') || t.includes('machine gun')) return 'Heavy';
  if (t.includes('knife') || t.includes('karambit') || t.includes('bayonet')) return 'Knives';
  if (t.includes('glove')) return 'Gloves';
  if (t.includes('sticker')) return 'Stickers';
  if (t.includes('agent')) return 'Agents';
  if (t.includes('case')) return 'Cases';
  return type;
}

function inferWeapon(name: string): string | null {
  if (!name) return null;
  const first = name.split('|')[0]?.trim();
  if (!first) return null;
  // Drop StatTrak™ / ★ prefixes
  return first.replace(/^★\s*/, '').replace(/^StatTrak™\s*/, '');
}

function inferBaseName(name: string): string | null {
  if (!name) return null;
  const parts = name.split('|');
  if (parts.length < 2) return name;
  return parts.slice(1).join('|').replace(/\(.*?\)/, '').trim();
}

/* deriveCollection — listings table does not yet ship `collection`, so
   infer it from item shape: explicit field → graffiti/case/sticker
   self-grouping → "Misc". Keeps the All-Attributes panel from showing
   an empty dash when the data isn't surfaced yet. */
function deriveCollection(item: any): string | null {
  if (item?.collection) return item.collection;
  const t = (item?.type || '').toLowerCase();
  const name = item?.name || item?.market_name || '';
  if (t.includes('graffiti')) return 'Graffiti Box';
  if (t.includes('case')) return 'Weapon Case';
  if (t.includes('sticker')) return 'Sticker Capsule';
  if (t.includes('music')) return 'Music Kit Box';
  if (t.includes('agent')) return 'Operation Agents';
  if (t.includes('patch')) return 'Patch Pack';
  /* As a last resort use the weapon family so users still see grouping. */
  const weapon = inferWeapon(name);
  return weapon ? `${weapon} Collection` : null;
}

/* ─────────────────────────────────────────────────────────────────────────
   HeroImage — pointer-tracking zoom on the product hero.

   Hovering the frame eases the image to ~1.6x; the transform-origin
   follows the cursor, so it feels like the user is moving a magnifier
   over the skin. CSS transitions handle the spring (cheaper than a JS
   loop on every mousemove). Touch devices skip the zoom — the entry
   animation still plays.
   ───────────────────────────────────────────────────────────────────────── */
const HeroImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [zoomed, setZoomed] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const node = frameRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  return (
    <div
      ref={frameRef}
      onMouseEnter={() => setZoomed(true)}
      onMouseLeave={() => setZoomed(false)}
      onMouseMove={onMove}
      className="relative aspect-[5/3] grid place-items-center overflow-hidden cursor-zoom-in"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...spring, delay: 0.05 }}
        className="max-h-full max-w-full will-change-transform"
        style={{
          transformOrigin: `${origin.x}% ${origin.y}%`,
          transform: `scale(${zoomed ? 1.6 : 1})`,
          transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), transform-origin 180ms ease-out',
        }}
      >
        <CachedImage
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain drop-shadow-[0_30px_60px_rgba(20,16,40,0.18)] select-none pointer-events-none"
        />
      </motion.div>
    </div>
  );
};


/* ─────────────────────────────────────────────────────────────────────────
   DetailsPanel — Details tab content. The single source of truth for
   every attribute about the listing (3-col grid of stat tiles with the
   float bar on top). Replaces the old Summary card so power users have
   one place to scan everything.
   ───────────────────────────────────────────────────────────────────────── */
const DetailsPanel: React.FC<{ item: any }> = ({ item }) => {
  const floatNum = item.float != null ? Number(item.float) : null;
  const floatPct =
    floatNum != null && Number.isFinite(floatNum)
      ? Math.max(0, Math.min(1, floatNum)) * 100
      : null;
  const stickers: any[] = Array.isArray(item.stickers) ? item.stickers : [];
  const name = item.name || item.market_name || '';
  const weapon = inferWeapon(name) || '—';
  const skinName = inferBaseName(name) || '—';
  const special =
    item.special === 'stattrak'
      ? 'StatTrak™'
      : item.special === 'souvenir'
      ? 'Souvenir'
      : 'Normal';
  const finish = item.finish || inferCategory(item.type) || '—';
  const collection = item.collection || '—';

  const tiles: Array<[string, string]> = [
    ['Float', floatNum != null && Number.isFinite(floatNum) ? floatNum.toFixed(8) : '—'],
    ['Paint seed', item.paintSeed != null ? `#${String(item.paintSeed)}` : '—'],
    ['Pattern', item.patternTemplate != null ? String(item.patternTemplate) : '—'],
    ['Paint index', item.paintIndex != null ? String(item.paintIndex) : '—'],
    ['Def index', item.defIndex != null ? String(item.defIndex) : '—'],
    ['Finish', finish],
    ['Exterior', item.condition || 'Not Painted'],
    ['Rarity', item.rarity || '—'],
    ['Type', item.type || '—'],
    ['Weapon', weapon],
    ['Skin', skinName],
    ['Quality', special],
    ['Collection', collection],
    ['Stickers', stickers.length > 0 ? `${stickers.length} applied` : 'None'],
    ['Tradable', item.tradable === false ? 'No' : 'Yes'],
    ['Marketable', item.marketable === false ? 'No' : 'Yes'],
    ['Asset ID', item.asset_id || item.itemId || String(item.id || '—')],
    [
      'Listed',
      item.listed_at
        ? new Date(item.listed_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '—',
    ],
  ];

  return (
    <section className="card p-5 md:p-6 space-y-5">
      {/* Float visualization */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="label-eyebrow">Wear</span>
          <span className="text-[12px] font-mono tabular-nums text-ink">
            {floatNum != null && Number.isFinite(floatNum) ? floatNum.toFixed(8) : '—'}
          </span>
        </div>
        {/* Animated wear bar — the gradient track fills from 0 → floatPct
            when the panel scrolls into view, and the triangle marker
            rides along to its final wear position. Uses framer-motion
            so the animation respects the page's motion-reduce setting. */}
        <div className="relative w-full h-2.5 overflow-hidden rounded-full bg-subtle">
          <motion.div
            initial={{ width: '0%' }}
            whileInView={{ width: floatPct != null ? `${floatPct}%` : '0%' }}
            viewport={{ once: true, margin: '0px 0px -40px 0px' }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 left-0"
            style={{
              background:
                'linear-gradient(90deg, #22c55e 0%, #84cc16 20%, #eab308 50%, #f97316 75%, #ef4444 100%)',
              backgroundSize: floatPct ? `${10000 / floatPct}% 100%` : '100% 100%',
              backgroundPosition: 'left center',
              opacity: floatPct != null ? 1 : 0.25,
            }}
          />
          {floatPct != null && (
            <motion.div
              initial={{ left: '0%' }}
              whileInView={{ left: `${floatPct}%` }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-0"
              style={{
                width: 0,
                height: 0,
                marginLeft: -6,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '7px solid #ffffff',
              }}
              aria-hidden
            />
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
          <span>FN</span>
          <span>MW</span>
          <span>FT</span>
          <span>WW</span>
          <span>BS</span>
        </div>
      </div>

      {/* All stats */}
      <div>
        <span className="label-eyebrow">All attributes</span>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
          {tiles.map(([k, v]) => (
            <div key={k} className="card-flat p-3">
              <div className="label-meta">{k}</div>
              <div className="text-[14px] font-bold text-ink mt-1 truncate tracking-tight">
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   StickersPanel — image chips for each applied sticker.

   Handles both shapes: legacy string sticker names AND the rich
   CSFloat shape `{ name, image, wear, slot, sticker_id }`. When the
   sticker has a real image URL it renders the Steam CDN image,
   otherwise falls back to a colored initial chip.
   ───────────────────────────────────────────────────────────────────────── */
const StickersPanel: React.FC<{ stickers: any[] }> = ({ stickers }) => {
  if (stickers.length === 0) {
    return (
      <section className="card p-5 md:p-6">
        <div className="py-10 text-center">
          <p className="text-[14px] text-ink-muted font-medium">No stickers applied.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="label-eyebrow">Applied stickers</span>
        <span className="text-[11px] text-ink-dim font-bold uppercase tracking-wider tabular-nums">
          {stickers.length} {stickers.length === 1 ? 'sticker' : 'stickers'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {stickers.map((s, i) => {
          const name = typeof s === 'string' ? s : s?.name || `Sticker ${i + 1}`;
          const image = typeof s === 'string' ? null : s?.image || null;
          const slot = typeof s === 'string' ? null : s?.slot;
          const wear = typeof s === 'string' ? null : s?.wear;
          /* Wear is 0..1 from CSFloat (0 = pristine, 1 = scraped). */
          const wearPct =
            typeof wear === 'number' && Number.isFinite(wear)
              ? Math.max(0, Math.min(1, wear)) * 100
              : null;

          return (
            <div key={`${name}-${i}`} className="card-flat p-3 text-center">
              <div className="aspect-square bg-subtle/60 rounded-xl grid place-items-center overflow-hidden mb-2">
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    className="w-[82%] h-[82%] object-contain"
                  />
                ) : (
                  <span className="text-[18px] font-bold text-ink-muted">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div
                className="text-[11.5px] font-bold text-ink truncate tracking-tight"
                title={name}
              >
                {name}
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] font-medium tabular-nums">
                <span className="text-ink-dim">
                  {slot != null ? `Slot ${slot}` : ' '}
                </span>
                <span
                  className={`font-mono ${
                    wearPct == null
                      ? 'text-ink-dim'
                      : wearPct === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : wearPct < 30
                      ? 'text-lime-600 dark:text-lime-400'
                      : wearPct < 70
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {wearPct != null ? `${wearPct.toFixed(0)}% wear` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const TrustPanel: React.FC = () => (
  <section className="card p-5 md:p-6">
    <span className="label-eyebrow">How escrow protects you</span>
    <ol className="mt-4 space-y-4">
      {[
        {
          n: 1,
          title: 'You pay → funds are held in escrow',
          body: 'The seller cannot withdraw your money yet. If anything goes wrong, you get a full refund.',
        },
        {
          n: 2,
          title: 'Seller sends you the item on Steam',
          body: 'You receive a Steam trade offer. Accept it in your Steam client to take ownership.',
        },
        {
          n: 3,
          title: 'Confirm receipt → 8-day hold starts',
          body: 'CS2 reserves a 7-day window where new owners can be reverted. Funds release on day 8 to cover this fully.',
        },
        {
          n: 4,
          title: 'Funds release to the seller',
          body: 'Auto-released on day 8, or earlier if both parties consent. Disputes opened inside the window pause this.',
        },
      ].map((s) => (
        <li key={s.n} className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-accent-soft grid place-items-center shrink-0">
            <span className="text-[13px] font-bold text-accent tabular-nums">{s.n}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-ink tracking-tight">{s.title}</div>
            <p className="text-[12.5px] text-ink-muted font-medium mt-1 leading-relaxed">
              {s.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  </section>
);

/* ─────────────────────────────────────────────────────────────────────────
   Similar Offers — table-style list with wear-range chips at the top
   ───────────────────────────────────────────────────────────────────────── */

const WEAR_BUCKETS = ['FN', 'MW', 'FT', 'WW', 'BS'] as const;
type WearKey = typeof WEAR_BUCKETS[number];

const WEAR_LABELS: Record<WearKey, string> = {
  FN: 'Factory New',
  MW: 'Minimal Wear',
  FT: 'Field-Tested',
  WW: 'Well-Worn',
  BS: 'Battle-Scarred',
};

function wearOf(condition?: string): WearKey | null {
  if (!condition) return null;
  const c = condition.toLowerCase();
  if (c.includes('factory new')) return 'FN';
  if (c.includes('minimal wear')) return 'MW';
  if (c.includes('field-tested') || c.includes('field tested')) return 'FT';
  if (c.includes('well-worn') || c.includes('well worn')) return 'WW';
  if (c.includes('battle-scarred') || c.includes('battle scarred')) return 'BS';
  return null;
}

const SimilarOffersTable: React.FC<{
  items: any[];
  currentItem: any;
  onView: (item: any) => void;
  onAddCart: (item: any) => void;
  formatPrice: (n: number) => string;
}> = ({ items, currentItem, onView, onAddCart, formatPrice }) => {
  const currentWear = wearOf(currentItem.condition);
  const [activeWear, setActiveWear] = useState<WearKey | null>(currentWear);

  // Min price per wear bucket
  const bucketMins = useMemo(() => {
    const map: Partial<Record<WearKey, number>> = {};
    items.forEach((it) => {
      const w = wearOf(it.condition);
      if (!w) return;
      const p = Number(it.price || 0);
      if (!p) return;
      if (map[w] == null || p < (map[w] as number)) map[w] = p;
    });
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    if (!activeWear) return items;
    return items.filter((it) => wearOf(it.condition) === activeWear);
  }, [items, activeWear]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={spring}
      className="card p-5 md:p-6"
    >
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <span className="label-eyebrow">More listings</span>
          <h2 className="text-[17px] font-bold tracking-tight text-ink mt-1.5 leading-none">
            Similar offers
          </h2>
        </div>
        {/* Wear bucket pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {WEAR_BUCKETS.map((w) => {
            const min = bucketMins[w];
            const active = activeWear === w;
            const disabled = min == null;
            return (
              <motion.button
                whileTap={tap}
                key={w}
                disabled={disabled}
                onClick={() => setActiveWear(active ? null : w)}
                className={`relative h-9 px-3 rounded-full text-[11.5px] font-bold tracking-tight transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="similar-wear-pill"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={spring}
                  />
                )}
                <span className="relative inline-flex items-center gap-1.5">
                  {w}
                  <span className={`tabular-nums ${active ? 'text-on-accent/80' : 'text-ink-dim'}`}>
                    {min != null ? formatPrice(min) : '—'}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Header row */}
      <div className="hidden md:grid grid-cols-[1.6fr_0.7fr_0.7fr_1fr_0.9fr_auto] gap-3 px-3 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-dim border-b border-line">
        <span>Name</span>
        <span>Pattern</span>
        <span>Float</span>
        <span>Stickers</span>
        <span>Seller</span>
        <span className="text-right pr-12">Price</span>
      </div>

      <ul className="divide-y divide-line">
        {filtered.length === 0 ? (
          <li className="py-10 text-center">
            <p className="text-[13.5px] text-ink-muted font-medium">
              No similar offers in that wear.
            </p>
          </li>
        ) : (
          filtered.slice(0, 8).map((r, i) => {
            const isCurrent = String(r.id) === String(currentItem.id);
            const color = rarityColor(r.rarity);
            const stickers: string[] = Array.isArray(r.stickers) ? r.stickers : [];
            return (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring, delay: Math.min(i * 0.03, 0.18) }}
                whileHover={{ x: 2 }}
                className={`grid grid-cols-[1.6fr_auto] md:grid-cols-[1.6fr_0.7fr_0.7fr_1fr_0.9fr_auto] gap-3 items-center px-3 py-3 rounded-2xl hover:bg-subtle/50 transition-colors cursor-pointer ${
                  isCurrent ? 'bg-accent-soft' : ''
                }`}
                onClick={() => onView(r)}
              >
                {/* Name + image */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl bg-subtle/60 grid place-items-center overflow-hidden shrink-0 relative"
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background: `radial-gradient(circle at 50% 50%, ${color || 'rgb(var(--accent))'}22, transparent 65%)` }}
                    />
                    <CachedImage src={r.image} alt={r.name} className="relative w-[85%] h-[85%] object-contain" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-bold text-ink truncate tracking-tight leading-tight">
                      {r.name || r.market_name}
                    </div>
                    <div className="text-[11px] text-ink-dim font-semibold uppercase tracking-wider truncate">
                      {r.rarity || 'Standard'}{r.condition ? ` · ${r.condition}` : ''}
                    </div>
                  </div>
                </div>

                {/* Pattern */}
                <div className="hidden md:block text-[12.5px] text-ink font-semibold tabular-nums">
                  {r.patternTemplate ?? '—'}
                </div>

                {/* Float */}
                <div className="hidden md:block text-[12.5px] text-ink font-mono">
                  {r.float != null ? Number(r.float).toFixed(4) : '—'}
                </div>

                {/* Stickers */}
                <div className="hidden md:flex items-center gap-1">
                  {stickers.length === 0 ? (
                    <span className="text-[12px] text-ink-dim">—</span>
                  ) : (
                    stickers.slice(0, 5).map((s, si) => (
                      <span
                        key={si}
                        title={s}
                        className="w-6 h-6 rounded-md bg-subtle grid place-items-center text-[9px] font-bold text-ink-dim"
                      >
                        {String(s).slice(0, 1).toUpperCase()}
                      </span>
                    ))
                  )}
                </div>

                {/* Seller */}
                <div className="hidden md:flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-accent-soft grid place-items-center text-[10px] font-bold text-accent shrink-0">
                    {r.seller?.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <span className="text-[12.5px] text-ink-muted font-medium truncate">
                    {r.seller?.name || 'Anonymous'}
                  </span>
                </div>

                {/* Price + buy */}
                <div className="flex items-center justify-end gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-[14px] font-bold text-ink tabular-nums tracking-tight">
                      {formatPrice(r.price)}
                    </div>
                  </div>
                  <motion.button
                    whileTap={tap}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddCart(r);
                    }}
                    className="h-9 px-3.5 rounded-full bg-accent text-on-accent text-[12px] font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    Buy
                  </motion.button>
                </div>
              </motion.li>
            );
          })
        )}
      </ul>
    </motion.section>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   SteamDataStrip — compact metadata panel shown right below the item
   header. Surfaces every attribute we can pull from Steam / CSFloat:

     - Float value + linear scale visualising the wear
     - Wear category (Factory New / Minimal Wear / …)
     - Pattern index (paint seed) — critical for Doppler / Case Hardened
     - Rarity + StatTrak flag
     - Sticker count with a scrollable strip below
     - Inspect-in-game deep link

   Rendered as a 2-column grid on mobile and 4-column on desktop so
   every metric is glanceable. Missing fields are hidden so the card
   never shows blank rows.
   ───────────────────────────────────────────────────────────────────────── */

function wearCategoryFromFloat(f: number | null | undefined): string | null {
  if (f == null || !Number.isFinite(Number(f))) return null;
  const v = Number(f);
  if (v < 0.07) return 'Factory New';
  if (v < 0.15) return 'Minimal Wear';
  if (v < 0.38) return 'Field-Tested';
  if (v < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
}

const SteamDataStrip: React.FC<{ item: any; stickers: any[] }> = ({ item, stickers }) => {
  const floatVal =
    item?.float != null ? Number(item.float) : null;
  const paintSeed =
    item?.paintSeed ?? item?.paint_seed ?? item?.patternTemplate ?? null;
  const wearName = wearCategoryFromFloat(floatVal) || item?.condition || null;
  const rarity = item?.rarity || null;
  const inspectLink =
    (item as any)?.inspectLink ?? (item as any)?.inspect_link ?? null;
  const isStatTrak = item?.special === 'stattrak';

  /* Nothing to show? Bail out so we don't render an empty card. */
  const anyValue = floatVal != null || paintSeed != null || wearName || rarity || stickers.length > 0;
  if (!anyValue) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.04 }}
      className="card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="label-eyebrow">Steam data</div>
        {inspectLink && (
          <a
            href={inspectLink}
            className="text-[11px] font-bold text-accent hover:opacity-80 transition-opacity inline-flex items-center gap-1"
          >
            Inspect in-game →
          </a>
        )}
      </div>

      {/* Float meter — full-width scale with the current value marked.
          Only rendered when we actually have a float value. */}
      {floatVal != null && (
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-ink-muted">
              Float value
            </span>
            <span className="text-[13px] font-bold text-ink font-mono tabular-nums">
              {floatVal.toFixed(6)}
            </span>
          </div>
          <div className="relative h-1.5 rounded-full overflow-hidden bg-subtle">
            {/* Scale gradient matches Steam's colour code */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to right, #3fbb52 0%, #3fbb52 7%, #dcdc41 7%, #dcdc41 15%, #dd8c1a 15%, #dd8c1a 38%, #dd4a1a 38%, #dd4a1a 45%, #b21f1f 45%, #b21f1f 100%)',
              }}
            />
            {/* Position marker */}
            <div
              aria-hidden
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-ink shadow-md"
              style={{
                left: `calc(${Math.min(100, Math.max(0, floatVal * 100))}% - 6px)`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9.5px] font-bold text-ink-dim tabular-nums">
            <span>0.00</span>
            <span>0.07</span>
            <span>0.15</span>
            <span>0.38</span>
            <span>0.45</span>
            <span>1.00</span>
          </div>
        </div>
      )}

      {/* Attribute grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {wearName && <SteamStat label="Wear" value={wearName} />}
        {paintSeed != null && (
          <SteamStat label="Pattern" value={`#${paintSeed}`} mono />
        )}
        {rarity && <SteamStat label="Rarity" value={rarity} />}
        <SteamStat
          label="StatTrak™"
          value={isStatTrak ? 'Yes' : 'No'}
          tone={isStatTrak ? 'orange' : 'muted'}
        />
        {stickers.length > 0 && (
          <SteamStat label="Stickers" value={String(stickers.length)} mono />
        )}
      </div>

      {/* Sticker strip — thumbnails + names, horizontally scrollable
          on mobile to save vertical space. */}
      {stickers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-line">
          <div className="label-eyebrow mb-2.5">Applied stickers</div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {stickers.map((s: any, i: number) => (
              <div
                key={`${s.name || i}-${i}`}
                className="card-flat p-2 flex flex-col items-center min-w-[100px] shrink-0"
              >
                {s.image ? (
                  <img
                    src={s.image}
                    alt={s.name}
                    className="w-10 h-10 object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-subtle grid place-items-center text-[9px] text-ink-dim">
                    ?
                  </div>
                )}
                <div className="text-[10px] font-bold text-ink text-center mt-1.5 leading-tight line-clamp-2">
                  {s.name || 'Sticker'}
                </div>
                {s.wear != null && Number(s.wear) > 0 && (
                  <div className="text-[9px] text-ink-muted font-semibold mt-0.5 tabular-nums">
                    {(Number(s.wear) * 100).toFixed(0)}% wear
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
};

const SteamStat: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'muted' | 'orange';
}> = ({ label, value, mono, tone }) => (
  <div className="card-flat px-3 py-2.5">
    <div className="label-meta">{label}</div>
    <div
      className={`text-[13px] font-bold tracking-tight leading-none mt-1 ${
        mono ? 'font-mono' : ''
      } ${
        tone === 'orange'
          ? 'text-orange-700 dark:text-orange-300'
          : tone === 'muted'
          ? 'text-ink-muted'
          : 'text-ink'
      }`}
    >
      {value}
    </div>
  </div>
);

export default ItemDetailPage;
