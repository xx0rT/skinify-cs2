import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Heart,
  ShoppingBag,
  Share2,
  ShieldCheck,
  Eye,
  Copy,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
  Check,
  Zap,
  Layers,
  Hash,
  Paintbrush,
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
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { CachedImage } from '../components/ui/CachedImage';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { SkinCard, SkinCardSkeleton, rarityColor } from '../components/ui/SkinCard';
import { spring, tap } from '../lib/motion';
import { openDepositModal } from '../components/DepositModal';

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
  const { balance, fetchBalance } = useBalanceStore();

  const [tab, setTab] = useState<'details' | 'stickers' | 'trust'>('details');
  const [confirmBuyOpen, setConfirmBuyOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

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
    (it: any) => {
      if (!user) {
        addToast({ type: 'warning', title: 'Login required', message: 'Sign in to use wishlist.' });
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
    },
    [user, toggleItem, addToast],
  );

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
      addToast({ type: 'success', title: 'Order placed', message: 'Continue in cart to check out.' });
      setConfirmBuyOpen(false);
      navigate('/cart');
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

  const stickers: string[] = Array.isArray(item.stickers) ? item.stickers : [];
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

              <HeroImage src={item.image} alt={name} />

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

            {/* Description + Summary side-by-side */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.04 }}
              className="grid md:grid-cols-2 gap-3"
            >
              <section className="card p-5 md:p-6">
                <span className="label-eyebrow">Description</span>
                <p className="text-[13.5px] sm:text-[14px] text-ink-muted font-medium mt-2.5 leading-relaxed">
                  {item.description ||
                    `${name}${item.condition ? ` in ${item.condition}` : ''}. ${inferCategory(item.type) || 'Item'} from CS2 — fully tradable and marketable after purchase.`}
                </p>
              </section>

              <section className="card p-5 md:p-6">
                <span className="label-eyebrow">Summary</span>
                <dl className="mt-2.5 divide-y divide-line">
                  {[
                    item.collection && { Icon: Layers,      k: 'Collection', v: item.collection,                    accent: true },
                    item.patternTemplate != null && { Icon: Hash, k: 'Pattern',  v: String(item.patternTemplate) },
                    { Icon: Paintbrush, k: 'Finish',      v: item.finish || inferCategory(item.type) || '—' },
                    { Icon: TrendingUp, k: 'Float',       v: item.float != null ? Number(item.float).toFixed(6) : '—' },
                    { Icon: ShieldCheck, k: 'Tradable',   v: item.tradable === false ? 'No' : 'Yes' },
                  ].filter(Boolean).map((row: any, i: number) => (
                    <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-[13px] text-ink-muted font-medium">
                        <row.Icon size={13} strokeWidth={2.2} className={row.accent ? 'text-accent' : 'text-ink-dim'} />
                        {row.k}
                      </dt>
                      <dd className={`text-[13px] font-bold tabular-nums truncate max-w-[180px] ${row.accent ? 'text-accent' : 'text-ink'}`}>
                        {row.v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </motion.div>

            {/* Tab bar */}
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
                  <DetailsPanel item={item} />
                )}

                {tab === 'stickers' && (
                  <section className="card p-5 md:p-6">
                    {stickers.length === 0 ? (
                      <div className="py-10 text-center">
                        <p className="text-[14px] text-ink-muted font-medium">No stickers applied.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {stickers.map((s, i) => (
                          <div key={i} className="card-flat p-3 text-center">
                            <div className="text-[12px] font-bold text-ink truncate tracking-tight">
                              {s}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {tab === 'trust' && <TrustPanel />}
              </motion.div>
            </AnimatePresence>

            {/* Similar Offers — table layout */}
            {related.length > 0 && (
              <SimilarOffersTable
                items={related}
                currentItem={item}
                onView={(r) => navigate(`/item/${r.id}`)}
                onAddCart={handleAddCart}
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
            <section ref={desktopPanelRef} className="card p-6 relative overflow-hidden">
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
                      message: 'Sign in with Steam to message the seller.',
                    });
                    return;
                  }
                  setMessageOpen(true);
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

      <ConfirmationModal
        isOpen={confirmBuyOpen}
        onClose={() => setConfirmBuyOpen(false)}
        onConfirm={confirmPurchase}
        title="Confirm purchase"
        message={`Buy ${name} for ${formatPrice(item.price)}?`}
        confirmText="Buy now"
        cancelText="Cancel"
        variant="info"
        isProcessing={purchasing}
      />

      <MessageSellerModal
        isOpen={messageOpen}
        onClose={() => setMessageOpen(false)}
        seller={item.seller}
        itemName={name}
        onSend={(text) => {
          addToast({
            type: 'success',
            title: 'Message sent',
            message: `${item.seller?.name || 'Seller'} will reply in your inbox.`,
          });
          setMessageOpen(false);
          // Best-effort log so the message isn't lost if a backend hooks in later.
          if (typeof window !== 'undefined') {
            try {
              const key = 'skinify_outbox';
              const prev = JSON.parse(localStorage.getItem(key) || '[]');
              prev.push({
                to: item.seller?.steamId,
                seller: item.seller?.name,
                itemId: item.id,
                itemName: name,
                text,
                ts: Date.now(),
              });
              localStorage.setItem(key, JSON.stringify(prev.slice(-50)));
            } catch {
              /* private mode — ignore */
            }
          }
        }}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   MessageSellerModal — small inline DM composer. The actual delivery
   pipeline isn't wired yet; we queue the message in localStorage and toast
   a success so the UX is testable end-to-end. When the messages backend
   ships, swap onSend's body for the real call.
   ───────────────────────────────────────────────────────────────────────── */
const MessageSellerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  seller: any;
  itemName: string;
  onSend: (text: string) => void;
}> = ({ isOpen, onClose, seller, itemName, onSend }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setText('');
      setSending(false);
    }
  }, [isOpen]);

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
    await new Promise((r) => setTimeout(r, 350));
    onSend(trimmed);
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
        className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
        onClick={onClose}
      >
        <motion.div
          key="dm-card"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={spring}
          onClick={(e) => e.stopPropagation()}
          className="card w-full max-w-md p-5 sm:p-6 relative"
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
          >
            <XIcon size={15} strokeWidth={2.4} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-accent text-on-accent grid place-items-center font-bold shrink-0">
              {seller?.avatar ? (
                <img src={seller.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span className="text-[15px]">{initial}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="label-eyebrow">Message</div>
              <div className="text-[15px] font-bold text-ink tracking-tight truncate">
                {seller?.name || 'Seller'}
              </div>
            </div>
          </div>

          <div className="mt-3 card-flat p-3">
            <div className="label-meta">About</div>
            <div className="text-[12.5px] font-semibold text-ink truncate mt-0.5">
              {itemName}
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Hi! Is this still available?"
            rows={4}
            className="mt-3 w-full rounded-2xl bg-subtle px-3.5 py-3 text-[13.5px] text-ink font-medium outline-none focus:ring-2 focus:ring-accent/40 resize-none"
            autoFocus
          />

          <div className="mt-2 flex items-center justify-between text-[11px] text-ink-dim">
            <span>Replies arrive in your Skinify inbox.</span>
            <span className="tabular-nums">{text.length}/500</span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[13px] transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileTap={tap}
              whileHover={text.trim() ? { scale: 1.01 } : undefined}
              onClick={send}
              disabled={!text.trim() || sending}
              className="flex-1 h-11 rounded-full bg-accent text-on-accent font-bold text-[13px] inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <Send size={13} strokeWidth={2.4} />
              {sending ? 'Sending…' : 'Send'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
const SellerCard: React.FC<{
  seller: any;
  onView: () => void;
  onMessage: () => void;
}> = ({ seller, onView, onMessage }) => {
  const name = seller?.name || 'Anonymous';
  const initial = name.charAt(0).toUpperCase();
  const rating: number = Number(seller?.rating ?? 4.9);
  const deals: number = Number(seller?.totalDeals ?? seller?.successDeals ?? 124);
  const memberSince: string = seller?.memberSince || 'Active trader';

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.12 }}
      className="card p-5"
    >
      <span className="label-eyebrow">Seller</span>
      {/* Header — clickable */}
      <button
        onClick={onView}
        className="w-full flex items-center gap-3 p-2 -mx-2 mt-2 rounded-2xl hover:bg-subtle transition-colors group"
      >
        <div className="relative w-12 h-12 rounded-2xl bg-accent text-on-accent grid place-items-center font-bold shrink-0">
          {seller?.avatar ? (
            <img src={seller.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
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

      {/* Stat grid */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="card-flat p-2.5 text-center">
          <div className="label-meta">Rating</div>
          <div className="mt-1 inline-flex items-center gap-1 text-[14px] font-bold text-ink tracking-tight tabular-nums">
            <Star size={11} strokeWidth={2.4} className="fill-amber-400 text-amber-400" />
            {rating.toFixed(1)}
          </div>
        </div>
        <div className="card-flat p-2.5 text-center">
          <div className="label-meta">Deals</div>
          <div className="mt-1 text-[14px] font-bold text-ink tracking-tight tabular-nums">
            {deals.toLocaleString()}
          </div>
        </div>
        <div className="card-flat p-2.5 text-center">
          <div className="label-meta">Reply</div>
          <div className="mt-1 text-[14px] font-bold text-ink tracking-tight tabular-nums">
            ~{deals > 500 ? '2m' : deals > 100 ? '6m' : '15m'}
          </div>
        </div>
      </div>

      {/* Star track */}
      <div className="mt-3 flex items-center gap-1.5">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={11}
              className={
                s <= Math.round(rating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-ink-dim'
              }
            />
          ))}
        </div>
        <span className="text-[11px] text-ink-muted font-medium">
          {Math.round(rating * 20)}% positive
        </span>
      </div>

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


const DetailsPanel: React.FC<{ item: any }> = ({ item }) => (
  <section className="card p-5 md:p-6">
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {[
        ['Float',     item.float != null ? Number(item.float).toFixed(6) : '—'],
        ['Type',      item.type || '—'],
        ['Pattern',   item.patternTemplate || '—'],
        ['Tradable',  item.tradable ? 'Yes' : 'No'],
        ['Marketable',item.marketable ? 'Yes' : 'No'],
        ['Listed',    item.listed_at ? new Date(item.listed_at).toLocaleDateString() : '—'],
      ].map(([k, v]) => (
        <div key={k as string} className="card-flat p-3">
          <div className="label-meta">{k}</div>
          <div className="text-[14px] font-bold text-ink mt-1 truncate tracking-tight">
            {v as string}
          </div>
        </div>
      ))}
    </div>
    {item.description && (
      <div className="mt-5">
        <div className="label-eyebrow mb-2">Description</div>
        <p className="text-[13.5px] text-ink-muted leading-relaxed font-medium">
          {item.description}
        </p>
      </div>
    )}
  </section>
);

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

export default ItemDetailPage;
