import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShoppingCart } from 'lucide-react';
import { useRecentActivity, RecentActivity } from '../hooks/useRecentActivity';
import { useCurrencyStore } from '../store/currencyStore';
import { CachedImage } from './ui/CachedImage';
import { rarityColor } from './ui/SkinCard';

const RARITY_BY_KEYWORD: Array<[RegExp, string]> = [
  [/dragon lore|howl|fire serpent|fade.*karambit|karambit.*fade|butterfly|m9 bayonet/i, 'Covert'],
  [/awp|ak-47|m4a4|m4a1|deagle|desert eagle/i, 'Classified'],
  [/usp-s|glock|p250|tec-9/i, 'Restricted'],
];
const inferRarity = (name: string): string => {
  for (const [re, r] of RARITY_BY_KEYWORD) if (re.test(name)) return r;
  return 'Mil-Spec';
};

const relativeTime = (iso: string): string => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'just now';
  const diff = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

interface Props {
  className?: string;
  /** How many rows to keep visible. Default 5. */
  rows?: number;
  /** Push a new row every N ms. Default 3200. */
  intervalMs?: number;
}

/**
 * Live market activity feed.
 *
 * Behavior: holds a fixed-length window of `rows` items. Every `intervalMs`,
 * we pull the next activity from the pool, splice it onto the *top*, and let
 * Framer Motion's layout animation push the rest down. The bottom row drops
 * off via exit animation. Result: one row at a time, smooth top-down push.
 *
 * The underlying `useRecentActivity` hook subscribes to a Supabase realtime
 * channel on completed orders — when new orders land, the pool refreshes and
 * the visible feed naturally picks them up.
 */
export const LiveActivityFeed: React.FC<Props> = ({
  className = '',
  rows = 5,
  intervalMs = 3200,
}) => {
  const { activities: pool, loading } = useRecentActivity(60);
  const { formatPrice } = useCurrencyStore();

  const [visible, setVisible] = useState<RecentActivity[]>([]);
  const cursorRef = useRef(0);
  const lastSigRef = useRef('');

  // Seed / re-seed visible window when pool size or signature changes
  useEffect(() => {
    if (!pool?.length) {
      setVisible([]);
      return;
    }
    const sig = pool
      .slice(0, rows)
      .map((a) => a.id)
      .join('|');
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      setVisible(pool.slice(0, rows));
      cursorRef.current = rows % pool.length;
    }
  }, [pool, rows]);

  // Push one new row every interval — wrap-cycle through the pool, but tag
  // each entry with a per-tick suffix so AnimatePresence treats wrap-arounds
  // as distinct.
  useEffect(() => {
    if (!pool?.length || pool.length <= rows) return;
    const id = setInterval(() => {
      const next = pool[cursorRef.current % pool.length];
      cursorRef.current = (cursorRef.current + 1) % pool.length;
      setVisible((cur) => {
        const tagged: RecentActivity = {
          ...next,
          // unique key per push so the same db row reappearing later still animates
          id: `${next.id}#${Date.now()}`,
        };
        const out = [tagged, ...cur];
        return out.slice(0, rows);
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [pool, rows, intervalMs]);

  // 30s tick so relative timestamps stay fresh on visible rows
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((v) => v + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const renderedRows = useMemo(() => visible, [visible]);

  return (
    <section className={`glass rounded-3xl2 p-5 md:p-6 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-2xl bg-white/[0.05] grid place-items-center">
            <Activity size={15} className="text-accent-400" strokeWidth={2.5} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
          </div>
          <div>
            <div className="text-[14.5px] font-semibold text-white tracking-tight">
              Live market activity
            </div>
            <div className="text-[11.5px] text-zinc-500">
              Recent purchases from across the marketplace
            </div>
          </div>
        </div>
        <span className="hidden sm:inline-flex h-7 px-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold tracking-wide items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="relative">
        {loading || visible.length === 0 ? (
          <div className="space-y-1.5">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl skeleton" />
            ))}
          </div>
        ) : (
          <ul className="relative space-y-1.5">
            <AnimatePresence initial={false}>
              {renderedRows.map((a, idx) => {
                const rarity = inferRarity(a.item_name);
                const color = rarityColor(rarity);
                const isNew = idx === 0;
                return (
                  <motion.li
                    key={a.id}
                    layout="position"
                    initial={{ opacity: 0, y: -28, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.96, height: 0, marginTop: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 320,
                      damping: 32,
                      mass: 0.7,
                      opacity: { duration: 0.22 },
                    }}
                    className={`relative flex items-center gap-3 h-14 px-3 rounded-2xl overflow-hidden border ${
                      isNew
                        ? 'bg-accent-500/[0.08] border-accent-500/30'
                        : 'bg-white/[0.03] border-white/[0.05]'
                    }`}
                  >
                    {/* rarity strip */}
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                      style={{ background: color }}
                    />

                    {/* NEW pulse highlight — fades out after ~1.4s */}
                    {isNew && (
                      <motion.div
                        initial={{ opacity: 0.45 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(90deg, rgba(139,73,242,0.18), transparent 60%)',
                        }}
                      />
                    )}

                    {/* thumb */}
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-white/[0.04] grid place-items-center overflow-hidden relative">
                      {a.item_image ? (
                        <CachedImage
                          src={a.item_image}
                          alt={a.item_name}
                          className="w-[88%] h-[88%] object-contain"
                        />
                      ) : (
                        <ShoppingCart size={14} className="text-zinc-500" />
                      )}
                    </div>

                    {/* text */}
                    <div className="flex-1 min-w-0 relative">
                      <div className="text-[12.5px] text-zinc-300 truncate">
                        <span className="text-white font-semibold">{a.buyer_name}</span>{' '}
                        <span className="text-zinc-500">bought</span>{' '}
                        <span className="text-white font-medium">{a.item_name}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                        {relativeTime(a.created_at)}
                        {isNew && (
                          <span className="text-accent-400 font-semibold tracking-wide uppercase text-[9.5px]">
                            · new
                          </span>
                        )}
                      </div>
                    </div>

                    {/* price */}
                    <div className="text-right shrink-0 relative">
                      <div className="text-[14px] font-display font-bold text-white tracking-tight tabular-nums">
                        {formatPrice(a.price)}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        {/* bottom fade to suggest "more below" */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-ink-900/40 to-transparent rounded-b-2xl" />
      </div>
    </section>
  );
};

export default LiveActivityFeed;
