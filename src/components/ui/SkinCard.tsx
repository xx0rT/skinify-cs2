import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag } from 'lucide-react';
import { CachedImage } from './CachedImage';
import { tap } from '../../lib/motion';

/**
 * SkinCard — neutral, no-glow card for a CS2 listing.
 *
 * Rarity is communicated by a single colored chip ("dot + label") and a
 * matching 1px bottom-edge hairline. No radial glows, no per-card gradients —
 * those read as AI-slop. The card itself is .card (rounded-3xl, hairline
 * border, theme surface).
 *
 * Memoized: only re-renders when id / price / wished / variant / formatPrice
 * change. Stable parents that keep callbacks the same (useCallback) will get
 * fully-skipped renders.
 */

const RARITY_HEX: Record<string, string> = {
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

export const rarityColor = (r?: string) => RARITY_HEX[rarityKey(r)] || '#8B8FA3';

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
        whileTap={tap}
        onClick={onView}
        className="card group relative flex items-center gap-4 p-3 pr-4 cursor-pointer contain-card"
      >
        <div
          className="absolute left-3 top-3 bottom-3 w-[3px] rounded-full"
          style={{ background: color }}
          aria-hidden
        />
        <div className="w-20 h-20 shrink-0 rounded-2xl bg-subtle grid place-items-center overflow-hidden ml-2">
          <CachedImage src={item.image} alt={name} className="w-[88%] h-[88%] object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="chip-dot" style={{ background: color }} />
            <span className="label-meta" style={{ color }}>
              {item.rarity || 'Standard'}
            </span>
            {item.condition && (
              <span className="text-[11px] text-ink-dim font-medium">· {item.condition}</span>
            )}
          </div>
          <h3 className="text-[15px] font-bold text-ink truncate tracking-tight">{name}</h3>
          {item.float != null && (
            <p className="text-[12px] text-ink-dim font-medium mt-0.5">
              Float {Number(item.float).toFixed(4)}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[18px] font-bold text-ink tracking-tight tabular-nums leading-none">
            {formatPrice(item.price)}
          </div>
          {item.priceChange !== undefined && item.priceChange !== 0 && (
            <div
              className={`text-[11px] font-semibold mt-1 ${
                item.priceChange > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {item.priceChange > 0 ? '+' : ''}
              {item.priceChange.toFixed(1)}%
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleWish && (
            <motion.button
              whileTap={tap}
              onClick={(e) => {
                e.stopPropagation();
                onToggleWish();
              }}
              className="icon-chip hover:bg-bg transition-colors"
              aria-label="Wishlist"
            >
              <Heart
                size={16}
                strokeWidth={wished ? 2.4 : 2}
                className={wished ? 'fill-current text-accent' : 'text-ink-muted'}
              />
            </motion.button>
          )}
          {onAddCart && (
            <motion.button
              whileTap={tap}
              onClick={(e) => {
                e.stopPropagation();
                onAddCart();
              }}
              className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold flex items-center gap-1.5"
            >
              <ShoppingBag size={14} strokeWidth={2.4} />
              <span className="hidden sm:inline">Add</span>
            </motion.button>
          )}
        </div>
      </motion.article>
    );
  }

  /* grid */
  return (
    <motion.article
      whileTap={tap}
      onClick={onView}
      className="card group relative cursor-pointer contain-card overflow-hidden"
    >
      {/* image area */}
      <div className="relative aspect-[5/4] flex items-center justify-center p-5 bg-subtle/40">
        {item.special === 'stattrak' && (
          <span className="absolute top-3 left-3 pill bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300 text-[10px] font-bold tracking-wider uppercase">
            ST
          </span>
        )}
        {item.special === 'souvenir' && (
          <span className="absolute top-3 left-3 pill bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300 text-[10px] font-bold tracking-wider uppercase">
            SV
          </span>
        )}
        {onToggleWish && (
          <motion.button
            whileTap={tap}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWish();
            }}
            className="absolute top-3 right-3 icon-chip-sm bg-surface/90 backdrop-blur-sm"
            aria-label="Wishlist"
          >
            <Heart
              size={14}
              strokeWidth={wished ? 2.4 : 2}
              className={wished ? 'fill-current text-accent' : 'text-ink-muted'}
            />
          </motion.button>
        )}
        <CachedImage
          src={item.image}
          alt={name}
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </div>

      {/* content area */}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="chip-dot" style={{ background: color }} />
          <span className="label-meta" style={{ color }}>
            {item.rarity || 'Standard'}
          </span>
          {item.condition && (
            <span className="ml-auto text-[11px] text-ink-dim font-medium truncate">
              {item.condition}
            </span>
          )}
        </div>
        <h3 className="text-[15px] font-bold text-ink truncate tracking-tight" title={name}>
          {name}
        </h3>
        {item.float != null && (
          <p className="text-[11px] text-ink-dim font-medium mt-0.5">
            Float {Number(item.float).toFixed(4)}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-[18px] font-bold text-ink tracking-tight leading-none tabular-nums">
              {formatPrice(item.price)}
            </div>
            {item.priceChange !== undefined && item.priceChange !== 0 && (
              <div
                className={`text-[11px] font-semibold mt-1 ${
                  item.priceChange > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {item.priceChange > 0 ? '+' : ''}
                {item.priceChange.toFixed(1)}%
              </div>
            )}
          </div>
          {onAddCart && (
            <motion.button
              whileTap={tap}
              onClick={(e) => {
                e.stopPropagation();
                onAddCart();
              }}
              className="icon-chip bg-accent text-on-accent hover:opacity-90 transition-opacity"
              aria-label="Add to cart"
            >
              <ShoppingBag size={15} strokeWidth={2.4} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  );
};

export const SkinCard = React.memo(SkinCardImpl, (a, b) => {
  return (
    a.item.id === b.item.id &&
    a.item.price === b.item.price &&
    a.wished === b.wished &&
    a.variant === b.variant &&
    a.formatPrice === b.formatPrice
  );
});

/* Content-shaped skeleton — uses .skel (theme-aware) and matches the card. */
export const SkinCardSkeleton: React.FC<{ className?: string }> = React.memo(({ className = '' }) => (
  <div className={`skel relative ${className}`} style={{ aspectRatio: '5 / 6.4' }}>
    <div className="absolute left-4 right-4 top-[58%] h-2 rounded-full bg-surface/60" />
    <div className="absolute left-4 right-16 top-[68%] h-3 rounded-full bg-surface/70" />
    <div className="absolute left-4 right-4 bottom-4 flex items-center justify-between">
      <div className="h-4 w-20 rounded-md bg-surface/80" />
      <div className="h-9 w-9 rounded-2xl bg-surface/70" />
    </div>
  </div>
));

/* Need the relative for the skeleton's absolute children */
SkinCardSkeleton.displayName = 'SkinCardSkeleton';

export default SkinCard;
