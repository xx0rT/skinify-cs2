import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  RefreshCw,
  Search,
  ExternalLink,
  Tag,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { getSupabaseCredentials } from '../../../utils/supabaseHelpers';
import { useToastStore } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import { useCurrencyStore } from '../../../store/currencyStore';
import { spring, tap } from '../../../lib/motion';
import { SkinCard } from '../../ui/SkinCard';
import { ListItemModal, ListingData } from '../../marketplace/ListItemModal';

/* ─────────────────────────────────────────────────────────────────────────
   InventoryTab — redesigned
   - Hero strip: KPI tiles (items, listed, est. value)
   - Toolbar: rarity-pill filter + condition pill filter + search + sort
   - Item cards: rarity-tinted top bar, large image, name, condition,
     est. value, primary CTA (List for sale / Already listed)
   - Bulk-list: select items + bulk list button
   - Empty state with refresh + open Steam inventory CTAs
   ───────────────────────────────────────────────────────────────────────── */

interface InvItem {
  id: string;
  asset_id: string;
  name: string;
  market_name: string;
  type: string;
  rarity: string;
  condition: string;
  image: string;
  price_estimate: number;
  tradable: boolean;
  marketable: boolean;
  listed_for_sale: boolean;
  /** Steam `csgo_econ_action_preview` URL captured from the inventory
      API. Carried through to listing creation so the marketplace card
      can later resolve real float + paint seed via /skin-float. */
  inspect_link?: string;
}

type Sort = 'value-desc' | 'value-asc' | 'name';
const RARITIES = ['all', 'Covert', 'Classified', 'Restricted', 'Mil-Spec', 'Industrial Grade', 'Consumer Grade'];

const InventoryTab: React.FC<{ steamId: string }> = ({ steamId }) => {
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();
  const [items, setItems] = useState<InvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState('all');
  const [sort, setSort] = useState<Sort>('value-desc');
  const [showListModal, setShowListModal] = useState(false);
  const [modalItems, setModalItems] = useState<InvItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInv();
  }, [steamId]);

  const fetchInv = async () => {
    setLoading(true);
    setError(null);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/user-inventory?steamId=${steamId}`, {
        headers: { Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Inventory fetch failed');
      const data = await res.json();

      const listingsRes = await fetch(
        `${supabaseUrl}/functions/v1/marketplace-listings?steamId=${steamId}&userOnly=true`,
        { headers: { Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' } },
      );
      const listedIds = new Set<string>();
      if (listingsRes.ok) {
        const lj = await listingsRes.json();
        (lj.items || []).forEach((i: any) => listedIds.add(i.asset_id));
      }

      const mapped: InvItem[] = (data.items || [])
        .filter((it: any) => it && it.name && it.image)
        .map((it: any) => {
          const aid = it.assetid || it.id;
          return {
            id: it.id || `${aid}_${Date.now()}`,
            asset_id: aid,
            name: it.name,
            market_name: it.market_name || it.name,
            type: it.type || 'Unknown',
            rarity: it.rarity || 'Consumer Grade',
            condition: it.condition || 'Not Painted',
            image: it.image,
            price_estimate: Number(it.price_estimate || 0),
            tradable: it.tradable !== false,
            marketable: it.marketable !== false,
            listed_for_sale: listedIds.has(aid),
            inspect_link: it.inspect_link || it.inspectLink || undefined,
          };
        });

      setItems(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = items.filter((i) => {
      if (rarity !== 'all' && i.rarity !== rarity) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        i.condition.toLowerCase().includes(q)
      );
    });
    if (sort === 'value-desc') arr = arr.sort((a, b) => b.price_estimate - a.price_estimate);
    if (sort === 'value-asc') arr = arr.sort((a, b) => a.price_estimate - b.price_estimate);
    if (sort === 'name') arr = arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [items, query, rarity, sort]);

  const kpis = useMemo(() => {
    const total = items.length;
    const listed = items.filter((i) => i.listed_for_sale).length;
    const value = items.reduce((s, i) => s + (i.price_estimate || 0), 0);
    return { total, listed, value };
  }, [items]);

  const openListModal = (...itemsToList: InvItem[]) => {
    /* Gate listing creation behind a linked Steam account.
       Email-signup users won't have steamId set; they need to link
       their Steam profile first because the trade offer + escrow flow
       can only target a Steam account. */
    const { user } = useAuthStore.getState();
    if (!user?.steamId) {
      addToast({
        type: 'warning',
        title: 'Link your Steam account first',
        message:
          'Listings deliver via Steam trade offers. Open Settings → Linked accounts to connect Steam.',
        duration: 6000,
      });
      return;
    }
    setModalItems(itemsToList);
    setShowListModal(true);
  };

  const handleConfirmListing = async (listings: ListingData[]) => {
    const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

    /* Submit listings with a healthy concurrency window. Earlier this
       was capped at 2 (an over-correction after some 500s under burst
       load), which made bulk listings feel sluggish — listing 40 items
       took the better part of a minute serially. 8 workers stays well
       under PostgREST/db pool limits while turning a 40-item submit
       into ~5 batches.

       Each POST has a 15s timeout and a one-shot retry with jittered
       backoff on 5xx / network errors, since most failures under load
       are transient. */
    const CONCURRENCY = 8;
    const TIMEOUT_MS = 15000;
    const RETRY_BACKOFF_MS = 600;

    const postOnce = async (body: any, signal: AbortSignal) =>
      fetch(`${supabaseUrl}/functions/v1/marketplace-listings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });

    const submitOne = async (info: ListingData): Promise<'ok' | 'fail'> => {
      const item = items.find((it) => it.id === info.itemId);
      if (!item) return 'fail';
      const body: any = {
        steam_id: steamId,
        asset_id: item.asset_id,
        market_hash_name: item.market_name,
        item_name: item.name,
        item_type: item.type,
        rarity: item.rarity,
        condition: item.condition,
        price: info.price,
        image_url: item.image,
        description: info.description || `${item.condition} ${item.name}`,
        listing_type: info.listingType === 'auction' ? 'auction' : 'standard',
        /* Inspect link travels with the listing so post-list it can
           be used for real float lookups in /functions/v1/skin-float. */
        inspect_link: item.inspect_link,
      };
      if (info.visibility === 'private') body.listing_type = 'private';

      const attempt = async (): Promise<{ ok: boolean; transient: boolean }> => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        try {
          const res = await postOnce(body, ctrl.signal);
          if (res.ok) return { ok: true, transient: false };
          /* Log the server's actual error so we can fix the root cause
             instead of guessing from 500s in the network panel. */
          try {
            const txt = await res.text();
            console.error(
              `[list ${item.name}] ${res.status}: ${txt.slice(0, 400)}`,
            );
          } catch {
            /* ignore — non-text body */
          }
          /* 5xx is worth retrying; 4xx (validation, KYC, conflict) is not. */
          return { ok: false, transient: res.status >= 500 };
        } catch {
          /* Network / abort — treat as transient. */
          return { ok: false, transient: true };
        } finally {
          clearTimeout(timer);
        }
      };

      let r = await attempt();
      if (!r.ok && r.transient) {
        await new Promise((res) =>
          setTimeout(res, RETRY_BACKOFF_MS + Math.random() * 400),
        );
        r = await attempt();
      }
      if (!r.ok) return 'fail';

      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, listed_for_sale: true } : p)),
      );
      return 'ok';
    };

    /* Concurrency-limited fan-out: workers pull from a shared queue. */
    let cursor = 0;
    const results: ('ok' | 'fail')[] = [];
    const worker = async () => {
      while (cursor < listings.length) {
        const idx = cursor++;
        results[idx] = await submitOne(listings[idx]);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, listings.length) }, worker),
    );

    const ok = results.filter((r) => r === 'ok').length;
    const fail = results.filter((r) => r === 'fail').length;

    if (ok > 0) {
      addToast({
        type: 'success',
        title: ok === 1 ? 'Listed' : 'Listed items',
        message: `${ok} item${ok === 1 ? '' : 's'} listed${fail ? `, ${fail} failed` : ''}`,
      });
    } else if (fail > 0) {
      addToast({ type: 'error', title: 'Failed to list', message: `${fail} item${fail === 1 ? '' : 's'} failed` });
    }
    setShowListModal(false);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    /* Untradable items can never be listed for sale on Skinify because Steam
       blocks the trade offer. Already-listed items can't be re-listed.
       Either case → reject the click and surface a hint. */
    if (!item.tradable) {
      addToast({
        type: 'warning',
        title: 'Untradable',
        message: 'This item can\'t be traded on Steam, so it can\'t be listed for sale.',
      });
      return;
    }
    if (item.listed_for_sale) {
      addToast({
        type: 'info',
        title: 'Already listed',
        message: 'Remove the existing listing first from the Listings tab.',
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { user } = useAuthStore();
  const steamLinked = !!user?.steamId;

  return (
    <div className="space-y-4">
      {!steamLinked && <SteamLinkBanner />}

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="grid grid-cols-3 gap-3"
      >
        <KpiTile label="Items" value={String(kpis.total)} Icon={Package} sub={`${kpis.listed} listed`} />
        <KpiTile label="Listed for sale" value={String(kpis.listed)} Icon={Tag} sub={`${kpis.total - kpis.listed} available`} />
        <KpiTile label="Est. value" value={formatPrice(kpis.value)} Icon={TrendingUp} sub="Across all items" />
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.05 }}
        className="card p-3 space-y-2.5"
      >
        {/* Row 1: search + actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 h-10 px-3.5 rounded-full bg-subtle">
            <Search size={14} strokeWidth={2} className="text-ink-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items by name, type, condition…"
              className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[13px] font-medium"
            />
          </div>
          <SortPicker sort={sort} onChange={setSort} />
          <motion.button
            whileTap={tap}
            onClick={fetchInv}
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
            onClick={() => window.open(`https://steamcommunity.com/profiles/${steamId}/inventory/`, '_blank')}
            className="h-10 px-3.5 rounded-full bg-subtle hover:bg-bg flex items-center gap-1.5 text-[12.5px] font-semibold text-ink transition-colors"
            title="Open Steam inventory"
          >
            <ExternalLink size={13} strokeWidth={2.2} />
            <span className="hidden sm:inline">Steam</span>
          </motion.button>
        </div>

        {/* Row 2: rarity pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-0.5">
          {RARITIES.map((r) => {
            const active = rarity === r;
            return (
              <motion.button
                whileTap={tap}
                key={r}
                onClick={() => setRarity(r)}
                className={`relative h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="inv-rarity-pill"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={spring}
                  />
                )}
                <span className="relative">{r === 'all' ? 'All rarities' : r}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Selected bar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-accent-soft">
                <div className="text-[12.5px] font-semibold text-ink">
                  {selected.size} selected
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-[12px] font-semibold text-ink-muted hover:text-ink px-2"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      const picked = items.filter((it) => selected.has(it.id) && !it.listed_for_sale && it.tradable);
                      if (picked.length === 0) {
                        addToast({ type: 'warning', title: 'Nothing to list', message: 'Selected items are already listed or untradable.' });
                        return;
                      }
                      openListModal(...picked);
                    }}
                    className="h-8 px-3 rounded-full bg-accent text-on-accent text-[12px] font-bold"
                  >
                    List selected
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Grid / states */}
      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <div className="card p-12 text-center">
          <Package size={28} className="mx-auto text-rose-500 mb-3" />
          <p className="text-[15px] font-bold text-ink">{error}</p>
          <button
            onClick={fetchInv}
            className="mt-4 h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Sparkles size={26} className="mx-auto text-ink-muted mb-3" />
          <p className="text-[15px] font-bold text-ink tracking-tight">
            {items.length === 0 ? 'Your inventory is empty' : 'No items match this filter'}
          </p>
          <p className="text-[13px] text-ink-muted font-medium mt-1.5 max-w-md mx-auto">
            {items.length === 0
              ? 'Make sure your Steam inventory is set to public, then refresh.'
              : 'Try a different rarity or clear your search.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={fetchInv}
              className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5"
            >
              <RefreshCw size={13} strokeWidth={2.4} />
              Refresh
            </button>
            <button
              onClick={() => window.open(`https://steamcommunity.com/profiles/${steamId}/inventory/`, '_blank')}
              className="h-10 px-4 rounded-full bg-subtle text-ink text-[13px] font-bold inline-flex items-center gap-1.5"
            >
              <ExternalLink size={13} strokeWidth={2.4} />
              Open Steam
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          layout
          className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => (
              <ItemCard
                key={item.id}
                item={item}
                index={i}
                selected={selected.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                onList={() => openListModal(item)}
                formatPrice={formatPrice}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* List modal */}
      {showListModal && modalItems.length > 0 && (
        <ListItemModal
          isOpen={showListModal}
          onClose={() => setShowListModal(false)}
          items={modalItems.map((it) => ({
            id: it.id,
            asset_id: it.asset_id,
            name: it.name,
            market_name: it.market_name,
            type: it.type,
            rarity: it.rarity,
            condition: it.condition,
            wear: it.condition,
            image: it.image,
            price_estimate: it.price_estimate,
            tradable: it.tradable,
            marketable: it.marketable,
            listed_for_sale: it.listed_for_sale,
            last_updated: '',
          })) as any}
          onConfirmListing={handleConfirmListing}
        />
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
  sub: string;
  Icon: React.ComponentType<any>;
}> = ({ label, value, sub, Icon }) => (
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
    <div className="text-[11.5px] text-ink-dim font-medium mt-1.5">{sub}</div>
  </motion.div>
);

/* Uses the marketplace SkinCard for the visual so inventory tiles
   look identical to listings everywhere else on the site. Adds an
   inventory-only overlay (selection check / listed badge / untradable
   badge) and a "List" action stacked beneath the card. */
const ItemCard: React.FC<{
  item: InvItem;
  index: number;
  selected: boolean;
  onToggleSelect: () => void;
  onList: () => void;
  formatPrice: (n: number) => string;
}> = ({ item, index, selected, onToggleSelect, onList, formatPrice }) => {
  const blocked = !item.tradable || item.listed_for_sale;
  const cardItem = {
    id: String(item.id),
    name: item.name,
    market_name: item.name,
    image: item.image,
    price: Number(item.price_estimate || 0),
    type: item.type,
    rarity: item.rarity,
    condition: item.condition,
    seller: { steamId: '', name: '', online: false },
  } as any;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ ...spring, delay: Math.min(index * 0.012, 0.18) }}
      className={`space-y-2 ${blocked ? 'opacity-70' : ''}`}
    >
      <div
        onClick={blocked ? undefined : onToggleSelect}
        className={`relative rounded-3xl transition-shadow ${
          blocked ? 'cursor-not-allowed' : 'cursor-pointer'
        } ${selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}
      >
        <SkinCard
          variant="tile"
          hoverLift={false}
          item={cardItem}
          /* Suppress in-card navigation; we want the wrapper's
             onClick to drive selection instead. */
          onView={() => {
            if (!blocked) onToggleSelect();
          }}
          formatPrice={formatPrice}
        />
        {item.listed_for_sale && (
          <span className="absolute top-3 left-3 pill bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1 z-10">
            <CheckCircle2 size={11} strokeWidth={2.4} />
            Listed
          </span>
        )}
        {!item.tradable && (
          <span className="absolute top-3 left-3 pill bg-rose-500/15 text-rose-700 dark:text-rose-300 z-10">
            Untradable
          </span>
        )}
        {!blocked && (
          <div
            className={`absolute top-3 right-3 w-6 h-6 rounded-full grid place-items-center transition-all z-10 ${
              selected
                ? 'bg-accent text-on-accent'
                : 'bg-bg/80 text-transparent opacity-0 hover:opacity-100'
            }`}
          >
            <CheckCircle2 size={12} strokeWidth={2.6} />
          </div>
        )}
      </div>
      {!item.listed_for_sale && item.tradable && (
        <motion.button
          whileTap={tap}
          onClick={onList}
          className="w-full h-9 rounded-full bg-accent text-on-accent text-[12px] font-bold inline-flex items-center justify-center gap-1.5"
        >
          <Tag size={12} strokeWidth={2.4} />
          List item
        </motion.button>
      )}
    </motion.div>
  );
};

const SortPicker: React.FC<{ sort: Sort; onChange: (s: Sort) => void }> = ({ sort, onChange }) => {
  const [open, setOpen] = useState(false);
  const labels: Record<Sort, string> = {
    'value-desc': 'High to low',
    'value-asc': 'Low to high',
    'name': 'Name (A-Z)',
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

const SkeletonGrid: React.FC = () => (
  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="skel" style={{ aspectRatio: '5 / 6.4' }} />
    ))}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   SteamLinkBanner — shown to email-signup users who haven't connected
   Steam yet. Listings require Steam because the trade offer + escrow
   handoff target a Steam account. Tapping Link Steam restarts the
   OpenID flow with ?mode=link so we attach the steamId to the current
   authenticated user instead of starting a fresh sign-in.
   ───────────────────────────────────────────────────────────────────────── */
const SteamLinkBanner: React.FC = () => {
  // Lazy import via dynamic-require pattern to avoid a top-level cycle
  // when this file is imported by routes that don't need credentialAuth.
  const onLink = () => {
    import('../../../utils/credentialAuth').then((mod) => mod.startSteamLink());
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
    >
      <div className="w-11 h-11 rounded-2xl bg-accent-soft text-accent grid place-items-center shrink-0">
        <Tag size={18} strokeWidth={2.4} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-ink tracking-tight">
          Link your Steam account to start listing
        </div>
        <p className="text-[12.5px] text-ink-muted font-medium mt-0.5 leading-relaxed">
          You can browse and buy as you are. Listings deliver via Steam trade
          offers, so we need to connect your Steam profile first.
        </p>
      </div>
      <motion.button
        whileTap={tap}
        whileHover={{ scale: 1.02 }}
        onClick={onLink}
        className="h-10 px-4 rounded-full bg-accent text-on-accent font-bold text-[12.5px] inline-flex items-center justify-center gap-1.5 shrink-0"
        style={{ boxShadow: '0 10px 22px -12px rgb(var(--accent) / 0.55)' }}
      >
        Link Steam
      </motion.button>
    </motion.div>
  );
};

export default InventoryTab;
