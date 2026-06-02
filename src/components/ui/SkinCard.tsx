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
  seller?: { steamId: string; name: string; online?: boolean };
  paintSeed?: number | string;
  patternTemplate?: number | string;
  stickers?: (string | { name?: string; image?: string })[];
  views?: number;
  expiresAt?: string | number;
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

  /* grid — float-style: rarity-gradient image area, sharp rarity bottom
     line, then info rows beneath. */
  const floatNum = item.float != null ? Number(item.float) : null;
  const floatPct =
    floatNum != null && Number.isFinite(floatNum)
      ? Math.max(0, Math.min(1, floatNum)) * 100
      : null;
  const seed = item.paintSeed ?? item.patternTemplate;
  const online = item.seller?.online ?? false;
  const stickers = Array.isArray(item.stickers) ? item.stickers : [];

  return (
    <motion.article
      whileTap={tap}
      onClick={onView}
      className="card group relative cursor-pointer contain-card overflow-hidden"
    >
      {/* image area — rarity gradient bg + sharp rarity bottom edge */}
      <div
        className="relative aspect-[5/4] flex items-center justify-center p-5 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.0) 0%, ${color}1f 55%, ${color}3a 100%)`,
        }}
      >
        {/* corner pills — StatTrak / Souvenir badge in the top-left,
            wishlist in the top-right. Kept compact to avoid covering
            the skin art. */}
        {item.special === 'stattrak' && (
          <span
            className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold tracking-wider uppercase bg-orange-500/15 text-orange-600 dark:text-orange-300"
          >
            ST
          </span>
        )}
        {item.special === 'souvenir' && (
          <span
            className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold tracking-wider uppercase bg-yellow-500/15 text-yellow-700 dark:text-yellow-300"
          >
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
            className="absolute top-2.5 right-2.5 icon-chip-sm bg-surface/90 backdrop-blur-sm"
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

        {/* Stickers — stacked in the bottom-left of the image area,
            ABOVE the rarity hairline. Capped at 5 visible. */}
        {stickers.length > 0 && (
          <div className="absolute left-2 bottom-2 flex items-center gap-1 z-10">
            {stickers.slice(0, 5).map((s, i) => {
              const url = typeof s === 'string' ? undefined : s.image;
              const label = typeof s === 'string' ? s : s.name || '';
              return (
                <div
                  key={`${label}-${i}`}
                  title={label}
                  className="w-6 h-6 rounded-md bg-surface/85 backdrop-blur-sm grid place-items-center overflow-hidden ring-1 ring-line/60"
                >
                  {url ? (
                    <img src={url} alt={label} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[9px] font-bold text-ink-muted">
                      {label.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sharp rarity bottom edge — full-width, no rounding. */}
        <div
          className="absolute left-0 right-0 bottom-0 h-[3px]"
          style={{ background: color }}
          aria-hidden
        />
      </div>

      {/* content area */}
      <div className="px-3.5 pt-3 pb-3.5">
        {/* Title row — name + condition */}
        <h3
          className="text-[14px] font-bold text-ink truncate tracking-tight leading-tight"
          title={name}
        >
          {name}
        </h3>
        {item.condition && (
          <div className="text-[11px] text-ink-muted font-medium mt-0.5 truncate">
            {item.special === 'stattrak' && (
              <span className="text-orange-600 dark:text-orange-400 font-bold">StatTrak™ </span>
            )}
            {item.special === 'souvenir' && (
              <span className="text-yellow-600 dark:text-yellow-400 font-bold">Souvenir </span>
            )}
            {item.condition}
          </div>
        )}

        {/* Price + change pill */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-[18px] font-bold text-ink tracking-tight tabular-nums leading-none">
            {formatPrice(item.price)}
          </div>
          {item.priceChange !== undefined && item.priceChange !== 0 && (
            <span
              className={`shrink-0 inline-flex items-center gap-1 text-[10.5px] font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                item.priceChange > 0
                  ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/12 text-rose-700 dark:text-rose-300'
              }`}
            >
              {item.priceChange > 0 ? '+' : '−'}
              {Math.abs(item.priceChange).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Online dot + float bar */}
        {(floatPct != null || online !== undefined) && (
          <div className="mt-2.5 flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                online ? 'bg-emerald-500' : 'bg-ink-dim'
              }`}
              aria-label={online ? 'Online' : 'Offline'}
            />
            {floatPct != null ? (
              <div
                className="relative flex-1 h-1 rounded-full overflow-hidden bg-subtle"
                title={`Float ${floatNum?.toFixed(6)}`}
              >
                {/* 5-step wear gradient — FN green → BS red. */}
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background:
                      'linear-gradient(90deg, #22c55e 0%, #84cc16 25%, #eab308 50%, #f97316 75%, #ef4444 100%)',
                  }}
                  aria-hidden
                />
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-ink rounded-full"
                  style={{ left: `calc(${floatPct}% - 1px)` }}
                  aria-hidden
                />
              </div>
            ) : (
              <span className="text-[10.5px] text-ink-dim font-medium">
                {online ? 'Online' : 'Offline'}
              </span>
            )}
          </div>
        )}

        {/* Float value + paint seed */}
        {(floatNum != null || seed != null) && (
          <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-medium tabular-nums">
            <span className="text-ink-muted font-mono truncate">
              {floatNum != null ? floatNum.toFixed(8) : '—'}
            </span>
            {seed != null && (
              <span className="text-ink-dim shrink-0">#{String(seed)}</span>
            )}
          </div>
        )}

        {/* Add to cart — moved to a thin row so the data above breathes. */}
        {onAddCart && (
          <motion.button
            whileTap={tap}
            onClick={(e) => {
              e.stopPropagation();
              onAddCart();
            }}
            className="mt-3 w-full h-9 rounded-full bg-accent text-on-accent text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity"
            aria-label="Add to cart"
          >
            <ShoppingBag size={13} strokeWidth={2.4} />
            Add to cart
          </motion.button>
        )}
      </div>
    </motion.article>
  );
};

export const SkinCard = React.memo(SkinCardImpl, (a, b) => {
  return (
    a.item.id === b.item.id &&
    a.item.price === b.item.price &&
    a.item.float === b.item.float &&
    a.item.paintSeed === b.item.paintSeed &&
    a.item.seller?.online === b.item.seller?.online &&
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
