import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  ExternalLink,
  Facebook,
  Link as LinkIcon,
  Mail,
  Share2,
  Star,
  UserPlus,
  UserCheck,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CachedImage } from '../ui/CachedImage';
import { SkinCard } from '../ui/SkinCard';
import { useToastStore } from '../../store/toastStore';
import { spring, tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   ItemDetailExtras — collection of small components added to the product
   detail page in one place. Each is independent and gated by its own
   data, so they can be dropped in or removed without affecting the
   rest of the page.

   Exports:
     - ItemActionsRow:    Follow seller + Compare on Steam + Share
     - RatingWidget:      1-5 star direct rating
     - SalesHistoryCard:  inline chart + latest sales list
     - TagsRow:           clickable filter chips
     - StickersRow:       horizontal slider (recommended stickers)
     - SimilarItemsRow:   horizontal slider of similar listings
   ───────────────────────────────────────────────────────────────────────── */

/* ───── ItemActionsRow ───── */
export const ItemActionsRow: React.FC<{
  item: any;
  isFollowing: boolean;
  onToggleFollow: () => void;
}> = ({ item, isFollowing, onToggleFollow }) => {
  const compareUrl = useMemo(() => {
    const hash =
      item.market_hash_name ||
      item.market_name ||
      item.name ||
      '';
    if (!hash) return null;
    return `https://steamcommunity.com/market/listings/730/${encodeURIComponent(hash)}`;
  }, [item]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.05 }}
      className="card p-2.5 flex flex-wrap items-center gap-2"
    >
      <motion.button
        whileTap={tap}
        whileHover={{ scale: 1.02 }}
        onClick={onToggleFollow}
        className={`h-10 px-4 rounded-full text-[12.5px] font-bold inline-flex items-center gap-1.5 transition-colors ${
          isFollowing
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            : 'bg-accent text-on-accent'
        }`}
      >
        {isFollowing ? (
          <>
            <UserCheck size={13} strokeWidth={2.4} />
            Following seller
          </>
        ) : (
          <>
            <UserPlus size={13} strokeWidth={2.4} />
            Follow seller
          </>
        )}
      </motion.button>

      {compareUrl && (
        <motion.a
          whileTap={tap}
          whileHover={{ scale: 1.02 }}
          href={compareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[12.5px] font-bold inline-flex items-center gap-1.5 transition-colors"
        >
          <ExternalLink size={13} strokeWidth={2.4} />
          Compare on Steam
        </motion.a>
      )}

      <SharePopover item={item} />
    </motion.div>
  );
};

/* ───── SharePopover ───── */
const SharePopover: React.FC<{ item: any }> = ({ item }) => {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const title = item.name || item.market_name || 'CS2 Item on Skinify';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      addToast({ type: 'success', title: 'Link copied' });
    } catch {
      addToast({ type: 'error', title: 'Copy failed' });
    }
    setOpen(false);
  };

  const shareNative = async () => {
    if (!('share' in navigator)) {
      addToast({ type: 'info', title: 'Native share not supported on this device.' });
      return;
    }
    try {
      await (navigator as any).share({ title, url });
    } catch {
      /* user dismissed */
    }
    setOpen(false);
  };

  const openExternal = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const twitter = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const email = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check this out on Skinify: ${url}`)}`;
  const reddit = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  return (
    <div className="relative" ref={popRef}>
      <motion.button
        whileTap={tap}
        whileHover={{ scale: 1.02 }}
        onClick={() => setOpen((v) => !v)}
        className="h-10 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[12.5px] font-bold inline-flex items-center gap-1.5 transition-colors"
        aria-expanded={open}
      >
        <Share2 size={13} strokeWidth={2.4} />
        Share
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-0 mt-2 z-30 min-w-[220px] bg-surface ring-1 ring-line shadow-xl rounded-2xl overflow-hidden"
          >
            <ShareItem Icon={LinkIcon} label="Copy link" onClick={copyLink} />
            <ShareItem Icon={Share2} label="System share…" onClick={shareNative} />
            <div className="h-px bg-line" />
            <ShareItem Icon={XIcon} label="Share on X / Twitter" onClick={() => openExternal(twitter)} />
            <ShareItem Icon={Facebook} label="Share on Facebook" onClick={() => openExternal(facebook)} />
            <ShareItem Icon={Mail} label="Share via email" onClick={() => openExternal(email)} />
            <ShareItem Icon={Share2} label="Share to Reddit" onClick={() => openExternal(reddit)} />
            <ShareItem Icon={Share2} label="Share to Telegram" onClick={() => openExternal(telegram)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ShareItem: React.FC<{
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

/* ───── SellerRatingWidget ─────
   Compact 5-star inline widget designed to live INSIDE the seller card
   on the item detail page.

   Color scale: 1★ = red (negative experience) → 5★ = green (excellent).
   Now supports HALF stars: hovering or clicking the LEFT half of a
   star registers `n - 0.5`, the right half registers the full `n`.
   So ratings can be 0.5, 1, 1.5, 2, … 5.

   Persistence: per-seller rating goes into localStorage with the key
   `skinify_seller_rating_<sellerKey>`. We also append an entry to the
   global `skinify_seller_ratings_index` so the seller's profile page
   can show their accumulated ratings. */

/* 1..5 → color. Stops are picked so the gradient feels balanced
   (red → orange → amber → lime → emerald). For half ratings we round
   UP to the nearest whole star for color/label selection — a 3.5 still
   counts as lime/Good, not amber/OK. */
const RATING_COLOR: Record<number, string> = {
  1: '#ef4444', // red-500
  2: '#f97316', // orange-500
  3: '#eab308', // yellow-500
  4: '#84cc16', // lime-500
  5: '#22c55e', // emerald-500
};

/* Labels by 0.5 increments — 10 stops so half-star ratings still feel
   informative ("Mediocre" vs "OK"). */
const RATING_LABEL: Record<string, string> = {
  '0.5': 'Terrible',
  '1': 'Awful',
  '1.5': 'Very poor',
  '2': 'Poor',
  '2.5': 'Mediocre',
  '3': 'OK',
  '3.5': 'Decent',
  '4': 'Good',
  '4.5': 'Great',
  '5': 'Excellent',
};

export const SellerRatingWidget: React.FC<{ sellerKey: string }> = ({ sellerKey }) => {
  const storageKey = `skinify_seller_rating_${sellerKey}`;
  const indexKey = 'skinify_seller_ratings_index';
  const [hover, setHover] = useState(0);
  const [value, setValue] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setValue(Number(raw) || 0);
      else setValue(0);
    } catch {
      /* private window */
    }
  }, [storageKey]);

  const set = (n: number) => {
    setValue(n);
    try {
      localStorage.setItem(storageKey, String(n));
      const raw = localStorage.getItem(indexKey);
      const arr: Array<{ sellerKey: string; rating: number; ts: number }> = raw
        ? JSON.parse(raw)
        : [];
      const without = arr.filter((e) => e.sellerKey !== sellerKey);
      without.push({ sellerKey, rating: n, ts: Date.now() });
      localStorage.setItem(indexKey, JSON.stringify(without.slice(-500)));
    } catch {
      /* ignore */
    }
  };

  const display = hover || value;
  const activeWhole = display > 0 ? Math.ceil(display) : 0;
  const activeColor = activeWhole > 0 ? RATING_COLOR[activeWhole] : null;
  const activeLabel = display > 0 ? RATING_LABEL[String(display)] : null;

  return (
    <div className="mt-3 pt-3 border-t border-line">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
          {value > 0 ? 'Your rating' : 'Rate seller'}
        </span>
        <div className="flex items-center gap-1.5">
          {activeLabel && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider tabular-nums"
              style={{ color: activeColor || undefined }}
            >
              {display.toFixed(display % 1 === 0 ? 0 : 1)} · {activeLabel}
            </span>
          )}
          <div
            className="flex items-center gap-0.5"
            onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <HalfStar
                key={n}
                index={n}
                display={display}
                color={activeColor}
                onHover={setHover}
                onPick={set}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ───── HalfStar — single star with two hit-zones (left = n - 0.5,
   right = n). The visual is one <Star> filled to the right percentage
   via a clip-path, layered over an empty <Star> background. */
const HalfStar: React.FC<{
  index: number; // 1..5
  display: number; // current effective rating (hover or value)
  color: string | null;
  onHover: (v: number) => void;
  onPick: (v: number) => void;
}> = ({ index, display, color, onHover, onPick }) => {
  /* fillPct: how much of THIS star to fill, in % (0, 50, 100). */
  const fillPct =
    display >= index ? 100 : display >= index - 0.5 ? 50 : 0;

  return (
    <span className="relative inline-block w-[14px] h-[14px] cursor-pointer">
      {/* Empty background star — always rendered, sets the outline. */}
      <Star
        size={14}
        strokeWidth={2}
        className="absolute inset-0 text-ink-dim"
      />
      {/* Filled overlay — clipped to fillPct of its width. */}
      {fillPct > 0 && (
        <span
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${fillPct}%` }}
        >
          <Star
            size={14}
            strokeWidth={2}
            style={color ? { color, fill: color } : undefined}
          />
        </span>
      )}
      {/* Hit-zones: left half = -0.5 of index, right half = full. Both
          are absolutely positioned over the star and transparent. */}
      <button
        type="button"
        aria-label={`Rate ${index - 0.5} stars · ${RATING_LABEL[String(index - 0.5)]}`}
        onMouseEnter={() => onHover(index - 0.5)}
        onClick={() => onPick(index - 0.5)}
        className="absolute top-0 bottom-0 left-0 w-1/2 z-10 transition-transform hover:scale-110"
        style={{ transformOrigin: 'center' }}
      />
      <button
        type="button"
        aria-label={`Rate ${index} stars · ${RATING_LABEL[String(index)]}`}
        onMouseEnter={() => onHover(index)}
        onClick={() => onPick(index)}
        className="absolute top-0 bottom-0 right-0 w-1/2 z-10 transition-transform hover:scale-110"
        style={{ transformOrigin: 'center' }}
      />
    </span>
  );
};

/* ───── RatingWidget — legacy, kept for backwards compat ───── */
export const RatingWidget: React.FC<{ itemId: string }> = ({ itemId }) => {
  const storageKey = `skinify_rating_${itemId}`;
  const [hover, setHover] = useState(0);
  const [value, setValue] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setValue(Number(raw) || 0);
    } catch {
      /* private window */
    }
  }, [storageKey]);

  const set = (n: number) => {
    setValue(n);
    try {
      localStorage.setItem(storageKey, String(n));
    } catch {
      /* ignore */
    }
  };

  const display = hover || value;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="card p-4 sm:p-5 flex items-center justify-between gap-4"
    >
      <div>
        <div className="label-eyebrow">Your rating</div>
        <div className="text-[13.5px] font-bold text-ink mt-1">
          {value > 0 ? `You rated this ${value}/5` : 'Rate this listing'}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => set(n)}
            className="p-1 transition-transform hover:scale-110"
            aria-label={`Rate ${n} stars`}
          >
            <Star
              size={20}
              strokeWidth={2}
              className={
                n <= display
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-ink-dim'
              }
            />
          </button>
        ))}
      </div>
    </motion.section>
  );
};

/* ───── SalesHistoryCard ─────
   Inline SVG sparkline. We derive a deterministic 30-point series from
   the item id + current price so the chart is stable across reloads
   even without a backend. Real backend later swaps the `points` prop. */
export const SalesHistoryCard: React.FC<{
  currentPrice: number;
  itemId: string;
  formatPrice: (n: number) => string;
}> = ({ currentPrice, itemId, formatPrice }) => {
  const points = useMemo(
    () => buildSeries(itemId, currentPrice),
    [itemId, currentPrice],
  );
  const min = Math.min(...points.map((p) => p.price));
  const max = Math.max(...points.map((p) => p.price));
  const span = Math.max(1, max - min);

  const W = 600;
  const H = 140;
  const stepX = W / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = H - ((p.price - min) / span) * (H - 20) - 10;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const areaPath = `${path} L${W},${H} L0,${H} Z`;

  const latest = points.slice(-5).reverse();

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="card p-5 sm:p-6"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="label-eyebrow">Sales history</span>
          <h3 className="text-[16px] font-bold text-ink tracking-tight mt-1">
            Last 30 sales
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
            30d avg
          </div>
          <div className="text-[15px] font-bold tabular-nums text-ink leading-none mt-1">
            {formatPrice(
              points.reduce((s, p) => s + p.price, 0) / points.length,
            )}
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-[140px] block"
        >
          <defs>
            <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#salesArea)" />
          <path
            d={path}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Last-point dot */}
          {(() => {
            const last = points[points.length - 1];
            const x = (points.length - 1) * stepX;
            const y = H - ((last.price - min) / span) * (H - 20) - 10;
            return (
              <circle
                cx={x}
                cy={y}
                r={3.5}
                fill="rgb(var(--accent))"
                stroke="rgb(var(--surface))"
                strokeWidth={1.8}
              />
            );
          })()}
        </svg>
      </div>

      <ul className="mt-4 divide-y divide-line">
        {latest.map((p) => (
          <li
            key={p.ts}
            className="flex items-center justify-between py-2 text-[12.5px] font-medium"
          >
            <span className="text-ink-muted">
              {new Date(p.ts).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="text-ink font-bold tabular-nums">
              {formatPrice(p.price)}
            </span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function buildSeries(id: string, currentPrice: number) {
  const n = 30;
  const seed = hash(id || 'x') || 1;
  const out: { ts: number; price: number }[] = [];
  const now = Date.now();
  let prng = seed;
  for (let i = 0; i < n; i++) {
    prng = (prng * 1664525 + 1013904223) & 0xffffffff;
    const swing = (((prng >>> 0) % 1000) / 1000 - 0.5) * 0.12;
    const trendBias = (i / n - 0.5) * 0.18;
    const factor = 1 + trendBias + swing;
    out.push({
      ts: now - (n - i) * 24 * 60 * 60 * 1000,
      price: Math.max(1, currentPrice * factor),
    });
  }
  // Anchor the last point to the current price so the chart matches.
  out[out.length - 1].price = currentPrice;
  return out;
}

/* ───── TagsRow ─────
   Clickable filter chips. Each chip carries a target URL — usually
   /marketplace?<param>=<value> — and navigates the user there. */
export interface TagDef {
  label: string;
  to: string;
  /** Optional accent: 'rarity' renders in the supplied color. */
  color?: string;
}

export const TagsRow: React.FC<{
  tags: TagDef[];
}> = ({ tags }) => {
  const navigate = useNavigate();
  if (tags.length === 0) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="card p-4 sm:p-5"
    >
      <span className="label-eyebrow">Tags</span>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <button
            key={`${t.label}-${t.to}`}
            onClick={() => navigate(t.to)}
            className="px-2.5 h-7 rounded-full bg-subtle hover:bg-accent-soft text-[12px] font-semibold transition-colors"
            style={t.color ? { color: t.color } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>
    </motion.section>
  );
};

/* ───── StickersRow — recommended stickers slider ───── */
export const StickersRow: React.FC<{
  stickers: Array<{ name: string; image?: string; price?: number }>;
  formatPrice: (n: number) => string;
}> = ({ stickers, formatPrice }) => {
  if (stickers.length === 0) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="label-eyebrow">Recommended</span>
          <h3 className="text-[16px] font-bold text-ink tracking-tight mt-1">
            Stickers that pair well
          </h3>
        </div>
      </div>
      <HorizontalSlider>
        {stickers.map((s, i) => (
          <div
            key={`${s.name}-${i}`}
            className="snap-start shrink-0 w-28 card-flat p-3 text-center"
          >
            <div className="aspect-square bg-subtle grid place-items-center rounded-xl overflow-hidden mb-2">
              {s.image ? (
                <img src={s.image} alt={s.name} className="w-[80%] h-[80%] object-contain" />
              ) : (
                <span className="text-[11px] font-bold text-ink-muted">
                  {s.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-[11.5px] font-bold text-ink truncate leading-tight">
              {s.name}
            </div>
            {s.price != null && (
              <div className="text-[10.5px] text-ink-muted tabular-nums mt-0.5">
                {formatPrice(s.price)}
              </div>
            )}
          </div>
        ))}
      </HorizontalSlider>
    </motion.section>
  );
};

/* ───── SimilarItemsRow ─────
   Card slider, separate from the existing SimilarOffersTable so users
   can scroll big visual previews without the row layout below being
   replaced. */
export const SimilarItemsRow: React.FC<{
  items: any[];
  onView: (id: string) => void;
  onAddCart?: (item: any) => void;
  onToggleWish?: (item: any) => void;
  isWished?: (item: any) => boolean;
  formatPrice: (n: number) => string;
}> = ({ items, onView, onAddCart, onToggleWish, isWished, formatPrice }) => {
  if (items.length === 0) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="label-eyebrow">More like this</span>
          <h3 className="text-[16px] font-bold text-ink tracking-tight mt-1">
            Similar items
          </h3>
        </div>
      </div>
      <HorizontalSlider>
        {items.slice(0, 12).map((it) => (
          <div
            key={it.id}
            className="snap-start shrink-0 w-56"
          >
            <SkinCard
              variant="tile"
              item={it}
              onView={() => onView(String(it.id))}
              onAddCart={onAddCart ? () => onAddCart(it) : undefined}
              onToggleWish={onToggleWish ? () => onToggleWish(it) : undefined}
              wished={isWished ? isWished(it) : false}
              formatPrice={formatPrice}
            />
          </div>
        ))}
      </HorizontalSlider>
    </motion.section>
  );
};

/* RecommendedItemsRow — same shape as SimilarItemsRow but a different
   header. Lets callers explicitly distinguish "things you may also
   like" from "more of this category". */
export const RecommendedItemsRow: React.FC<{
  items: any[];
  onView: (id: string) => void;
  onAddCart?: (item: any) => void;
  onToggleWish?: (item: any) => void;
  isWished?: (item: any) => boolean;
  formatPrice: (n: number) => string;
}> = ({ items, onView, onAddCart, onToggleWish, isWished, formatPrice }) => {
  if (items.length === 0) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="label-eyebrow">Recommended</span>
          <h3 className="text-[16px] font-bold text-ink tracking-tight mt-1">
            Picked for you
          </h3>
        </div>
      </div>
      <HorizontalSlider>
        {items.slice(0, 12).map((it) => (
          <div
            key={it.id}
            className="snap-start shrink-0 w-56"
          >
            <SkinCard
              variant="tile"
              item={it}
              onView={() => onView(String(it.id))}
              onAddCart={onAddCart ? () => onAddCart(it) : undefined}
              onToggleWish={onToggleWish ? () => onToggleWish(it) : undefined}
              wished={isWished ? isWished(it) : false}
              formatPrice={formatPrice}
            />
          </div>
        ))}
      </HorizontalSlider>
    </motion.section>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   HorizontalSlider — overflow-x scroll with snap + arrow buttons.
   Used by Stickers and SimilarItems rows.
   ───────────────────────────────────────────────────────────────────────── */
const HorizontalSlider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dir: -1 | 1) => {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: dir * Math.round(node.clientWidth * 0.8), behavior: 'smooth' });
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Scroll left"
        className="hidden md:grid absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-surface ring-1 ring-line shadow place-items-center text-ink hover:bg-subtle transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={2.6} />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Scroll right"
        className="hidden md:grid absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-surface ring-1 ring-line shadow place-items-center text-ink hover:bg-subtle transition-colors"
      >
        <ChevronRight size={14} strokeWidth={2.6} />
      </button>
      <div
        ref={ref}
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-thin pb-1"
      >
        {children}
      </div>
    </div>
  );
};

/* ───── Helpers ───── */
export function buildItemTags(item: any): TagDef[] {
  const tags: TagDef[] = [];
  const isSouvenir = item.special === 'souvenir';
  const isStatTrak = item.special === 'stattrak';
  tags.push({
    label: isSouvenir ? 'Souvenir' : isStatTrak ? 'StatTrak™' : 'Normal',
    to: isSouvenir
      ? '/marketplace?q=Souvenir'
      : isStatTrak
      ? '/marketplace?q=StatTrak'
      : '/marketplace',
  });
  if (item.type) {
    tags.push({
      label: item.type,
      to: `/marketplace?type=${encodeURIComponent(item.type)}`,
    });
  }
  if (item.collection) {
    tags.push({
      label: item.collection,
      to: `/marketplace?collection=${encodeURIComponent(item.collection)}`,
    });
  }
  if (item.condition) {
    tags.push({
      label: item.condition,
      to: `/marketplace?wear=${encodeURIComponent(item.condition)}`,
    });
  }
  if (item.rarity) {
    tags.push({
      label: item.rarity,
      to: `/marketplace?rarity=${encodeURIComponent(item.rarity)}`,
    });
  }
  if (Array.isArray(item.stickers)) {
    item.stickers.slice(0, 4).forEach((s: any) => {
      const name = typeof s === 'string' ? s : s.name;
      if (name) {
        tags.push({
          label: name,
          to: `/marketplace?q=${encodeURIComponent(name)}`,
        });
      }
    });
  }
  // Weapon class — pull "AWP" out of "AWP | Dragon Lore"
  const weapon = (item.name || item.market_name || '').split('|')[0]?.trim();
  if (weapon) {
    tags.push({
      label: weapon.replace(/^★\s*/, '').replace(/^StatTrak™\s*/, ''),
      to: `/marketplace?q=${encodeURIComponent(weapon)}`,
    });
  }
  return tags;
}
