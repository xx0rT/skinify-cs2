import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Shield,
  MessageSquare,
  Search,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../../store/authStore';
import { spring, tap } from '../../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   ReviewsTab
   - Hero summary: average rating + total count + star-distribution bars
   - Filter pills: All / 5★ / 4★ / 3★ / 2★ / 1★
   - Search by comment / reviewer name
   - Review cards: avatar, name, verified badge, stars, comment, relative date
   ───────────────────────────────────────────────────────────────────────── */

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
  reviewer: {
    display_name: string;
    avatar_url: string;
  } | null;
}

type StarFilter = 0 | 5 | 4 | 3 | 2 | 1;

const ReviewsTab: React.FC = () => {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StarFilter>(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.steamId) return;
      setLoading(true);
      try {
        const { data: u } = await supabase
          .from('users')
          .select('id')
          .eq('steam_id', user.steamId)
          .maybeSingle();
        if (!u || cancelled) {
          setReviews([]);
          return;
        }
        const { data } = await supabase
          .from('user_reviews')
          .select(`
            id, reviewer_id, rating, comment, is_verified_purchase, created_at,
            reviewer:users!user_reviews_reviewer_id_fkey(display_name, avatar_url)
          `)
          .eq('reviewed_user_id', u.id)
          .order('created_at', { ascending: false });
        if (!cancelled) setReviews((data as any) || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.steamId]);

  const stats = useMemo(() => {
    const n = reviews.length;
    const avg = n ? reviews.reduce((s, r) => s + r.rating, 0) / n : 0;
    const dist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
      pct: n ? (reviews.filter((r) => r.rating === star).length / n) * 100 : 0,
    }));
    return { n, avg, dist };
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((r) => {
      if (filter !== 0 && r.rating !== filter) return false;
      if (!q) return true;
      return (
        String(r.comment || '').toLowerCase().includes(q) ||
        String(r.reviewer?.display_name || '').toLowerCase().includes(q)
      );
    });
  }, [reviews, filter, query]);

  return (
    <div className="space-y-4">
      {/* Hero summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="card p-6 sm:p-7 relative overflow-hidden"
      >
        <motion.div
          aria-hidden
          className="absolute -top-24 -right-16 w-[320px] h-[320px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(closest-side, rgb(var(--accent) / 0.16), transparent 65%)',
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative grid md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center">
          <div className="text-center md:text-left">
            <span className="label-eyebrow">Average rating</span>
            <div className="flex items-end gap-2 mt-1.5 justify-center md:justify-start">
              <div className="text-[44px] sm:text-[52px] font-bold tracking-tight leading-none tabular-nums text-ink">
                {stats.n ? stats.avg.toFixed(1) : '—'}
              </div>
              <div className="text-[13px] text-ink-muted font-medium mb-1.5">/ 5</div>
            </div>
            <div className="mt-2 flex items-center gap-0.5 justify-center md:justify-start">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={16}
                  className={
                    s <= Math.round(stats.avg)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-ink-dim'
                  }
                />
              ))}
            </div>
            <div className="text-[12px] text-ink-muted font-medium mt-2">
              From {stats.n} review{stats.n === 1 ? '' : 's'}
            </div>
          </div>

          {/* Distribution bars */}
          <div className="space-y-1.5 min-w-0">
            {stats.dist.map((d) => (
              <div key={d.star} className="flex items-center gap-2.5">
                <div className="flex items-center gap-1 w-9 shrink-0">
                  <span className="text-[12px] font-bold text-ink tabular-nums">
                    {d.star}
                  </span>
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1 h-2 rounded-full bg-subtle overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${d.pct}%` }}
                    transition={{ ...spring, mass: 0.6 }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
                <div className="w-9 shrink-0 text-right text-[11.5px] text-ink-muted font-semibold tabular-nums">
                  {d.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Toolbar: star filter + search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.05 }}
        className="card p-2 flex items-center gap-2 flex-wrap"
      >
        <div className="flex items-center gap-1 px-1">
          {([
            { id: 0 as StarFilter, label: 'All' },
            { id: 5 as StarFilter, label: '5★' },
            { id: 4 as StarFilter, label: '4★' },
            { id: 3 as StarFilter, label: '3★' },
            { id: 2 as StarFilter, label: '2★' },
            { id: 1 as StarFilter, label: '1★' },
          ]).map((f) => {
            const active = filter === f.id;
            return (
              <motion.button
                whileTap={tap}
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`relative h-9 px-3 rounded-full text-[12.5px] font-semibold transition-colors ${
                  active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="reviews-filter-pill"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={spring}
                  />
                )}
                <span className="relative">{f.label}</span>
              </motion.button>
            );
          })}
        </div>
        <div className="flex-1 min-w-[160px] flex items-center gap-2 h-9 px-3 rounded-full bg-subtle">
          <Search size={14} strokeWidth={2} className="text-ink-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reviews…"
            className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[12.5px] font-medium"
          />
        </div>
      </motion.div>

      {/* List */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="text-[13.5px] text-ink-muted font-medium">Loading reviews…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare size={26} className="mx-auto text-ink-muted mb-3" />
          <p className="text-[15px] font-bold text-ink tracking-tight">
            {reviews.length === 0 ? 'No reviews yet' : 'No reviews match this filter'}
          </p>
          <p className="text-[13px] text-ink-muted font-medium mt-1">
            {reviews.length === 0
              ? 'Reviews from buyers and sellers will appear here after each completed trade.'
              : 'Try a different rating or clear your search.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map((r) => (
              <motion.li
                key={r.id}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="card p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={
                      r.reviewer?.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.reviewer_id}`
                    }
                    alt=""
                    className="w-11 h-11 rounded-2xl object-cover bg-subtle shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold text-ink tracking-tight truncate">
                        {r.reviewer?.display_name || 'Anonymous trader'}
                      </span>
                      {r.is_verified_purchase && (
                        <span className="pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                          <Shield size={10} strokeWidth={2.4} />
                          Verified
                        </span>
                      )}
                      <span className="text-[11.5px] text-ink-dim font-medium ml-auto">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          className={
                            s <= r.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-ink-dim'
                          }
                        />
                      ))}
                    </div>
                    {r.comment && (
                      <p className="text-[13.5px] text-ink-muted font-medium mt-2 leading-relaxed">
                        {r.comment}
                      </p>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
};

export default ReviewsTab;
