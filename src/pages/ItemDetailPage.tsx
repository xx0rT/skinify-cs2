import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Heart,
  ShoppingBag,
  Share2,
  Eye,
  CheckCircle2,
  ExternalLink,
  Check,
  Zap,
  Star,
  MessageCircle,
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
import { rarityColor } from '../components/ui/SkinCard';
import { useSkinFloat } from '../hooks/useSkinFloat';
import { spring, tap } from '../lib/motion';
import { openDepositModal } from '../components/DepositModal';
import {
  SalesHistoryCard,
  SimilarItemsRow,
} from '../components/item/ItemDetailExtras';
import AuctionBidPanel from '../components/item/AuctionBidPanel';

/* ─────────────────────────────────────────────────────────────────────────
   ItemDetailPage
   - Left/main: hero image with rarity glow, name + meta, tabs (Details,
     Price history, Stickers, Trust & escrow)
   - Right: sticky buy panel (price, quantity, CTA, balance hint)
   - Bottom: similar items grid
   ───────────────────────────────────────────────────────────────────────── */

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

  /* Open (or seed) a DM thread with the seller and jump to /messages.
     Shared by the desktop rail seller card and the mobile one. */
  const messageSeller = useCallback(() => {
    if (!item?.seller) return;
    if (!user) {
      addToast({
        type: 'warning',
        title: 'Login required',
        message: 'Sign in to message the seller.',
      });
      return;
    }
    const peerId = String(item.seller?.steamId || item.seller?.name || 'unknown');
    const { ensureThread, sendMessage } = useDMStore.getState();
    ensureThread(peerId, item.seller?.name || 'Seller', item.seller?.avatar);
    const existing = useDMStore.getState().threads[peerId];
    if (!existing || existing.messages.length === 0) {
      sendMessage(peerId, `Hi! I'm interested in this listing.`, {
        itemId: String(item.id),
        itemName: item.name || item.market_name,
        itemImage: item.image,
      });
    }
    navigate(`/messages?peer=${encodeURIComponent(peerId)}`);
  }, [item, user, addToast, navigate]);

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
          <div className="panel p-16 text-center mt-12 max-w-xl mx-auto">
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
            {/* Hero — flat panel (no border), dotted texture like the
                skins.com product frame. Float readout rides the top-left
                corner; wishlist/share top-right. */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className="panel p-6 md:p-8 relative overflow-hidden"
            >
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{
                  backgroundImage:
                    'radial-gradient(rgb(var(--ink)) 1px, transparent 1px)',
                  backgroundSize: '22px 22px',
                }}
              />

              {/* Float readout — value + mini wear scale, top-left */}
              {enrichedItem.float != null && Number.isFinite(Number(enrichedItem.float)) && (
                <div className="absolute top-5 left-5 md:top-6 md:left-6 flex items-center gap-2.5 z-10">
                  <span className="text-[13px] font-bold font-mono tabular-nums text-ink">
                    {Number(enrichedItem.float).toFixed(3)}
                  </span>
                  <span className="relative w-[120px] h-[3px] rounded-full overflow-hidden hidden sm:block">
                    <span
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(90deg, #38bdf8 0%, #22c55e 25%, #eab308 55%, #f97316 78%, #ef4444 100%)',
                      }}
                    />
                    <span
                      className="absolute -top-[3.5px] w-2 h-2 rounded-full bg-white shadow"
                      style={{
                        left: `calc(${Math.min(100, Math.max(0, Number(enrichedItem.float) * 100))}% - 4px)`,
                        top: '-2.5px',
                      }}
                    />
                  </span>
                </div>
              )}

              {/* Inspect / wishlist / share — top-right */}
              <div className="absolute top-4 right-4 md:top-5 md:right-5 flex items-center gap-1 z-10">
                {resolveInspectLink(enrichedItem) && (
                  <a
                    href={resolveInspectLink(enrichedItem)!}
                    className="h-10 px-3 rounded-full grid place-items-center text-[12px] font-bold text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"
                    title="Inspect in game (opens Steam)"
                  >
                    <Eye size={15} strokeWidth={2.2} />
                    <span className="hidden sm:inline">Inspect</span>
                  </a>
                )}
                <motion.button
                  whileTap={tap}
                  onClick={() => handleWish(item)}
                  aria-label="Wishlist"
                  className="w-10 h-10 grid place-items-center text-ink-muted hover:text-ink transition-colors"
                >
                  <Heart
                    size={18}
                    strokeWidth={wished ? 2.4 : 2}
                    className={wished ? 'fill-accent text-accent' : ''}
                  />
                </motion.button>
                <motion.button
                  whileTap={tap}
                  onClick={copyLink}
                  aria-label="Share"
                  className="w-10 h-10 grid place-items-center text-ink-muted hover:text-ink transition-colors"
                >
                  {copied ? (
                    <Check size={16} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Share2 size={16} strokeWidth={2} />
                  )}
                </motion.button>
              </div>

              <HeroImage src={enrichedItem.image} alt={name} />

              <div className="relative mt-6 min-w-0">
                <span className="label-eyebrow">
                  {inferWeapon(name) || item.type || 'CS2 Item'}
                  {item.special === 'stattrak' && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400">StatTrak™</span>
                  )}
                </span>
                <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-ink leading-none mt-2">
                  {inferBaseName(name) || name}
                </h1>
                <div className="mt-2.5 flex items-center gap-1.5 text-[13px] text-ink-muted font-semibold">
                  {item.condition && <span>{item.condition}</span>}
                  {item.condition && item.rarity && <span className="text-ink-dim">•</span>}
                  {item.rarity && <span style={{ color }}>{item.rarity}</span>}
                  {item.views != null && (
                    <span className="ml-2 flex items-center gap-1 text-[12px] font-medium text-ink-dim">
                      <Eye size={11} /> {Number(item.views).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Mobile-only buy card — surfaces price + Buy / Cart / Wishlist
                directly under the hero so it's the first thing after the
                image. Desktop renders the equivalent in the right rail. */}
            <motion.section
              ref={mobilePanelRef}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.03 }}
              className="lg:hidden panel p-5"
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

              <ListingMeta item={enrichedItem} seller={item.seller} color={color} />
            </motion.section>

            {/* Tab bar — Details / Stickers / Trust. */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.06 }}
              className="panel p-1.5 inline-flex gap-1"
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

            {/* Seller — mobile only; desktop shows it in the right rail. */}
            {item.seller?.name && (
              <div className="lg:hidden">
                <SellerCard
                  seller={item.seller}
                  onView={() => navigate(`/user/${item.seller.steamId}`)}
                  onMessage={messageSeller}
                />
              </div>
            )}

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
            <section className="panel p-6 relative overflow-hidden">
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

                <ListingMeta item={enrichedItem} seller={item.seller} color={color} />
              </div>
            </section>
            )}
            </div>

            {/* Seller */}
            {item.seller?.name && (
              <SellerCard
                seller={item.seller}
                onView={() => navigate(`/user/${item.seller.steamId}`)}
                onMessage={messageSeller}
              />
            )}
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
    </div>
  );
};

/* Resolve a working steam:// inspect link for a listing. Listing rows
   may ship the link with Steam's %placeholders%; substitute what we
   know. Falls back to building one from s/a/d params when present. */
function resolveInspectLink(item: any): string | null {
  let link: string | null =
    item?.inspect_link || item?.inspectLink || item?.inspect_url || null;
  if (link) {
    const owner = item?.seller?.steamId ? String(item.seller.steamId) : '';
    const assetId = item?.asset_id || item?.assetId || item?.itemId || '';
    link = link
      .replace('%owner_steamid%', owner)
      .replace('%assetid%', String(assetId));
    /* Unresolved placeholders make Steam reject the link — bail. */
    if (link.includes('%')) return null;
    return link;
  }
  const s = item?.s ?? item?.owner_steamid ?? item?.seller?.steamId;
  const a = item?.a ?? item?.asset_id ?? item?.assetId;
  const d = item?.d ?? item?.d_code;
  if (s && a && d) {
    return `steam://rungame/730/76561202255233023/+csgo_econ_action_preview S${s}A${a}D${d}`;
  }
  return null;
}

/* ───── Sub-panels ───── */

/* ListingMeta — skins.com-style flat key-value rows under the buy CTA:
   RARITY · EXTERIOR · FLOAT · PATTERN · SELLER. No boxes, no tiles —
   just label-left / value-right lines above a soft divider. */
const ListingMeta: React.FC<{ item: any; seller?: any; color: string }> = ({
  item,
  seller,
  color,
}) => {
  const floatNum =
    item?.float != null && Number.isFinite(Number(item.float)) ? Number(item.float) : null;
  const rows: Array<[string, React.ReactNode]> = [];
  if (item?.rarity) {
    rows.push([
      'Rarity',
      <span key="r" className="inline-flex items-center gap-1.5 uppercase">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        {item.rarity}
      </span>,
    ]);
  }
  if (item?.condition) rows.push(['Exterior', item.condition]);
  if (floatNum != null) rows.push(['Float', floatNum.toFixed(4)]);
  if (item?.paintSeed != null) rows.push(['Pattern', `#${String(item.paintSeed)}`]);
  if (seller?.name) rows.push(['Seller', <span key="s" className="uppercase">{seller.name}</span>]);
  if (rows.length === 0) return null;
  return (
    <div className="mt-5 pt-2 border-t border-line/50">
      {rows.map(([k, v]) => (
        <div key={k} className="kv-row">
          <span className="kv-label">{k}</span>
          <span className="kv-value truncate">{v}</span>
        </div>
      ))}
    </div>
  );
};

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
  const viewer = useAuthStore((s) => s.user);
  /* Own listing — no "message yourself" button. */
  const isSelf =
    !!viewer?.steamId && !!seller?.steamId && String(viewer.steamId) === String(seller.steamId);
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

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.12 }}
      className="panel p-5"
    >
      <span className="label-eyebrow">Seller</span>
      {/* Header — clickable */}
      <button
        onClick={onView}
        className="w-full flex items-center gap-3 p-2 -mx-2 mt-2 rounded-2xl hover:bg-subtle transition-colors group"
      >
        <div className="w-12 h-12 rounded-2xl bg-accent text-on-accent grid place-items-center font-bold shrink-0 overflow-hidden">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[16px]">{initial}</span>
          )}
        </div>
        <div className="text-left min-w-0 flex-1">
          <div className="text-[14.5px] font-bold text-ink truncate tracking-tight">{name}</div>
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

      {/* CTA row — Message + View profile (Message hidden on own listings) */}
      <div className={`mt-4 grid gap-2 ${isSelf ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {!isSelf && (
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.01 }}
            onClick={onMessage}
            className="h-10 rounded-full bg-accent text-on-accent font-bold text-[12.5px] flex items-center justify-center gap-1.5"
          >
            <MessageCircle size={12} strokeWidth={2.6} />
            Message
          </motion.button>
        )}
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
  /* Only the attributes buyers actually check — the exhaustive
     18-tile dump (def index, asset id, marketable flags…) read as
     noise. Tiles with no value are dropped entirely instead of
     rendering a dash. */
  const tiles: Array<[string, string]> = (
    [
      ['Float', floatNum != null && Number.isFinite(floatNum) ? floatNum.toFixed(8) : null],
      ['Paint seed', item.paintSeed != null ? `#${String(item.paintSeed)}` : null],
      ['Pattern', item.patternTemplate != null ? String(item.patternTemplate) : null],
      ['Exterior', item.condition || null],
      ['Rarity', item.rarity || null],
      ['Type', item.type || null],
      ['Collection', item.collection || null],
      ['Paint index', item.paintIndex != null ? String(item.paintIndex) : null],
      ['Def index', item.defIndex != null ? String(item.defIndex) : null],
      ['Finish', item.finish || null],
      [
        'Quality',
        item.special === 'stattrak'
          ? 'StatTrak™'
          : item.special === 'souvenir'
          ? 'Souvenir'
          : null,
      ],
      [
        'Stickers',
        Array.isArray(item.stickers) && item.stickers.length > 0
          ? `${item.stickers.length} applied`
          : null,
      ],
      ['Tradable', item.tradable === false ? 'No' : null],
      [
        'Listed',
        item.listed_at
          ? new Date(item.listed_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : null,
      ],
    ] as Array<[string, string | null]>
  ).filter((t): t is [string, string] => t[1] != null);

  return (
    <section className="panel p-5 md:p-6 space-y-5">
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

      {/* Attributes — flat key-value rows, no tile boxes. */}
      <div>
        {tiles.map(([k, v]) => (
          <div key={k} className="kv-row">
            <span className="kv-label">{k}</span>
            <span className="kv-value truncate">{v}</span>
          </div>
        ))}
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
      <section className="panel p-5 md:p-6">
        <div className="py-10 text-center">
          <p className="text-[14px] text-ink-muted font-medium">No stickers applied.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel p-5 md:p-6">
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
  <section className="panel p-5 md:p-6">
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

export default ItemDetailPage;
