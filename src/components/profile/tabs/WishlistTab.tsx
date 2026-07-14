import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Trash2,
  ShoppingBag,
  ExternalLink,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import { useCartStore } from '../../../store/cartStore';
import { useCurrencyStore } from '../../../store/currencyStore';
import { spring, tap } from '../../../lib/motion';
import { rarityColor } from '../../ui/SkinCard';

/* ─────────────────────────────────────────────────────────────────────────
   WishlistTab
   - Fetches wishlist_items + the referenced marketplace_listings rows
   - Search by name, sort by added-date / price asc / price desc
   - Inline remove + add-to-cart, click-to-view-item
   - Empty state with browse CTA
   ───────────────────────────────────────────────────────────────────────── */

interface WishRow {
  id: string;
  listing_id: string;
  created_at: string;
  listing: {
    id: string;
    item_name: string;
    price: number;
    wear: string;
    float_value: number | null;
    stattrak: boolean;
    image_url: string;
    rarity?: string;
    type?: string;
    seller_steam_id: string;
  } | null;
}

type Sort = 'newest' | 'price-asc' | 'price-desc';

const WishlistTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { addItem } = useCartStore();
  const { formatPrice } = useCurrencyStore();

  const [rows, setRows] = useState<WishRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('newest');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.steamId) return;
      setLoading(true);
      try {
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('steam_id', user.steamId)
          .maybeSingle();
        if (!userRow) return;

        const { data: wish } = await supabase
          .from('wishlist_items')
          .select('id, listing_id, created_at')
          .eq('user_id', userRow.id)
          .order('created_at', { ascending: false });

        const ids = (wish || []).map((w: any) => w.listing_id);
        let listingsMap = new Map<string, any>();
        if (ids.length > 0) {
          const { data: listings } = await supabase
            .from('marketplace_listings')
            .select('id, item_name, price, condition, float_value, image_url, rarity, item_type, seller_steam_id')
            .in('id', ids);
          (listings || []).forEach((l: any) =>
            listingsMap.set(String(l.id), {
              id: String(l.id),
              item_name: l.item_name,
              price: Number(l.price),
              wear: l.condition,
              float_value: l.float_value,
              stattrak: String(l.item_name || '').includes('StatTrak'),
              image_url: l.image_url,
              rarity: l.rarity,
              type: l.item_type,
              seller_steam_id: l.seller_steam_id,
            }),
          );
        }

        if (cancelled) return;
        setRows(
          (wish || []).map((w: any) => ({
            id: String(w.id),
            listing_id: String(w.listing_id),
            created_at: w.created_at,
            listing: listingsMap.get(String(w.listing_id)) || null,
          })),
        );
      } catch (err) {
        console.error('[wishlist] load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.steamId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter(
      (r) => r.listing && (!q || r.listing.item_name.toLowerCase().includes(q)),
    );
    switch (sort) {
      case 'price-asc':
        out = [...out].sort((a, b) => (a.listing?.price || 0) - (b.listing?.price || 0));
        break;
      case 'price-desc':
        out = [...out].sort((a, b) => (b.listing?.price || 0) - (a.listing?.price || 0));
        break;
      default:
        out = [...out].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return out;
  }, [rows, query, sort]);

  const totalValue = useMemo(
    () => filtered.reduce((s, r) => s + (r.listing?.price || 0), 0),
    [filtered],
  );

  const handleRemove = async (row: WishRow) => {
    try {
      await supabase.from('wishlist_items').delete().eq('id', row.id);
      setRows((cur) => cur.filter((r) => r.id !== row.id));
      addToast({ type: 'success', title: 'Removed from wishlist' });
    } catch {
      addToast({ type: 'error', title: 'Could not remove item' });
    }
  };

  const handleAdd = (row: WishRow) => {
    if (!row.listing) return;
    addItem({
      id: row.listing.id,
      name: row.listing.item_name,
      price: row.listing.price,
      image: row.listing.image_url,
      condition: row.listing.wear,
      rarity: row.listing.rarity || 'Mil-Spec',
      type: row.listing.type || 'Unknown',
      seller: { steamId: row.listing.seller_steam_id, name: 'Seller' },
    } as any);
    addToast({ type: 'success', title: 'Added to cart', message: row.listing.item_name });
  };

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="card p-5 md:p-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-eyebrow">Sledované</span>
          <h3 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-ink mt-2 leading-none">
            {loading ? '—' : `${filtered.length} ${filtered.length === 1 ? 'položka' : filtered.length <= 4 ? 'položky' : 'položek'}`}
          </h3>
          <p className="text-[12.5px] text-ink-muted font-medium mt-1.5">
            {filtered.length > 0
              ? `Celková hodnota · ${formatPrice(totalValue)}`
              : 'Označené skiny se sledují tady'}
          </p>
        </div>
        <motion.button
          whileTap={tap}
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/marketplace')}
          className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] flex items-center gap-1.5"
          style={{ boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.6)' }}
        >
          <Search size={14} strokeWidth={2.4} />
          Browse market
        </motion.button>
      </div>

      {/* Toolbar */}
      <div className="card p-2 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-3 px-3 h-11">
          <Search size={16} strokeWidth={2} className="text-ink-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat v oblíbených…"
            className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[13.5px] font-medium"
          />
        </div>
        <SortPicker value={sort} onChange={setSort} />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skel h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Heart size={28} strokeWidth={2} className="mx-auto text-ink-muted mb-3" />
          <p className="text-[15px] font-bold text-ink tracking-tight">
            {query ? 'Nic nenalezeno' : 'Váš seznam oblíbených je prázdný'}
          </p>
          <p className="text-[13px] text-ink-muted font-medium mt-1">
            {query
              ? 'Zkuste jiný výraz.'
              : 'Projděte tržiště a klepněte na srdíčko u skinů, které chcete sledovat.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map((row) => (
              <WishRow
                key={row.id}
                row={row}
                onRemove={() => handleRemove(row)}
                onAdd={() => handleAdd(row)}
                onView={() => row.listing && navigate(`/item/${row.listing.id}`)}
                formatPrice={formatPrice}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const WishRow: React.FC<{
  row: WishRow;
  onRemove: () => void;
  onAdd: () => void;
  onView: () => void;
  formatPrice: (n: number) => string;
}> = ({ row, onRemove, onAdd, onView, formatPrice }) => {
  if (!row.listing) return null;
  const color = rarityColor(row.listing.rarity);
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
      transition={spring}
      className="card p-3 flex items-center gap-3 group"
    >
      <button
        onClick={onView}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-subtle grid place-items-center overflow-hidden shrink-0 hover:bg-bg transition-colors"
      >
        <img
          src={row.listing.image_url}
          alt=""
          className="w-[85%] h-[85%] object-contain transition-transform group-hover:scale-105"
        />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-[10px] uppercase tracking-wider font-bold truncate" style={{ color }}>
            {row.listing.rarity || 'Standard'}
          </span>
          {row.listing.wear && (
            <span className="text-[10px] text-ink-dim font-semibold">· {row.listing.wear}</span>
          )}
        </div>
        <button
          onClick={onView}
          className="text-[14px] font-bold text-ink truncate tracking-tight text-left hover:text-accent transition-colors"
        >
          {row.listing.item_name}
        </button>
        <div className="text-[11px] text-ink-dim font-medium mt-0.5">
          Added {new Date(row.created_at).toLocaleDateString()}
        </div>
      </div>

      <div className="text-right shrink-0 hidden sm:block">
        <div className="text-[15px] font-bold text-ink tabular-nums tracking-tight">
          {formatPrice(row.listing.price)}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <motion.button
          whileTap={tap}
          onClick={onView}
          aria-label="View item"
          className="hidden sm:grid icon-chip-sm hover:bg-bg transition-colors"
        >
          <ExternalLink size={14} className="text-ink-muted" />
        </motion.button>
        <motion.button
          whileTap={tap}
          onClick={onAdd}
          className="h-9 px-3 rounded-full bg-accent text-on-accent text-[12px] font-bold flex items-center gap-1.5"
        >
          <ShoppingBag size={13} strokeWidth={2.4} />
          <span className="hidden sm:inline">Add</span>
        </motion.button>
        <motion.button
          whileTap={tap}
          onClick={onRemove}
          aria-label="Remove from wishlist"
          className="icon-chip-sm hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 text-ink-muted transition-colors"
        >
          <Trash2 size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
};

const SortPicker: React.FC<{ value: Sort; onChange: (s: Sort) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const OPTS: { id: Sort; label: string }[] = [
    { id: 'newest', label: 'Nejnovější' },
    { id: 'price-desc', label: 'Cena · od nejvyšší' },
    { id: 'price-asc', label: 'Cena · od nejnižší' },
  ];
  return (
    <div className="relative">
      <motion.button
        whileTap={tap}
        onClick={() => setOpen((v) => !v)}
        className="h-11 px-3 sm:px-4 rounded-full bg-subtle hover:bg-bg text-[13px] text-ink font-semibold flex items-center gap-2 transition-colors"
      >
        <ArrowUpDown size={14} strokeWidth={2.2} />
        <span className="hidden sm:inline">{OPTS.find((o) => o.id === value)?.label}</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="card-elevated absolute right-0 mt-2 w-52 p-1.5 z-20"
            onMouseLeave={() => setOpen(false)}
          >
            {OPTS.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className={`w-full h-10 px-3 rounded-2xl text-left text-[13px] font-semibold transition-colors ${
                  value === o.id ? 'bg-accent-soft text-ink' : 'text-ink-muted hover:bg-subtle hover:text-ink'
                }`}
              >
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WishlistTab;
