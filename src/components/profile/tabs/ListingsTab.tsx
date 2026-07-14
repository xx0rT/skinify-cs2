import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  RefreshCw,
  Search,
  Trash2,
  Edit3,
  Copy,
  Eye,
  Tag,
  Check,
  X,
  TrendingUp,
  Plus,
  ChevronDown,
  Store,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseCredentials } from '../../../utils/supabaseHelpers';
import { useToastStore } from '../../../store/toastStore';
import { useCurrencyStore } from '../../../store/currencyStore';
import { spring, tap } from '../../../lib/motion';
import { rarityColor } from '../../ui/SkinCard';
import { supabase } from '../../../lib/supabaseClient';
import { useBalanceStore } from '../../../store/balanceStore';

/* ─────────────────────────────────────────────────────────────────────────
   ListingsTab — redesigned
   - 3 KPIs (Active listings / Total value / Total views)
   - Search + sort + status pills (active / paused)
   - Cards with inline edit-price flow, remove, view-on-marketplace
   - Empty state with "List from inventory" CTA
   ───────────────────────────────────────────────────────────────────────── */

interface Listing {
  id: number | string;
  asset_id: string;
  item_name: string;
  market_hash_name: string;
  item_type: string;
  rarity: string;
  condition: string;
  price: number;
  image_url: string;
  description?: string;
  is_active: boolean;
  views: number;
  created_at: string;
  listing_type?: 'standard' | 'auction' | 'private';
  /** Share token — every listing gets one (DB trigger); for private
      listings it forms the only URL the item is reachable at. */
  share_token?: string;
  /** Optional float value (0.0–1.0). May be a string (some endpoints
      ship it that way) or null. The card parses it defensively. */
  float?: number | string | null;
  /** Paid promotion — true when the 49 Kč fee was paid. */
  is_promoted?: boolean;
  promoted_until?: string | null;
}

type Sort = 'newest' | 'price-desc' | 'price-asc' | 'views';

/* Listing promotion — flat fee charged from the user's balance. */
const PROMOTE_FEE_CZK = 49;
const PROMOTE_SKIP_CONFIRM_KEY = 'skinify_skip_promote_confirm';

const ListingsTab: React.FC<{ steamId: string }> = ({ steamId }) => {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const { formatPrice, formatFee } = useCurrencyStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const fetchBalance = useBalanceStore((s) => s.fetchBalance);
  const balance = useBalanceStore((s) => s.balance);
  /* Promotion confirm modal + optimistic UI sets. Buttons flip state
     the instant they're clicked — no spinners, no delay. */
  const [confirmPromote, setConfirmPromote] = useState<Listing | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [shopAddedIds, setShopAddedIds] = useState<Set<string>>(new Set());
  const [promotingIds, setPromotingIds] = useState<Set<string>>(new Set());
  const [editPrice, setEditPrice] = useState('');

  useEffect(() => {
    fetchListings();
  }, [steamId]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(
        `${supabaseUrl}/functions/v1/marketplace-listings?steamId=${steamId}&userOnly=true&_t=${Date.now()}`,
        {
          headers: { Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          cache: 'no-store',
        },
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const formatted: Listing[] = (data.items || []).map((l: any) => ({
        id: l.id || l.asset_id,
        asset_id: l.asset_id,
        item_name: l.name || l.item_name || 'Unknown',
        market_hash_name: l.market_name || l.market_hash_name,
        item_type: l.type || l.item_type || 'Unknown',
        rarity: l.rarity || 'Consumer Grade',
        condition: l.condition || 'Factory New',
        price: Number(l.price || 0),
        image_url: l.image || l.image_url || '',
        description: l.description,
        is_active: l.is_active !== false,
        views: Number(l.views || 0),
        created_at: l.created_at || l.listed_at || new Date().toISOString(),
        listing_type: l.listing_type || 'standard',
        share_token: l.share_token || undefined,
        is_promoted: l.is_promoted === true,
        promoted_until: l.promoted_until || null,
      }));
      setListings(formatted);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = listings.filter(
      (l) =>
        !q ||
        l.item_name.toLowerCase().includes(q) ||
        l.item_type.toLowerCase().includes(q),
    );
    if (sort === 'newest')
      arr = arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sort === 'price-desc') arr = arr.sort((a, b) => b.price - a.price);
    if (sort === 'price-asc') arr = arr.sort((a, b) => a.price - b.price);
    if (sort === 'views') arr = arr.sort((a, b) => b.views - a.views);
    return arr;
  }, [listings, query, sort]);

  const kpis = useMemo(() => {
    const totalValue = listings.reduce((s, l) => s + l.price, 0);
    const totalViews = listings.reduce((s, l) => s + l.views, 0);
    return { count: listings.length, totalValue, totalViews };
  }, [listings]);

  /* Add to shop — attach a listing to the user's public storefront.
     Goes through the toggle-shop-item edge function (service role) so
     the RLS-restricted shop_items INSERT works for Steam-OpenID users
     who don't have a Supabase auth.uid(). The function resolves the
     user's shop server-side from steamId, so we only send steamId +
     listingId. Idempotent on duplicate (the function returns
     `alreadyAdded: true` on the unique-constraint hit). */
  const handleAddToShop = async (l: Listing) => {
    if (!steamId) {
      addToast({ type: 'warning', title: 'Nejprve se přihlaste' });
      return;
    }
    /* Optimistic — flip the button green immediately; roll back only
       if the server actually rejects. */
    setShopAddedIds((prev) => new Set([...prev, String(l.id)]));
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/toggle-shop-item`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          steamId,
          listingId: l.id,
          /* shopId omitted — the edge function looks it up from the
             user's row, so we don't have to query user_shops here
             (which would also 401 for Steam-OpenID users). */
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setShopAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(String(l.id));
          return next;
        });
        addToast({
          type: 'error',
          title: 'Do obchodu se nepodařilo přidat',
          message: data?.error || `HTTP ${res.status}`,
        });
        return;
      }
      const shopUrl = data?.shopUrl;
      if (data?.alreadyAdded) {
        addToast({
          type: 'info',
          title: 'Už je ve vašem obchodě',
          message: shopUrl ? `${l.item_name} · /shop/${shopUrl}` : l.item_name,
        });
      } else {
        addToast({
          type: 'success',
          title: 'Přidáno do vašeho obchodu',
          message: shopUrl
            ? `${l.item_name} now appears on /shop/${shopUrl}`
            : l.item_name,
        });
      }
    } catch (err: any) {
      setShopAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(String(l.id));
        return next;
      });
      addToast({
        type: 'error',
        title: 'Do obchodu se nepodařilo přidat',
        message: err?.message || 'Chyba sítě.',
      });
    }
  };

  /* Promote — 49 Kč flat fee, charged from the Skinify balance.
     Flow: confirm modal (skippable via "don't ask again") →
     OPTIMISTIC promoted state (the button flips instantly) → charge
     the fee via the balance function → persist is_promoted on the
     listing → also feed the hot-items rail. Any failure rolls the
     state back and explains why. */
  const handlePromote = (l: Listing) => {
    if (l.is_promoted || promotingIds.has(String(l.id))) return;
    /* Pre-check funds so we never optimistically flip the button (or
       hit the server) when the user can't actually afford the fee. */
    if (Number(balance || 0) < PROMOTE_FEE_CZK) {
      addToast({
        type: 'warning',
        title: 'Nedostatečný zůstatek',
        message: `You need ${formatFee(PROMOTE_FEE_CZK)} to promote a listing — top up first.`,
      });
      return;
    }
    let skip = false;
    try {
      skip = localStorage.getItem(PROMOTE_SKIP_CONFIRM_KEY) === '1';
    } catch {
      /* private mode */
    }
    if (skip) {
      executePromotion(l);
    } else {
      setDontAskAgain(false);
      setConfirmPromote(l);
    }
  };

  const executePromotion = async (l: Listing) => {
    setConfirmPromote(null);
    const key = String(l.id);
    /* In-flight guard — a double click used to fire the charge twice
       before the optimistic state landed. */
    if (promotingIds.has(key)) return;
    if (Number(balance || 0) < PROMOTE_FEE_CZK) {
      addToast({
        type: 'warning',
        title: 'Nedostatečný zůstatek',
        message: `You need ${formatFee(PROMOTE_FEE_CZK)} to promote a listing.`,
      });
      return;
    }
    setPromotingIds((prev) => new Set(prev).add(key));
    const promotedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    /* Instant UI — promoted state applies the moment the user commits. */
    setListings((prev) =>
      prev.map((x) =>
        x.id === l.id ? { ...x, is_promoted: true, promoted_until: promotedUntil } : x,
      ),
    );
    const rollback = () =>
      setListings((prev) =>
        prev.map((x) =>
          x.id === l.id ? { ...x, is_promoted: false, promoted_until: null } : x,
        ),
      );

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      /* ONE charge, server-side: the hot-items function verifies the
         balance, debits the 49 Kč fee, creates the featured entry AND
         persists the listing's promoted flags with service role. The
         client previously charged a second fee via the balance
         function on top of this — that's the "promoted 3×" bill. */
      const res = await fetch(`${supabaseUrl}/functions/v1/hot-items`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: Number(l.id),
          user_steam_id: steamId,
          asset_id: l.asset_id || String(l.id),
          duration_hours: 24 * 7,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        /* Already promoted server-side — keep the flag, no new charge. */
        addToast({
          type: 'info',
          title: 'Už je promované',
          message: `${l.item_name} is already featured${
            data?.expires_at ? ` until ${new Date(data.expires_at).toLocaleDateString()}` : ''
          }.`,
        });
        return;
      }
      if (!res.ok) {
        rollback();
        addToast({
          type: 'error',
          title: 'Propagace selhala',
          message: data?.error || `Could not charge the ${PROMOTE_FEE_CZK} Kč fee.`,
        });
        return;
      }

      if (data?.expires_at) {
        setListings((prev) =>
          prev.map((x) =>
            x.id === l.id ? { ...x, promoted_until: data.expires_at } : x,
          ),
        );
      }
      fetchBalance(steamId);
      addToast({
        type: 'success',
        title: 'Nabídka promována',
        message: `${l.item_name} · featured for 7 days (−${PROMOTE_FEE_CZK} Kč)`,
      });
    } catch (err: any) {
      rollback();
      addToast({
        type: 'error',
        title: 'Propagace selhala',
        message: err?.message || 'Network error',
      });
    } finally {
      setPromotingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleRemove = async (l: Listing) => {
    const prev = listings;
    setListings((p) => p.filter((x) => x.id !== l.id));
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(
        `${supabaseUrl}/functions/v1/marketplace-listings?id=${l.id}&steamId=${steamId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        },
      );
      if (!res.ok) throw new Error('Delete failed');
      addToast({ type: 'success', title: 'Listing removed', message: l.item_name });
    } catch {
      setListings(prev);
      addToast({ type: 'error', title: 'Failed to remove' });
    }
  };

  const startEdit = (l: Listing) => {
    setEditingId(l.id);
    setEditPrice(String(l.price));
  };

  const saveEdit = async (l: Listing) => {
    const newPrice = Number(editPrice);
    if (!newPrice || newPrice <= 0) {
      addToast({ type: 'error', title: 'Invalid price' });
      return;
    }
    const prev = listings;
    setListings((p) =>
      p.map((x) => (x.id === l.id ? { ...x, price: newPrice } : x)),
    );
    setEditingId(null);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(
        `${supabaseUrl}/functions/v1/marketplace-listings?steam_id=${steamId}&id=${l.id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: newPrice, description: l.description || '' }),
        },
      );
      if (!res.ok) throw new Error();
      addToast({ type: 'success', title: 'Price updated', message: formatPrice(newPrice) });
    } catch {
      setListings(prev);
      addToast({ type: 'error', title: 'Update failed' });
    }
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="grid grid-cols-3 gap-3"
      >
        <KpiTile label="Aktivní nabídky" value={String(kpis.count)} Icon={ShoppingBag} />
        <KpiTile label="Hodnota nabídek" value={formatPrice(kpis.totalValue)} Icon={TrendingUp} />
        <KpiTile label="Zobrazení celkem" value={kpis.totalViews.toLocaleString()} Icon={Eye} />
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.05 }}
        className="card p-3 flex items-center gap-2 flex-wrap"
      >
        <div className="flex-1 min-w-[200px] flex items-center gap-2 h-10 px-3.5 rounded-full bg-subtle">
          <Search size={14} strokeWidth={2} className="text-ink-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat v nabídkách…"
            className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[13px] font-medium"
          />
        </div>
        <SortPicker sort={sort} onChange={setSort} />
        <motion.button
          whileTap={tap}
          onClick={fetchListings}
          disabled={loading}
          className="h-10 w-10 rounded-full bg-subtle hover:bg-bg grid place-items-center disabled:opacity-50 transition-colors"
          title="Obnovit"
        >
          <RefreshCw
            size={14}
            strokeWidth={2.2}
            className={`text-ink-muted ${loading ? 'animate-spin' : ''}`}
          />
        </motion.button>
        <motion.button
          whileTap={tap}
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/profile?tab=inventory')}
          className="h-10 px-4 rounded-full bg-accent text-on-accent flex items-center gap-1.5 text-[13px] font-bold"
          style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
        >
          <Plus size={14} strokeWidth={2.6} />
          List item
        </motion.button>
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skel h-[280px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Tag size={26} className="mx-auto text-ink-muted mb-3" />
          <p className="text-[15px] font-bold text-ink tracking-tight">
            {listings.length === 0 ? 'Zatím žádné nabídky' : 'Hledání neodpovídá žádná nabídka'}
          </p>
          <p className="text-[13px] text-ink-muted font-medium mt-1.5 max-w-md mx-auto">
            {listings.length === 0
              ? 'Vyberte položky z inventáře a vystavte je na tržiště.'
              : 'Zkuste jiné hledání.'}
          </p>
          {listings.length === 0 && (
            <motion.button
              whileTap={tap}
              onClick={() => navigate('/profile?tab=inventory')}
              className="mt-5 h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center gap-1.5"
              style={{ boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.6)' }}
            >
              <Plus size={14} strokeWidth={2.6} />
              List from inventory
            </motion.button>
          )}
        </div>
      ) : (
        <motion.div layout className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((l, i) => (
              <ListingCard
                key={String(l.id)}
                listing={l}
                index={i}
                editing={editingId === l.id}
                editPrice={editPrice}
                setEditPrice={setEditPrice}
                onStartEdit={() => startEdit(l)}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={() => saveEdit(l)}
                onRemove={() => handleRemove(l)}
                onPromote={() => handlePromote(l)}
                onAddToShop={() => handleAddToShop(l)}
                promoted={!!l.is_promoted}
                promotedUntil={l.promoted_until || null}
                inShop={shopAddedIds.has(String(l.id))}
                promoteLabel={formatFee(PROMOTE_FEE_CZK)}
                onView={() => navigate(`/item/${l.id}`)}
                formatPrice={formatPrice}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Promote confirmation ── */}
      <AnimatePresence>
        {confirmPromote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm grid place-items-center p-4"
            onClick={() => setConfirmPromote(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="panel p-6 w-full max-w-sm"
            >
              <span className="label-eyebrow">Promote listing</span>
              <h3 className="text-[18px] font-bold tracking-tight mt-1.5 leading-tight">
                Feature “{confirmPromote.item_name}” for 7 days?
              </h3>
              <p className="text-[13px] text-ink-muted font-medium mt-2 leading-relaxed">
                Your listing appears in the promoted rail on the homepage and at
                the top of the marketplace. A one-time fee of{' '}
                <span className="text-ink font-bold">{formatFee(PROMOTE_FEE_CZK)}</span>{' '}
                is charged from your balance.
              </p>

              <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={dontAskAgain}
                  onClick={() => setDontAskAgain((v) => !v)}
                  className={`w-5 h-5 rounded-md grid place-items-center transition-colors ${
                    dontAskAgain ? 'bg-accent text-on-accent' : 'bg-subtle'
                  }`}
                >
                  {dontAskAgain && <Check size={12} strokeWidth={3} />}
                </button>
                <span
                  className="text-[12.5px] text-ink-muted font-medium"
                  onClick={() => setDontAskAgain((v) => !v)}
                >
                  Don't ask again — promote instantly next time
                </span>
              </label>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfirmPromote(null)}
                  className="h-11 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={tap}
                  onClick={() => {
                    if (dontAskAgain) {
                      try {
                        localStorage.setItem(PROMOTE_SKIP_CONFIRM_KEY, '1');
                      } catch {
                        /* private mode */
                      }
                    }
                    executePromotion(confirmPromote);
                  }}
                  className="h-11 rounded-full bg-accent text-on-accent text-[13px] font-bold"
                >
                  Propagovat · {formatFee(PROMOTE_FEE_CZK)}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Subcomponents
   ───────────────────────────────────────────────────────────────────────── */

const KpiTile: React.FC<{
  label: string;
  value: string;
  Icon: React.ComponentType<any>;
}> = ({ label, value, Icon }) => (
  <motion.div whileHover={{ y: -2 }} transition={spring} className="card p-4">
    <div className="flex items-start justify-between mb-3">
      <span className="label-meta">{label}</span>
      <div className="icon-chip-sm bg-accent-soft">
        <Icon size={14} strokeWidth={2.2} className="text-accent" />
      </div>
    </div>
    <div className="text-[20px] sm:text-[22px] font-bold tracking-tight tabular-nums text-ink leading-none">
      {value}
    </div>
  </motion.div>
);

/* Wraps the marketplace SkinCard (same visual as /marketplace) and
   stacks a thin owner-only action row beneath it: edit price + remove.
   Keeps the look unified across the site instead of every page
   rolling its own card. */
/* Fully bespoke listing card — sharp edges, single cohesive surface.
   Layout:
     ┌─────────────────────────────────────┐
     │                                     │
     │           ITEM IMAGE                │
     │           (75% height)              │
     │                                     │
     │  rarity color stripe (2px sharp)    │
     ├─────────────────────────────────────┤
     │  type · float bar                   │
     │  Name (one line, truncated)         │
     │  Condition                          │
     │                                     │
     │  PRICE (large)                      │
     │                                     │
     │  [ Edit ] [ Shop ] [ ✕ ]            │
     │  [ Promote · 49 Kč ]                │
     └─────────────────────────────────────┘
   No rounded pills bleeding through, no gaps, no overlay strip
   sitting over content. The whole thing is one rectangular tile
   with sharp 4px corners and a hairline border that warms to the
   rarity colour on hover. */
const ListingCard: React.FC<{
  listing: Listing;
  index: number;
  editing: boolean;
  editPrice: string;
  setEditPrice: (s: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
  onPromote: () => void;
  promotedUntil?: string | null;
  promoted?: boolean;
  inShop?: boolean;
  onAddToShop: () => void;
  /** Localised "49 Kč" / "2 €" label shown on the Promote button. */
  promoteLabel: string;
  onView: () => void;
  formatPrice: (n: number) => string;
}> = ({
  listing,
  index,
  editing,
  editPrice,
  setEditPrice,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
  onPromote,
  promotedUntil,
  promoted = false,
  inShop = false,
  onAddToShop,
  promoteLabel,
  onView,
  formatPrice,
}) => {
  const r = rarityColor(listing.rarity);
  /* Float renders as a 0-100% wear bar at the top of the info panel.
     Skinify stores float as text; parse defensively. */
  const floatNum =
    listing.float != null && listing.float !== ''
      ? Number(listing.float)
      : null;
  const floatPct =
    floatNum != null && Number.isFinite(floatNum)
      ? Math.max(0, Math.min(1, floatNum)) * 100
      : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ ...spring, delay: Math.min(index * 0.012, 0.18) }}
      whileHover={{ y: -2 }}
      /* Sharp 4px corners (rounded-md) instead of the soft 24px on the
         marketplace card — matches the user's "sharp edges" ask while
         still hiding any subpixel image bleed. Single surface, no
         nested cards. */
      className="group relative bg-surface rounded-md overflow-hidden flex flex-col transition-shadow"
      style={{
        boxShadow: 'inset 0 0 0 1px rgb(var(--ink) / 0.08)',
        ['--rarity' as any]: r || 'rgb(var(--accent))',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          'inset 0 0 0 1.5px var(--rarity), 0 12px 28px -16px rgb(0 0 0 / 0.35)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          'inset 0 0 0 1px rgb(var(--ink) / 0.08)';
      }}
    >
      {/* IMAGE PANEL — fixed aspect ratio so all cards line up; rarity
          wash from bottom up + a sharp 2px stripe at the bottom edge
          forming the visual divider between image and info. */}
      <button
        type="button"
        onClick={onView}
        className="relative aspect-[5/3.4] overflow-hidden bg-gradient-to-b from-subtle/30 to-subtle/60 text-left"
      >
        {r && (
          <>
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[45%] pointer-events-none"
              style={{
                background: `linear-gradient(to top, ${r}59 0%, ${r}22 40%, transparent 100%)`,
              }}
            />
            {/* Sharp 2px rarity stripe — the divider between image &
                info area. This is the "sharp edge" the design hinges on. */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[2px] pointer-events-none"
              style={{ background: r }}
            />
          </>
        )}
        <img
          src={listing.image_url}
          alt={listing.item_name}
          loading="lazy"
          className="absolute inset-0 m-auto max-h-[85%] max-w-[85%] object-contain transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {/* Top meta row — listing type pill (left) + views (right) */}
        <div className="absolute top-0 inset-x-0 p-2 flex items-start justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5">
            {listing.listing_type === 'auction' && (
              <span className="px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider uppercase rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-300">
                Auction
              </span>
            )}
            {listing.listing_type === 'private' && (
              <span className="px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider uppercase rounded-sm bg-purple-500/15 text-purple-700 dark:text-purple-300">
                Private
              </span>
            )}
          </div>
          {listing.views > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-bg/75 backdrop-blur-sm text-ink-muted tabular-nums">
              <Eye size={10} strokeWidth={2.6} />
              {listing.views}
            </span>
          )}
        </div>
      </button>

      {/* INFO + ACTIONS panel — single padded surface, no nested
          backgrounds. Everything reads as one block divided from the
          image only by the 2px rarity stripe above. */}
      <div className="p-3 space-y-3 flex-1 flex flex-col">
        {/* Float bar (when known) — slim wear gauge above the name */}
        {floatPct != null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[9.5px] font-bold uppercase tracking-wider text-ink-dim">
              <span>{listing.item_type}</span>
              <span className="font-mono tabular-nums text-ink">
                {floatNum!.toFixed(4)}
              </span>
            </div>
            <div className="relative h-[3px] bg-subtle rounded-sm overflow-hidden">
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${floatPct}%`,
                  background:
                    'linear-gradient(90deg, #22c55e 0%, #84cc16 25%, #eab308 50%, #f97316 75%, #ef4444 100%)',
                  backgroundSize: `${10000 / floatPct}% 100%`,
                  backgroundPosition: 'left center',
                }}
              />
            </div>
          </div>
        )}
        {floatPct == null && (
          <div className="text-[9.5px] font-bold uppercase tracking-wider text-ink-dim">
            {listing.item_type}
          </div>
        )}

        {/* Name + condition */}
        <div className="min-w-0 -mt-1">
          <div className="text-[13.5px] font-bold text-ink tracking-tight leading-tight truncate">
            {listing.item_name}
          </div>
          <div className="text-[11px] text-ink-muted font-medium truncate mt-0.5">
            {listing.condition}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[18px] font-bold text-ink tracking-tight tabular-nums leading-none">
            {formatPrice(listing.price)}
          </div>
        </div>

        {/* ACTIONS — pinned at the bottom via mt-auto so the panel
            grows to fill any leftover vertical space; actions are
            always at the same Y coordinate across the grid. */}
        <div className="mt-auto space-y-1.5" onClick={(e) => e.stopPropagation()}>
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveEdit();
                  if (e.key === 'Escape') onCancelEdit();
                }}
                className="flex-1 min-w-0 h-8 px-2.5 rounded-sm bg-subtle outline-none text-ink text-[12.5px] font-bold tabular-nums focus:ring-2 focus:ring-accent"
              />
              <motion.button
                whileTap={tap}
                onClick={onSaveEdit}
                className="h-8 w-8 shrink-0 rounded-sm bg-accent text-on-accent grid place-items-center"
                title="Uložit"
              >
                <Check size={12} strokeWidth={2.6} />
              </motion.button>
              <motion.button
                whileTap={tap}
                onClick={onCancelEdit}
                className="h-8 w-8 shrink-0 rounded-sm bg-subtle text-ink grid place-items-center"
                title="Zrušit"
              >
                <X size={12} strokeWidth={2.4} />
              </motion.button>
            </div>
          ) : (
            <>
              {/* Primary row — Edit + Shop + Remove. Sharp-cornered
                  buttons matching the card. */}
              <div className="flex items-stretch gap-1">
                <motion.button
                  whileTap={tap}
                  onClick={onStartEdit}
                  className="flex-1 h-8 rounded-sm bg-subtle hover:bg-bg text-ink text-[11.5px] font-bold inline-flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit3 size={11} strokeWidth={2.4} />
                  Upravit
                </motion.button>
                <motion.button
                  whileTap={tap}
                  onClick={inShop ? undefined : onAddToShop}
                  className={`flex-1 h-8 rounded-sm text-[11.5px] font-bold inline-flex items-center justify-center gap-1 transition-colors ${
                    inShop
                      ? 'bg-emerald-500 text-white cursor-default'
                      : 'bg-subtle hover:bg-bg text-ink'
                  }`}
                  title={inShop ? 'Ve vašem obchodě' : 'Přidat do vašeho obchodu'}
                >
                  {inShop ? <Check size={11} strokeWidth={2.8} /> : <Store size={11} strokeWidth={2.4} />}
                  {inShop ? 'V obchodě' : 'Obchod'}
                </motion.button>
                <motion.button
                  whileTap={tap}
                  onClick={onRemove}
                  className="h-8 w-8 shrink-0 rounded-sm bg-subtle hover:bg-rose-500/15 grid place-items-center transition-colors group/del"
                  title="Odebrat nabídku"
                >
                  <Trash2
                    size={12}
                    strokeWidth={2.4}
                    className="text-ink-muted group-hover/del:text-rose-500 transition-colors"
                  />
                </motion.button>
              </div>

              {/* Private share link — the only way buyers reach a
                  private listing. Truncated URL + one-tap copy. */}
              {listing.listing_type === 'private' && listing.share_token && (
                <PrivateLinkRow token={String(listing.share_token)} />
              )}

              {/* Promote — accent pill; flips to a green "Promoted"
                  state INSTANTLY on click (optimistic, no spinner). */}
              {promoted ? (
                <motion.div
                  initial={{ scale: 0.94 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  className="w-full h-8 rounded-sm bg-emerald-500 text-white text-[11.5px] font-bold inline-flex items-center justify-center gap-1"
                >
                  <Check size={12} strokeWidth={2.8} />
                  {(() => {
                    if (!promotedUntil) return 'Promováno';
                    const days = Math.max(
                      0,
                      Math.ceil((new Date(promotedUntil).getTime() - Date.now()) / 86_400_000),
                    );
                    return `Promováno · zbývá ${days} d`;
                  })()}
                </motion.div>
              ) : (
                <motion.button
                  whileTap={tap}
                  whileHover={{ scale: 1.01 }}
                  onClick={onPromote}
                  className="w-full h-8 rounded-sm bg-accent text-on-accent text-[11.5px] font-bold inline-flex items-center justify-center"
                  style={{ boxShadow: '0 4px 12px -6px rgb(var(--accent) / 0.55)' }}
                >
                  Promote · {promoteLabel}
                </motion.button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
};

/* PrivateLinkRow — truncated share URL + copy button on private listing
   cards. The link opens the item detail page via the share-token lookup
   (private listings never appear in public browse). */
const PrivateLinkRow: React.FC<{ token: string }> = ({ token }) => {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/item/${token}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — nothing to do */
    }
  };
  return (
    <div className="flex items-stretch gap-1">
      <div
        className="flex-1 min-w-0 h-8 px-2.5 rounded-sm bg-subtle flex items-center"
        title={url}
      >
        <span className="text-[10.5px] font-semibold text-ink-muted truncate">
          {url.replace(/^https?:\/\//, '')}
        </span>
      </div>
      <motion.button
        whileTap={tap}
        onClick={copy}
        className={`h-8 px-2.5 shrink-0 rounded-sm text-[11px] font-bold inline-flex items-center gap-1 transition-colors ${
          copied
            ? 'bg-emerald-500 text-white'
            : 'bg-subtle hover:bg-bg text-ink'
        }`}
        title="Zkopírovat soukromý odkaz"
      >
        {copied ? <Check size={11} strokeWidth={2.8} /> : <Copy size={11} strokeWidth={2.4} />}
        {copied ? 'Zkopírováno' : 'Kopírovat'}
      </motion.button>
    </div>
  );
};

const SortPicker: React.FC<{ sort: Sort; onChange: (s: Sort) => void }> = ({ sort, onChange }) => {
  const [open, setOpen] = useState(false);
  const labels: Record<Sort, string> = {
    'newest': 'Nejnovější',
    'price-desc': 'Cena ↓',
    'price-asc': 'Cena ↑',
    'views': 'Nejvíce zobrazené',
  };
  return (
    <div className="relative">
      <motion.button
        whileTap={tap}
        onClick={() => setOpen((o) => !o)}
        className="h-10 px-3.5 rounded-full bg-subtle hover:bg-bg flex items-center gap-1.5 text-[12.5px] font-semibold text-ink transition-colors"
      >
        {labels[sort]}
        <ChevronDown size={13} strokeWidth={2.4} className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-20 card p-1.5 min-w-[180px] shadow-xl"
            >
              {(Object.keys(labels) as Sort[]).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    onChange(k);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-colors ${
                    sort === k ? 'bg-accent-soft text-ink' : 'text-ink-muted hover:bg-subtle hover:text-ink'
                  }`}
                >
                  {labels[k]}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListingsTab;
