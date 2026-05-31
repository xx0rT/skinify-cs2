import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShoppingBag, ArrowUpRight, TrendingUp, Users } from 'lucide-react';
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
 * Market activity feed — push-from-top, oldest slides off the bottom.
 * Layout has a header with running counters (active buyers, last hour,
 * 24h volume) and a clean activity list. No "LIVE" badge or pulse-dot
 * theatrics; the motion itself reads as live.
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

  // Derived stats from the pool
  const stats = useMemo(() => {
    const now = Date.now();
    const lastHour = (pool || []).filter(
      (a) => now - new Date(a.created_at).getTime() < 60 * 60 * 1000,
    );
    const last24h = (pool || []).filter(
      (a) => now - new Date(a.created_at).getTime() < 24 * 60 * 60 * 1000,
    );
    const uniqueBuyers = new Set(last24h.map((a) => a.buyer_name)).size;
    const volume24h = last24h.reduce((s, a) => s + Number(a.price || 0), 0);
    return {
      lastHourCount: lastHour.length,
      uniqueBuyers,
      volume24h,
    };
  }, [pool]);

  return (
    <section className={`card p-5 md:p-6 relative overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="icon-chip bg-accent-soft shrink-0">
            <Activity size={16} strokeWidth={2.4} className="text-accent" />
          </div>
          <div className="min-w-0">
            <span className="label-eyebrow">Market activity</span>
            <h3 className="text-[16px] sm:text-[17px] font-bold text-ink tracking-tight mt-1 leading-none">
              What's trading right now
            </h3>
          </div>
        </div>

        {/* Mini stat row */}
        <div className="flex items-stretch gap-2 sm:gap-3">
          {[
            { Icon: TrendingUp, label: 'Last hour', value: stats.lastHourCount.toLocaleString() },
            { Icon: Users,      label: 'Buyers (24h)', value: stats.uniqueBuyers.toLocaleString() },
            { Icon: ShoppingBag, label: 'Volume (24h)', value: formatPrice(stats.volume24h) },
          ].map((s) => (
            <div
              key={s.label}
              className="card-flat px-3 py-2 flex items-center gap-2.5 min-w-[110px]"
            >
              <div className="icon-chip-sm bg-accent-soft shrink-0">
                <s.Icon size={12} strokeWidth={2.4} className="text-accent" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-dim truncate">
                  {s.label}
                </div>
                <div className="text-[13.5px] font-bold tabular-nums text-ink leading-none mt-0.5 truncate">
                  {s.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/*
        Fixed-height container — locks the parent so when the oldest row
        exits, the surrounding page DOES NOT REFLOW.
      */}
      <div
        className="relative"
        style={{ minHeight: rows * 64 + (rows - 1) * 8 }}
      >
        {loading || visible.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="skel h-16" />
            ))}
          </div>
        ) : (
          <ul className="relative space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((a, idx) => {
                const rarity = inferRarity(a.item_name);
                const color = rarityColor(rarity);
                const isNew = idx === 0;
                const buyerInitial = (a.buyer_name || '?').charAt(0).toUpperCase();
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
                    className={`relative flex items-center gap-3 h-16 px-3 sm:px-4 rounded-2xl overflow-hidden card-flat ${
                      isNew ? 'ring-1 ring-accent/40' : ''
                    }`}
                  >
                    {/* rarity color bar */}
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                      style={{ background: color }}
                      aria-hidden
                    />

                    {isNew && (
                      <motion.div
                        initial={{ opacity: 0.55 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(90deg, rgb(var(--accent) / 0.18), transparent 55%)',
                        }}
                      />
                    )}

                    {/* Item image with rarity halo — only renders when an image exists */}
                    {a.item_image && (
                      <div className="relative w-12 h-12 rounded-xl bg-subtle/60 grid place-items-center overflow-hidden shrink-0">
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `radial-gradient(circle at 50% 50%, ${color || 'rgb(var(--accent))'}28, transparent 65%)`,
                          }}
                        />
                        <CachedImage
                          src={a.item_image}
                          alt={a.item_name}
                          className="relative w-[85%] h-[85%] object-contain"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 relative">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Buyer avatar */}
                        <div className="w-5 h-5 rounded-full bg-accent-soft grid place-items-center text-[9.5px] font-bold text-accent shrink-0">
                          {buyerInitial}
                        </div>
                        <div className="text-[13px] text-ink-muted truncate font-medium">
                          <span className="text-ink font-bold">{a.buyer_name}</span>{' '}
                          bought{' '}
                          <span className="text-ink font-semibold">{a.item_name}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-ink-dim mt-1 font-medium tabular-nums">
                        {relativeTime(a.created_at)}
                      </div>
                    </div>

                    <div className="text-right shrink-0 relative flex items-center gap-2">
                      <div className="text-[15px] font-bold text-ink tracking-tight tabular-nums leading-none">
                        {formatPrice(a.price)}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-subtle hidden sm:grid place-items-center">
                        <ArrowUpRight size={12} strokeWidth={2.4} className="text-ink-muted" />
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
