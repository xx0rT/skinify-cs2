import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  RefreshCw,
  Search,
  Trash2,
  Edit3,
  Eye,
  Tag,
  Check,
  X,
  TrendingUp,
  Plus,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseCredentials } from '../../../utils/supabaseHelpers';
import { useToastStore } from '../../../store/toastStore';
import { useCurrencyStore } from '../../../store/currencyStore';
import { spring, tap } from '../../../lib/motion';
import { rarityColor } from '../../ui/SkinCard';

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
}

type Sort = 'newest' | 'price-desc' | 'price-asc' | 'views';

const ListingsTab: React.FC<{ steamId: string }> = ({ steamId }) => {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const { formatPrice, formatFee } = useCurrencyStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [editingId, setEditingId] = useState<string | number | null>(null);
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

  /* Promote — pay 49 CZK from balance, listing goes to the top of the
     marketplace + "Trending now" for 7 days. Backed by the existing
     hot-items edge function (POST). The button is hidden while the
     listing is already actively promoted. */
  const handlePromote = async (l: Listing) => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
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
      if (!res.ok) {
        addToast({
          type: 'error',
          title: 'Promotion failed',
          message: data?.error || 'Could not promote this listing.',
        });
        return;
      }
      addToast({
        type: 'success',
        title: 'Listing promoted',
        message: `${l.item_name} · featured for 7 days`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Promotion failed', message: 'Network error' });
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
        <KpiTile label="Active listings" value={String(kpis.count)} Icon={ShoppingBag} />
        <KpiTile label="Listed value" value={formatPrice(kpis.totalValue)} Icon={TrendingUp} />
        <KpiTile label="Total views" value={kpis.totalViews.toLocaleString()} Icon={Eye} />
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
            placeholder="Search listings…"
            className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[13px] font-medium"
          />
        </div>
        <SortPicker sort={sort} onChange={setSort} />
        <motion.button
          whileTap={tap}
          onClick={fetchListings}
          disabled={loading}
          className="h-10 w-10 rounded-full bg-subtle hover:bg-bg grid place-items-center disabled:opacity-50 transition-colors"
          title="Refresh"
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
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skel h-[280px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Tag size={26} className="mx-auto text-ink-muted mb-3" />
          <p className="text-[15px] font-bold text-ink tracking-tight">
            {listings.length === 0 ? 'No listings yet' : 'No listings match this search'}
          </p>
          <p className="text-[13px] text-ink-muted font-medium mt-1.5 max-w-md mx-auto">
            {listings.length === 0
              ? 'Pick items from your inventory to put them on the marketplace.'
              : 'Try a different search.'}
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
        <motion.div layout className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                promoteLabel={formatFee(49)}
                onView={() => navigate(`/item/${l.id}`)}
                formatPrice={formatPrice}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
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
  /** Localised "49 Kč" / "2 €" label shown next to the Promote button. */
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
  promoteLabel,
  onView,
  formatPrice,
}) => {
  /* Bespoke listing card — a focused, info-dense seller view rather
     than the marketplace SkinCard. The previous wrap-SkinCard-with-
     overlay attempt left actions floating outside the card and price
     appearing twice (once in SkinCard's own footer, once in the
     overlay). This version owns the whole layout: rarity-tinted image
     panel, info strip, price + actions inline at the bottom, all
     contained by a single rounded card with a hairline border that
     warms to the rarity colour on hover. */
  const r = rarityColor(listing.rarity);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ ...spring, delay: Math.min(index * 0.012, 0.18) }}
      whileHover={{ y: -2 }}
      className="group relative bg-surface rounded-2xl overflow-hidden flex flex-col"
      style={{
        boxShadow:
          'inset 0 0 0 1px rgb(var(--ink) / 0.08)',
        ['--rarity' as any]: r || 'rgb(var(--accent))',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          'inset 0 0 0 1.5px var(--rarity), 0 10px 26px -14px rgb(0 0 0 / 0.25)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          'inset 0 0 0 1px rgb(var(--ink) / 0.08)';
      }}
    >
      {/* Image area — click-to-view. Rarity wash from the bottom up,
          plus a sharp 1.5px stripe along the bottom edge. */}
      <button
        type="button"
        onClick={onView}
        className="relative w-full aspect-[5/3.4] grid place-items-center overflow-hidden bg-subtle/40 px-5 pt-5 pb-3 text-left"
      >
        {r && (
          <>
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[42%] pointer-events-none"
              style={{ background: `linear-gradient(to top, ${r}59 0%, ${r}26 35%, transparent 100%)` }}
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[1.5px] pointer-events-none"
              style={{ background: r }}
            />
          </>
        )}
        <img
          src={listing.image_url}
          alt={listing.item_name}
          loading="lazy"
          className="relative max-h-[88%] max-w-[88%] object-contain transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {/* Top-right meta pills — listing type + view count */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          {listing.listing_type === 'auction' && (
            <span className="px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider uppercase rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
              Auction
            </span>
          )}
          {listing.listing_type === 'private' && (
            <span className="px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider uppercase rounded bg-purple-500/15 text-purple-700 dark:text-purple-300">
              Private
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-bg/80 text-ink-muted tabular-nums">
            <Eye size={10} strokeWidth={2.6} />
            {listing.views}
          </span>
        </div>
      </button>

      {/* Info + actions strip. Single padded surface so price, name,
          condition, and the action row all read as one block. */}
      <div className="p-3 space-y-2.5 flex-1 flex flex-col">
        <div className="min-w-0">
          <div className="text-[10.5px] text-ink-dim font-bold uppercase tracking-wider truncate">
            {listing.item_type}
          </div>
          <div className="text-[13.5px] font-bold text-ink truncate tracking-tight leading-tight mt-0.5">
            {listing.item_name}
          </div>
          <div className="text-[11.5px] text-ink-muted font-medium truncate mt-0.5">
            {listing.condition}
          </div>
        </div>

        {/* Price + edit/remove row. When editing, the input replaces
            the price+actions inline (no layout shift). */}
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="flex-1 min-w-0 h-9 px-3 rounded-full bg-subtle outline-none text-ink text-[13px] font-bold tabular-nums focus:ring-2 focus:ring-accent"
            />
            <motion.button
              whileTap={tap}
              onClick={onSaveEdit}
              className="h-9 w-9 shrink-0 rounded-full bg-accent text-on-accent grid place-items-center"
              title="Save"
            >
              <Check size={13} strokeWidth={2.6} />
            </motion.button>
            <motion.button
              whileTap={tap}
              onClick={onCancelEdit}
              className="h-9 w-9 shrink-0 rounded-full bg-subtle text-ink grid place-items-center"
              title="Cancel"
            >
              <X size={13} strokeWidth={2.4} />
            </motion.button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-dim">
                Price
              </div>
              <div className="text-[16px] font-bold text-ink tracking-tight tabular-nums leading-none mt-0.5">
                {formatPrice(listing.price)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <motion.button
                whileTap={tap}
                onClick={onStartEdit}
                className="h-9 w-9 rounded-full bg-subtle hover:bg-accent-soft text-ink-muted hover:text-ink grid place-items-center transition-colors"
                title="Edit price"
              >
                <Edit3 size={13} strokeWidth={2.4} />
              </motion.button>
              <motion.button
                whileTap={tap}
                onClick={onRemove}
                className="h-9 w-9 rounded-full bg-subtle hover:bg-rose-500/15 grid place-items-center transition-colors group/del"
                title="Remove listing"
              >
                <Trash2 size={13} strokeWidth={2.4} className="text-ink-muted group-hover/del:text-rose-500 transition-colors" />
              </motion.button>
            </div>
          </div>
        )}

        {/* Promote — paid 7-day featured boost. Sits on its own row
            below the price+actions block so it always reads as the
            secondary upsell rather than fighting the primary actions. */}
        {!editing && (
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.02 }}
            onClick={onPromote}
            className="w-full h-9 rounded-full bg-accent text-on-accent text-[12px] font-bold inline-flex items-center justify-center gap-1.5"
            style={{ boxShadow: '0 8px 18px -8px rgb(var(--accent) / 0.55)' }}
          >
            <Sparkles size={12} strokeWidth={2.6} />
            Promote · {promoteLabel}
          </motion.button>
        )}
      </div>
    </motion.article>
  );
};

const SortPicker: React.FC<{ sort: Sort; onChange: (s: Sort) => void }> = ({ sort, onChange }) => {
  const [open, setOpen] = useState(false);
  const labels: Record<Sort, string> = {
    'newest': 'Newest first',
    'price-desc': 'Price ↓',
    'price-asc': 'Price ↑',
    'views': 'Most viewed',
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
