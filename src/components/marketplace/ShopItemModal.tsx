import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Heart, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useToastStore } from '../../store/toastStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { rarityColor } from '../ui/SkinCard';
import { tap } from '../../lib/motion';

interface ShopItemModalProps {
  itemId: number;
  onClose: () => void;
  /* Per-shop styling from the shop editor's "Item detail modal" group. */
  accent?: string;
  config?: { buttonShape?: 'pill' | 'square'; accentTint?: boolean };
}

interface ListingData {
  id: number;
  item_name: string;
  item_type: string;
  image_url: string;
  price: number;
  condition: string;
  rarity: string;
  float_value: number | null;
  paint_seed?: number | null;
  description: string | null;
  is_active: boolean;
  seller_id: string;
  stickers?: any[] | null;
  users: {
    id: string;
    steam_id: string;
    display_name: string;
    avatar_url: string;
  };
}

const ShopItemModal: React.FC<ShopItemModalProps> = ({ itemId, onClose, accent, config }) => {
  const btnRadius = config?.buttonShape === 'square' ? '0.75rem' : '9999px';
  const accentTint = config?.accentTint ?? true;
  const accentColor = accent || 'rgb(var(--accent))';

  const [listing, setListing] = useState<ListingData | null>(null);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, isInWishlist } = useWishlistStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('marketplace_listings')
          .select(`*, users ( id, steam_id, display_name, avatar_url )`)
          .eq('id', itemId)
          .single();
        if (error) throw error;
        if (!cancelled) setListing(data as any);
      } catch (e) {
        console.error('Error fetching listing:', e);
        addToast({ type: 'error', title: 'Could not load item' });
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [itemId]);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toCartItem = (l: ListingData) => ({
    id: l.id.toString(),
    name: l.item_name,
    type: l.item_type,
    price: l.price,
    image: l.image_url,
    seller: {
      steamId: l.users.steam_id,
      displayName: l.users.display_name,
      avatarUrl: l.users.avatar_url,
    },
    condition: l.condition,
    rarity: l.rarity,
    float: l.float_value?.toString(),
  });

  const handleAddToCart = () => {
    if (!listing) return;
    addItem(toCartItem(listing) as any);
    addToast({ type: 'success', title: 'Added to cart', message: listing.item_name });
  };
  const handleAddToWishlist = () => {
    if (!listing) return;
    addToWishlist(toCartItem(listing) as any);
    addToast({ type: 'success', title: 'Added to wishlist', message: listing.item_name });
  };

  const color = listing ? rarityColor(listing.rarity) : 'rgb(var(--accent))';
  const floatNum = listing?.float_value != null ? Number(listing.float_value) : null;
  const floatPct =
    floatNum != null && Number.isFinite(floatNum) ? Math.max(0, Math.min(1, floatNum)) * 100 : null;
  const stickers = Array.isArray(listing?.stickers) ? listing!.stickers : [];
  const inWishlist = listing ? isInWishlist(listing.id.toString()) : false;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl"
        >
          {loading || !listing ? (
            <div className="p-16 grid place-items-center">
              <div className="w-8 h-8 rounded-full border-[3px] border-line border-t-accent animate-spin" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-line px-5 sm:px-6 py-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="label-eyebrow truncate" style={{ color }}>
                      {listing.rarity} · {listing.condition}
                    </span>
                  </div>
                  <h2 className="text-[18px] sm:text-[20px] font-bold text-ink tracking-tight truncate mt-0.5">
                    {listing.item_name}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="icon-chip-sm hover:bg-subtle transition-colors shrink-0 -mr-1"
                  aria-label="Close"
                >
                  <X size={16} strokeWidth={2.2} className="text-ink-muted" />
                </button>
              </div>

              <div className="p-5 sm:p-6 grid md:grid-cols-2 gap-6">
                {/* Left: image + wear + stickers */}
                <div className="space-y-4">
                  <div
                    className="relative aspect-[5/4] rounded-2xl grid place-items-center overflow-hidden"
                    style={{ background: `linear-gradient(180deg, transparent, ${color}22)` }}
                  >
                    <img
                      src={listing.image_url}
                      alt={listing.item_name}
                      className="w-[82%] h-[82%] object-contain"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: color }} />
                  </div>

                  {/* Wear bar */}
                  {floatPct != null && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="label-eyebrow">Wear</span>
                        <span className="text-[12px] font-mono tabular-nums text-ink">
                          {floatNum!.toFixed(6)}
                        </span>
                      </div>
                      <div className="relative w-full h-2 rounded-full overflow-hidden bg-subtle">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${floatPct}%` }}
                          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-y-0 left-0"
                          style={{ background: 'linear-gradient(90deg,#22c55e,#84cc16,#eab308,#f97316,#ef4444)' }}
                        />
                        <motion.div
                          initial={{ left: 0 }}
                          animate={{ left: `${floatPct}%` }}
                          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute top-0"
                          style={{ width: 0, height: 0, marginLeft: -5, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgb(var(--ink))' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stickers */}
                  {stickers.length > 0 && (
                    <div>
                      <span className="label-eyebrow">Stickers</span>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {stickers.slice(0, 6).map((s: any, i: number) => {
                          const img = typeof s === 'string' ? undefined : s.image;
                          const label = typeof s === 'string' ? s : s.name || '';
                          return (
                            <div key={i} title={label} className="w-11 h-11 rounded-xl bg-subtle grid place-items-center overflow-hidden ring-1 ring-line">
                              {img ? <img src={img} alt={label} className="w-full h-full object-contain" /> : <span className="text-[9px] font-bold text-ink-muted">{label.slice(0, 2)}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Seller */}
                  <button
                    onClick={() => window.open(`/user/${listing.users.steam_id}`, '_blank')}
                    className="w-full flex items-center gap-3 rounded-2xl bg-subtle/60 hover:bg-subtle p-3 transition-colors text-left"
                  >
                    <img src={listing.users.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="label-meta">Seller</div>
                      <div className="text-[13.5px] font-bold text-ink truncate">{listing.users.display_name}</div>
                    </div>
                    <ExternalLink size={14} className="text-ink-muted shrink-0" />
                  </button>
                </div>

                {/* Right: price + details + actions */}
                <div className="space-y-5">
                  <div>
                    <span className="label-eyebrow">Price</span>
                    <div className="text-[34px] font-bold text-ink tracking-tight tabular-nums leading-none mt-1">
                      {formatPrice(listing.price)}
                    </div>
                  </div>

                  <div className="border-t border-line/60 pt-1">
                    <Row label="Exterior" value={listing.condition} />
                    <Row label="Rarity" value={<span className="capitalize">{listing.rarity}</span>} />
                    <Row label="Type" value={listing.item_type} />
                    {floatNum != null && <Row label="Float" value={floatNum.toFixed(6)} mono />}
                    {listing.paint_seed != null && <Row label="Paint seed" value={`#${listing.paint_seed}`} mono />}
                    <Row label="Status" value={<span className="text-emerald-600 dark:text-emerald-400 font-bold">Available</span>} />
                  </div>

                  {listing.description && (
                    <div className="rounded-2xl bg-subtle/60 p-3.5">
                      <div className="label-eyebrow mb-1">Description</div>
                      <p className="text-[13px] text-ink-muted leading-relaxed">{listing.description}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2.5">
                    <motion.button
                      whileTap={tap}
                      onClick={handleAddToCart}
                      className="w-full h-12 inline-flex items-center justify-center gap-2 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
                      style={{
                        borderRadius: btnRadius,
                        background: accentTint ? accentColor : 'rgb(var(--accent))',
                        color: accentTint ? '#fff' : 'rgb(var(--on-accent))',
                      }}
                    >
                      <ShoppingCart size={16} strokeWidth={2.4} />
                      Add to cart
                    </motion.button>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={handleAddToWishlist}
                        disabled={inWishlist}
                        className={`h-11 inline-flex items-center justify-center gap-2 text-[13px] font-bold transition-colors ${
                          inWishlist ? 'bg-accent/12 text-accent cursor-default' : 'bg-subtle hover:bg-bg text-ink'
                        }`}
                        style={{ borderRadius: btnRadius }}
                      >
                        <Heart size={15} className={inWishlist ? 'fill-current' : ''} />
                        {inWishlist ? 'Wishlisted' : 'Wishlist'}
                      </button>
                      <button
                        onClick={() => window.open(`/user/${listing.users.steam_id}`, '_blank')}
                        className="h-11 inline-flex items-center justify-center gap-2 bg-subtle hover:bg-bg text-ink text-[13px] font-bold transition-colors"
                        style={{ borderRadius: btnRadius }}
                      >
                        <ExternalLink size={15} />
                        Seller
                      </button>
                    </div>
                  </div>

                  {/* Trust */}
                  <div className="rounded-2xl p-3.5 flex items-start gap-3 bg-emerald-500/8" style={{ boxShadow: 'inset 0 0 0 1px rgb(16 185 129 / 0.25)' }}>
                    <ShieldCheck size={16} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[13px] font-bold text-ink">Secure escrow</div>
                      <p className="text-[12px] text-ink-muted font-medium mt-0.5 leading-relaxed">
                        Your payment is held until the item lands in your inventory.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="kv-row">
    <span className="kv-label">{label}</span>
    <span className={`kv-value truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

export default ShopItemModal;
