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
  /**
   * grid  — standard rounded card with a border (default)
   * list  — horizontal row
   * tile  — flat, sharp-edged marketplace tile that abuts its neighbours
   *         with no gap. Used for the dense marketplace grid.
   */
  variant?: 'grid' | 'list' | 'tile';
}

/* Pull "AK-47" out of "AK-47 | Redline (Field-Tested)" — used as a
   weapon-class chip on the tile variant. Falls back to item.type so
   loadouts (Knives / Gloves / Sticker) still get a label. */
function inferWeaponClass(item: SkinCardItem): string | null {
  const raw = item.name || item.market_name || '';
  if (!raw) return item.type || null;
  const first = raw.split('|')[0]?.trim();
  if (!first) return item.type || null;
  // Drop StatTrak™ / ★ prefixes so "★ Karambit" → "Karambit"
  return first.replace(/^★\s*/, '').replace(/^StatTrak™\s*/, '').trim() || (item.type || null);
}

/* Short label for the type ("Covert Knife", "Extraordinary Gloves") */
function abbrevType(type?: string): string {
  if (!type) return '';
  const t = type.toLowerCase();
  if (t.includes('rifle')) return 'Rifle';
  if (t.includes('pistol')) return 'Pistol';
  if (t.includes('smg') || t.includes('submachine')) return 'SMG';
  if (t.includes('shotgun')) return 'Shotgun';
  if (t.includes('heavy') || t.includes('machine gun')) return 'Heavy';
  if (t.includes('knife') || t.includes('karambit') || t.includes('bayonet')) return 'Knife';
  if (t.includes('glove')) return 'Gloves';
  if (t.includes('sticker')) return 'Sticker';
  if (t.includes('agent')) return 'Agent';
  if (t.includes('case') || t.includes('container')) return 'Container';
  return type;
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

  /* Shared derived values used by grid + tile variants. Hoisted here so
     the two branches don't redeclare them. */
  const floatNum = item.float != null ? Number(item.float) : null;
  const floatPct =
    floatNum != null && Number.isFinite(floatNum)
      ? Math.max(0, Math.min(1, floatNum)) * 100
      : null;
  const seed = item.paintSeed ?? item.patternTemplate;
  const online = item.seller?.online ?? false;
  const stickers = Array.isArray(item.stickers) ? item.stickers : [];

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

  /* ─────────── TILE — Float-style dense marketplace tile ───────────
     Edge-to-edge layout (zero grid gap). Hairline borders share a single
     pixel with the neighbours. Hover lifts the tile above the seam,
     exposes a full-width ADD TO CART action at the bottom, and slightly
     scales the skin art. */
  const referencePrice =
    item.priceChange !== undefined && item.priceChange !== 0 && item.priceChange < 0
      ? item.price / (1 + item.priceChange / 100)
      : null;
  const weaponLabel = inferWeaponClass(item);

  if (variant === 'tile') {
    return (
      <motion.article
        whileTap={tap}
        whileHover={{ scale: 1.03, zIndex: 10 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.55 }}
        onClick={onView}
        className="group relative cursor-pointer contain-card overflow-hidden bg-surface flex flex-col"
        style={{
          boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 0.04), inset 0 -1px 0 0 rgb(255 255 255 / 0.04)',
        }}
      >
        {/* Image area — clean dark surface, no rarity glow */}
        <div className="relative aspect-[5/4] flex items-center justify-center px-5 pt-5 pb-3 overflow-hidden">
          {item.special === 'stattrak' && (
            <span className="absolute top-2.5 left-2.5 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider uppercase bg-orange-500/15 text-orange-600 dark:text-orange-300">
              ST
            </span>
          )}
          {item.special === 'souvenir' && (
            <span className="absolute top-2.5 left-2.5 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider uppercase bg-yellow-500/15 text-yellow-700 dark:text-yellow-300">
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
              className="absolute top-2.5 right-2.5 w-7 h-7 grid place-items-center text-ink-muted hover:text-ink transition-colors z-10"
              aria-label="Wishlist"
            >
              <Heart
                size={14}
                strokeWidth={wished ? 2.4 : 2}
                className={wished ? 'fill-current text-accent' : ''}
              />
            </motion.button>
          )}

          <CachedImage
            src={item.image}
            alt={name}
            className="relative z-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.06]"
          />

          {stickers.length > 0 && (
            <div className="absolute left-2 bottom-2 flex items-center gap-1 z-20">
              {stickers.slice(0, 5).map((s, i) => {
                const url = typeof s === 'string' ? undefined : s.image;
                const label = typeof s === 'string' ? s : s.name || '';
                return (
                  <div
                    key={`${label}-${i}`}
                    title={label}
                    className="w-5 h-5 bg-surface/85 grid place-items-center overflow-hidden"
                  >
                    {url ? (
                      <img src={url} alt={label} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[8.5px] font-bold text-ink-muted">
                        {label.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content — price, weapon class, item name, condition, float */}
        <div className="px-3.5 pt-1 pb-3 flex-1 flex flex-col">
          {/* Price row + change badge */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-[19px] font-bold text-ink tracking-tight tabular-nums leading-none">
              {formatPrice(item.price)}
            </div>
            {item.priceChange !== undefined && item.priceChange !== 0 && (
              <span
                className="inline-flex items-center text-[10.5px] font-bold tabular-nums px-1.5 py-[3px] text-white"
                style={{
                  background:
                    item.priceChange > 0
                      ? 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)'
                      : 'linear-gradient(90deg, #6366f1 0%, #f97316 100%)',
                }}
              >
                {item.priceChange > 0 ? '+' : '−'}
                {Math.abs(item.priceChange).toFixed(0)}%
              </span>
            )}
          </div>

          {/* Reference price — small grey line under the main price */}
          {referencePrice != null && (
            <div className="text-[11px] text-ink-dim font-medium mt-0.5 tabular-nums">
              Reference price {formatPrice(referencePrice)}
            </div>
          )}

          {/* Weapon class chip — rarity-colored square + colored label */}
          {weaponLabel && (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5"
                style={{ background: color }}
                aria-hidden
              />
              <span
                className="text-[12px] font-semibold truncate"
                style={{ color }}
              >
                {weaponLabel}
              </span>
            </div>
          )}

          {/* Item name */}
          <h3
            className="text-[15px] font-bold text-ink truncate tracking-tight leading-tight mt-1"
            title={name}
          >
            {name}
          </h3>

          {/* Condition row — "Factory New ★ Covert Rifle" */}
          {(item.condition || item.type) && (
            <div className="text-[11.5px] text-ink-muted font-medium mt-0.5 truncate">
              {item.condition}
              {item.condition && (item.special || item.type) && ' ★ '}
              {item.rarity || ''}
              {item.rarity && item.type && ' '}
              {abbrevType(item.type)}
            </div>
          )}

          {/* Float bar at the very bottom */}
          {floatPct != null && floatNum != null && (
            <div className="mt-auto pt-3 flex items-center gap-2">
              <span className="text-[11px] text-ink-muted font-mono tabular-nums shrink-0">
                {floatNum.toFixed(3)}
              </span>
              <div
                className="relative flex-1 h-1.5 overflow-hidden"
                title={`Float ${floatNum.toFixed(6)}`}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(90deg, #22c55e 0%, #84cc16 25%, #eab308 50%, #f97316 75%, #ef4444 100%)',
                  }}
                  aria-hidden
                />
                {/* White triangle marker */}
                <div
                  className="absolute top-0"
                  style={{
                    left: `calc(${floatPct}% - 4px)`,
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: '5px solid #ffffff',
                  }}
                  aria-hidden
                />
              </div>
            </div>
          )}
        </div>

        {/* Hover ADD TO CART action — slides up over the float bar area */}
        {onAddCart && (
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out flex items-stretch">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddCart();
              }}
              className="flex-1 h-11 bg-sky-300 hover:bg-sky-200 text-slate-900 text-[12.5px] font-bold uppercase tracking-[0.14em] inline-flex items-center justify-center gap-2 transition-colors"
            >
              <ShoppingBag size={14} strokeWidth={2.4} />
              Add to cart
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                /* Reserved for "more options" — opens detail view for now. */
                onView?.();
              }}
              className="w-11 h-11 bg-sky-300/95 hover:bg-sky-200 text-slate-900 grid place-items-center transition-colors"
              style={{ boxShadow: 'inset 1px 0 0 0 rgb(0 0 0 / 0.08)' }}
              aria-label="More"
            >
              <span className="flex flex-col gap-[2px]" aria-hidden>
                <span className="w-[3px] h-[3px] bg-slate-900 rounded-full" />
                <span className="w-[3px] h-[3px] bg-slate-900 rounded-full" />
                <span className="w-[3px] h-[3px] bg-slate-900 rounded-full" />
              </span>
            </button>
          </div>
        )}
      </motion.article>
    );
  }

  /* grid — float-style: rarity-gradient image area, sharp rarity bottom
     line, then info rows beneath. */

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
