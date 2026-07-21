import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
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
 * TradeOfferModal — compact, no-scroll-on-open layout.
 *
 * Previous version stacked a tall gradient header + two item grids +
 * a price panel + notes + buttons, which routinely overflowed a laptop
 * viewport and forced the whole modal to scroll. This version:
 *   - caps overall height at 88dvh and makes ONLY the item grids
 *     scroll internally (header, price bar, and action buttons stay
 *     pinned so Cancel/Send are always reachable without scrolling).
 *   - shrinks the header to a single compact row.
 *   - uses a denser 3-column item grid with smaller thumbnails.
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

    setCreating(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const offeredItems = mySelectedItems.map((item) => ({
        asset_id: item.asset_id,
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
        asset_id: item.asset_id,
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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="bg-gray-900 rounded-2xl w-full max-w-4xl h-[88dvh] flex flex-col overflow-hidden border border-purple-500/30 shadow-2xl"
        >
          {/* Compact header — single row */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-purple-500/25 bg-gradient-to-r from-purple-900/40 to-blue-900/40">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-white leading-none">Create Trade Offer</h2>
              <p className="text-[12px] text-gray-400 mt-1 truncate">
                Trading with <span className="text-purple-400 font-semibold">{recipientName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1.5 shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader className="w-7 h-7 animate-spin text-purple-500" />
              <span className="ml-3 text-[13px] text-gray-300">Loading inventories...</span>
            </div>
          ) : (
            <>
              {/* Inventories — the ONLY scrollable region */}
              <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 p-4 overflow-hidden">
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
                      accent: 'green' as const,
                    },
                    {
                      title: `${recipientName}'s Items`,
                      count: selectedRecipientItems.length,
                      items: filteredRecipientInventory,
                      search: recipientSearch,
                      setSearch: setRecipientSearch,
                      selected: selectedRecipientItems,
                      toggle: toggleRecipientItem,
                      accent: 'blue' as const,
                    },
                  ]
                ).map((col) => (
                  <div key={col.title} className="flex flex-col min-h-0">
                    <div className="shrink-0 flex items-center gap-1.5 mb-2">
                      <Package
                        size={13}
                        className={col.accent === 'green' ? 'text-green-400' : 'text-blue-400'}
                      />
                      <h3 className="text-[12.5px] font-bold text-white truncate">
                        {col.title} ({col.count})
                      </h3>
                    </div>
                    <div className="shrink-0 relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={col.search}
                        onChange={(e) => col.setSearch(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-[12.5px] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-3 gap-1.5 content-start pr-1">
                      {col.items.map((item) => {
                        const active = col.selected.includes(item.id);
                        const ring =
                          col.accent === 'green'
                            ? active
                              ? 'border-green-500 ring-1 ring-green-500/50'
                              : 'border-gray-700 hover:border-green-400'
                            : active
                            ? 'border-blue-500 ring-1 ring-blue-500/50'
                            : 'border-gray-700 hover:border-blue-400';
                        return (
                          <motion.button
                            type="button"
                            key={item.id}
                            onClick={() => col.toggle(item.id)}
                            whileTap={{ scale: 0.96 }}
                            className={`bg-gray-800 rounded-lg p-1.5 text-left border-2 transition-colors ${ring}`}
                          >
                            <CachedImage
                              src={item.image}
                              alt={item.name}
                              className="w-full h-12 object-contain mb-1"
                            />
                            <p className="text-[10px] text-white leading-tight line-clamp-2">
                              {item.name}
                            </p>
                            <p
                              className={`text-[10px] font-bold mt-0.5 ${
                                col.accent === 'green' ? 'text-green-400' : 'text-blue-400'
                              }`}
                            >
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
              <div className="shrink-0 border-t border-gray-800 bg-gray-800/40 px-4 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Offering</p>
                    <p className="text-[15px] font-bold text-green-400 tabular-nums">
                      {formatPrice(myTotalValue)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <ArrowRight size={16} className="text-purple-400" />
                    <span
                      className={`mt-0.5 text-[10.5px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
                        isPriceBalanced
                          ? 'bg-green-500/15 text-green-300'
                          : 'bg-red-500/15 text-red-300'
                      }`}
                    >
                      {priceDifference > 0 ? '+' : ''}
                      {priceDifference.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Requesting</p>
                    <p className="text-[15px] font-bold text-blue-400 tabular-nums">
                      {formatPrice(recipientTotalValue)}
                    </p>
                  </div>
                </div>

                {!isPriceBalanced && (myTotalValue > 0 || recipientTotalValue > 0) && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-1.5">
                    <AlertCircle size={13} className="text-red-400 shrink-0" />
                    <p className="text-[11px] text-red-300 font-medium">
                      Price difference must be within 15% — adjust your selections.
                    </p>
                  </div>
                )}

                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note (optional)…"
                  maxLength={200}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-[12.5px] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg transition-colors font-semibold text-[13px]"
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
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-2.5 rounded-lg transition-all font-semibold text-[13px] flex items-center justify-center gap-2"
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
