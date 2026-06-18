import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  FileText,
  Heart,
  Search as SearchIcon,
  ShoppingBag,
  UserPlus,
} from 'lucide-react';
import { CachedImage } from './CachedImage';
import { tap } from '../../lib/motion';
import { useToastStore } from '../../store/toastStore';
import { useSkinFloat } from '../../hooks/useSkinFloat';

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
  /* Auction-mode fields. When `listing_type === 'auction'` the tile
     shows a live countdown + current bid + Live Auction pill instead
     of the standard price + add-to-cart. */
  listing_type?: 'standard' | 'auction' | 'private';
  auction_end_time?: string | number;
  current_bid?: number;
  minimum_bid?: number;
  bid_count?: number;
  buyout_price?: number;
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
  /**
   * Tile-variant only. When false, the big scale/lift hover is
   * suppressed and replaced with a soft rarity-accent border. Use
   * `false` on the profile tabs (inventory, listings) so cards stay
   * still when the user hovers — they're not "buy now" surfaces, they
   * have their own actions stacked beneath.
   */
  hoverLift?: boolean;
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
  hoverLift = true,
}) => {
  const color = rarityColor(item.rarity);
  const name = item.name || item.market_name || '';

  /* Lazy-fetch float + paint seed from /functions/v1/skin-float when
     the listing row didn't ship them. The hook short-circuits when
     both values are already present. */
  const skinFloat = useSkinFloat({
    enabled: variant === 'tile',
    initialFloat: item.float as any,
    initialPaintSeed: item.paintSeed as any,
    inspectLink: (item as any).inspect_link ?? (item as any).inspectLink ?? null,
    fallbackKey: String(item.id || item.market_name || item.name || ''),
  });

  /* Shared derived values used by grid + tile variants. Hoisted here so
     the two branches don't redeclare them. */
  const floatNum =
    skinFloat.data?.float != null
      ? Number(skinFloat.data.float)
      : item.float != null
      ? Number(item.float)
      : null;
  const floatPct =
    floatNum != null && Number.isFinite(floatNum)
      ? Math.max(0, Math.min(1, floatNum)) * 100
      : null;
  const seed =
    skinFloat.data?.paint_seed ?? item.paintSeed ?? item.patternTemplate;
  const online = item.seller?.online ?? false;
  const stickers = Array.isArray(item.stickers)
    ? item.stickers
    : (skinFloat.data?.stickers as any[]) || [];

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
        /* When `hoverLift` is true (default — marketplace): spring up,
           scale 1.03, lift 22px so the action bar drops into the gap
           below. When false (profile inventory/listings): no lift, just
           a rarity-accent ring on hover. Keeps the cards still while
           still signaling "this is interactive". */
        whileHover={hoverLift ? { scale: 1.03, y: -22, zIndex: 10 } : undefined}
        transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.55 }}
        onClick={onView}
        className="group relative cursor-pointer bg-surface flex flex-col transition-shadow"
        style={{
          boxShadow: hoverLift
            ? 'inset 0 0 0 1px rgb(255 255 255 / 0.04), inset 0 -1px 0 0 rgb(255 255 255 / 0.04)'
            : `inset 0 0 0 1px rgb(255 255 255 / 0.04), inset 0 -1px 0 0 rgb(255 255 255 / 0.04)`,
          /* CSS variable that the rarity-ring hover rule below reads.
             Falls back to the accent colour when rarity is unknown. */
          ['--rarity' as any]: color || 'rgb(var(--accent))',
        }}
        onMouseEnter={(e) => {
          if (hoverLift) return;
          (e.currentTarget as HTMLElement).style.boxShadow =
            'inset 0 0 0 2px var(--rarity), 0 8px 22px -10px rgb(0 0 0 / 0.25)';
        }}
        onMouseLeave={(e) => {
          if (hoverLift) return;
          (e.currentTarget as HTMLElement).style.boxShadow =
            'inset 0 0 0 1px rgb(255 255 255 / 0.04), inset 0 -1px 0 0 rgb(255 255 255 / 0.04)';
        }}
      >
        {/* Image area. The bottom edge carries a sharp 1.5px rarity
            stripe; just above it, a soft upward fade in the same
            rarity color washes the bottom ~40% of the image area
            (strongest at the line, fading to transparent toward the
            top). Matches the colour treatment used on the categories
            page so the marketplace tile reads as the same family. */}
        <div className="relative aspect-[5/4] flex items-center justify-center px-5 pt-5 pb-3 overflow-hidden">
          {/* Rarity gradient + bottom line. Drawn behind the image
              via two stacked absolutely-positioned divs. Pointer-events
              none so it never interferes with the card click. */}
          {color && (
            <>
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none"
                style={{
                  background: `linear-gradient(to top, ${color}59 0%, ${color}26 35%, transparent 100%)`,
                }}
              />
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[1.5px] pointer-events-none"
                style={{ background: color }}
              />
            </>
          )}
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
          {/* Wishlist heart — always visible in the top-right of the image
              so users can favorite without hovering. Toggles the accent
              fill when active. */}
          {onToggleWish && (
            <motion.button
              whileTap={tap}
              onClick={(e) => {
                e.stopPropagation();
                onToggleWish();
              }}
              className={`absolute top-2.5 right-2.5 w-7 h-7 grid place-items-center transition-colors z-10 ${
                wished
                  ? 'text-accent'
                  : 'text-ink-muted hover:text-ink opacity-0 group-hover:opacity-100'
              }`}
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart
                size={15}
                strokeWidth={wished ? 2.6 : 2}
                className={wished ? 'fill-current' : ''}
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

        {/* Content — price, weapon class, item name, condition, float.
            Heights are normalised so every tile is the same height
            regardless of whether the reference price exists. The float
            row is anchored to the bottom via mt-auto. */}
        <div className="px-3.5 pt-1 pb-3 flex-1 flex flex-col">
          {/* Price row + change badge — replaced with current-bid and
              auction-end pill when listing_type === 'auction'. */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-[19px] font-bold text-ink tracking-tight tabular-nums leading-none">
              {item.listing_type === 'auction'
                ? formatPrice(item.current_bid ?? item.minimum_bid ?? item.price)
                : formatPrice(item.price)}
            </div>
            {item.listing_type === 'auction' && (
              <AuctionPill endTime={item.auction_end_time} />
            )}
            {item.listing_type !== 'auction' && item.priceChange !== undefined && item.priceChange !== 0 && (
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

          {/* Reference price slot — ALWAYS reserved (invisible placeholder
              when missing) so every tile lines up vertically. */}
          <div
            className="text-[11px] font-medium mt-0.5 tabular-nums h-[15px]"
            style={{
              color:
                item.listing_type === "auction" || referencePrice != null
                  ? "rgb(var(--ink-dim))"
                  : "transparent",
            }}
          >
            {item.listing_type === "auction"
              ? `${item.bid_count || 0} ${(item.bid_count || 0) === 1 ? "bid" : "bids"} so far`
              : referencePrice != null
              ? `Reference price ${formatPrice(referencePrice)}`
              : ' '}
          </div>

          {/* Weapon class chip — rarity-colored square + colored label */}
          <div className="mt-2 flex items-center gap-1.5 h-[16px]">
            {weaponLabel && (
              <>
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
              </>
            )}
          </div>

          {/* Item name */}
          <h3
            className="text-[15px] font-bold text-ink truncate tracking-tight leading-tight mt-1 h-[20px]"
            title={name}
          >
            {name}
          </h3>

          {/* Condition row — "Factory New ★ Covert Rifle" */}
          <div className="text-[11.5px] text-ink-muted font-medium mt-0.5 truncate h-[17px]">
            {item.condition || ''}
            {item.condition && (item.special || item.type) && ' ★ '}
            {item.rarity || ''}
            {item.rarity && item.type && ' '}
            {abbrevType(item.type)}
          </div>

          {/* Float metadata — ALWAYS rendered. Compact row with float
              value + paint seed before the gradient bar. */}
          <div className="mt-auto pt-3">
            <div className="flex items-center justify-between text-[10.5px] font-medium tabular-nums mb-1">
              <span className="text-ink-muted font-mono truncate">
                {floatNum != null && Number.isFinite(floatNum)
                  ? `float ${floatNum.toFixed(4)}`
                  : 'float —'}
              </span>
              <span className="text-ink-dim shrink-0 font-mono">
                {seed != null ? `#${String(seed)}` : ''}
              </span>
            </div>

            <div
              className="relative w-full h-1.5 overflow-hidden"
              title={floatNum != null ? `Float ${floatNum.toFixed(6)}` : 'No float data'}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(90deg, #22c55e 0%, #84cc16 25%, #eab308 50%, #f97316 75%, #ef4444 100%)',
                  opacity: floatPct != null ? 1 : 0.25,
                }}
                aria-hidden
              />
              {floatPct != null && (
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
              )}
            </div>
          </div>
        </div>

        {/* ADD-TO-CART action bar — anchored just BELOW the card edge
            (`top: 100%`). Pre-hover: collapsed to zero height from its
            center via `scaleY(0)`, invisible, no pointer events. On
            hover: `scaleY(1)` expands the bar simultaneously upward
            AND downward from the middle line, fading in over 200ms.

            Only attached when hoverLift is true (the marketplace case).
            Profile-tab cards (inventory/listings) hide this bar — they
            don't have an "add to cart" verb and they have their own
            actions stacked below the card. */}
        {onAddCart && hoverLift && (
          <div
            className="absolute top-full left-0 right-0 origin-center scale-y-0 opacity-0 pointer-events-none group-hover:scale-y-100 group-hover:opacity-100 group-hover:pointer-events-auto transition-[transform,opacity] duration-200 ease-out z-30"
          >
            <TileActionBar onAddCart={onAddCart} item={item} />
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

/* ─────────────────────────────────────────────────────────────────────────
   TileActionBar — hover-revealed accent action strip for the tile variant.

   Sits at the bottom of the card. The Add-to-cart button takes the
   majority width; the right-side button toggles a popover with four
   actions: Inspect in game, Show user description, Search, Follow.

   The bar covers only the float-row area (44px tall) so the item name
   and condition lines remain visible while hovering — the user can read
   what they're about to buy.
   ───────────────────────────────────────────────────────────────────────── */
const TileActionBar: React.FC<{
  onAddCart: () => void;
  onView?: () => void;
  item: SkinCardItem;
}> = ({ onAddCart, item }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { addToast } = useToastStore();

  /* Click-outside + Esc → close. */
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const inspectInGame = () => {
    const inspectLink =
      (item as any).inspect_link ||
      (item as any).inspectLink ||
      (item as any).inspect_url;
    if (inspectLink) {
      window.location.href = inspectLink;
    } else {
      addToast({
        type: 'info',
        title: 'Inspect link unavailable',
        message: 'This listing did not include a Steam inspect link.',
      });
    }
    setMenuOpen(false);
  };

  const showDescription = () => {
    addToast({
      type: 'info',
      title: 'Seller description',
      message:
        (item as any).description ||
        'The seller has not added a description for this item.',
      duration: 6000,
    });
    setMenuOpen(false);
  };

  const searchSimilar = () => {
    const q = (item.name || item.market_name || '').split('|')[0]?.trim();
    if (q) {
      window.location.href = `/marketplace?q=${encodeURIComponent(q)}`;
    }
    setMenuOpen(false);
  };

  const followSeller = () => {
    const sellerId = item.seller?.steamId;
    if (!sellerId) {
      addToast({ type: 'warning', title: 'No seller info' });
    } else {
      addToast({
        type: 'success',
        title: 'Following seller',
        message: `You'll be notified when ${item.seller?.name || 'this seller'} lists new items.`,
      });
    }
    setMenuOpen(false);
  };

  return (
    <div
      className="flex items-stretch w-full"
      onClick={stop}
    >
      <button
        onClick={(e) => {
          stop(e);
          onAddCart();
        }}
        className="flex-1 h-11 text-on-accent text-[12.5px] font-bold uppercase tracking-[0.14em] inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-95"
        style={{ background: 'rgb(var(--accent))' }}
      >
        <ShoppingBag size={14} strokeWidth={2.4} />
        Add to cart
      </button>

      {/* 3-dot more menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            stop(e);
            setMenuOpen((v) => !v);
          }}
          className="w-11 h-11 text-on-accent grid place-items-center transition-opacity hover:opacity-95"
          style={{
            background: 'rgb(var(--accent))',
            boxShadow: 'inset 1px 0 0 0 rgb(0 0 0 / 0.18)',
          }}
          aria-label="More options"
          aria-expanded={menuOpen}
        >
          <span className="flex flex-col gap-[2px]" aria-hidden>
            <span className="w-[3px] h-[3px] bg-current rounded-full" />
            <span className="w-[3px] h-[3px] bg-current rounded-full" />
            <span className="w-[3px] h-[3px] bg-current rounded-full" />
          </span>
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="more-menu"
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
              onClick={stop}
              className="absolute bottom-full right-0 mb-2 min-w-[200px] bg-surface text-ink shadow-xl ring-1 ring-line z-50 overflow-hidden"
            >
              <MenuItem Icon={Eye} label="Inspect in game" onClick={inspectInGame} />
              <MenuItem Icon={FileText} label="Show user description" onClick={showDescription} />
              <MenuItem Icon={SearchIcon} label="Search" onClick={searchSimilar} />
              <MenuItem Icon={UserPlus} label="Follow" onClick={followSeller} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const MenuItem: React.FC<{
  Icon: React.ComponentType<any>;
  label: string;
  onClick: () => void;
}> = ({ Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-3 h-10 text-[12.5px] font-semibold text-ink hover:bg-subtle transition-colors text-left"
  >
    <Icon size={13} strokeWidth={2.2} className="text-ink-muted shrink-0" />
    {label}
  </button>
);

/* ─────────────────────────────────────────────────────────────────────────
   AuctionPill — small live-countdown chip rendered next to the current
   bid on auction tiles. Ticks once per second. When time runs out the
   chip turns muted and reads "Ended".
   ───────────────────────────────────────────────────────────────────────── */
const AuctionPill: React.FC<{ endTime?: string | number }> = ({ endTime }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const end = endTime ? new Date(endTime).getTime() : null;
  if (!end || !Number.isFinite(end)) return null;
  const diff = end - now;
  const ended = diff <= 0;

  let label = 'Ended';
  if (!ended) {
    const totalSec = Math.floor(diff / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) label = `${d}d ${h}h`;
    else if (h > 0) label = `${h}h ${String(m).padStart(2, '0')}m`;
    else label = `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10.5px] font-bold tabular-nums px-1.5 py-[3px] rounded-md ${
        ended
          ? 'bg-subtle text-ink-muted'
          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
      }`}
      title={ended ? 'Auction ended' : `Auction ends ${new Date(end).toLocaleString()}`}
    >
      {!ended && (
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
      )}
      {label}
    </span>
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

/* Content-shaped skeleton — mirrors the tile variant layout exactly so
   the grid doesn't jump as items resolve. Image block on top, then
   price + weapon chip + name + condition + float bar, matching the
   real tile's vertical rhythm. */
export const SkinCardSkeleton: React.FC<{ className?: string }> = React.memo(({ className = '' }) => (
  <div
    className={`relative bg-surface overflow-hidden flex flex-col ${className}`}
    style={{
      aspectRatio: '5 / 7',
      boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 0.04)',
    }}
  >
    {/* image area */}
    <div className="relative aspect-[5/4] bg-subtle/30 grid place-items-center px-5 pt-5 pb-3">
      <div className="skel w-[70%] h-[70%] rounded-xl" />
    </div>
    {/* content area */}
    <div className="px-3.5 pt-1 pb-3 flex-1 flex flex-col gap-1.5">
      {/* price row */}
      <div className="flex items-center gap-2">
        <div className="skel h-5 w-20 rounded-md" />
        <div className="skel h-4 w-10 rounded" />
      </div>
      {/* reference price slot */}
      <div className="skel h-3 w-32 rounded-sm" />
      {/* weapon chip */}
      <div className="mt-1 flex items-center gap-1.5">
        <div className="skel w-2.5 h-2.5 rounded-none" />
        <div className="skel h-3 w-20 rounded-sm" />
      </div>
      {/* item name */}
      <div className="skel h-4 w-3/4 rounded-md" />
      {/* condition */}
      <div className="skel h-3 w-2/3 rounded-sm" />
      {/* float row */}
      <div className="mt-auto pt-3 flex flex-col gap-1.5">
        <div className="flex justify-between">
          <div className="skel h-3 w-16 rounded-sm" />
          <div className="skel h-3 w-8 rounded-sm" />
        </div>
        <div className="skel h-1.5 w-full rounded-sm" />
      </div>
    </div>
  </div>
));

/* Need the relative for the skeleton's absolute children */
SkinCardSkeleton.displayName = 'SkinCardSkeleton';

export default SkinCard;
