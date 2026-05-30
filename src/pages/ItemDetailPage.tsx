import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Heart,
  ShoppingBag,
  Share2,
  ShieldCheck,
  Eye,
  Copy,
  CheckCircle2,
  TrendingUp,
  Clock,
  ExternalLink,
  Check,
  Zap,
} from 'lucide-react';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
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

  useEffect(() => {
    if (user?.steamId) {
      fetchWishlist(user.steamId);
      fetchBalance(user.steamId);
    }
  }, [user?.steamId]);

  const item = useMemo(
    () => (items || []).find((i: any) => String(i.id) === String(itemId)),
    [items, itemId],
  );

  const related = useMemo(() => {
    if (!item || !items?.length) return [];
    const t = (item.type || '').toLowerCase();
    const r = (item.rarity || '').toLowerCase();
    return items
      .filter(
        (i: any) =>
          i.id !== item.id &&
          ((i.type || '').toLowerCase() === t || (i.rarity || '').toLowerCase() === r),
      )
      .slice(0, 8);
  }, [item, items]);

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

      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16">
        {/* Breadcrumb / back */}
        <motion.button
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring}
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink text-[13px] font-semibold transition-colors mb-4"
        >
          <ChevronLeft size={14} strokeWidth={2.4} />
          Back
        </motion.button>

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
              {/* Rarity-tinted glow */}
              <motion.div
                aria-hidden
                className="absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(closest-side, ${color}66, transparent 65%)`,
                  opacity: 0.6,
                }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                aria-hidden
                className="absolute -bottom-32 -left-24 w-[360px] h-[360px] rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(closest-side, rgb(var(--accent) / 0.12), transparent 65%)',
                }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              />

              <div className="relative aspect-[5/3] grid place-items-center">
                <CachedImage
                  src={item.image}
                  alt={name}
                  className="max-h-full max-w-full object-contain drop-shadow-[0_30px_60px_rgba(20,16,40,0.3)]"
                />
              </div>

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

            {/* Related */}
            {related.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                transition={spring}
              >
                <div className="flex items-end justify-between mb-3 px-1">
                  <div>
                    <span className="label-eyebrow">More to browse</span>
                    <h2 className="text-[17px] font-bold tracking-tight text-ink mt-1.5 leading-none">
                      Similar items
                    </h2>
                  </div>
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="text-[13px] text-ink-muted hover:text-ink font-semibold flex items-center gap-1 transition-colors"
                  >
                    View all
                  </button>
                </div>
                <motion.div
                  variants={staggerParent}
                  initial="hidden"
                  whileInView="shown"
                  viewport={{ once: true }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
                >
                  {related.slice(0, 4).map((r: any) => (
                    <motion.div key={r.id} variants={staggerChild} whileHover={{ y: -4 }} transition={spring}>
                      <SkinCard
                        item={r}
                        onView={() => navigate(`/item/${r.id}`)}
                        onAddCart={() => handleAddCart(r)}
                        onToggleWish={() => handleWish(r)}
                        wished={isInWishlist(r.id)}
                        formatPrice={formatPrice}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            )}
          </div>

          {/* ════════════ RIGHT (buy rail) ════════════ */}
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.08 }}
            className="lg:sticky lg:top-24 self-start space-y-4"
          >
            <section className="card p-6 relative overflow-hidden">
              <motion.div
                aria-hidden
                className="absolute -top-20 -right-16 w-[260px] h-[260px] rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(closest-side, rgb(var(--accent) / 0.16), transparent 65%)',
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              />
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
                    className="h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.65)' }}
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

            {/* Seller */}
            {item.seller?.name && (
              <section className="card p-5">
                <span className="label-eyebrow">Seller</span>
                <button
                  onClick={() => navigate(`/user/${item.seller.steamId}`)}
                  className="w-full flex items-center gap-3 p-2 -mx-2 mt-2 rounded-2xl hover:bg-subtle transition-colors"
                >
                  <div className="w-11 h-11 rounded-2xl bg-accent text-on-accent grid place-items-center font-bold shrink-0">
                    {item.seller.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-ink truncate tracking-tight">
                      {item.seller.name}
                    </div>
                    <div className="text-[11.5px] text-ink-muted font-medium">View profile</div>
                  </div>
                  <ExternalLink size={14} className="text-ink-muted shrink-0" />
                </button>
              </section>
            )}

            {/* Mini trust block */}
            <section className="card p-5">
              <ul className="space-y-3 text-[13px]">
                {[
                  { Icon: ShieldCheck, hue: 'mint',  label: 'Escrow until you confirm receipt' },
                  { Icon: Clock,       hue: 'sky',   label: 'Average trade under 60 seconds' },
                  { Icon: TrendingUp,  hue: 'lemon', label: '8-day hold matches CS2 trade-back' },
                ].map(({ Icon, hue, label }) => (
                  <li key={label} className="flex items-center gap-3">
                    <div className={`icon-chip-sm chip-${hue}`}>
                      <Icon size={13} strokeWidth={2.2} style={{ color: `rgb(var(--hue-${hue}))` }} />
                    </div>
                    <span className="text-ink-muted font-medium leading-tight">{label}</span>
                  </li>
                ))}
              </ul>
            </section>

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
    </div>
  );
};

/* ───── Sub-panels ───── */

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

export default ItemDetailPage;
