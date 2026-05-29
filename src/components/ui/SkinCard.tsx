import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart } from 'lucide-react';
import { CachedImage } from './CachedImage';

const rarityHex: Record<string, string> = {
  consumer: '#B0C3D9',
  industrial: '#5E98D9',
  milspec: '#4B69FF',
  restricted: '#8847FF',
  classified: '#D32CE6',
  covert: '#EB4B4B',
  contraband: '#E4AE39',
  extraordinary: '#E4AE39',
};

export const rarityKey = (r?: string) =>
  (r || '').toLowerCase().replace(/[^a-z-]/g, '').replace('-', '');

export const rarityColor = (r?: string) => rarityHex[rarityKey(r)] || '#8B8FA3';

export interface SkinCardItem {
  id: string;
  name?: string;
  market_name?: string;
  price: number;
  image: string;
  condition?: string;
  rarity?: string;
  type?: string;
  float?: string | number;
  priceChange?: number;
  special?: 'stattrak' | 'souvenir';
  seller?: { steamId: string; name: string };
}

interface SkinCardProps {
  item: SkinCardItem;
  onView?: () => void;
  onAddCart?: () => void;
  onToggleWish?: () => void;
  wished?: boolean;
  formatPrice: (n: number) => string;
  variant?: 'grid' | 'list';
}

const SkinCardImpl: React.FC<SkinCardProps> = ({
  item,
  onView,
  onAddCart,
  onToggleWish,
  wished = false,
  formatPrice,
  variant = 'grid',
}) => {
  const color = rarityColor(item.rarity);
  const name = item.name || item.market_name || '';

  if (variant === 'list') {
    return (
      <motion.article
        whileHover={{ x: 2 }}
        transition={{ duration: 0.2 }}
        className="group relative rounded-2xl2 glass overflow-hidden cursor-pointer flex items-center gap-4 p-3 pr-4"
        onClick={onView}
      >
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
          style={{ background: color }}
        />
        <div className="w-20 h-20 shrink-0 rounded-2xl bg-white/[0.03] grid place-items-center overflow-hidden">
          <CachedImage src={item.image} alt={name} className="w-[88%] h-[88%] object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <span
              className="text-[11px] uppercase tracking-wider font-semibold"
              style={{ color }}
            >
              {item.rarity || 'Standard'}
            </span>
            <span className="text-[11px] text-zinc-500">{item.condition || ''}</span>
          </div>
          <h3 className="text-[14px] font-semibold text-white truncate">{name}</h3>
          {item.float != null && (
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Float {Number(item.float).toFixed(4)}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[17px] font-display font-bold text-white tracking-tight">
            {formatPrice(item.price)}
          </div>
          {item.priceChange !== undefined && item.priceChange !== 0 && (
            <div
              className={`text-[11px] font-medium mt-0.5 ${
                item.priceChange > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {item.priceChange > 0 ? '+' : ''}
              {item.priceChange.toFixed(1)}%
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleWish && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWish();
              }}
              className="w-10 h-10 rounded-2xl bg-white/[0.05] hover:bg-white/[0.10] text-white grid place-items-center transition-colors"
              aria-label="Wishlist"
            >
              <Heart
                size={15}
                className={wished ? 'fill-accent-500 text-accent-500' : ''}
              />
            </button>
          )}
          {onAddCart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddCart();
              }}
              className="h-10 px-4 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-accent-glow transition-colors"
            >
              <ShoppingCart size={14} />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      className="group relative rounded-3xl glass contain-card overflow-hidden cursor-pointer"
      onClick={onView}
      style={{
        boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 20px 40px -20px rgba(0,0,0,0.6)`,
      }}
    >
      <div
        className="absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${color}30, transparent 60%)`,
        }}
      />
      <div
        className="absolute bottom-0 left-4 right-4 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      <div className="relative aspect-[4/3] flex items-center justify-center p-6 bg-gradient-to-b from-white/[0.02] to-transparent">
        {item.special === 'stattrak' && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-orange-500/15 text-orange-300 text-[10px] font-bold tracking-wide uppercase border border-orange-500/30">
            ST
          </span>
        )}
        {item.special === 'souvenir' && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-yellow-500/15 text-yellow-300 text-[10px] font-bold tracking-wide uppercase border border-yellow-500/30">
            SV
          </span>
        )}
        {onToggleWish && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWish();
            }}
            className="absolute top-3 right-3 w-9 h-9 rounded-2xl bg-black/40 backdrop-blur-md grid place-items-center text-white/80 hover:text-white hover:bg-black/60 transition-colors"
            aria-label="Wishlist"
          >
            <Heart
              size={15}
              strokeWidth={2}
              className={wished ? 'fill-accent-500 text-accent-500' : ''}
            />
          </button>
        )}
        <CachedImage
          src={item.image}
          alt={name}
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="flex items-baseline justify-between mb-1">
          <span
            className="text-[11px] uppercase tracking-wider font-semibold"
            style={{ color }}
          >
            {item.rarity || 'Standard'}
          </span>
          <span className="text-[11px] text-zinc-500">{item.condition || ''}</span>
        </div>
        <h3 className="text-[14px] font-semibold text-white truncate" title={name}>
          {name}
        </h3>
        {item.float != null && (
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Float {Number(item.float).toFixed(4)}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-[17px] font-display font-bold text-white tracking-tight leading-none">
              {formatPrice(item.price)}
            </div>
            {item.priceChange !== undefined && item.priceChange !== 0 && (
              <div
                className={`text-[11px] font-medium mt-1 ${
                  item.priceChange > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {item.priceChange > 0 ? '+' : ''}
                {item.priceChange.toFixed(1)}%
              </div>
            )}
          </div>
          {onAddCart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddCart();
              }}
              className="h-9 w-9 rounded-2xl bg-white/[0.06] hover:bg-accent-500 text-white grid place-items-center transition-colors"
              aria-label="Add to cart"
            >
              <ShoppingCart size={15} />
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
};


/* Memoize: SkinCard is rendered in long grids. Cheap re-renders matter when
   the parent state (filters, search, hover) changes but the card's own props
   don't. The custom comparator skips the unstable callbacks and only diffs the
   stable identifying props. */
export const SkinCard = React.memo(SkinCardImpl, (a, b) => {
  return (
    a.item.id === b.item.id &&
    a.item.price === b.item.price &&
    a.wished === b.wished &&
    a.variant === b.variant &&
    a.formatPrice === b.formatPrice
  );
});

/* Content-shaped skeleton — matches SkinCard footprint so the layout doesn't
   shift when real data lands. */
export const SkinCardSkeleton: React.FC<{ className?: string }> = React.memo(({ className = '' }) => (
  <div
    className={`relative rounded-3xl skeleton overflow-hidden ${className}`}
    style={{ aspectRatio: '3 / 4' }}
  >
    {/* image area placeholder */}
    <div className="relative h-[62%] flex items-center justify-center">
      <div className="w-[68%] h-[58%] rounded-2xl bg-white/[0.04]" />
    </div>
    {/* content area placeholder */}
    <div className="absolute left-0 right-0 bottom-0 px-4 pb-4 pt-2 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-16 rounded-full bg-white/[0.07]" />
        <div className="h-2.5 w-10 rounded-full bg-white/[0.05]" />
      </div>
      <div className="h-3 w-[80%] rounded-full bg-white/[0.08]" />
      <div className="flex items-center justify-between pt-1.5">
        <div className="h-4 w-20 rounded-md bg-white/[0.10]" />
        <div className="h-7 w-7 rounded-xl bg-white/[0.07]" />
      </div>
    </div>
  </div>
));

export default SkinCard;
