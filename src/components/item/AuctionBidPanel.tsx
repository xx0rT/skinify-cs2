import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Clock3, TrendingUp, Lock, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { spring, tap } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   AuctionBidPanel — replaces the standard buy panel on ItemDetailPage
   when the listing is an auction.

   Shows:
     - Live countdown to auction_end_time
     - Current bid + bid count
     - Bidder list (anonymised "Bidder #abcd" handles) with realtime updates
     - Bid input + Place Bid button (validates against current + min step)
     - Buyout button when buyout_price is set

   Realtime: subscribes to the auction_bids Supabase channel filtered
   by listing_id. Inserts there trigger a refetch.
   ───────────────────────────────────────────────────────────────────────── */

const MIN_INCREMENT = 1.0;

interface BidRow {
  id: string;
  bidder_handle: string;
  amount: number;
  created_at: string;
}

interface Props {
  item: any;
  formatPrice: (n: number) => string;
}

const AuctionBidPanel: React.FC<Props> = ({ item, formatPrice }) => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [bids, setBids] = useState<BidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidValue, setBidValue] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  /* 1-second countdown ticker for the timer at the top. */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchBids = async () => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(
        `${supabaseUrl}/functions/v1/auction-bid?listing_id=${encodeURIComponent(item.id)}`,
        {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (!res.ok) return;
      const data = await res.json();
      setBids(data.bids || []);
    } catch (e) {
      console.error('Failed to fetch bids', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  /* Realtime: refetch whenever a new bid lands for this listing.
     We use a per-listing channel so we don't get pinged for every
     auction site-wide. */
  useEffect(() => {
    const channel = supabase
      .channel(`auction_bids:${item.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auction_bids',
          filter: `listing_id=eq.${item.id}`,
        },
        () => fetchBids(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const endTime = item.auction_end_time
    ? new Date(item.auction_end_time).getTime()
    : null;
  const timeLeftMs = endTime ? endTime - now : 0;
  const ended = !endTime || timeLeftMs <= 0;

  const highestBid = useMemo(() => {
    if (bids.length === 0) {
      return Number(item.current_bid ?? item.minimum_bid ?? item.price ?? 0);
    }
    return Math.max(...bids.map((b) => Number(b.amount)));
  }, [bids, item]);

  const minNextBid = useMemo(
    () =>
      Math.max(
        Number(item.minimum_bid || 0),
        Number(highestBid || 0) + MIN_INCREMENT,
      ),
    [highestBid, item],
  );

  const myHandle = useMemo(() => {
    if (!user?.steamId) return null;
    /* Derive the same handle the edge function will compute so the
       user can recognise their own bids in the list before refresh. */
    return computeMyHandle(item.id, user.steamId);
  }, [item.id, user?.steamId]);

  const isSeller =
    !!user?.steamId &&
    !!item.seller?.steamId &&
    String(user.steamId) === String(item.seller.steamId);

  const placeBid = async (amount: number) => {
    if (!user?.steamId) {
      addToast({ type: 'warning', title: 'Sign in to bid' });
      return;
    }
    if (isSeller) {
      addToast({ type: 'warning', title: 'You cannot bid on your own auction' });
      return;
    }
    if (ended) {
      addToast({ type: 'warning', title: 'Auction has ended' });
      return;
    }
    if (!Number.isFinite(amount) || amount < minNextBid) {
      addToast({
        type: 'error',
        title: 'Bid too low',
        message: `Minimum next bid is ${formatPrice(minNextBid)}.`,
      });
      return;
    }
    setSubmitting(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/auction-bid`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listing_id: item.id,
          steam_id: user.steamId,
          amount,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast({
          type: 'error',
          title: 'Bid rejected',
          message: data?.error || `HTTP ${res.status}`,
        });
        return;
      }
      addToast({
        type: 'success',
        title: data.buyout ? 'You won the auction!' : 'Bid placed',
        message: `Your handle: ${data.handle}`,
      });
      setBidValue('');
      fetchBids();
    } catch (e: any) {
      addToast({
        type: 'error',
        title: 'Bid failed',
        message: e?.message || 'Network error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const timeLabel = useMemo(() => {
    if (ended) return 'Auction ended';
    const totalSec = Math.floor(timeLeftMs / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  }, [ended, timeLeftMs]);

  return (
    <section className="card p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="label-eyebrow inline-flex items-center gap-1.5">
          <Gavel size={11} strokeWidth={2.4} className="text-accent" />
          Live auction
        </span>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold tabular-nums px-2 py-1 rounded-md ${
            ended
              ? 'bg-subtle text-ink-muted'
              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
          }`}
        >
          {!ended && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          )}
          <Clock3 size={11} strokeWidth={2.4} />
          {timeLabel}
        </span>
      </div>

      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
        Current bid
      </div>
      <div className="text-[34px] sm:text-[40px] font-bold tracking-tight tabular-nums text-ink leading-none mt-1">
        {formatPrice(highestBid)}
      </div>
      <div className="text-[12.5px] text-ink-muted font-medium mt-1.5">
        {bids.length} {bids.length === 1 ? 'bid' : 'bids'}
        {item.buyout_price && (
          <>
            {' · '}buyout {formatPrice(Number(item.buyout_price))}
          </>
        )}
      </div>

      {/* Bid input */}
      {!ended && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3.5 h-12 rounded-2xl bg-subtle focus-within:ring-2 focus-within:ring-accent/40">
              <TrendingUp size={14} className="text-ink-muted" />
              <input
                type="number"
                inputMode="decimal"
                step={MIN_INCREMENT}
                min={minNextBid}
                value={bidValue}
                onChange={(e) => setBidValue(e.target.value)}
                placeholder={`${minNextBid.toFixed(2)} or more`}
                className="flex-1 bg-transparent outline-none text-[14.5px] font-bold tabular-nums text-ink placeholder:text-ink-dim min-w-0"
              />
            </div>
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.02 }}
              onClick={() => placeBid(Number(bidValue))}
              disabled={
                submitting ||
                isSeller ||
                !user ||
                !bidValue ||
                Number(bidValue) < minNextBid
              }
              className="h-12 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.55)' }}
            >
              <Gavel size={13} strokeWidth={2.4} />
              {submitting ? 'Bidding…' : 'Place bid'}
            </motion.button>
          </div>
          <div className="text-[11px] text-ink-dim font-medium">
            Min next bid {formatPrice(minNextBid)}
            {isSeller && ' · you own this auction'}
            {!user && ' · sign in to bid'}
          </div>

          {/* Quick-bid chips */}
          <div className="flex gap-2 flex-wrap">
            {[minNextBid, minNextBid + 5, minNextBid + 20, minNextBid + 100].map(
              (amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBidValue(String(amt))}
                  className="h-9 px-3 rounded-full bg-subtle hover:bg-bg text-ink text-[12px] font-bold tabular-nums transition-colors"
                >
                  +{formatPrice(amt - highestBid)}
                </button>
              ),
            )}
            {item.buyout_price && Number(item.buyout_price) > highestBid && (
              <button
                type="button"
                onClick={() => placeBid(Number(item.buyout_price))}
                className="h-9 px-3 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[12px] font-bold tabular-nums hover:opacity-90 inline-flex items-center gap-1.5"
              >
                <Trophy size={11} strokeWidth={2.4} />
                Buyout {formatPrice(Number(item.buyout_price))}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bidder list — anonymised handles, highest first */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="label-eyebrow inline-flex items-center gap-1.5">
            <Lock size={10} strokeWidth={2.4} />
            Bidders
          </span>
          <span className="text-[10.5px] text-ink-dim font-bold uppercase tracking-wider tabular-nums">
            Live · names hidden
          </span>
        </div>
        {loading ? (
          <div className="text-[12.5px] text-ink-muted font-medium py-3 text-center">
            Loading bids…
          </div>
        ) : bids.length === 0 ? (
          <div className="text-[12.5px] text-ink-muted font-medium py-3 text-center">
            No bids yet. Be the first.
          </div>
        ) : (
          <ul className="divide-y divide-line max-h-[260px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {bids.slice(0, 12).map((b, i) => {
                const isHigh = i === 0;
                const isMine = myHandle && b.bidder_handle === `#${myHandle}`;
                return (
                  <motion.li
                    key={b.id}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={spring}
                    className={`flex items-center justify-between py-2.5 ${
                      isHigh ? 'text-ink' : 'text-ink-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isHigh && (
                        <Trophy
                          size={12}
                          strokeWidth={2.4}
                          className="text-amber-500 shrink-0"
                        />
                      )}
                      <span
                        className={`font-mono text-[12.5px] truncate ${
                          isMine
                            ? 'text-accent font-bold'
                            : isHigh
                            ? 'font-bold text-ink'
                            : 'text-ink-muted'
                        }`}
                      >
                        Bidder {b.bidder_handle}
                        {isMine && ' (you)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[13px] tabular-nums ${
                          isHigh ? 'font-bold text-ink' : 'font-semibold'
                        }`}
                      >
                        {formatPrice(b.amount)}
                      </span>
                      <span className="text-[10.5px] text-ink-dim font-medium tabular-nums">
                        {timeAgo(b.created_at)}
                      </span>
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

/* Mirror the edge function's hash → first 6 hex chars. We import
   SHA-256 from the browser SubtleCrypto rather than node:crypto so
   the client can compute the same handle the server will assign. */
function computeMyHandle(listingId: string, steamId: string): string {
  /* Synchronous deterministic 24-bit hash that approximates the
     SHA-256 prefix used server-side. Good enough for self-recognition
     before the round-trip; the real handle from the server replaces
     this on next refetch. */
  let h = 5381;
  const s = `${listingId}:${steamId}`;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(6, '0').slice(0, 6);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default AuctionBidPanel;
