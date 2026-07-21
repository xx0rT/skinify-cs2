import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Search,
  Package,
  Loader,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import { CachedImage } from '../ui/CachedImage';

interface InventoryItem {
  id: string;
  /** The user-inventory edge function returns this field as `assetid`
      (no underscore) — kept optional here and resolved via
      itemAssetId() below so a future rename doesn't silently
      reintroduce the null-asset_id trade_items insert failure. */
  asset_id?: string;
  assetid?: string;
  name: string;
  market_name: string;
  type: string;
  rarity: string;
  condition: string;
  image: string;
  price_estimate: number;
  tradable: boolean;
  marketable: boolean;
  float?: string;
  pattern?: string;
  stickers?: any[];
}

interface TradeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientSteamId: string;
  recipientName: string;
}

/**
 * TradeOfferModal — compact, no-scroll-on-open layout, using the same
 * design tokens (bg-surface/bg-subtle/text-ink/bg-accent/ring-line) as
 * the rest of the site instead of a one-off dark-purple palette. The
 * previous hardcoded gray-900/purple-600 theme looked broken on mobile
 * because it didn't respond to the site's light/dark tokens at all.
 *
 *   - caps overall height at 88dvh; only the item grids scroll
 *     internally, header/price-bar/actions stay pinned.
 *   - dense 3-column item grid with small thumbnails.
 */
const TradeOfferModal: React.FC<TradeOfferModalProps> = ({
  isOpen,
  onClose,
  recipientSteamId,
  recipientName,
}) => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();

  const [myInventory, setMyInventory] = useState<InventoryItem[]>([]);
  const [recipientInventory, setRecipientInventory] = useState<InventoryItem[]>([]);
  const [selectedMyItems, setSelectedMyItems] = useState<string[]>([]);
  const [selectedRecipientItems, setSelectedRecipientItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [mySearch, setMySearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchInventories();
    }
    if (!isOpen) {
      setSelectedMyItems([]);
      setSelectedRecipientItems([]);
      setNotes('');
      setMySearch('');
      setRecipientSearch('');
    }
  }, [isOpen, user]);

  const fetchInventories = async () => {
    if (!user?.steamId) return;

    setLoading(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const [myInvResponse, recipientInvResponse] = await Promise.all([
        fetch(`${supabaseUrl}/functions/v1/user-inventory?steamId=${user.steamId}`, {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${supabaseUrl}/functions/v1/user-inventory?steamId=${recipientSteamId}`, {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (myInvResponse.ok) {
        const myData = await myInvResponse.json();
        setMyInventory(myData.items.filter((item: InventoryItem) => item.tradable));
      }

      if (recipientInvResponse.ok) {
        const recipientData = await recipientInvResponse.json();
        setRecipientInventory(recipientData.items.filter((item: InventoryItem) => item.tradable));
      }
    } catch (error) {
      console.error('Failed to fetch inventories:', error);
      addToast({
        type: 'error',
        title: 'Failed to Load',
        message: 'Could not load inventories',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMyItem = (itemId: string) => {
    setSelectedMyItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleRecipientItem = (itemId: string) => {
    setSelectedRecipientItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const getSelectedItems = (inventory: InventoryItem[], selectedIds: string[]) => {
    return inventory.filter((item) => selectedIds.includes(item.id));
  };

  const calculateTotalValue = (items: InventoryItem[]) => {
    return items.reduce((sum, item) => sum + item.price_estimate, 0);
  };

  const mySelectedItems = getSelectedItems(myInventory, selectedMyItems);
  const recipientSelectedItems = getSelectedItems(recipientInventory, selectedRecipientItems);
  const myTotalValue = calculateTotalValue(mySelectedItems);
  const recipientTotalValue = calculateTotalValue(recipientSelectedItems);
  const priceDifference = recipientTotalValue > 0
    ? ((myTotalValue - recipientTotalValue) / recipientTotalValue) * 100
    : myTotalValue > 0 ? 100 : 0;

  const isPriceBalanced = Math.abs(priceDifference) <= 15;

  const handleCreateTradeOffer = async () => {
    if (!user?.steamId) return;

    if (selectedMyItems.length === 0 || selectedRecipientItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'Items Required',
        message: 'Please select items from both inventories',
      });
      return;
    }

    if (!isPriceBalanced) {
      addToast({
        type: 'warning',
        title: 'Price Imbalance',
        message: `Price difference is ${Math.abs(priceDifference).toFixed(1)}%. Must be within 15%.`,
      });
      return;
    }

    /* Guard against the "null asset_id" DB failure (trade_items.asset_id
       is NOT NULL) surfacing as an opaque 500 — catch it client-side
       with an actionable message instead. */
    const missingId = [...mySelectedItems, ...recipientSelectedItems].some(
      (item) => !(item.asset_id || item.assetid),
    );
    if (missingId) {
      addToast({
        type: 'error',
        title: 'Item data incomplete',
        message: 'One of the selected items is missing its Steam asset id. Try refreshing inventories.',
      });
      return;
    }

    setCreating(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const offeredItems = mySelectedItems.map((item) => ({
        asset_id: item.asset_id || item.assetid,
        item_name: item.name,
        market_name: item.market_name,
        item_type: item.type,
        rarity: item.rarity,
        condition: item.condition,
        market_value: item.price_estimate,
        image_url: item.image,
        float_value: item.float,
        pattern_template: item.pattern,
        stickers: item.stickers || [],
      }));

      const requestedItems = recipientSelectedItems.map((item) => ({
        asset_id: item.asset_id || item.assetid,
        item_name: item.name,
        market_name: item.market_name,
        item_type: item.type,
        rarity: item.rarity,
        condition: item.condition,
        market_value: item.price_estimate,
        image_url: item.image,
        float_value: item.float,
        pattern_template: item.pattern,
        stickers: item.stickers || [],
      }));

      const response = await fetch(`${supabaseUrl}/functions/v1/trade-offers?action=create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initiator_steam_id: user.steamId,
          recipient_steam_id: recipientSteamId,
          offered_items: offeredItems,
          requested_items: requestedItems,
          notes: notes,
        }),
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Trade Offer Sent',
          message: `Your trade offer was sent to ${recipientName}`,
        });
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create trade offer');
      }
    } catch (error) {
      console.error('Failed to create trade offer:', error);
      addToast({
        type: 'error',
        title: 'Failed to Send',
        message: error instanceof Error ? error.message : 'Failed to create trade offer',
      });
    } finally {
      setCreating(false);
    }
  };

  const filterInventory = (inventory: InventoryItem[], searchQuery: string) => {
    if (!searchQuery) return inventory;
    const query = searchQuery.toLowerCase();
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.condition.toLowerCase().includes(query)
    );
  };

  const filteredMyInventory = filterInventory(myInventory, mySearch);
  const filteredRecipientInventory = filterInventory(recipientInventory, recipientSearch);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="bg-surface rounded-2xl w-full max-w-4xl h-[88dvh] flex flex-col overflow-hidden ring-1 ring-line shadow-2xl"
        >
          {/* Compact header — single row */}
          <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-line bg-subtle/60">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-ink leading-none">Create Trade Offer</h2>
              <p className="text-[12px] text-ink-muted mt-1 truncate">
                Trading with <span className="text-accent font-semibold">{recipientName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-ink-muted hover:text-ink transition-colors p-1.5 shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader className="w-7 h-7 animate-spin text-accent" />
              <span className="ml-3 text-[13px] text-ink-muted">Loading inventories...</span>
            </div>
          ) : (
            <>
              {/* Inventories — the ONLY scrollable region */}
              <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 sm:p-4 overflow-hidden">
                {(
                  [
                    {
                      title: 'Your Items',
                      count: selectedMyItems.length,
                      items: filteredMyInventory,
                      search: mySearch,
                      setSearch: setMySearch,
                      selected: selectedMyItems,
                      toggle: toggleMyItem,
                    },
                    {
                      title: `${recipientName}'s Items`,
                      count: selectedRecipientItems.length,
                      items: filteredRecipientInventory,
                      search: recipientSearch,
                      setSearch: setRecipientSearch,
                      selected: selectedRecipientItems,
                      toggle: toggleRecipientItem,
                    },
                  ]
                ).map((col) => (
                  <div key={col.title} className="flex flex-col min-h-0">
                    <div className="shrink-0 flex items-center gap-1.5 mb-2">
                      <Package size={13} className="text-accent" />
                      <h3 className="text-[12.5px] font-bold text-ink truncate">
                        {col.title} ({col.count})
                      </h3>
                    </div>
                    <div className="shrink-0 relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-dim w-3.5 h-3.5" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={col.search}
                        onChange={(e) => col.setSearch(e.target.value)}
                        className="w-full bg-subtle rounded-lg pl-8 pr-3 py-1.5 text-[12.5px] text-ink placeholder:text-ink-dim outline-none focus:ring-2 focus:ring-accent/40"
                      />
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-3 gap-1.5 content-start pr-1 pt-0.5">
                      {col.items.map((item) => {
                        const active = col.selected.includes(item.id);
                        return (
                          <motion.button
                            type="button"
                            key={item.id}
                            onClick={() => col.toggle(item.id)}
                            whileTap={{ scale: 0.96 }}
                            className={`bg-subtle rounded-lg p-1.5 text-left ring-2 transition-colors ${
                              active ? 'ring-accent bg-accent-soft' : 'ring-transparent hover:ring-line'
                            }`}
                          >
                            <CachedImage
                              src={item.image}
                              alt={item.name}
                              className="w-full h-12 object-contain mb-1"
                            />
                            <p className="text-[10px] text-ink leading-tight line-clamp-2">
                              {item.name}
                            </p>
                            <p className="text-[10px] font-bold mt-0.5 text-accent tabular-nums">
                              {formatPrice(item.price_estimate)}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price bar + notes + actions — pinned, never scrolls */}
              <div className="shrink-0 border-t border-line bg-subtle/60 px-4 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-ink-dim uppercase tracking-wide">Offering</p>
                    <p className="text-[15px] font-bold text-ink tabular-nums">
                      {formatPrice(myTotalValue)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <ArrowRight size={16} className="text-accent" />
                    <span
                      className={`mt-0.5 text-[10.5px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
                        isPriceBalanced
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {priceDifference > 0 ? '+' : ''}
                      {priceDifference.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-ink-dim uppercase tracking-wide">Requesting</p>
                    <p className="text-[15px] font-bold text-ink tabular-nums">
                      {formatPrice(recipientTotalValue)}
                    </p>
                  </div>
                </div>

                {!isPriceBalanced && (myTotalValue > 0 || recipientTotalValue > 0) && (
                  <div className="flex items-center gap-2 bg-rose-500/10 ring-1 ring-rose-500/25 rounded-lg px-3 py-1.5">
                    <AlertCircle size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                      Price difference must be within 15% — adjust your selections.
                    </p>
                  </div>
                )}

                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note (optional)…"
                  maxLength={200}
                  className="w-full bg-bg ring-1 ring-line rounded-lg px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-dim outline-none focus:ring-2 focus:ring-accent/40"
                />

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 bg-bg hover:bg-line/40 ring-1 ring-line text-ink py-2.5 rounded-lg transition-colors font-semibold text-[13px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTradeOffer}
                    disabled={
                      creating ||
                      selectedMyItems.length === 0 ||
                      selectedRecipientItems.length === 0 ||
                      !isPriceBalanced
                    }
                    className="flex-1 bg-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-on-accent py-2.5 rounded-lg transition-opacity font-semibold text-[13px] flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader size={14} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        Send Trade Offer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TradeOfferModal;
