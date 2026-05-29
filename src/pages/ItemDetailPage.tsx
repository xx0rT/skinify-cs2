import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Heart,
  ShoppingCart,
  Share2,
  Shield,
  Eye,
  Copy,
  CheckCircle2,
  TrendingUp,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useBalanceStore } from '../store/balanceStore';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CachedImage } from '../components/ui/CachedImage';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import PriceChart from '../components/marketplace/PriceChart';
import { SkinCard, rarityColor } from '../components/ui/SkinCard';

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

  const [confirmBuyOpen, setConfirmBuyOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (user?.steamId) {
      fetchWishlist(user.steamId);
      fetchBalance(user.steamId);
    }
  }, [user?.steamId]);

  const item = useMemo(() => items.find((i: any) => i.id === itemId), [items, itemId]);

  const related = useMemo(() => {
    if (!item || !items?.length) return [];
    const itemTypeLower = (item.type || '').toLowerCase();
    return items
      .filter(
        (i: any) =>
          i.id !== item.id &&
          ((i.type || '').toLowerCase() === itemTypeLower ||
            (i.rarity || '').toLowerCase() === (item.rarity || '').toLowerCase()),
      )
      .slice(0, 8);
  }, [item, items]);

  if (!loading && !item) {
    return (
      <div className="min-h-screen text-white">
        <Header activeSection="Market" />
        <main className="md:pl-[100px] pl-4 pr-4 pt-24 max-w-[1480px] mx-auto">
          <div className="glass rounded-3xl2 p-16 text-center">
            <p className="text-white text-[16px] font-semibold">Listing not found</p>
            <p className="text-zinc-500 text-[13px] mt-1">
              This item may have sold or been removed.
            </p>
            <button
              onClick={() => navigate('/marketplace')}
              className="mt-6 h-11 px-5 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-semibold transition-colors"
            >
              Back to marketplace
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading || !item) {
    return (
      <div className="min-h-screen text-white">
        <Header activeSection="Market" />
        <main className="md:pl-[100px] pl-4 pr-4 pt-24 max-w-[1480px] mx-auto">
          <div className="grid lg:grid-cols-[1fr_400px] gap-4">
            <div className="rounded-3xl2 aspect-square skeleton" />
            <div className="space-y-4">
              <div className="rounded-3xl2 h-32 skeleton" />
              <div className="rounded-3xl2 h-48 skeleton" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const color = rarityColor(item.rarity);
  const wished = isInWishlist(item.id);
  const inCart = cartItems.some((c: any) => c.id === item.id);
  const canAfford = (balance || 0) >= item.price;

  const handleAdd = () => {
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
    addToast({ type: 'success', title: 'Added to cart', message: item.name });
  };

  const handleWish = () => {
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

  const handleBuyNow = async () => {
    if (!user) {
      addToast({ type: 'warning', title: 'Login required', message: 'Sign in with Steam to buy.' });
      return;
    }
    if (!canAfford) {
      addToast({
        type: 'error',
        title: 'Insufficient balance',
        message: `You need ${formatPrice(item.price - (balance || 0))} more.`,
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

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast({ type: 'success', title: 'Link copied' });
  };

  return (
    <div className="min-h-screen text-white">
      <Header activeSection="Market" />

      <main className="md:pl-[100px] pl-4 pr-4 pt-24 pb-16 max-w-[1480px] mx-auto">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 hover:text-white text-[13px] font-medium transition-colors mb-5"
        >
          <ChevronLeft size={15} />
          Back
        </button>

        <div className="grid lg:grid-cols-[1fr_420px] gap-4">
          {/* LEFT: showcase + details */}
          <div className="space-y-4 min-w-0">
            {/* Showcase */}
            <div className="relative glass rounded-3xl2 p-8 md:p-12 overflow-hidden">
              <div
                className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-50"
                style={{ background: `radial-gradient(closest-side, ${color}55, transparent)` }}
              />
              <div className="relative grid place-items-center aspect-[4/3]">
                <CachedImage
                  src={item.image}
                  alt={item.name}
                  className="w-full max-w-[520px] h-full object-contain drop-shadow-2xl"
                />
              </div>

              {/* badges */}
              <div className="relative flex flex-wrap items-center gap-2 mt-6">
                <span
                  className="h-8 px-3 rounded-2xl text-[11.5px] uppercase tracking-wider font-bold"
                  style={{ background: `${color}20`, color }}
                >
                  {item.rarity}
                </span>
                {item.condition && (
                  <span className="h-8 px-3 rounded-2xl bg-white/[0.05] border border-white/[0.06] text-[12px] text-zinc-300 font-medium flex items-center">
                    {item.condition}
                  </span>
                )}
                {item.special === 'stattrak' && (
                  <span className="h-8 px-3 rounded-2xl bg-orange-500/15 text-orange-300 border border-orange-500/30 text-[12px] font-bold flex items-center">
                    StatTrak™
                  </span>
                )}
                {item.special === 'souvenir' && (
                  <span className="h-8 px-3 rounded-2xl bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 text-[12px] font-bold flex items-center">
                    Souvenir
                  </span>
                )}
              </div>
            </div>

            {/* Details grid */}
            <section className="glass rounded-3xl2 p-6">
              <h2 className="text-[16px] font-display font-semibold text-white tracking-tight mb-4">
                Item details
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  ['Float', item.float != null ? Number(item.float).toFixed(6) : '—'],
                  ['Type', item.type || '—'],
                  ['Pattern', (item as any).patternTemplate || '—'],
                  ['Tradable', item.tradable ? 'Yes' : 'No'],
                  ['Marketable', item.marketable ? 'Yes' : 'No'],
                  [
                    'Listed',
                    item.listed_at
                      ? new Date(item.listed_at).toLocaleDateString()
                      : '—',
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k as string}
                    className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">
                      {k}
                    </div>
                    <div className="text-[14px] text-white font-medium mt-1 truncate">{v as string}</div>
                  </div>
                ))}
              </div>

              {item.stickers && item.stickers.length > 0 && (
                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold mb-2">
                    Stickers
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.stickers.map((s: string, i: number) => (
                      <span
                        key={i}
                        className="h-9 px-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-[12px] text-zinc-300 flex items-center"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.description && (
                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold mb-2">
                    Description
                  </div>
                  <p className="text-[13.5px] text-zinc-300 leading-relaxed">{item.description}</p>
                </div>
              )}
            </section>

            {/* Price chart */}
            <section className="glass rounded-3xl2 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-display font-semibold text-white tracking-tight">
                    Price history
                  </h2>
                  <p className="text-[12px] text-zinc-500 mt-0.5">
                    Steam Community Market reference pricing
                  </p>
                </div>
                <span className="h-8 px-3 rounded-2xl bg-white/[0.05] border border-white/[0.06] text-[11.5px] text-zinc-300 font-medium flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-emerald-400" />
                  Last 30 days
                </span>
              </div>
              <PriceChart itemName={item.name || item.market_name} rarityColor={color} />
            </section>

            {/* Related */}
            {related.length > 0 && (
              <section>
                <div className="flex items-end justify-between mb-3">
                  <h2 className="text-[18px] font-display font-bold text-white tracking-tight">
                    Similar items
                  </h2>
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="text-[13px] text-zinc-400 hover:text-white transition-colors"
                  >
                    View all
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {related.slice(0, 4).map((r: any) => (
                    <SkinCard
                      key={r.id}
                      item={r}
                      onView={() => navigate(`/item/${r.id}`)}
                      onAddCart={() => {
                        addItem({
                          id: r.id,
                          name: r.name || r.market_name,
                          price: r.price,
                          image: r.image,
                          condition: r.condition,
                          rarity: r.rarity,
                          type: r.type,
                          seller: r.seller,
                        } as any);
                        addToast({ type: 'success', title: 'Added to cart' });
                      }}
                      onToggleWish={() => {
                        if (!user) {
                          addToast({
                            type: 'warning',
                            title: 'Login required',
                          });
                          return;
                        }
                        toggleItem(
                          {
                            id: r.id,
                            name: r.name || r.market_name,
                            price: r.price,
                            image: r.image,
                            condition: r.condition,
                            rarity: r.rarity,
                            type: r.type,
                            seller: r.seller,
                          } as any,
                          user.steamId,
                        );
                      }}
                      wished={isInWishlist(r.id)}
                      formatPrice={formatPrice}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT: purchase rail */}
          <aside className="lg:sticky lg:top-24 self-start space-y-4">
            {/* Title + price */}
            <section className="glass rounded-3xl2 p-6">
              <h1 className="text-[24px] font-display font-bold text-white tracking-tight leading-tight">
                {item.name || item.market_name}
              </h1>
              <p className="text-[13px] text-zinc-400 mt-1">
                {item.condition}
                {item.float != null && (
                  <span className="text-zinc-600"> · Float {Number(item.float).toFixed(4)}</span>
                )}
              </p>

              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[12px] uppercase tracking-wide text-zinc-500 font-semibold">
                    Listed price
                  </div>
                  <div className="text-[34px] font-display font-bold text-white tracking-tight leading-none mt-1">
                    {formatPrice(item.price)}
                  </div>
                  {item.priceChange !== undefined && item.priceChange !== 0 && (
                    <div
                      className={`text-[12px] font-medium mt-1 ${
                        item.priceChange > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.priceChange > 0 ? '+' : ''}
                      {item.priceChange.toFixed(1)}% vs 30d avg
                    </div>
                  )}
                </div>
                {item.views !== undefined && (
                  <div className="text-right text-zinc-500">
                    <Eye size={14} className="inline-block mr-1 -mt-px" />
                    <span className="text-[12px] font-medium">
                      {item.views.toLocaleString()} views
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-[1fr_44px_44px] gap-2">
                <button
                  onClick={handleBuyNow}
                  className="h-12 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-semibold shadow-accent-glow transition-colors disabled:opacity-50"
                  disabled={purchasing}
                >
                  Buy now
                </button>
                <button
                  onClick={handleAdd}
                  className={`h-12 rounded-2xl grid place-items-center transition-colors ${
                    inCart
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-white'
                  }`}
                  title="Add to cart"
                >
                  {inCart ? <CheckCircle2 size={16} /> : <ShoppingCart size={16} />}
                </button>
                <button
                  onClick={handleWish}
                  className="h-12 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white grid place-items-center transition-colors"
                  title="Wishlist"
                >
                  <Heart size={16} className={wished ? 'fill-accent-500 text-accent-500' : ''} />
                </button>
              </div>

              {user && (
                <div className="mt-4 flex items-center justify-between text-[12px]">
                  <span className="text-zinc-500">Your balance</span>
                  <span className={canAfford ? 'text-zinc-300 font-medium' : 'text-rose-400 font-medium'}>
                    {formatPrice(balance || 0)}
                    {!canAfford && (
                      <span className="text-zinc-500 ml-1.5">
                        (need {formatPrice(item.price - (balance || 0))} more)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </section>

            {/* Seller */}
            {item.seller?.name && (
              <section className="glass rounded-3xl2 p-5">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold mb-3">
                  Seller
                </div>
                <button
                  onClick={() => navigate(`/user/${item.seller.steamId}`)}
                  className="w-full flex items-center gap-3 p-2 -m-2 rounded-2xl hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 grid place-items-center text-white font-semibold shrink-0">
                    {item.seller.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-[14px] text-white font-semibold truncate">
                      {item.seller.name}
                    </div>
                    <div className="text-[12px] text-zinc-500">View profile</div>
                  </div>
                  <ExternalLink size={14} className="ml-auto text-zinc-500 shrink-0" />
                </button>
              </section>
            )}

            {/* Trust signals */}
            <section className="glass rounded-3xl2 p-5">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold mb-3">
                Trade protection
              </div>
              <ul className="space-y-3 text-[13px]">
                {[
                  { icon: Shield, label: 'Escrow until you confirm receipt' },
                  { icon: Clock, label: 'Trades typically complete in <60s' },
                  { icon: CheckCircle2, label: 'Refunded if seller fails to deliver' },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3">
                    <Icon size={14} className="text-accent-400 shrink-0" />
                    <span className="text-zinc-300">{label}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Share */}
            <button
              onClick={copyLink}
              className="w-full h-11 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[13px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Copy size={14} />
              Copy listing link
            </button>
          </aside>
        </div>
      </main>

      <Footer />

      <ConfirmationModal
        isOpen={confirmBuyOpen}
        onClose={() => setConfirmBuyOpen(false)}
        onConfirm={confirmPurchase}
        title="Confirm purchase"
        message={`Buy ${item.name || item.market_name} for ${formatPrice(item.price)}?`}
        confirmText="Buy now"
        cancelText="Cancel"
        variant="info"
        isProcessing={purchasing}
      />
    </div>
  );
};

export default ItemDetailPage;
