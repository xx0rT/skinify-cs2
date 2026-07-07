import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  ShieldCheck,
  MessageSquare,
  Send,
  X as XIcon,
  ThumbsUp,
} from 'lucide-react';
import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { spring, tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   UserReviews — public profile reviews tab.

   Full rewrite in the site's design language:
     - `.card` surfaces (not gradient blobs)
     - Token colors (accent / ink / subtle) so it picks up the theme
     - Compact summary header with a 1–5 distribution bar chart
     - Inline review composer with the same half-star rating widget
       used in the seller-card on the item detail page (red 1★ → green 5★)
     - Reviews list using `.card-flat` rows

   Schema is unchanged — same `user_reviews` table the previous version
   wrote to. We dropped the separate ReviewSubmissionModal and inlined a
   single composer that opens in place; that's where the "horrible
   modal" complaint came from.
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
    avatar_url: string | null;
  };
}

interface UserReviewsProps {
  /** Steam ID of the user being viewed. */
  userId: string;
  /** Same as userId — kept for backwards compat with the call site. */
  steamId: string;
}

const RATING_COLOR: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
};

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

const UserReviews: React.FC<UserReviewsProps> = ({ userId, steamId }) => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [canReview, setCanReview] = useState(false);
  const [actualUserId, setActualUserId] = useState<string | null>(null);

  const isOwnProfile = !!user?.steamId && user.steamId === steamId;

  useEffect(() => {
    fetchUserIdAndReviews();
    checkCanReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user?.steamId]);

  /* Reviews + eligibility come from the `reviews` edge function —
     user_reviews RLS is authenticated-only, and Steam-OpenID users run
     on the anon key, so a direct table read returned nothing (and the
     old insert used steam ids where the table wants users.id uuids). */
  const fetchUserIdAndReviews = async () => {
    try {
      setIsLoading(true);
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      };
      if (user?.steamId) headers['x-steam-id'] = user.steamId;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/reviews?steam_id=${steamId}`,
        { headers },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Server error (${res.status})`);
      const normalized = (body?.reviews || []).map((r: any) => ({
        ...r,
        reviewer: Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer,
      })) as Review[];
      setReviews(normalized);
      setCanReview(Boolean(body?.can_review));
      setActualUserId('resolved-server-side');
    } catch (e) {
      console.error('Error fetching reviews:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const checkCanReview = async () => {
    /* Eligibility is included in the GET response. */
  };

  /* Aggregate stats derived from the loaded reviews so the header
     summary always matches what's rendered below. Falls back to 0
     when there are no reviews. */
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return { total, avg: 0, distribution: [0, 0, 0, 0, 0] };
    }
    const sum = reviews.reduce((s, r) => s + Number(r.rating || 0), 0);
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const idx = Math.max(0, Math.min(4, Math.round(Number(r.rating || 0)) - 1));
      dist[idx] += 1;
    });
    return { total, avg: sum / total, distribution: dist };
  }, [reviews]);

  const submit = async () => {
    if (!user || !comment.trim() || !actualUserId) {
      addToast({ type: 'error', title: 'Add a comment first' });
      return;
    }
    if (rating <= 0) {
      addToast({ type: 'error', title: 'Pick a rating first' });
      return;
    }
    setSubmitting(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/reviews`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'Content-Type': 'application/json',
          'x-steam-id': user.steamId,
        },
        body: JSON.stringify({
          reviewed_steam_id: steamId,
          rating,
          comment: comment.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Server error (${res.status})`);

      addToast({
        type: 'success',
        title: 'Review posted',
        message: 'Thanks for the feedback.',
      });
      setComposerOpen(false);
      setRating(0);
      setComment('');
      setCanReview(false);
      fetchUserIdAndReviews();
    } catch (e: any) {
      console.error('Error submitting review:', e);
      addToast({
        type: 'error',
        title: 'Review failed',
        message: e?.message || 'Try again in a minute.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card p-12 text-center">
        <div className="text-[13.5px] text-ink-muted font-medium">Loading reviews…</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ─── Summary header ─── */}
      <section className="card p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-5">
          {/* Average rating block */}
          <div className="text-center sm:text-left">
            <div className="label-eyebrow">Average rating</div>
            <div className="flex items-baseline gap-2 mt-1 justify-center sm:justify-start">
              <div className="text-[36px] sm:text-[44px] font-bold text-ink tracking-tight tabular-nums leading-none">
                {stats.avg > 0 ? stats.avg.toFixed(1) : '—'}
              </div>
              <div className="text-[12.5px] text-ink-muted font-medium">/ 5</div>
            </div>
            <StaticStars value={stats.avg} size={14} />
            <div className="text-[11.5px] text-ink-muted font-medium mt-1">
              {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Distribution bars */}
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = stats.distribution[n - 1];
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-2">
                  <span className="text-[11.5px] font-bold text-ink-muted tabular-nums w-3">
                    {n}
                  </span>
                  <Star
                    size={11}
                    strokeWidth={2}
                    style={{
                      color: RATING_COLOR[n],
                      fill: RATING_COLOR[n],
                    }}
                  />
                  <div className="flex-1 h-1.5 rounded-full bg-subtle overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ ...spring, mass: 0.7 }}
                      className="h-full"
                      style={{ background: RATING_COLOR[n] }}
                    />
                  </div>
                  <span className="text-[11px] text-ink-dim font-medium tabular-nums w-8 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action button */}
          {canReview && !composerOpen && (
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.02 }}
              onClick={() => setComposerOpen(true)}
              className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13px] inline-flex items-center gap-1.5"
              style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.55)' }}
            >
              <MessageSquare size={13} strokeWidth={2.4} />
              Write a review
            </motion.button>
          )}
        </div>

        {/* Gentle hints when the viewer can't post one */}
        {!isOwnProfile && !canReview && user && (
          <p className="text-[11.5px] text-ink-dim font-medium mt-4">
            You can leave a review after a completed trade with this user.
          </p>
        )}
        {!user && !isOwnProfile && (
          <p className="text-[11.5px] text-ink-dim font-medium mt-4">
            Sign in to leave a review.
          </p>
        )}
      </section>

      {/* ─── Composer ─── */}
      <AnimatePresence initial={false}>
        {composerOpen && (
          <motion.section
            key="composer"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={spring}
            className="card p-5 sm:p-6 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="label-eyebrow">Your review</span>
                <h3 className="text-[18px] font-bold text-ink tracking-tight mt-1">
                  Rate this trader
                </h3>
              </div>
              <button
                onClick={() => setComposerOpen(false)}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
              >
                <XIcon size={15} strokeWidth={2.4} />
              </button>
            </div>

            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <InteractiveRating value={rating} onChange={setRating} />
              {rating > 0 && (
                <span
                  className="text-[12px] font-bold uppercase tracking-wider tabular-nums"
                  style={{ color: RATING_COLOR[Math.ceil(rating)] }}
                >
                  {rating.toFixed(rating % 1 === 0 ? 0 : 1)} ·{' '}
                  {RATING_LABEL[String(rating)]}
                </span>
              )}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience trading with this user — delivery speed, communication, anything notable…"
              rows={4}
              maxLength={1000}
              className="mt-4 w-full rounded-2xl bg-subtle px-3.5 py-3 text-[13.5px] text-ink font-medium outline-none focus:ring-2 focus:ring-accent/40 resize-none"
            />
            <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-ink-dim font-medium">
              <span>Be specific — facts help other traders more than vibes.</span>
              <span className="tabular-nums">{comment.length}/1000</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <motion.button
                whileTap={tap}
                whileHover={!submitting ? { scale: 1.01 } : undefined}
                onClick={submit}
                disabled={submitting || rating <= 0 || !comment.trim()}
                className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13px] inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.55)' }}
              >
                <Send size={13} strokeWidth={2.4} />
                {submitting ? 'Posting…' : 'Post review'}
              </motion.button>
              <motion.button
                whileTap={tap}
                onClick={() => setComposerOpen(false)}
                className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[13px] transition-colors"
              >
                Cancel
              </motion.button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Reviews list ─── */}
      <section className="card p-3 sm:p-4">
        {reviews.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-ink-muted mx-auto mb-3" />
            <p className="text-[14px] font-bold text-ink">No reviews yet</p>
            <p className="text-[12.5px] text-ink-muted font-medium mt-1">
              Be the first to leave one after a completed trade.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {reviews.map((r) => (
              <ReviewRow key={r.id} review={r} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

/* ───── ReviewRow ───── */
const ReviewRow: React.FC<{ review: Review }> = ({ review }) => {
  const name = review.reviewer?.display_name || 'Anonymous';
  const avatar =
    review.reviewer?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="card-flat p-4"
    >
      <div className="flex items-start gap-3">
        <img
          src={avatar}
          alt=""
          className="w-10 h-10 rounded-2xl object-cover bg-subtle shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13.5px] font-bold text-ink tracking-tight truncate">
              {name}
            </span>
            {review.is_verified_purchase && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck size={10} strokeWidth={2.6} />
                Verified
              </span>
            )}
            <span className="text-[10.5px] text-ink-dim font-medium tabular-nums ml-auto">
              {new Date(review.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <StaticStars value={review.rating} size={12} />
            <span className="text-[11px] font-bold tabular-nums text-ink-muted">
              {Number(review.rating).toFixed(1)}
            </span>
          </div>
          <p className="text-[13px] text-ink-muted font-medium leading-relaxed mt-2 whitespace-pre-wrap break-words">
            {review.comment}
          </p>
        </div>
      </div>
    </motion.li>
  );
};

/* ───── StaticStars ───── */
const StaticStars: React.FC<{ value: number; size?: number }> = ({
  value,
  size = 14,
}) => {
  const color = value > 0 ? RATING_COLOR[Math.max(1, Math.ceil(value))] : null;
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const fillPct = value >= n ? 100 : value >= n - 0.5 ? 50 : 0;
        return (
          <span
            key={n}
            className="relative inline-block"
            style={{ width: size, height: size }}
          >
            <Star size={size} strokeWidth={2} className="absolute inset-0 text-ink-dim" />
            {fillPct > 0 && color && (
              <span
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${fillPct}%` }}
              >
                <Star size={size} strokeWidth={2} style={{ color, fill: color }} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};

/* ───── InteractiveRating — half-star, color-shifting, same UX as the
   seller card on the item detail page. ───── */
const InteractiveRating: React.FC<{
  value: number;
  onChange: (v: number) => void;
}> = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  const color = display > 0 ? RATING_COLOR[Math.ceil(display)] : null;

  return (
    <div
      className="flex items-center gap-1"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <RatingStarPicker
          key={n}
          index={n}
          display={display}
          color={color}
          onHover={setHover}
          onPick={onChange}
        />
      ))}
    </div>
  );
};

const RatingStarPicker: React.FC<{
  index: number;
  display: number;
  color: string | null;
  onHover: (v: number) => void;
  onPick: (v: number) => void;
}> = ({ index, display, color, onHover, onPick }) => {
  const fillPct = display >= index ? 100 : display >= index - 0.5 ? 50 : 0;
  return (
    <span className="relative inline-block w-7 h-7 cursor-pointer">
      <Star size={28} strokeWidth={2} className="absolute inset-0 text-ink-dim" />
      {fillPct > 0 && color && (
        <span
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${fillPct}%` }}
        >
          <Star size={28} strokeWidth={2} style={{ color, fill: color }} />
        </span>
      )}
      <button
        type="button"
        aria-label={`Rate ${index - 0.5} stars`}
        onMouseEnter={() => onHover(index - 0.5)}
        onClick={() => onPick(index - 0.5)}
        className="absolute top-0 bottom-0 left-0 w-1/2 z-10 transition-transform hover:scale-110"
      />
      <button
        type="button"
        aria-label={`Rate ${index} stars`}
        onMouseEnter={() => onHover(index)}
        onClick={() => onPick(index)}
        className="absolute top-0 bottom-0 right-0 w-1/2 z-10 transition-transform hover:scale-110"
      />
    </span>
  );
};

export default UserReviews;
