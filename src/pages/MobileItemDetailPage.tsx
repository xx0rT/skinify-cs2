import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Heart,
  Share2,
  ShoppingCart,
  Shield,
  Clock,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useBalanceStore } from '../store/balanceStore';
import { CachedImage } from '../components/ui/CachedImage';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { rarityColor } from '../components/ui/SkinCard';

const MobileItemDetailPage: React.FC = () => {
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

  if (loading || !item) {
    return (
      <div className="min-h-screen p-4">
        <div className="rounded-3xl aspect-square skeleton mb-4" />
        <div className="rounded-2xl h-24 skeleton" />
      </div>
    );
  }

  const color = rarityColor(item.rarity);
  const wished = isInWishlist(item.id);
  const inCart = cartItems.some((c: any) => c.id === item.id);
  const canAfford = (balance || 0) >= item.price;

  const itemPayload = {
    id: item.id,
    name: item.name || item.market_name,
    price: item.price,
    image: item.image,
    condition: item.condition,
    rarity: item.rarity,
    type: item.type,
    seller: item.seller,
  };

  const handleAdd = () => {
    addItem(itemPayload as any);
    addToast({ type: 'success', title: 'Added to cart', message: item.name });
  };
  const handleWish = () => {
    if (!user) {
      addToast({ type: 'warning', title: 'Login required' });
      return;
    }
    toggleItem(itemPayload as any, user.steamId);
  };
  const handleBuy = () => {
    if (!user) {
      addToast({ type: 'warning', title: 'Login required' });
      return;
    }
    if (!canAfford) {
      addToast({
        type: 'error',
        title: 'Insufficient balance',
        message: `Need ${formatPrice(item.price - (balance || 0))} more.`,
      });
      return;
    }
    setConfirmBuyOpen(true);
  };
  const confirmPurchase = async () => {
    setPurchasing(true);
    try {
      addItem(itemPayload as any);
      addToast({ type: 'success', title: 'Order placed' });
      setConfirmBuyOpen(false);
      navigate('/cart');
    } finally {
      setPurchasing(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast({ type: 'success', title: 'Link copied' });
  };

  return (
    <div className="min-h-screen text-white pb-32">
      <header className="sticky top-0 z-30 px-4 pt-4 pb-3 bg-ink-900/80 backdrop-blur-xl flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-2xl bg-white/[0.05] grid place-items-center"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1" />
        <button onClick={copy} className="w-11 h-11 rounded-2xl bg-white/[0.05] grid place-items-center">
          <Share2 size={17} />
        </button>
        <button
          onClick={handleWish}
          className="w-11 h-11 rounded-2xl bg-white/[0.05] grid place-items-center"
        >
          <Heart size={17} className={wished ? 'fill-accent-500 text-accent-500' : ''} />
        </button>
      </header>

      <main className="px-4 space-y-4">
        <section className="relative glass rounded-3xl2 p-6 overflow-hidden">
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-50"
            style={{ background: `radial-gradient(closest-side, ${color}55, transparent)` }}
          />
          <div className="relative aspect-[4/3] grid place-items-center">
            <CachedImage
              src={item.image}
              alt={item.name}
              className="w-full max-w-[360px] h-full object-contain drop-shadow-2xl"
            />
          </div>
          <div className="relative flex flex-wrap items-center gap-2 mt-4">
            <span
              className="h-7 px-2.5 rounded-2xl text-[10.5px] uppercase tracking-wider font-bold"
              style={{ background: `${color}20`, color }}
            >
              {item.rarity}
            </span>
            {item.condition && (
              <span className="h-7 px-2.5 rounded-2xl bg-white/[0.05] border border-white/[0.06] text-[11px] text-zinc-300 font-medium flex items-center">
                {item.condition}
              </span>
            )}
            {item.special === 'stattrak' && (
              <span className="h-7 px-2.5 rounded-2xl bg-orange-500/15 text-orange-300 border border-orange-500/30 text-[11px] font-bold flex items-center">
                StatTrak™
              </span>
            )}
          </div>
        </section>

        <section className="glass rounded-3xl2 p-5">
          <h1 className="text-[20px] font-display font-bold text-white tracking-tight leading-tight">
            {item.name || item.market_name}
          </h1>
          {item.float != null && (
            <p className="text-[12px] text-zinc-500 mt-1">Float {Number(item.float).toFixed(4)}</p>
          )}
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold">Price</div>
            <div className="text-[30px] font-display font-bold text-white tracking-tight leading-none mt-1">
              {formatPrice(item.price)}
            </div>
          </div>
        </section>

        <section className="glass rounded-3xl2 p-5">
          <h2 className="text-[14px] font-display font-semibold text-white tracking-tight mb-3">
            Details
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Float', item.float != null ? Number(item.float).toFixed(6) : '—'],
              ['Type', item.type || '—'],
              ['Tradable', item.tradable ? 'Yes' : 'No'],
              ['Marketable', item.marketable ? 'Yes' : 'No'],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-medium">{k}</div>
                <div className="text-[13px] text-white font-medium mt-1 truncate">{v as string}</div>
              </div>
            ))}
          </div>
        </section>

        {item.seller?.name && (
          <section className="glass rounded-3xl2 p-4">
            <button
              onClick={() => navigate(`/user/${item.seller.steamId}`)}
              className="w-full flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 grid place-items-center text-white font-semibold shrink-0">
                {item.seller.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="text-[13.5px] text-white font-semibold truncate">{item.seller.name}</div>
                <div className="text-[11.5px] text-zinc-500">View seller profile</div>
              </div>
              <ExternalLink size={14} className="text-zinc-500" />
            </button>
          </section>
        )}

        <section className="glass rounded-3xl2 p-5">
          <ul className="space-y-2.5 text-[12.5px]">
            {[
              { icon: Shield, label: 'Escrow protected' },
              { icon: Clock, label: 'Average trade under 60s' },
              { icon: CheckCircle2, label: 'Refund if seller fails' },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5">
                <Icon size={13} className="text-accent-400" />
                <span className="text-zinc-300">{label}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <div className="fixed left-0 right-0 bottom-0 z-30 p-4 bg-gradient-to-t from-ink-950 via-ink-950/95 to-transparent">
        <div className="glass-strong rounded-3xl2 p-3 flex items-center gap-2">
          <button
            onClick={handleAdd}
            className={`h-12 w-12 rounded-2xl grid place-items-center shrink-0 transition-colors ${
              inCart ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.06] hover:bg-white/[0.12] text-white'
            }`}
          >
            {inCart ? <CheckCircle2 size={17} /> : <ShoppingCart size={17} />}
          </button>
          <button
            onClick={handleBuy}
            className="flex-1 h-12 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-semibold shadow-accent-glow transition-colors"
          >
            Buy for {formatPrice(item.price)}
          </button>
        </div>
      </div>

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

export default MobileItemDetailPage;
