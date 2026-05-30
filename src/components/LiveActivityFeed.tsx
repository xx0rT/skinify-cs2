import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShoppingBag } from 'lucide-react';
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
  rows?: number;
  intervalMs?: number;
}

/**
 * Live activity feed — push-from-top, oldest slides off the bottom.
 * Theme-adaptive: uses .card + .icon-chip + ink hierarchy. The "new row"
 * accent wash uses the active --accent (matches whichever palette is set).
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

  useEffect(() => {
    if (!pool?.length) {
      setVisible([]);
      return;
    }
    const sig = pool.slice(0, rows).map((a) => a.id).join('|');
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      setVisible(pool.slice(0, rows));
      cursorRef.current = rows % pool.length;
    }
  }, [pool, rows]);

  useEffect(() => {
    if (!pool?.length || pool.length <= rows) return;
    const id = setInterval(() => {
      const next = pool[cursorRef.current % pool.length];
      cursorRef.current = (cursorRef.current + 1) % pool.length;
      setVisible((cur) => {
        const tagged: RecentActivity = { ...next, id: `${next.id}#${Date.now()}` };
        return [tagged, ...cur].slice(0, rows);
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [pool, rows, intervalMs]);

  // re-render every 30s so relative timestamps stay fresh
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((v) => v + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const renderedRows = useMemo(() => visible, [visible]);

  return (
    <section className={`card p-5 md:p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="icon-chip relative" style={{ background: 'rgb(var(--accent-soft))' }}>
            <Activity size={16} strokeWidth={2.4} className="text-accent" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <div className="text-[14.5px] font-bold text-ink tracking-tight">
              Live market activity
            </div>
            <div className="text-[12px] text-ink-muted font-medium">
              Recent purchases from across the marketplace
            </div>
          </div>
        </div>
        <span className="pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          <span className="chip-dot bg-emerald-500 animate-pulse" />
          LIVE
        </span>
      </div>

      {/*
        Fixed-height container — locks the parent to (rows × 56px row + 6px gap × (rows-1))
        so when the oldest row exits, the surrounding page DOES NOT REFLOW.
        Previous bug: `exit={{ height: 0 }}` collapsed the row, the <ul> shrank,
        and any content below jumped up while the user was reading. Now the
        container reserves the space and rows can leave the bottom freely.
      */}
      <div
        className="relative"
        style={{ minHeight: rows * 56 + (rows - 1) * 6 }}
      >
        {loading || visible.length === 0 ? (
          <div className="space-y-1.5">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="skel h-14" />
            ))}
          </div>
        ) : (
          <ul className="relative space-y-1.5">
            <AnimatePresence initial={false} mode="popLayout">
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
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                    transition={{
                      type: 'spring',
                      stiffness: 320,
                      damping: 34,
                      mass: 0.7,
                      opacity: { duration: 0.22 },
                    }}
                    className={`relative flex items-center gap-3 h-14 px-3 rounded-2xl overflow-hidden ${
                      isNew ? 'bg-accent-soft' : 'bg-subtle/60'
                    }`}
                  >
                    {/* rarity strip */}
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                      style={{ background: color }}
                      aria-hidden
                    />

                    {isNew && (
                      <motion.div
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(90deg, rgb(var(--accent) / 0.16), transparent 60%)',
                        }}
                      />
                    )}

                    <div className="icon-chip-sm bg-surface relative overflow-hidden">
                      {a.item_image ? (
                        <CachedImage
                          src={a.item_image}
                          alt={a.item_name}
                          className="w-[88%] h-[88%] object-contain"
                        />
                      ) : (
                        <ShoppingBag size={13} className="text-ink-dim" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 relative">
                      <div className="text-[12.5px] text-ink-muted truncate font-medium">
                        <span className="text-ink font-bold">{a.buyer_name}</span>{' '}
                        bought{' '}
                        <span className="text-ink font-semibold">{a.item_name}</span>
                      </div>
                      <div className="text-[11px] text-ink-dim mt-0.5 flex items-center gap-1.5 font-medium">
                        {relativeTime(a.created_at)}
                        {isNew && (
                          <span className="text-accent font-bold tracking-wider uppercase text-[9.5px]">
                            · new
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 relative">
                      <div className="text-[14px] font-bold text-ink tracking-tight tabular-nums">
                        {formatPrice(a.price)}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
};

export default LiveActivityFeed;
