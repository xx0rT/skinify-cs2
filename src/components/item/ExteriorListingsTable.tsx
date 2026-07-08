import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Check } from 'lucide-react';
import { CachedImage } from '../ui/CachedImage';
import { tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   ExteriorListingsTable — the "buy by exterior" table on the item detail
   page (CSFloat-style). Given the whole marketplace listing set and the
   current item, it:
     - finds every listing of the SAME base skin (weapon | skin, ignoring
       the "(Exterior)" suffix and StatTrak/Souvenir prefixes),
     - groups them by exterior with a "starts from" price per exterior tab,
     - lists the individual listings for the selected exterior as rows
       (float bar + value, stickers, price, Buy).
   ───────────────────────────────────────────────────────────────────────── */

const EXTERIOR_ORDER = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
const EXTERIOR_ABBR: Record<string, string> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
};

/* "StatTrak™ AK-47 | Redline (Field-Tested)" → "AK-47 | Redline" */
function baseSkinKey(raw: string): string {
  return (raw || '')
    .replace(/^★\s*/, '')
    .replace(/^StatTrak™\s*/i, '')
    .replace(/^Souvenir\s*/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLowerCase();
}

function itemName(it: any): string {
  return it.name || it.market_name || '';
}
function itemCondition(it: any): string {
  return it.condition || '';
}
function itemFloat(it: any): number | null {
  const f = it.float ?? it.float_value;
  return f != null && Number.isFinite(Number(f)) ? Number(f) : null;
}

const ExteriorListingsTable: React.FC<{
  item: any;
  allItems: any[];
  formatPrice: (n: number) => string;
  onBuy: (it: any) => void;
  onView?: (it: any) => void;
}> = ({ item, allItems, formatPrice, onBuy, onView }) => {
  const baseKey = baseSkinKey(itemName(item));

  /* All listings of the same base skin. */
  const family = useMemo(
    () => (allItems || []).filter((it) => baseSkinKey(itemName(it)) === baseKey),
    [allItems, baseKey],
  );

  /* Group by exterior → { count, minPrice, listings[] }. */
  const byExterior = useMemo(() => {
    const map = new Map<string, { count: number; min: number; listings: any[] }>();
    for (const it of family) {
      const ext = itemCondition(it) || 'Unknown';
      const entry = map.get(ext) || { count: 0, min: Infinity, listings: [] };
      entry.count += 1;
      entry.min = Math.min(entry.min, Number(it.price) || Infinity);
      entry.listings.push(it);
      map.set(ext, entry);
    }
    // Sort listings within each exterior by price asc.
    for (const e of map.values()) e.listings.sort((a, b) => (a.price || 0) - (b.price || 0));
    return map;
  }, [family]);

  const exteriors = useMemo(
    () =>
      EXTERIOR_ORDER.filter((e) => byExterior.has(e)).concat(
        [...byExterior.keys()].filter((e) => !EXTERIOR_ORDER.includes(e)),
      ),
    [byExterior],
  );

  const [active, setActive] = useState<string>(
    () => itemCondition(item) || exteriors[0] || '',
  );

  // Nothing useful to show if only the current listing exists.
  if (family.length <= 1) return null;

  const activeEntry = byExterior.get(active);

  return (
    <section className="panel p-0 overflow-hidden">
      <div className="p-4 pb-3">
        <span className="label-eyebrow">Buy by exterior</span>
        <p className="text-[12px] text-ink-muted font-medium mt-1">
          Every listing of this skin, grouped by wear. Prices are the cheapest available.
        </p>
      </div>

      {/* Exterior tabs — each shows "starts from" price */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {exteriors.map((ext) => {
          const entry = byExterior.get(ext)!;
          const isActive = ext === active;
          const has = entry.min !== Infinity;
          return (
            <button
              key={ext}
              onClick={() => setActive(ext)}
              className={`shrink-0 rounded-2xl px-3.5 py-2 text-left transition-colors ${
                isActive
                  ? 'bg-accent text-on-accent'
                  : 'bg-subtle text-ink hover:bg-subtle/70'
              }`}
            >
              <div
                className={`text-[11px] font-bold uppercase tracking-wide ${
                  isActive ? 'text-on-accent/80' : 'text-ink-muted'
                }`}
              >
                {EXTERIOR_ABBR[ext] || ext}
              </div>
              <div className="text-[13.5px] font-bold tabular-nums mt-0.5 whitespace-nowrap">
                {has ? formatPrice(entry.min) : '—'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Listings for the selected exterior */}
      <div className="border-t border-line divide-y divide-line max-h-[380px] overflow-y-auto">
        {(activeEntry?.listings || []).map((it) => {
          const f = itemFloat(it);
          const fPct = f != null ? Math.max(0, Math.min(1, f)) * 100 : null;
          const stickers = Array.isArray(it.stickers) ? it.stickers : [];
          const isCurrent = String(it.id) === String(item.id);
          return (
            <div
              key={it.id}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                isCurrent ? 'bg-accent/[0.06]' : 'hover:bg-subtle/40'
              }`}
            >
              <button
                onClick={() => onView?.(it)}
                className="w-12 h-12 rounded-xl bg-subtle grid place-items-center overflow-hidden shrink-0"
                aria-label="View listing"
              >
                <CachedImage src={it.image} alt={itemName(it)} className="w-[86%] h-[86%] object-contain" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-ink tabular-nums">
                    {f != null ? f.toFixed(4) : '—'}
                  </span>
                  {stickers.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {stickers.slice(0, 4).map((s: any, i: number) => {
                        const url = typeof s === 'string' ? undefined : s.image;
                        return url ? (
                          <img key={i} src={url} alt="" className="w-4 h-4 object-contain" />
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                {/* Float bar */}
                <div className="relative w-full h-1.5 rounded-full overflow-hidden mt-1.5 bg-subtle">
                  <div
                    className="absolute inset-0 opacity-90"
                    style={{
                      background:
                        'linear-gradient(90deg,#22c55e 0%,#84cc16 25%,#eab308 50%,#f97316 75%,#ef4444 100%)',
                      opacity: fPct != null ? 1 : 0.2,
                    }}
                    aria-hidden
                  />
                  {fPct != null && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-white shadow"
                      style={{ left: `calc(${fPct}% - 1px)` }}
                      aria-hidden
                    />
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[14px] font-bold text-ink tabular-nums leading-none">
                  {formatPrice(it.price)}
                </div>
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-accent mt-1.5">
                    <Check size={11} strokeWidth={2.6} /> Viewing
                  </span>
                ) : (
                  <motion.button
                    whileTap={tap}
                    onClick={() => onBuy(it)}
                    className="mt-1.5 h-8 px-3 rounded-full bg-accent text-on-accent text-[11.5px] font-bold inline-flex items-center gap-1.5"
                  >
                    <ShoppingBag size={11} strokeWidth={2.4} />
                    Buy
                  </motion.button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ExteriorListingsTable;
